import { executeData, fetchData } from '../../methods.js';
import collageSchema from '../../schema/superadmin/collage.js';
import rolesSchema from '../../schema/roles.js';
import { ObjectId } from 'mongodb';
import tpcManagementController from '../tpcManagement.js';

const tablename = "tblCollage";
const rolesTable = "tblRoles";
const tpcManagement = new tpcManagementController();

export default class collagecontroller {

    async listcollage(req, res, next) {
        try {
            const { projection, filter, options } = req.body;

            // For public signup access, only return active colleges with active subscriptions
            // For authenticated Superadmin, return all colleges based on filter
            let finalFilter = filter || {};

            // If no authentication (public signup), only show active colleges
            if (!req.user || !req.user.role || req.user.role.toLowerCase() !== 'superadmin') {
                finalFilter = {
                    ...finalFilter,
                    deleted: false,
                    collage_status: 1,
                    collage_subscription_status: 'active'
                };
            }

            const fetchOptions = {
                ...(options || {}),
                ...(req ? { req: req } : {})
            };

            const response = await fetchData(
                tablename,
                projection || {},
                finalFilter,
                fetchOptions
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Colleges fetched successfully',
                data: response.data
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Fetch failed',
                error: error.message
            };
            next();
        }
    }

    async insertcollage(req, res, next) {
        try {
            const data = req.body;

            // Convert collage_name to uppercase if provided
            if (data.collage_name) {
                data.collage_name = data.collage_name.toUpperCase();
            }

            // Ensure subscription status is set
            if (!data.collage_subscription_status) {
                data.collage_subscription_status = 'active';
            }

            // Validate departments if provided
            if (data.collage_departments && Array.isArray(data.collage_departments) && data.collage_departments.length > 0) {
                // Verify all departments exist
                const departmentsResponse = await fetchData(
                    'tblDepartments',
                    { department_id: 1 },
                    {
                        department_id: { $in: data.collage_departments },
                        department_status: 1,
                        deleted: false
                    }
                );

                if (!departmentsResponse.success || !departmentsResponse.data ||
                    departmentsResponse.data.length !== data.collage_departments.length) {
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: 'One or more departments are invalid',
                        error: 'Invalid department IDs'
                    };
                    return next();
                }
            } else {
                data.collage_departments = [];
            }

            // Extract TPC account creation data and prepare college data
            const {
                create_tpc_account,
                collage_tpc_email,
                collage_tpc_password,
                collage_tpc_contact,
                collage_tpc_person,
                ...collegeData
            } = data;

            // Initialize arrays for new structure
            collegeData.tpc_users = [];
            collegeData.departments = [];

            // Create College TPC user if requested (using PersonMaster as single source of truth)
            let tpcPersonId = null;
            if (create_tpc_account && collage_tpc_email && collage_tpc_password && collage_tpc_person) {
                try {
                    const normalizedEmail = collage_tpc_email.toLowerCase().trim();

                    // Check if TPC email already exists in PersonMaster
                    const existingUser = await fetchData(
                        personTable,
                        { person_email: 1, _id: 1 },
                        {
                            person_email: normalizedEmail,
                            person_deleted: false
                        }
                    );

                    if (existingUser.success && existingUser.data && existingUser.data.length > 0) {
                        res.locals.responseData = {
                            success: false,
                            status: 409,
                            message: 'TPC email already exists. Please use a different email.',
                            error: 'TPC email already registered'
                        };
                        return next();
                    }

                    // Hash password
                    const saltRounds = 10;
                    const hashedPassword = await bcrypt.hash(collage_tpc_password, saltRounds);

                    // STEP 1: Create TPC user in PersonMaster FIRST (single source of truth)
                    // Note: We'll update person_collage_id after college is created
                    const tpcUserData = {
                        person_name: collage_tpc_person.trim(),
                        person_email: normalizedEmail,
                        person_role: 'TPC',
                        person_password: hashedPassword,
                        person_status: 'active',
                        person_deleted: false,
                        college_name: collegeData.collage_name,
                        contact_number: collage_tpc_contact ? collage_tpc_contact.trim() : null,
                    };

                    const tpcResponse = await executeData(personTable, tpcUserData, 'i', personMasterSchema);

                    if (!tpcResponse.success) {
                        res.locals.responseData = {
                            success: false,
                            status: 500,
                            message: 'Failed to create TPC user in PersonMaster',
                            error: tpcResponse.error || 'TPC user creation failed'
                        };
                        return next();
                    }

                    // Get the PersonMaster._id (this is the PRIMARY ID used everywhere)
                    tpcPersonId = tpcResponse.data?.insertedId || tpcResponse.data?._id;

                    // Create TPC user reference to add to college document (just person_id, no duplicate data)
                    const tpcUserReference = {
                        person_id: tpcPersonId, // Reference to tblPersonMaster._id
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    collegeData.tpc_users.push(tpcUserReference);
                } catch (tpcError) {
                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'Failed to prepare TPC user data',
                        error: tpcError.message
                    };
                    return next();
                }
            }

            // Insert college with TPC user references
            const response = await executeData(tablename, collegeData, 'i', collageSchema);

            if (!response.success) {
                // Rollback: Delete TPC user from PersonMaster if college creation fails
                if (tpcPersonId) {
                    try {
                        await executeData(personTable, { person_deleted: true }, 'u', personMasterSchema, { _id: tpcPersonId });
                    } catch (rollbackError) {
                        console.error('Error rolling back TPC user creation:', rollbackError.message);
                    }
                }

                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'College insertion failed',
                    error: response.error || 'Failed to create college'
                };
                return next();
            }

