import { executeData, fetchData } from '../methods.js';
import tpcSchema from '../schema/tpc.js';
import deptTpcSchema from '../schema/deptTpc.js';
import collageSchema from '../schema/superadmin/collage.js';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';

const tpcTable = "tblTPC";
const deptTpcTable = "tblDeptTPC";
const collageTable = "tblCollage";
const departmentTable = "tblDepartments";

export default class tpcManagementController {

    /**
     * Create College TPC Account
     * POST /tpc-management/create-college-tpc
     */
    async createCollegeTpc(req, res, next) {
        try {
            const {
                tpc_name,
                tpc_email,
                tpc_password,
                tpc_contact,
                collage_id
            } = req.body;

            // Validate required fields
            if (!tpc_name || !tpc_email || !tpc_password || !collage_id) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Missing required fields',
                    error: 'tpc_name, tpc_email, tpc_password, and collage_id are required'
                };
                return next();
            }

            // Parallelize validation checks and password hashing
            const normalizedEmail = tpc_email.toLowerCase().trim();
            const personTable = "tblPersonMaster";
            const saltRounds = 10;

            const [collegeCheck, existingUserCheck, hashedPassword] = await Promise.all([
                // 1. Verify college exists
                fetchData(
                    collageTable,
                    { _id: 1, collage_name: 1 },
                    {
                        _id: typeof collage_id === 'string' && /^[0-9a-fA-F]{24}$/.test(collage_id)
                            ? new ObjectId(collage_id)
                            : collage_id,
                        deleted: false
                    }
                ),
                // 2. Check if TPC email already exists in PersonMaster
                fetchData(
                    personTable,
                    { _id: 1, person_email: 1, person_role: 1, person_collage_id: 1 },
                    {
                        person_email: normalizedEmail,
                        person_deleted: false
                    }
                ),
                // 3. Hash password (CPU intensive, run in parallel with I/O)
                bcrypt.hash(tpc_password, saltRounds)
            ]);

            if (!collegeCheck.success || !collegeCheck.data || collegeCheck.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'College not found',
                    error: 'College with provided ID does not exist'
                };
                return next();
            }

            const college = collegeCheck.data[0];

            if (existingUserCheck.success && existingUserCheck.data && existingUserCheck.data.length > 0) {
                const existingUser = existingUserCheck.data[0];
                // Check if this user is already a TPC for this college
                if (existingUser.person_role === 'TPC' && existingUser.person_collage_id?.toString() === collage_id.toString()) {
                    res.locals.responseData = {
                        success: false,
                        status: 409,
                        message: 'TPC account already exists for this college',
                        error: 'A TPC account with this email already exists for this college'
                    };
                    return next();
                } else if (existingUser.person_email === normalizedEmail) {
                    res.locals.responseData = {
                        success: false,
                        status: 409,
                        message: 'Email already exists',
                        error: 'A user with this email already exists'
                    };
                    return next();
                }
            }

            // STEP 1: Create user in tblPersonMaster FIRST (single source of truth)
            const personMasterSchema = (await import('../schema/PersonMaster.js')).default;

            const tpcUserData = {
                person_name: tpc_name.trim(),
                person_email: normalizedEmail,
                person_role: 'TPC',
                person_password: hashedPassword,
                person_status: 'active',
                person_deleted: false,
                person_collage_id: collage_id,
                college_name: college.collage_name,
                contact_number: tpc_contact ? tpc_contact.trim() : null,
            };

            const personResponse = await executeData(personTable, tpcUserData, 'i', personMasterSchema);

            if (!personResponse.success) {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to create TPC user in PersonMaster',
                    error: personResponse.error || 'TPC account creation failed'
                };
                return next();
            }

            // Get the PersonMaster._id (this is the PRIMARY ID used everywhere)
            const personId = personResponse.data?.insertedId || personResponse.data?._id;

            // STEP 2: Add reference to college document with dedicated _id and name
            const tpcUserReference = {
                _id: personId,
                person_id: personId,
                name: tpc_name.trim(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Update college document: add TPC to tpc_users and set legacy display fields so frontend shows name/email/contact
            const updateFilter = { _id: college._id };
            const updateData = {
                $push: { tpc_users: tpcUserReference },
                $set: {
                    updated_at: new Date().toISOString(),
                    collage_tpc_person: tpc_name.trim(),
                    collage_tpc_email: normalizedEmail,
                    collage_tpc_contact: (tpc_contact || '').trim() || null
                }
            };

            let updateResponse;
            try {
                updateResponse = await executeData(
                    collageTable,
                    updateData,
                    'u',
                    collageSchema,
                    updateFilter
                );
            } catch (updateError) {
                // If executeData throws an exception, treat it as a failure
                console.error('Error updating college with TPC reference:', updateError.message);
                updateResponse = {
                    success: false,
                    error: updateError.message || 'College update failed'
                };
            }

            if (!updateResponse || !updateResponse.success) {
                // Rollback: Delete user from PersonMaster if college update fails
                try {
                    await executeData(personTable, { person_deleted: true }, 'u', personMasterSchema, { _id: personId });
                    console.log('Rollback successful: TPC user deleted from PersonMaster');
                } catch (rollbackError) {
                    console.error('Error rolling back TPC user creation:', rollbackError.message);
                }

                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to add TPC user reference to college',
                    error: updateResponse?.error || updateResponse?.message || 'TPC account creation failed'
                };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 201,
                message: 'College TPC account created successfully',
                data: {
                    person_id: personId, // Primary ID from PersonMaster
                    tpc_email: normalizedEmail,
                    tpc_name: tpc_name.trim(),
                    collage_name: college.collage_name
                }
            };
            next();
        } catch (error) {
            console.error('Error creating College TPC:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to create TPC account',
                error: error.message
            };
            next();
        }
    }

    /**
     * Update College TPC Account
     * POST /tpc-management/update-college-tpc
     */
    async updateCollegeTpc(req, res, next) {
        try {
            const {
                filter,
                tpc_name,
                tpc_email,
                tpc_password,
                tpc_contact,
                tpc_status
            } = req.body;

            if (!filter || (!filter._id && !filter.collage_id && !filter.tpc_email)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Missing filter',
                    error: 'Filter with _id, collage_id, or tpc_email is required'
                };
                return next();
            }

            // Convert _id to ObjectId if it's a string
            const processedFilter = { ...filter };
            if (processedFilter._id && typeof processedFilter._id === 'string') {
                if (/^[0-9a-fA-F]{24}$/.test(processedFilter._id)) {
                    processedFilter._id = new ObjectId(processedFilter._id);
                }
            }
            processedFilter.tpc_deleted = false;

            // Check if TPC exists
            const existingTpc = await fetchData(
                tpcTable,
                { _id: 1, tpc_email: 1, collage_id: 1 },
                processedFilter
            );

            if (!existingTpc.success || !existingTpc.data || existingTpc.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'TPC account not found',
                    error: 'TPC account with provided filter does not exist'
                };
                return next();
            }

            const tpc = existingTpc.data[0];

            // Check email uniqueness if email is being updated
            if (tpc_email && tpc_email.toLowerCase().trim() !== tpc.tpc_email) {
                const emailCheck = await fetchData(
                    tpcTable,
                    { tpc_email: 1 },
                    {
                        tpc_email: tpc_email.toLowerCase().trim(),
                        tpc_deleted: false,
                        _id: { $ne: tpc._id }
                    }
                );

                if (emailCheck.success && emailCheck.data && emailCheck.data.length > 0) {
                    res.locals.responseData = {
                        success: false,
                        status: 409,
                        message: 'Email already exists',
                        error: 'A TPC account with this email already exists'
                    };
                    return next();
                }
            }

            // Prepare update data
            const updateData = {};
            if (tpc_name) updateData.tpc_name = tpc_name.trim();
            if (tpc_email) updateData.tpc_email = tpc_email.toLowerCase().trim();
            if (tpc_contact !== undefined) updateData.tpc_contact = tpc_contact ? tpc_contact.trim() : null;
            if (tpc_status) updateData.tpc_status = tpc_status;

            // Hash password if provided
            if (tpc_password) {
                const saltRounds = 10;
                updateData.tpc_password = await bcrypt.hash(tpc_password, saltRounds);
            }

            // Update TPC account
            const updateFilter = { _id: tpc._id };
            const response = await executeData(tpcTable, updateData, 'u', tpcSchema, updateFilter);

            if (!response.success) {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to update TPC account',
                    error: response.error || 'TPC account update failed'
                };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'College TPC account updated successfully',
                data: {
                    tpc_id: tpc._id,
                    tpc_email: updateData.tpc_email || tpc.tpc_email,
                    tpc_name: updateData.tpc_name || tpc.tpc_name
                }
            };
            next();
        } catch (error) {
            console.error('Error updating College TPC:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to update TPC account',
                error: error.message
            };
            next();
        }
    }

    /**
     * Create Department TPC Account
     * POST /tpc-management/create-dept-tpc
     */
    async createDeptTpc(req, res, next) {
        try {
            const {
                dept_tpc_name,
                dept_tpc_email,
                dept_tpc_password,
                dept_tpc_contact,
                department_id,
                collage_id
            } = req.body;

            // Validate required fields
            if (!dept_tpc_name || !dept_tpc_email || !dept_tpc_password || !department_id || !collage_id) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Missing required fields',
                    error: 'dept_tpc_name, dept_tpc_email, dept_tpc_password, department_id, and collage_id are required'
                };
                return next();
            }

            // Verify department exists
            const deptFilter = {
                _id: typeof department_id === 'string' && /^[0-9a-fA-F]{24}$/.test(department_id)
                    ? new ObjectId(department_id)
                    : department_id,
                deleted: false
            };

            const deptCheck = await fetchData(
                departmentTable,
                { _id: 1, department_name: 1, department_code: 1, department_college_id: 1 },
                deptFilter
            );

            if (!deptCheck.success || !deptCheck.data || deptCheck.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Department not found',
                    error: 'Department with provided ID does not exist'
                };
                return next();
            }

            const department = deptCheck.data[0];

            // Verify college exists
            const collegeFilter = {
                _id: typeof collage_id === 'string' && /^[0-9a-fA-F]{24}$/.test(collage_id)
                    ? new ObjectId(collage_id)
                    : collage_id,
                deleted: false
            };

            const collegeCheck = await fetchData(
                collageTable,
                { _id: 1, collage_name: 1 },
                collegeFilter
            );

            if (!collegeCheck.success || !collegeCheck.data || collegeCheck.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'College not found',
                    error: 'College with provided ID does not exist'
                };
                return next();
            }

            const college = collegeCheck.data[0];
            const normalizedEmail = dept_tpc_email.toLowerCase().trim();
            const deptObjectId = deptFilter._id;

            // Check if department already has a DeptTPC in college's departments array
            if (college.departments && Array.isArray(college.departments)) {
                const existingDept = college.departments.find(
                    dept => (dept.department_id?.toString() === deptObjectId.toString() ||
                        dept.department_id?.toString() === department_id.toString()) &&
                        dept.dept_tpc &&
                        dept.dept_tpc.dept_tpc_status !== 'inactive'
                );

                if (existingDept) {
                    res.locals.responseData = {
                        success: false,
                        status: 409,
                        message: 'Department TPC account already exists for this department',
                        error: 'A DeptTPC account already exists for this department'
                    };
                    return next();
                }
            }

            // Check if email exists in any college's departments array
            const existingEmailCheck = await fetchData(
                collageTable,
                { _id: 1, collage_name: 1 },
                {
                    'departments.dept_tpc.dept_tpc_email': normalizedEmail,
                    deleted: false
                }
            );

            if (existingEmailCheck.success && existingEmailCheck.data && existingEmailCheck.data.length > 0) {
                res.locals.responseData = {
                    success: false,
                    status: 409,
                    message: 'Email already exists in another college',
                    error: 'A DeptTPC account with this email already exists'
                };
                return next();
            }

            // Hash password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(dept_tpc_password, saltRounds);

            // STEP 1: Create user in tblPersonMaster FIRST (single source of truth)
            const personTable = "tblPersonMaster";
            const personMasterSchema = (await import('../schema/PersonMaster.js')).default;

            const deptTpcUserData = {
                person_name: dept_tpc_name.trim(),
                person_email: normalizedEmail,
                person_role: 'DeptTPC',
                person_password: hashedPassword,
                person_status: 'active',
                person_deleted: false,
                person_collage_id: collage_id,
                college_name: college.collage_name,
                // Store BOTH department name and department_id for robust filtering
                department: department.department_name || department.department_code || null,
                department_id: (department.department_id || deptObjectId)?.toString?.() || (department.department_id || deptObjectId) || null,
                contact_number: dept_tpc_contact ? dept_tpc_contact.trim() : null,
            };

            const personResponse = await executeData(personTable, deptTpcUserData, 'i', personMasterSchema);

            if (!personResponse.success) {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to create DeptTPC user in PersonMaster',
                    error: personResponse.error || 'DeptTPC account creation failed'
                };
                return next();
            }

            // Get the PersonMaster._id (this is the PRIMARY ID used everywhere)
            const personId = personResponse.data?.insertedId || personResponse.data?._id;

            // STEP 2: Add reference to college document (person_id + name + email for display in DB/UI)
            const deptTpcReference = {
                person_id: personId,
                name: dept_tpc_name.trim(),
                dept_tpc_email: normalizedEmail,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Check if department already exists in college's departments array
            let departmentExists = false;
            if (college.departments && Array.isArray(college.departments)) {
                const deptIndex = college.departments.findIndex(
                    dept => dept.department_id?.toString() === deptObjectId.toString() ||
                        dept.department_id?.toString() === department_id.toString()
                );

                if (deptIndex >= 0) {
                    // Department exists, add dept_tpc reference to it
                    const updateFilter = { _id: collegeFilter._id };
                    const updateData = {
                        $set: {
                            [`departments.${deptIndex}.dept_tpc`]: deptTpcReference,
                            [`departments.${deptIndex}.updated_at`]: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }
                    };

                    let updateResponse;
                    try {
                        updateResponse = await executeData(
                            collageTable,
                            updateData,
                            'u',
                            collageSchema,
                            updateFilter
                        );
                    } catch (updateError) {
                        console.error('Error updating college with DeptTPC reference:', updateError.message);
                        updateResponse = {
                            success: false,
                            error: updateError.message || 'College update failed'
                        };
                    }

                    if (!updateResponse || !updateResponse.success) {
                        // Rollback: Delete user from PersonMaster if college update fails
                        try {
                            await executeData(personTable, { person_deleted: true }, 'u', personMasterSchema, { _id: personId });
                            console.log('Rollback successful: DeptTPC user deleted from PersonMaster');
                        } catch (rollbackError) {
                            console.error('Error rolling back DeptTPC user creation:', rollbackError.message);
                        }

                        res.locals.responseData = {
                            success: false,
                            status: 500,
                            message: 'Failed to add DeptTPC reference to department',
                            error: updateResponse?.error || updateResponse?.message || 'DeptTPC account creation failed'
                        };
                        return next();
                    }
                    departmentExists = true;
                }
            }

            // If department doesn't exist in college, add it with DeptTPC reference
            if (!departmentExists) {
                const departmentEntry = {
                    _id: deptObjectId,
                    name: department.department_name || department.department_code || '',
                    department_id: deptObjectId,
                    department_name: department.department_name,
                    department_code: department.department_code,
                    dept_tpc: deptTpcReference,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const updateFilter = { _id: collegeFilter._id };
                const updateData = {
                    $push: { departments: departmentEntry },
                    $set: { updated_at: new Date().toISOString() }
                };

                const updateResponse = await executeData(
                    collageTable,
                    updateData,
                    'u',
                    collageSchema,
                    updateFilter
                );

                if (!updateResponse.success) {
                    // Rollback: Delete user from PersonMaster if college update fails
                    try {
                        await executeData(personTable, { person_deleted: true }, 'u', personMasterSchema, { _id: personId });
                    } catch (rollbackError) {
                        console.error('Error rolling back DeptTPC user creation:', rollbackError.message);
                    }

                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'Failed to add department with DeptTPC reference to college',
                        error: updateResponse.error || 'DeptTPC account creation failed'
                    };
                    return next();
                }
            }

            res.locals.responseData = {
                success: true,
                status: 201,
                message: 'Department TPC account created successfully',
                data: {
                    person_id: personId, // Primary ID from PersonMaster
                    dept_tpc_email: normalizedEmail,
                    dept_tpc_name: dept_tpc_name.trim(),
                    department_name: department.department_name,
                    collage_name: college.collage_name
                }
            };
            next();
        } catch (error) {
            console.error('Error creating Department TPC:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to create DeptTPC account',
                error: error.message
            };
            next();
        }
    }

    /**
     * Update Department TPC Account
     * POST /tpc-management/update-dept-tpc
     */
    async updateDeptTpc(req, res, next) {
        try {
            const {
                filter,
                dept_tpc_name,
                dept_tpc_email,
                dept_tpc_password,
                dept_tpc_contact,
                dept_tpc_status
            } = req.body;

            if (!filter || (!filter._id && !filter.department_id && !filter.dept_tpc_email)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Missing filter',
                    error: 'Filter with _id, department_id, or dept_tpc_email is required'
                };
                return next();
            }

            const personTable = "tblPersonMaster";
            const personMasterSchema = (await import('../schema/PersonMaster.js')).default;

            // Build filter for PersonMaster
            const userFilter = {
                person_role: 'DeptTPC',
                person_deleted: false
            };

            if (filter._id) {
                userFilter._id = typeof filter._id === 'string' && /^[0-9a-fA-F]{24}$/.test(filter._id)
                    ? new ObjectId(filter._id)
                    : filter._id;
            } else if (filter.dept_tpc_email) {
                userFilter.person_email = filter.dept_tpc_email.toLowerCase().trim();
            } else if (filter.department_id) {
                // If filtering by department_id, we need a way to link it.
                // PersonMaster stores 'department_id' (as string or ObjId)
                userFilter.department_id = filter.department_id.toString();
            }

            // Fetch existing user from PersonMaster
            const existingUserRes = await fetchData(personTable, {}, userFilter);

            if (!existingUserRes.success || !existingUserRes.data || existingUserRes.data.length === 0) {
                // Fallback: Check if user exists with ObjectId department_id if string failed
                if (filter.department_id) {
                    userFilter.department_id = typeof filter.department_id === 'string' && /^[0-9a-fA-F]{24}$/.test(filter.department_id)
                        ? new ObjectId(filter.department_id)
                        : filter.department_id;
                    const retryRes = await fetchData(personTable, {}, userFilter);
                    if (retryRes.success && retryRes.data && retryRes.data.length > 0) {
                        // Found it
                    } else {
                        res.locals.responseData = {
                            success: false,
                            status: 404,
                            message: 'Department TPC account not found',
                            error: 'DeptTPC account with provided filter does not exist'
                        };
                        return next();
                    }
                } else {
                    res.locals.responseData = {
                        success: false,
                        status: 404,
                        message: 'Department TPC account not found',
                        error: 'DeptTPC account with provided filter does not exist'
                    };
                    return next();
                }
            }

            // Get the correct user data (handling the retry case implicitly if we fetch again or just reuse if found)
            // Actually let's just fetch precisely.
            const user = existingUserRes.data && existingUserRes.data.length > 0
                ? existingUserRes.data[0]
                : (await fetchData(personTable, {}, userFilter)).data[0];

            // Check email uniqueness if changing
            if (dept_tpc_email && dept_tpc_email.toLowerCase().trim() !== user.person_email) {
                const emailCheck = await fetchData(
                    personTable,
                    { person_email: 1 },
                    {
                        person_email: dept_tpc_email.toLowerCase().trim(),
                        person_deleted: false,
                        _id: { $ne: user._id }
                    }
                );

                if (emailCheck.success && emailCheck.data && emailCheck.data.length > 0) {
                    res.locals.responseData = {
                        success: false,
                        status: 409,
                        message: 'Email already exists',
                        error: 'A user with this email already exists'
                    };
                    return next();
                }
            }

            // Prepare update data for PersonMaster
            const updateData = {};
            if (dept_tpc_name) updateData.person_name = dept_tpc_name.trim();
            if (dept_tpc_email) updateData.person_email = dept_tpc_email.toLowerCase().trim();
            if (dept_tpc_contact !== undefined) updateData.contact_number = dept_tpc_contact ? dept_tpc_contact.trim() : null;
            if (dept_tpc_status) updateData.person_status = dept_tpc_status; // Assuming status maps directly 'active'/'inactive'

            // Hash password if provided
            if (dept_tpc_password) {
                const saltRounds = 10;
                updateData.person_password = await bcrypt.hash(dept_tpc_password, saltRounds);
            }

            // Update PersonMaster
            const personUpdateResponse = await executeData(personTable, updateData, 'u', personMasterSchema, { _id: user._id });

            if (!personUpdateResponse.success) {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to update DeptTPC account',
                    error: personUpdateResponse.error || 'Update failed'
                };
                return next();
            }

            // Sync with Collage (departments array)
            const collegeId = user.person_collage_id;
            const departmentId = user.department_id;

            if (collegeId && departmentId) {
                const collegeFilter = {
                    _id: typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
                        ? new ObjectId(collegeId)
                        : collegeId,
                    deleted: false
                };

                // We need to find the correct department index
                const collegeRes = await fetchData(collageTable, { departments: 1 }, collegeFilter);
                if (collegeRes.success && collegeRes.data && collegeRes.data.length > 0) {
                    const college = collegeRes.data[0];
                    if (college.departments && Array.isArray(college.departments)) {
                        const deptIndex = college.departments.findIndex(
                            d => d.department_id?.toString() === departmentId.toString()
                        );

                        if (deptIndex >= 0) {
                            // Update the dept_tpc object inside the department
                            const collageUpdateData = {};
                            if (dept_tpc_name) collageUpdateData[`departments.${deptIndex}.dept_tpc.name`] = dept_tpc_name.trim();
                            if (dept_tpc_email) collageUpdateData[`departments.${deptIndex}.dept_tpc.dept_tpc_email`] = dept_tpc_email.toLowerCase().trim();
                            // contact not stored in dept_tpc usually, just check usage

                            collageUpdateData[`departments.${deptIndex}.updated_at`] = new Date().toISOString();
                            collageUpdateData[`updated_at`] = new Date().toISOString();

                            await executeData(collageTable, { $set: collageUpdateData }, 'u', collageSchema, collegeFilter);
                        }
                    }
                }
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Department TPC account updated successfully',
                data: {
                    dept_tpc_id: user._id,
                    dept_tpc_email: updateData.person_email || user.person_email,
                    dept_tpc_name: updateData.person_name || user.person_name
                }
            };
            next();
        } catch (error) {
            console.error('Error updating Department TPC:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to update DeptTPC account',
                error: error.message
            };
            next();
        }
    }

    /**
     * List TPC Accounts
     * POST /tpc-management/list-college-tpc
     */
    async listCollegeTpc(req, res, next) {
        try {
            const { projection, filter, options } = req.body;

            const defaultFilter = { tpc_deleted: false };
            const mergedFilter = { ...defaultFilter, ...(filter || {}) };

            const response = await fetchData(
                tpcTable,
                projection || {},
                mergedFilter,
                options || {}
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'College TPC accounts fetched successfully',
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

    /**
     * List Department TPC Accounts
     * POST /tpc-management/list-dept-tpc
     * Returns Dept TPCs from PersonMaster (single source of truth) in shape expected by frontend (department_id, dept_tpc_name, dept_tpc_email, dept_tpc_contact). Legacy tblDeptTPC is empty.
     */
    async listDeptTpc(req, res, next) {
        try {
            const personTable = 'tblPersonMaster';
            const personFilter = { person_role: { $regex: /^depttpc$/i }, person_deleted: false };
            const personProjection = { _id: 1, person_name: 1, person_email: 1, contact_number: 1, department_id: 1 };

            const personResponse = await fetchData(
                personTable,
                personProjection,
                personFilter,
                { sort: { person_name: 1 } }
            );

            const fromPersonMaster = (personResponse.success && personResponse.data ? personResponse.data : []).map(p => ({
                _id: p._id,
                department_id: p.department_id,
                dept_tpc_name: p.person_name,
                dept_tpc_email: p.person_email,
                dept_tpc_contact: p.contact_number || null
            }));

            // Legacy: merge with tblDeptTPC if any records exist
            const legacyFilter = { dept_tpc_deleted: false };
            const legacyResponse = await fetchData(deptTpcTable, {}, legacyFilter, {});
            const legacyList = legacyResponse.success && legacyResponse.data ? legacyResponse.data : [];
            const legacyIds = new Set(legacyList.map(l => l.department_id?.toString()));
            const combined = [
                ...fromPersonMaster,
                ...legacyList.filter(l => !fromPersonMaster.some(p => (p.department_id?.toString() || '') === (l.department_id?.toString() || '')))
            ];

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Department TPC accounts fetched successfully',
                data: combined
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

    /**
     * Delete College TPC Account
     * POST /tpc-management/delete-college-tpc
     */
    async deleteCollegeTpc(req, res, next) {
        try {
            const {
                person_id,  // PersonMaster._id (new structure)
                collage_id,
                tpc_email
            } = req.body;

            if (!person_id && !collage_id && !tpc_email) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Missing identifier',
                    error: 'person_id, collage_id, or tpc_email is required'
                };
                return next();
            }

            const personTable = "tblPersonMaster";
            const personMasterSchema = (await import('../schema/PersonMaster.js')).default;
            let personId = null;
            let collegeId = null;

            // Find user in PersonMaster (new structure - single source of truth)
            let userFilter = { person_deleted: false, person_role: 'TPC' };

            if (person_id) {
                userFilter._id = typeof person_id === 'string' && /^[0-9a-fA-F]{24}$/.test(person_id)
                    ? new ObjectId(person_id)
                    : person_id;
            } else if (tpc_email) {
                userFilter.person_email = tpc_email.toLowerCase().trim();
            } else if (collage_id) {
                userFilter.person_collage_id = typeof collage_id === 'string' && /^[0-9a-fA-F]{24}$/.test(collage_id)
                    ? new ObjectId(collage_id)
                    : collage_id;
            }

            const userResponse = await fetchData(
                personTable,
                { _id: 1, person_collage_id: 1, person_email: 1 },
                userFilter
            );

            if (userResponse.success && userResponse.data && userResponse.data.length > 0) {
                const user = userResponse.data[0];
                personId = user._id;
                collegeId = user.person_collage_id;
            } else {
                // Fallback: Check old tblTPC table (backward compatibility)
                const oldTpcFilter = { tpc_deleted: false };
                if (tpc_email) {
                    oldTpcFilter.tpc_email = tpc_email.toLowerCase().trim();
                } else if (collage_id) {
                    oldTpcFilter.collage_id = collage_id;
                }

                const oldTpcResponse = await fetchData(tpcTable, { _id: 1, collage_id: 1 }, oldTpcFilter);
                if (oldTpcResponse.success && oldTpcResponse.data && oldTpcResponse.data.length > 0) {
                    const oldTpc = oldTpcResponse.data[0];
                    // Soft delete in old table
                    const deleteFilter = { _id: oldTpc._id };
                    const deleteResponse = await executeData(
                        tpcTable,
                        { tpc_deleted: true, tpc_status: 'inactive' },
                        'u',
                        tpcSchema,
                        deleteFilter
                    );

                    if (deleteResponse.success) {
                        res.locals.responseData = {
                            success: true,
                            status: 200,
                            message: 'College TPC account deleted successfully',
                            data: { tpc_id: oldTpc._id }
                        };
                        return next();
                    }
                }

                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'TPC account not found',
                    error: 'TPC account with provided identifier does not exist'
                };
                return next();
            }

            // Soft delete in PersonMaster
            const deletePersonFilter = { _id: personId };
            const deletePersonResponse = await executeData(
                personTable,
                { person_deleted: true, person_status: 'inactive' },
                'u',
                personMasterSchema,
                deletePersonFilter
            );

            if (!deletePersonResponse.success) {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to delete TPC account in PersonMaster',
                    error: deletePersonResponse.error || 'Delete failed'
                };
                return next();
            }

            // Remove person_id reference from college document
            if (collegeId) {
                const collegeFilter = {
                    _id: typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
                        ? new ObjectId(collegeId)
                        : collegeId,
                    deleted: false
                };

                const updateResponse = await executeData(
                    collageTable,
                    { $pull: { tpc_users: { person_id: personId } } },
                    'u',
                    collageSchema,
                    collegeFilter
                );

                // Non-critical if college update fails (user is already deleted in PersonMaster)
                if (!updateResponse.success) {
                    console.warn('Warning: Failed to remove TPC reference from college document:', updateResponse.error);
                }
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'College TPC account deleted successfully',
                data: { person_id: personId }
            };
            next();
        } catch (error) {
            console.error('Error deleting College TPC:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to delete TPC account',
                error: error.message
            };
            next();
        }
    }

    /**
     * Delete Department TPC Account
     * POST /tpc-management/delete-dept-tpc
     */
    async deleteDeptTpc(req, res, next) {
        try {
            const {
                person_id,  // PersonMaster._id (new structure)
                department_id,
                collage_id,
                dept_tpc_email
            } = req.body;

            if (!person_id && !department_id && !dept_tpc_email) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Missing identifier',
                    error: 'person_id, department_id, or dept_tpc_email is required'
                };
                return next();
            }

            const personTable = "tblPersonMaster";
            const personMasterSchema = (await import('../schema/PersonMaster.js')).default;
            let personId = null;
            let collegeId = null;
            let departmentName = null;

            // Find user in PersonMaster (new structure - single source of truth)
            let userFilter = { person_deleted: false, person_role: 'DeptTPC' };

            if (person_id) {
                userFilter._id = typeof person_id === 'string' && /^[0-9a-fA-F]{24}$/.test(person_id)
                    ? new ObjectId(person_id)
                    : person_id;
            } else if (dept_tpc_email) {
                userFilter.person_email = dept_tpc_email.toLowerCase().trim();
            } else if (department_id) {
                // Find by department_id - need to check college documents
                const deptFilter = {
                    _id: typeof department_id === 'string' && /^[0-9a-fA-F]{24}$/.test(department_id)
                        ? new ObjectId(department_id)
                        : department_id,
                    deleted: false
                };
                const deptResponse = await fetchData(departmentTable, { _id: 1, department_name: 1 }, deptFilter);
                if (deptResponse.success && deptResponse.data && deptResponse.data.length > 0) {
                    const dept = deptResponse.data[0];
                    userFilter.department = dept.department_name;
                    if (collage_id) {
                        userFilter.person_collage_id = typeof collage_id === 'string' && /^[0-9a-fA-F]{24}$/.test(collage_id)
                            ? new ObjectId(collage_id)
                            : collage_id;
                    }
                }
            }

            const userResponse = await fetchData(
                personTable,
                { _id: 1, person_collage_id: 1, department: 1, person_email: 1 },
                userFilter
            );

            if (userResponse.success && userResponse.data && userResponse.data.length > 0) {
                const user = userResponse.data[0];
                personId = user._id;
                collegeId = user.person_collage_id;
                departmentName = user.department;
            } else {
                // Fallback: Check old tblDeptTPC table (backward compatibility)
                const oldDeptTpcFilter = { dept_tpc_deleted: false };
                if (dept_tpc_email) {
                    oldDeptTpcFilter.dept_tpc_email = dept_tpc_email.toLowerCase().trim();
                } else if (department_id) {
                    oldDeptTpcFilter.department_id = department_id;
                }

                const oldDeptTpcResponse = await fetchData(deptTpcTable, { _id: 1, collage_id: 1, department_id: 1 }, oldDeptTpcFilter);
                if (oldDeptTpcResponse.success && oldDeptTpcResponse.data && oldDeptTpcResponse.data.length > 0) {
                    const oldDeptTpc = oldDeptTpcResponse.data[0];
                    // Soft delete in old table
                    const deleteFilter = { _id: oldDeptTpc._id };
                    const deleteResponse = await executeData(
                        deptTpcTable,
                        { dept_tpc_deleted: true, dept_tpc_status: 'inactive' },
                        'u',
                        deptTpcSchema,
                        deleteFilter
                    );

                    if (deleteResponse.success) {
                        res.locals.responseData = {
                            success: true,
                            status: 200,
                            message: 'Department TPC account deleted successfully',
                            data: { dept_tpc_id: oldDeptTpc._id }
                        };
                        return next();
                    }
                }

                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Department TPC account not found',
                    error: 'DeptTPC account with provided identifier does not exist'
                };
                return next();
            }

            // Soft delete in PersonMaster
            const deletePersonFilter = { _id: personId };
            const deletePersonResponse = await executeData(
                personTable,
                { person_deleted: true, person_status: 'inactive' },
                'u',
                personMasterSchema,
                deletePersonFilter
            );

            if (!deletePersonResponse.success) {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to delete DeptTPC account in PersonMaster',
                    error: deletePersonResponse.error || 'Delete failed'
                };
                return next();
            }

            // Remove person_id reference from college document's department
            if (collegeId && departmentName) {
                const collegeFilter = {
                    _id: typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
                        ? new ObjectId(collegeId)
                        : collegeId,
                    deleted: false
                };

                // Find the department and remove dept_tpc reference
                const collegeResponse = await fetchData(
                    collageTable,
                    { _id: 1, departments: 1 },
                    collegeFilter
                );

                if (collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0) {
                    const college = collegeResponse.data[0];
                    if (college.departments && Array.isArray(college.departments)) {
                        const deptIndex = college.departments.findIndex(
                            dept => dept.department_name === departmentName &&
                                dept.dept_tpc &&
                                dept.dept_tpc.person_id?.toString() === personId.toString()
                        );

                        if (deptIndex >= 0) {
                            const updateResponse = await executeData(
                                collageTable,
                                {
                                    $unset: { [`departments.${deptIndex}.dept_tpc`]: "" },
                                    $set: { [`departments.${deptIndex}.updated_at`]: new Date().toISOString() }
                                },
                                'u',
                                collageSchema,
                                collegeFilter
                            );

                            // Non-critical if college update fails (user is already deleted in PersonMaster)
                            if (!updateResponse.success) {
                                console.warn('Warning: Failed to remove DeptTPC reference from college document:', updateResponse.error);
                            }
                        }
                    }
                }
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Department TPC account deleted successfully',
                data: { person_id: personId }
            };
            next();
        } catch (error) {
            console.error('Error deleting Department TPC:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to delete DeptTPC account',
                error: error.message
            };
            next();
        }
    }

    /**
     * Internal method to create College TPC (can be called directly)
     */
    async createCollegeTpcInternal(data) {
        try {
            const { tpc_name, tpc_email, tpc_password, tpc_contact, collage_id } = data;

            if (!tpc_name || !tpc_email || !tpc_password || !collage_id) {
                return {
                    success: false,
                    status: 400,
                    message: 'Missing required fields',
                    error: 'tpc_name, tpc_email, tpc_password, and collage_id are required'
                };
            }

            const collegeFilter = {
                _id: typeof collage_id === 'string' && /^[0-9a-fA-F]{24}$/.test(collage_id)
                    ? new ObjectId(collage_id)
                    : collage_id,
                deleted: false
            };

            const collegeCheck = await fetchData(collageTable, { _id: 1, collage_name: 1 }, collegeFilter);

            if (!collegeCheck.success || !collegeCheck.data || collegeCheck.data.length === 0) {
                return {
                    success: false,
                    status: 404,
                    message: 'College not found',
                    error: 'College with provided ID does not exist'
                };
            }

            const college = collegeCheck.data[0];

            const existingTpc = await fetchData(tpcTable, { tpc_id: 1, _id: 1 }, {
                collage_id: collage_id,
                tpc_deleted: false
            });

            if (existingTpc.success && existingTpc.data && existingTpc.data.length > 0) {
                return {
                    success: false,
                    status: 409,
                    message: 'TPC account already exists for this college',
                    error: 'A TPC account already exists for this college'
                };
            }

            const existingEmail = await fetchData(tpcTable, { tpc_email: 1 }, {
                tpc_email: tpc_email.toLowerCase().trim(),
                tpc_deleted: false
            });

            if (existingEmail.success && existingEmail.data && existingEmail.data.length > 0) {
                return {
                    success: false,
                    status: 409,
                    message: 'Email already exists',
                    error: 'A TPC account with this email already exists'
                };
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(tpc_password, saltRounds);

            // Create TPC user object to add to college's tpc_users array (dedicated _id and name)
            const tpcUser = {
                _id: new ObjectId(),
                name: tpc_name.trim(),
                tpc_name: tpc_name.trim(),
                tpc_email: tpc_email.toLowerCase().trim(),
                tpc_contact: tpc_contact ? tpc_contact.trim() : null,
                tpc_password: hashedPassword,
                tpc_status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Update college document to add TPC user to tpc_users array
            const updateFilter = { _id: collegeFilter._id };
            const updateData = {
                $push: { tpc_users: tpcUser },
                $set: { updated_at: new Date().toISOString() }
            };

            const response = await executeData(
                collageTable,
                updateData,
                'u',
                collageSchema,
                updateFilter
            );

            if (!response.success) {
                return {
                    success: false,
                    status: 500,
                    message: 'Failed to create TPC account',
                    error: response.error || 'TPC account creation failed'
                };
            }

            return {
                success: true,
                status: 201,
                message: 'College TPC account created successfully',
                data: {
                    person_id: personId, // Primary ID from PersonMaster
                    tpc_email: normalizedEmail,
                    tpc_name: tpc_name.trim(),
                    collage_name: college.collage_name
                }
            };
        } catch (error) {
            console.error('Error in createCollegeTpcInternal:', error);
            return {
                success: false,
                status: 500,
                message: 'Failed to create TPC account',
                error: error.message
            };
        }
    }

    /**
     * Internal method to update College TPC (can be called directly)
     */
    async updateCollegeTpcInternal(data) {
        try {
            const { filter, tpc_name, tpc_email, tpc_password, tpc_contact, tpc_status } = data;

            if (!filter || (!filter._id && !filter.collage_id && !filter.tpc_email)) {
                return {
                    success: false,
                    status: 400,
                    message: 'Missing filter',
                    error: 'Filter with _id, collage_id, or tpc_email is required'
                };
            }

            const processedFilter = { ...filter };
            if (processedFilter._id && typeof processedFilter._id === 'string') {
                if (/^[0-9a-fA-F]{24}$/.test(processedFilter._id)) {
                    processedFilter._id = new ObjectId(processedFilter._id);
                }
            }
            processedFilter.tpc_deleted = false;

            const existingTpc = await fetchData(tpcTable, { _id: 1, tpc_email: 1, collage_id: 1 }, processedFilter);

            if (!existingTpc.success || !existingTpc.data || existingTpc.data.length === 0) {
                return {
                    success: false,
                    status: 404,
                    message: 'TPC account not found',
                    error: 'TPC account with provided filter does not exist'
                };
            }

            const tpc = existingTpc.data[0];

            if (tpc_email && tpc_email.toLowerCase().trim() !== tpc.tpc_email) {
                const emailCheck = await fetchData(tpcTable, { tpc_email: 1 }, {
                    tpc_email: tpc_email.toLowerCase().trim(),
                    tpc_deleted: false,
                    _id: { $ne: tpc._id }
                });

                if (emailCheck.success && emailCheck.data && emailCheck.data.length > 0) {
                    return {
                        success: false,
                        status: 409,
                        message: 'Email already exists',
                        error: 'A TPC account with this email already exists'
                    };
                }
            }

            const updateData = {};
            if (tpc_name) updateData.tpc_name = tpc_name.trim();
            if (tpc_email) updateData.tpc_email = tpc_email.toLowerCase().trim();
            if (tpc_contact !== undefined) updateData.tpc_contact = tpc_contact ? tpc_contact.trim() : null;
            if (tpc_status) updateData.tpc_status = tpc_status;

            if (tpc_password) {
                const saltRounds = 10;
                updateData.tpc_password = await bcrypt.hash(tpc_password, saltRounds);
            }

            const updateFilter = { _id: tpc._id };
            const response = await executeData(tpcTable, updateData, 'u', tpcSchema, updateFilter);

            if (!response.success) {
                return {
                    success: false,
                    status: 500,
                    message: 'Failed to update TPC account',
                    error: response.error || 'TPC account update failed'
                };
            }

            return {
                success: true,
                status: 200,
                message: 'College TPC account updated successfully',
                data: {
                    tpc_id: tpc._id,
                    tpc_email: updateData.tpc_email || tpc.tpc_email,
                    tpc_name: updateData.tpc_name || tpc.tpc_name
                }
            };
        } catch (error) {
            console.error('Error in updateCollegeTpcInternal:', error);
            return {
                success: false,
                status: 500,
                message: 'Failed to update TPC account',
                error: error.message
            };
        }
    }

    /**
     * Internal method to create Department TPC (can be called directly)
     */
    async createDeptTpcInternal(data) {
        try {
            const { dept_tpc_name, dept_tpc_email, dept_tpc_password, dept_tpc_contact, department_id, collage_id } = data;

            if (!dept_tpc_name || !dept_tpc_email || !dept_tpc_password || !department_id || !collage_id) {
                return {
                    success: false,
                    status: 400,
                    message: 'Missing required fields',
                    error: 'dept_tpc_name, dept_tpc_email, dept_tpc_password, department_id, and collage_id are required'
                };
            }

            const deptFilter = {
                _id: typeof department_id === 'string' && /^[0-9a-fA-F]{24}$/.test(department_id)
                    ? new ObjectId(department_id)
                    : department_id,
                deleted: false
            };

            const deptCheck = await fetchData(departmentTable, { _id: 1, department_name: 1, department_code: 1, department_college_id: 1 }, deptFilter);

            if (!deptCheck.success || !deptCheck.data || deptCheck.data.length === 0) {
                return {
                    success: false,
                    status: 404,
                    message: 'Department not found',
                    error: 'Department with provided ID does not exist'
                };
            }

            const department = deptCheck.data[0];

            const collegeFilter = {
                _id: typeof collage_id === 'string' && /^[0-9a-fA-F]{24}$/.test(collage_id)
                    ? new ObjectId(collage_id)
                    : collage_id,
                deleted: false
            };

            const collegeCheck = await fetchData(collageTable, { _id: 1, collage_name: 1 }, collegeFilter);

            if (!collegeCheck.success || !collegeCheck.data || collegeCheck.data.length === 0) {
                return {
                    success: false,
                    status: 404,
                    message: 'College not found',
                    error: 'College with provided ID does not exist'
                };
            }

            const college = collegeCheck.data[0];
            const normalizedEmail = dept_tpc_email.toLowerCase().trim();
            const deptObjectId = deptFilter._id;

            // Check if department already has a DeptTPC in college's departments array (NEW STRUCTURE)
            if (college.departments && Array.isArray(college.departments)) {
                const existingDept = college.departments.find(
                    dept => (dept.department_id?.toString() === deptObjectId.toString() ||
                        dept.department_id?.toString() === department_id.toString()) &&
                        dept.dept_tpc &&
                        dept.dept_tpc.dept_tpc_status !== 'inactive'
                );

                if (existingDept) {
                    return {
                        success: false,
                        status: 409,
                        message: 'Department TPC account already exists for this department',
                        error: 'A DeptTPC account already exists for this department'
                    };
                }
            }

            // Check if email exists in any college's departments array
            const existingEmailCheck = await fetchData(
                collageTable,
                { _id: 1, collage_name: 1 },
                {
                    'departments.dept_tpc.dept_tpc_email': normalizedEmail,
                    deleted: false
                }
            );

            if (existingEmailCheck.success && existingEmailCheck.data && existingEmailCheck.data.length > 0) {
                return {
                    success: false,
                    status: 409,
                    message: 'Email already exists in another college',
                    error: 'A DeptTPC account with this email already exists'
                };
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(dept_tpc_password, saltRounds);

            // STEP 1: Create user in tblPersonMaster FIRST (single source of truth)
            const personTable = "tblPersonMaster";
            const personMasterSchema = (await import('../schema/PersonMaster.js')).default;

            const deptTpcUserData = {
                person_name: dept_tpc_name.trim(),
                person_email: normalizedEmail,
                person_role: 'DeptTPC',
                person_password: hashedPassword,
                person_status: 'active',
                person_deleted: false,
                person_collage_id: collage_id,
                college_name: college.collage_name,
                department: department.department_name?.trim() || department.department_code?.trim() || null,
                department_id: (deptObjectId?.toString?.() || deptObjectId || department_id?.toString?.() || department_id || null),
                contact_number: dept_tpc_contact ? dept_tpc_contact.trim() : null,
            };

            const personResponse = await executeData(personTable, deptTpcUserData, 'i', personMasterSchema);

            if (!personResponse.success) {
                return {
                    success: false,
                    status: 500,
                    message: 'Failed to create DeptTPC user in PersonMaster',
                    error: personResponse.error || 'DeptTPC account creation failed'
                };
            }

            // Get the PersonMaster._id (this is the PRIMARY ID used everywhere)
            const personId = personResponse.data?.insertedId || personResponse.data?._id;

            // STEP 2: Add reference to college document (person_id + name + email for display in DB/UI)
            const deptTpcReference = {
                person_id: personId,
                name: dept_tpc_name.trim(),
                dept_tpc_email: normalizedEmail,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Check if department already exists in college's departments array
            let departmentExists = false;
            let deptIndex = -1;

            if (college.departments && Array.isArray(college.departments)) {
                deptIndex = college.departments.findIndex(
                    dept => dept.department_id?.toString() === deptObjectId.toString() ||
                        dept.department_id?.toString() === department_id.toString()
                );

                if (deptIndex >= 0) {
                    // Department exists, add dept_tpc reference to it
                    const updateFilter = { _id: collegeFilter._id };
                    const updateData = {
                        $set: {
                            [`departments.${deptIndex}.dept_tpc`]: deptTpcReference,
                            [`departments.${deptIndex}.updated_at`]: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }
                    };

                    const response = await executeData(
                        collageTable,
                        updateData,
                        'u',
                        collageSchema,
                        updateFilter
                    );

                    if (!response.success) {
                        // Rollback: Delete user from PersonMaster if college update fails
                        try {
                            await executeData(personTable, { person_deleted: true }, 'u', personMasterSchema, { _id: personId });
                        } catch (rollbackError) {
                            console.error('Error rolling back DeptTPC user creation:', rollbackError.message);
                        }

                        return {
                            success: false,
                            status: 500,
                            message: 'Failed to add DeptTPC reference to department',
                            error: response.error || 'DeptTPC account creation failed'
                        };
                    }
                    departmentExists = true;
                }
            }

            // If department doesn't exist in college, add it with DeptTPC reference
            if (!departmentExists) {
                const departmentEntry = {
                    _id: deptObjectId,
                    name: department.department_name || department.department_code || '',
                    department_id: deptObjectId,
                    department_name: department.department_name,
                    department_code: department.department_code,
                    dept_tpc: deptTpcReference,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const updateFilter = { _id: collegeFilter._id };
                const updateData = {
                    $push: { departments: departmentEntry },
                    $set: { updated_at: new Date().toISOString() }
                };

                const response = await executeData(
                    collageTable,
                    updateData,
                    'u',
                    collageSchema,
                    updateFilter
                );

                if (!response.success) {
                    // Rollback: Delete user from PersonMaster if college update fails
                    try {
                        await executeData(personTable, { person_deleted: true }, 'u', personMasterSchema, { _id: personId });
                    } catch (rollbackError) {
                        console.error('Error rolling back DeptTPC user creation:', rollbackError.message);
                    }

                    return {
                        success: false,
                        status: 500,
                        message: 'Failed to add department with DeptTPC reference to college',
                        error: response.error || 'DeptTPC account creation failed'
                    };
                }
            }

            return {
                success: true,
                status: 201,
                message: 'Department TPC account created successfully',
                data: {
                    person_id: personId, // Primary ID from PersonMaster
                    dept_tpc_email: normalizedEmail,
                    dept_tpc_name: dept_tpc_name.trim(),
                    department_name: department.department_name,
                    collage_name: college.collage_name
                }
            };
        } catch (error) {
            console.error('Error in createDeptTpcInternal:', error);
            return {
                success: false,
                status: 500,
                message: 'Failed to create DeptTPC account',
                error: error.message
            };
        }
    }
}