            const collegeId = response.data?.insertedId || response.data?._id;

            // Update TPC user's person_collage_id now that college is created
            if (tpcPersonId) {
                try {
                    await executeData(
                        personTable,
                        { person_collage_id: collegeId },
                        'u',
                        personMasterSchema,
                        { _id: tpcPersonId }
                    );
                } catch (updateError) {
                    console.error('Error updating TPC user college_id:', updateError.message);
                    // Non-critical, continue
                }
            }

            // Insert roles for this college (excluding superadmin)
            const rolesData = [
                { role_name: "DeptTPC" },
                { role_name: "TPC" },
                { role_name: "Student" },
            ];

            // Check if roles already exist, if not insert them
            // Note: Roles are global, so no role-based filtering needed here
            const existingRoles = await fetchData(
                rolesTable,
                { role_name: 1 },
                { role_name: { $in: rolesData.map(r => r.role_name) } },
                {} // No user context needed for roles (global data)
            );

            // Only insert roles that don't exist
            const rolesToInsert = rolesData.filter(role => {
                return !existingRoles.data.some(existing =>
                    existing.role_name.toLowerCase() === role.role_name.toLowerCase()
                );
            });

            if (rolesToInsert.length > 0) {
                await executeData(rolesTable, rolesToInsert, 'i', rolesSchema);
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: create_tpc_account && tpcPersonId
                    ? 'College and TPC account created successfully'
                    : 'College created successfully',
                data: {
                    college: response.data,
                    tpc_person_id: tpcPersonId // PersonMaster._id (single source of truth)
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Insert failed',
                error: error.message
            };
            next();
        }
    }

    async updatecollage(req, res, next) {
        try {
            const { filter, data, options } = req.body;

            if (!filter || !data) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Filter and data are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Extract TPC account flags and password (password should not be stored in college record)
            // Keep TPC fields in collegeData for storing in college record
            const {
                create_tpc_account,
                update_tpc_account,
                collage_tpc_password,  // Don't store password in college record
                ...collegeData
            } = data;

            // Extract TPC fields for account creation/update (these will be stored in college record AND used for user account)
            const collage_tpc_email = data.collage_tpc_email;
            const collage_tpc_contact = data.collage_tpc_contact;
            const collage_tpc_person = data.collage_tpc_person;

            // TPC fields are already in collegeData (they weren't extracted), so we don't need to add them back
            // But let's ensure they're there explicitly
            if (collage_tpc_person && !collegeData.collage_tpc_person) collegeData.collage_tpc_person = collage_tpc_person;
            if (collage_tpc_email && !collegeData.collage_tpc_email) collegeData.collage_tpc_email = collage_tpc_email;
            if (collage_tpc_contact && !collegeData.collage_tpc_contact) collegeData.collage_tpc_contact = collage_tpc_contact;

            // Convert collage_name to uppercase if provided in update
            if (collegeData.collage_name) {
                collegeData.collage_name = collegeData.collage_name.toUpperCase();
            }

            // Remove undefined/null values from collegeData
            Object.keys(collegeData).forEach(key => {
                if (collegeData[key] === undefined || collegeData[key] === null) {
                    delete collegeData[key];
                }
            });

            // CRITICAL: Remove `tpc_users` and `departments` from collegeData to prevent
            // overwriting them with empty arrays if the frontend sends them.
            // These arrays should only be modified via specific $push/$pull operations
            // or the dedicated TPC management methods.
            delete collegeData.tpc_users;
            delete collegeData.departments;

            // If collegeData is empty and we're only creating TPC account, skip college update
            const shouldUpdateCollege = Object.keys(collegeData).length > 0;

            // Debug logging (can be removed in production)
            console.log('Update College Debug:', {
                shouldUpdateCollege,
                collegeDataKeys: Object.keys(collegeData),
                collegeData: collegeData,
                hasTpcFields: !!(collage_tpc_person || collage_tpc_email || collage_tpc_contact),
                createTpcAccount: create_tpc_account,
                updateTpcAccount: update_tpc_account,
                filter: filter
            });

            // Validate departments if being updated
            if (collegeData.collage_departments && Array.isArray(collegeData.collage_departments) && collegeData.collage_departments.length > 0) {
                // Convert department IDs to ObjectId if they're strings
                const departmentIds = collegeData.collage_departments.map(id => {
                    if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
                        return new ObjectId(id);
                    }
                    return id;
                });

                // Verify all departments exist (check by _id, not department_id)
                const departmentsResponse = await fetchData(
                    'tblDepartments',
                    { _id: 1 },
                    {
                        _id: { $in: departmentIds },
                        department_status: 1,
                        deleted: false
                    }
                );

                if (!departmentsResponse.success || !departmentsResponse.data ||
                    departmentsResponse.data.length !== collegeData.collage_departments.length) {
                    console.error('Department validation failed:', {
                        requested: collegeData.collage_departments,
                        found: departmentsResponse.data?.map(d => d._id) || [],
                        count: departmentsResponse.data?.length || 0
                    });
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: 'One or more departments are invalid',
                        error: 'Invalid department IDs'
                    };
                    return next();
                }
            }

            // Convert _id in filter to ObjectId if it's a string (for consistency with executeData)
            const processedFilter = { ...filter };
            if (processedFilter._id && typeof processedFilter._id === 'string') {
                try {
                    if (/^[0-9a-fA-F]{24}$/.test(processedFilter._id)) {
                        processedFilter._id = new ObjectId(processedFilter._id);
                    } else {
                        console.error('Invalid ObjectId format:', processedFilter._id);
                        res.locals.responseData = {
                            success: false,
                            status: 400,
                            message: 'Invalid college ID format',
                            error: 'College ID must be a valid 24-character hex string'
                        };
                        return next();
                    }
                } catch (error) {
                    console.error('Failed to convert _id to ObjectId:', error.message);
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: 'Invalid college ID',
                        error: error.message
                    };
                    return next();
                }
            }

            // Add deleted: false to filter to exclude soft-deleted colleges
            processedFilter.deleted = false;

            // Verify college exists (always check, even if we're only creating TPC account)
            const collegeCheck = await fetchData(
                tablename,
                { _id: 1, collage_name: 1 },
                processedFilter
            );

            if (!collegeCheck.success || !collegeCheck.data || collegeCheck.data.length === 0) {
                console.error('College not found with filter:', processedFilter);
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'College not found',
                    error: 'College with provided filter not found. Please check the college ID.'
                };
                return next();
            }

            const college = collegeCheck.data[0];
            console.log('College found:', college._id, college.collage_name);
            console.log('College _id type from fetchData:', typeof college._id, college._id);

            // Use the actual college _id from database for update (more reliable than filter)
            // Ensure _id is ObjectId format - college._id from fetchData should already be ObjectId
            // Use only _id for update filter since we already verified college exists and is not deleted
            // The deleted check was done in the collegeCheck query above
            const updateFilter = {
                _id: college._id  // Use directly from fetchData result (already ObjectId)
            };
            console.log('Update filter after processing:', {
                _id: updateFilter._id,
                _idType: typeof updateFilter._id,
                _idIsObjectId: updateFilter._id instanceof ObjectId,
                _idString: updateFilter._id?.toString()
            });

            // Update college only if there's data to update
            // If only creating/updating TPC account, we still need to update college record with TPC fields
            let response = { success: true, data: college };
            if (shouldUpdateCollege) {
                try {
                    console.log('Updating college with data:', JSON.stringify(collegeData, null, 2));
                    console.log('Using update filter:', {
                        _id: updateFilter._id,
                        _idType: typeof updateFilter._id,
                        _idIsObjectId: updateFilter._id instanceof ObjectId,
                        _idString: updateFilter._id?.toString()
                    });

                    // Ensure updateFilter._id is ObjectId (should already be, but double-check)
                    if (!(updateFilter._id instanceof ObjectId)) {
                        if (typeof updateFilter._id === 'string' && /^[0-9a-fA-F]{24}$/.test(updateFilter._id)) {
                            updateFilter._id = new ObjectId(updateFilter._id);
                            console.log('Converted update filter _id to ObjectId:', updateFilter._id.toString());
                        } else {
                            console.error('Invalid _id format in update filter:', updateFilter._id);
                        }
                    }

                    // Pass the filter directly - executeData will handle ObjectId conversion if needed
                    // The _id from fetchData should already be a proper ObjectId
                    console.log('Final update filter before executeData:', {
                        _id: updateFilter._id?.toString(),
                        _idIsObjectId: updateFilter._id instanceof ObjectId,
                        _idType: typeof updateFilter._id
                    });

                    response = await executeData(tablename, collegeData, 'u', collageSchema, updateFilter, options || {});

                    if (!response.success) {
                        console.error('College update error:', response.error, response);
                        console.error('Full response:', JSON.stringify(response, null, 2));
                        res.locals.responseData = {
                            success: false,
                            status: 500,
                            message: 'College update failed',
                            error: response.error || response.message || 'Failed to update college'
                        };
                        return next();
                    }
                    console.log('College update successful:', response);
                } catch (updateError) {
                    console.error('College update exception:', updateError);
                    console.error('Exception stack:', updateError.stack);
                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'College update failed',
                        error: updateError.message || 'Failed to update college'
                    };
                    return next();
                }
            } else {
                console.log('Skipping college update - no data to update, only TPC account creation/update');
                // Even if skipping update, we should still store TPC fields in college record
                if (create_tpc_account || update_tpc_account) {
                    if (collage_tpc_person || collage_tpc_email || collage_tpc_contact) {
                        const tpcFieldsOnly = {};
                        if (collage_tpc_person) tpcFieldsOnly.collage_tpc_person = collage_tpc_person;
                        if (collage_tpc_email) tpcFieldsOnly.collage_tpc_email = collage_tpc_email;
                        if (collage_tpc_contact) tpcFieldsOnly.collage_tpc_contact = collage_tpc_contact;

                        console.log('Updating college with TPC fields only:', tpcFieldsOnly);
                        try {
                            response = await executeData(tablename, tpcFieldsOnly, 'u', collageSchema, updateFilter, options || {});
                            if (!response.success) {
                                console.error('Failed to update college with TPC fields:', response.error);
                                // Don't fail the entire operation, just log the error
                            } else {
                                console.log('College TPC fields updated successfully');
                            }
                        } catch (error) {
                            console.error('Error updating college with TPC fields:', error.message);
                            // Don't fail the entire operation, just log the error
                        }
                    }
                }
            }

            let tpcUserId = null;
            let tpcOperation = null; // 'created' or 'updated'

            // CREATE College TPC user account using TPC Management Controller
            if (create_tpc_account) {
                if (!collage_tpc_email || !collage_tpc_password || !collage_tpc_person) {
                    // Critical Error: User requested TPC creation but missing fields
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: 'Missing TPC account details',
                        error: 'Email, Password, and Contact Person are required to create a TPC account'
                    };
                    return next();
                }

                try {
                    // Use college from the check above (already verified)
                    const collegeId = college._id.toString();

                    // Create TPC account - call internal method
                    const tpcResult = await tpcManagement.createCollegeTpcInternal({
                        tpc_name: collage_tpc_person,
                        tpc_email: collage_tpc_email,
                        tpc_password: collage_tpc_password,
                        tpc_contact: collage_tpc_contact,
                        collage_id: collegeId
                    });

                    if (!tpcResult.success) {
                        res.locals.responseData = {
                            success: false,
                            status: tpcResult.status || 500,
                            message: tpcResult.message || 'Failed to create TPC account',
                            error: tpcResult.error || 'TPC account creation failed'
                        };
                        return next();
                    }

                    tpcUserId = tpcResult.data?.person_id || tpcResult.data?.tpc_id; // Support both new (person_id) and old (tpc_id) structure
                    tpcOperation = 'created';
                } catch (tpcError) {
                    console.error('Error creating College TPC account:', tpcError.message);
                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'Failed to create TPC account',
                        error: tpcError.message || 'TPC account creation failed'
                    };
                    return next();
                }
            }

            // UPDATE College TPC user account using TPC Management Controller
            if (update_tpc_account && collage_tpc_email && collage_tpc_password && collage_tpc_person) {
                try {
                    // Use college from the check above (already verified)
                    const collegeId = college._id.toString();

                    // Update TPC account - call internal method
                    const tpcResult = await tpcManagement.updateCollegeTpcInternal({
                        filter: { collage_id: collegeId },
                        tpc_name: collage_tpc_person,
                        tpc_email: collage_tpc_email,
                        tpc_password: collage_tpc_password,
                        tpc_contact: collage_tpc_contact
                    });

                    if (!tpcResult.success) {
                        res.locals.responseData = {
                            success: false,
                            status: tpcResult.status || 500,
                            message: tpcResult.message || 'Failed to update TPC account',
                            error: tpcResult.error || 'TPC account update failed'
                        };
                        return next();
                    }

                    tpcUserId = tpcResult.data?.person_id || tpcResult.data?.tpc_id; // Support both new (person_id) and old (tpc_id) structure
                    tpcOperation = 'updated';
                } catch (tpcError) {
                    console.error('Error updating College TPC account:', tpcError.message);
                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'Failed to update TPC account',
                        error: tpcError.message || 'TPC account update failed'
                    };
                    return next();
                }
            }

            let successMessage = 'College updated successfully';
            if (tpcOperation === 'created') {
                successMessage = 'College updated and TPC account created successfully';
            } else if (tpcOperation === 'updated') {
                successMessage = 'College updated and TPC account updated successfully';
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: successMessage,
                data: {
                    college: response.data,
                    tpc_user_id: tpcUserId,
                    tpc_operation: tpcOperation
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Update failed',
                error: error.message
            };
            next();
        }
    }

    async deletecollage(req, res, next) {
        try {
            const { filter, hardDelete, options } = req.body;

            if (!filter) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Filter is required',
                    error: 'Missing filter'
                };
                return next();
            }

            const deleteOptions = {
                hardDelete: hardDelete || false,
                ...(options || {})
            };

            const response = await executeData(tablename, null, 'd', collageSchema, filter, deleteOptions);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'College deleted successfully',
                data: response.data || { deletedCount: response.deletedCount }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Delete failed',
                error: error.message
            };
            next();
        }
    }

    /**
     * Update college subscription status
     * Route: POST /collage/update-subscription
     */
    async updateSubscription(req, res, next) {
        try {
            const { filter, subscription_status } = req.body;

            if (!filter || !subscription_status) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Filter and subscription_status are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            if (!['active', 'inactive'].includes(subscription_status)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Invalid subscription_status. Must be "active" or "inactive"',
                    error: 'Invalid subscription status'
                };
                return next();
            }

            const response = await executeData(
                tablename,
                { collage_subscription_status: subscription_status },
                'u',
                collageSchema,
                filter,
                {}
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `College subscription ${subscription_status === 'active' ? 'activated' : 'deactivated'} successfully`,
                data: response.data
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Update subscription failed',
                error: error.message
            };
            next();
        }
    }
}