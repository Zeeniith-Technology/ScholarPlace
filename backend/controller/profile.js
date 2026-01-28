import { executeData, fetchData } from '../methods.js';
import personMasterSchema from '../schema/PersonMaster.js';
import tpcSchema from '../schema/tpc.js';
import deptTpcSchema from '../schema/deptTpc.js';
import bcrypt from 'bcrypt';

export default class profileController {

    /**
     * Get user profile
     * Route: GET /profile
     */
    async getProfile(req, res, next) {
        try {
            // Check if auth middleware already set an error response
            if (res.locals.responseData && !res.locals.responseData.success) {
                console.log('[Profile] Auth middleware already set error response, skipping');
                return next();
            }
            
            // Get userId from multiple possible sources
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const userRole = req.user?.role;
            
            console.log('[Profile] Request:', { 
                userId, 
                userRole, 
                user: req.user,
                hasResponseData: !!res.locals.responseData,
                userIdSource: {
                    reqUserId: req.userId,
                    reqUser_id: req.user?.id,
                    reqUser_userId: req.user?.userId,
                    reqUser_person_id: req.user?.person_id,
                    header: req.headers['x-user-id']
                }
            });
            
            if (!userId) {
                console.log('[Profile] No userId found, returning error');
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            // Handle superadmin users (not stored in database)
            // Check both userRole from JWT and userId for superadmin (case-insensitive)
            const isSuperadmin = (userRole && userRole.toLowerCase() === 'superadmin') || 
                                userId === 'superadmin-dev' || 
                                userId?.toString() === 'superadmin-dev';
            
            console.log('[Profile] Checking superadmin:', { 
                userRole, 
                userId, 
                isSuperadmin,
                userObject: req.user 
            });
            
            if (isSuperadmin) {
                console.log('[Profile] Superadmin detected, returning superadmin profile');
                const profileData = {
                    id: userId,
                    name: req.user?.name || 'Super Admin',
                    email: req.user?.email || '',
                    role: 'superadmin',  // Explicitly set role
                    person_role: 'superadmin',  // Also include person_role for compatibility
                    status: 'active',
                    contact_number: '',
                    department: '',
                    semester: null,
                    enrollment_number: '',
                    college_name: '',
                    last_login: null,
                    createdAt: null,
                    updatedAt: null
                };

                console.log('[Profile] Returning profile data:', profileData);

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Profile fetched successfully',
                    data: profileData
                };
                return next();
            }

            // Normalize role for comparison (case-insensitive)
            const normalizedUserRole = userRole?.toLowerCase();
            
            // First, try to fetch from tblPersonMaster (single source of truth for all users)
            const { ObjectId } = await import('mongodb');
            const userIdFilter = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)
                ? { _id: new ObjectId(userId), person_deleted: false }
                : { _id: userId, person_deleted: false };

            let response = await fetchData(
                'tblPersonMaster',
                {},
                userIdFilter,
                {}
            );

            // If found in PersonMaster, use it (works for all roles including TPC/DeptTPC)
            if (response.success && response.data && response.data.length > 0) {
                const user = response.data[0];
                const profileData = {
                    id: user._id || user.person_id,
                    name: user.person_name,
                    email: user.person_email,
                    role: user.person_role,
                    person_role: user.person_role,
                    status: user.person_status,
                    contact_number: user.contact_number || '',
                    department: user.department || '',
                    semester: user.semester || null,
                    enrollment_number: user.enrollment_number || '',
                    college_name: user.college_name || '',
                    college_id: user.person_collage_id,
                    last_login: user.last_login || null,
                    createdAt: user.createdAt || user.created_at,
                    updatedAt: user.updatedAt || user.updated_at
                };

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Profile fetched successfully',
                    data: profileData
                };
                return next();
            }

            // Fallback: Check old tblTPC table (backward compatibility for legacy data)
            if (normalizedUserRole === 'tpc') {
                const tpcUserIdFilter = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)
                    ? { _id: new ObjectId(userId), tpc_deleted: false }
                    : { _id: userId, tpc_deleted: false };

                const tpcResponse = await fetchData(
                    'tblTPC',
                    {},
                    tpcUserIdFilter,
                    {}
                );

                if (tpcResponse.success && tpcResponse.data && tpcResponse.data.length > 0) {
                    const tpcUser = tpcResponse.data[0];
                    const profileData = {
                        id: tpcUser._id,
                        name: tpcUser.tpc_name,
                        email: tpcUser.tpc_email,
                        role: 'TPC',
                        person_role: 'TPC',
                        status: tpcUser.tpc_status || 'active',
                        contact_number: tpcUser.tpc_contact || '',
                        department: '',
                        semester: null,
                        enrollment_number: '',
                        college_name: tpcUser.collage_name || '',
                        college_id: tpcUser.collage_id,
                        last_login: tpcUser.updated_at || null,
                        createdAt: tpcUser.created_at || null,
                        updatedAt: tpcUser.updated_at || null
                    };

                    res.locals.responseData = {
                        success: true,
                        status: 200,
                        message: 'Profile fetched successfully',
                        data: profileData
                    };
                    return next();
                }
            }

            // Fallback: Check old tblDeptTPC table (backward compatibility for legacy data)
            if (normalizedUserRole === 'depttpc') {
                const deptTpcUserIdFilter = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)
                    ? { _id: new ObjectId(userId), dept_tpc_deleted: false }
                    : { _id: userId, dept_tpc_deleted: false };

                const deptTpcResponse = await fetchData('tblDeptTPC', {}, deptTpcUserIdFilter, {});
                if (deptTpcResponse.success && deptTpcResponse.data && deptTpcResponse.data.length > 0) {
                    const deptTpcUser = deptTpcResponse.data[0];
                    const profileData = {
                        id: deptTpcUser._id,
                        name: deptTpcUser.dept_tpc_name,
                        email: deptTpcUser.dept_tpc_email,
                        role: 'DeptTPC',
                        person_role: 'DeptTPC',
                        status: deptTpcUser.dept_tpc_status || 'active',
                        contact_number: deptTpcUser.dept_tpc_contact || '',
                        department: deptTpcUser.department_name || '',
                        semester: null,
                        enrollment_number: '',
                        college_name: deptTpcUser.collage_name || '',
                        college_id: deptTpcUser.collage_id,
                        last_login: deptTpcUser.updated_at || null,
                        createdAt: deptTpcUser.created_at || null,
                        updatedAt: deptTpcUser.updated_at || null
                    };
                    res.locals.responseData = {
                        success: true,
                        status: 200,
                        message: 'Profile fetched successfully',
                        data: profileData
                    };
                    return next();
                }
            }

            // If not found anywhere, return error
            res.locals.responseData = {
                success: false,
                status: 404,
                message: 'User not found',
                error: 'Profile not found'
            };
            return next();
            
            // Don't send password
            const profileData = {
                id: user._id || user.person_id,
                name: user.person_name,
                email: user.person_email,
                role: user.person_role,
                person_role: user.person_role,  // Also include person_role for consistency
                status: user.person_status,
                contact_number: user.contact_number || '',
                department: user.department || '',
                semester: user.semester || null,
                enrollment_number: user.enrollment_number || '',
                college_name: user.college_name || '',
                last_login: user.last_login || null,
                createdAt: user.createdAt || user.created_at,
                updatedAt: user.updatedAt || user.updated_at
            };

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Profile fetched successfully',
                data: profileData
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch profile',
                error: error.message
            };
            next();
        }
    }

    /**
     * Update user profile
     * Route: POST /profile/update
     */
    async updateProfile(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const userRole = req.user?.role;
            const updateData = req.body;
            
            console.log('[Profile Update] Request:', { userId, userRole, updateData });
            
            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            // Handle superadmin (cannot update)
            const isSuperadmin = (userRole && userRole.toLowerCase() === 'superadmin') || 
                                userId === 'superadmin-dev' || 
                                userId?.toString() === 'superadmin-dev';
            
            if (isSuperadmin) {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Superadmin profile cannot be updated',
                    error: 'Superadmin profile is read-only'
                };
                return next();
            }

            // Normalize role for comparison
            const normalizedUserRole = userRole?.toLowerCase();

            // Handle TPC users
            if (normalizedUserRole === 'tpc') {
                const { ObjectId } = await import('mongodb');
                const userIdFilter = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)
                    ? { _id: new ObjectId(userId), tpc_deleted: false }
                    : { _id: userId, tpc_deleted: false };

                // Map frontend field names to TPC database field names
                const mappedData = {};
                
                if (updateData.name !== undefined) {
                    mappedData.tpc_name = updateData.name;
                }
                if (updateData.phone !== undefined || updateData.contact_number !== undefined) {
                    mappedData.tpc_contact = updateData.phone || updateData.contact_number;
                }
                // Email and college cannot be updated
                
                if (Object.keys(mappedData).length === 0) {
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: 'No valid fields to update',
                        error: 'Please provide at least one field to update'
                    };
                    return next();
                }

                // Update TPC profile
                const response = await executeData(
                    'tblTPC',
                    mappedData,
                    'u',
                    tpcSchema,
                    userIdFilter
                );

                if (!response.success) {
                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'Failed to update profile',
                        error: response.error || 'Update failed'
                    };
                    return next();
                }

                // Fetch updated profile
                const updatedProfile = await fetchData(
                    'tblTPC',
                    {},
                    userIdFilter,
                    {}
                );

                if (!updatedProfile.success || !updatedProfile.data || updatedProfile.data.length === 0) {
                    res.locals.responseData = {
                        success: false,
                        status: 404,
                        message: 'Profile not found after update',
                        error: 'Failed to fetch updated profile'
                    };
                    return next();
                }

                const tpcUser = updatedProfile.data[0];
                const profileData = {
                    id: tpcUser._id,
                    name: tpcUser.tpc_name,
                    email: tpcUser.tpc_email,
                    role: 'TPC',
                    person_role: 'TPC',
                    status: tpcUser.tpc_status || 'active',
                    contact_number: tpcUser.tpc_contact || '',
                    department: '',
                    semester: null,
                    enrollment_number: '',
                    college_name: tpcUser.collage_name || '',
                    college_id: tpcUser.collage_id,
                    last_login: tpcUser.updated_at || null,
                    updatedAt: tpcUser.updated_at || null
                };

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Profile updated successfully',
                    data: profileData
                };
                return next();
            }

            // Handle DeptTPC users
            if (normalizedUserRole === 'depttpc') {
                const { ObjectId } = await import('mongodb');
                const userIdFilter = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)
                    ? { _id: new ObjectId(userId), dept_tpc_deleted: false }
                    : { _id: userId, dept_tpc_deleted: false };

                // Map frontend field names to DeptTPC database field names
                const mappedData = {};
                
                if (updateData.name !== undefined) {
                    mappedData.dept_tpc_name = updateData.name;
                }
                if (updateData.phone !== undefined || updateData.contact_number !== undefined) {
                    mappedData.dept_tpc_contact = updateData.phone || updateData.contact_number;
                }
                // Email and college cannot be updated
                
                if (Object.keys(mappedData).length === 0) {
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: 'No valid fields to update',
                        error: 'Please provide at least one field to update'
                    };
                    return next();
                }

                // Update DeptTPC profile
                const response = await executeData(
                    'tblDeptTPC',
                    mappedData,
                    'u',
                    deptTpcSchema,
                    userIdFilter
                );

                if (!response.success) {
                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'Failed to update profile',
                        error: response.error || 'Update failed'
                    };
                    return next();
                }

                // Fetch updated profile
                const updatedProfile = await fetchData(
                    'tblDeptTPC',
                    {},
                    userIdFilter,
                    {}
                );

                if (!updatedProfile.success || !updatedProfile.data || updatedProfile.data.length === 0) {
                    res.locals.responseData = {
                        success: false,
                        status: 404,
                        message: 'Profile not found after update',
                        error: 'Failed to fetch updated profile'
                    };
                    return next();
                }

                const deptTpcUser = updatedProfile.data[0];
                const profileData = {
                    id: deptTpcUser._id,
                    name: deptTpcUser.dept_tpc_name,
                    email: deptTpcUser.dept_tpc_email,
                    role: 'DeptTPC',
                    person_role: 'DeptTPC',
                    status: deptTpcUser.dept_tpc_status || 'active',
                    contact_number: deptTpcUser.dept_tpc_contact || '',
                    department: deptTpcUser.department_name || '',
                    semester: null,
                    enrollment_number: '',
                    college_name: deptTpcUser.collage_name || '',
                    college_id: deptTpcUser.collage_id,
                    last_login: deptTpcUser.updated_at || null,
                    updatedAt: deptTpcUser.updated_at || null
                };

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Profile updated successfully',
                    data: profileData
                };
                return next();
            }

            // Handle regular users (Students, etc.) - update tblPersonMaster
            // Map frontend field names to database field names
            const mappedData = {
                person_name: updateData.name || updateData.fullName,
                contact_number: updateData.phone || updateData.contact_number,
                department: updateData.department,
                semester: updateData.semester ? parseInt(updateData.semester) : undefined,
                enrollment_number: updateData.enrollmentNumber || updateData.enrollment_number,
                updatedAt: new Date().toISOString()
            };

            // Remove undefined values
            Object.keys(mappedData).forEach(key => {
                if (mappedData[key] === undefined) {
                    delete mappedData[key];
                }
            });

            if (Object.keys(mappedData).length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'No valid fields to update',
                    error: 'Please provide at least one field to update'
                };
                return next();
            }

            // Update user profile
            const response = await executeData(
                'tblPersonMaster',
                mappedData,
                'u',
                personMasterSchema,
                { _id: userId }
            );

            if (!response.success) {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to update profile',
                    error: response.error || 'Update failed'
                };
                return next();
            }

            // Fetch updated profile
            const updatedProfile = await fetchData(
                'tblPersonMaster',
                {},
                { _id: userId },
                {}
            );

            if (!updatedProfile.success || !updatedProfile.data || updatedProfile.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Profile not found after update',
                    error: 'Failed to fetch updated profile'
                };
                return next();
            }

            const user = updatedProfile.data[0];
            const profileData = {
                id: user._id || user.person_id,
                name: user.person_name,
                email: user.person_email,
                role: user.person_role,
                person_role: user.person_role,
                status: user.person_status,
                contact_number: user.contact_number || '',
                department: user.department || '',
                semester: user.semester || null,
                enrollment_number: user.enrollment_number || '',
                college_name: user.college_name || '',
                last_login: user.last_login || null,
                updatedAt: user.updatedAt || user.updated_at
            };

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Profile updated successfully',
                data: profileData
            };
            next();
        } catch (error) {
            console.error('[Profile Update] Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to update profile',
                error: error.message
            };
            next();
        }
    }

    /**
     * Change password
     * Route: POST /profile/change-password
     */
    async changePassword(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const userRole = req.user?.role;
            const { currentPassword, newPassword, confirmPassword } = req.body;
            
            console.log('[Change Password] Request:', { userId, userRole });
            
            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (!currentPassword || !newPassword) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Current password and new password are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            if (confirmPassword && newPassword !== confirmPassword) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'New passwords do not match',
                    error: 'Password confirmation failed'
                };
                return next();
            }

            if (newPassword.length < 6) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Password must be at least 6 characters long',
                    error: 'Password too short'
                };
                return next();
            }

            // Handle superadmin (cannot change password)
            const isSuperadmin = (userRole && userRole.toLowerCase() === 'superadmin') || 
                                userId === 'superadmin-dev' || 
                                userId?.toString() === 'superadmin-dev';
            
            if (isSuperadmin) {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Superadmin password cannot be changed',
                    error: 'Superadmin password is read-only'
                };
                return next();
            }

            // Normalize role for comparison
            const normalizedUserRole = userRole?.toLowerCase();

            // Handle TPC users
            if (normalizedUserRole === 'tpc') {
                const { ObjectId } = await import('mongodb');
                const userIdFilter = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)
                    ? { _id: new ObjectId(userId), tpc_deleted: false }
                    : { _id: userId, tpc_deleted: false };

                // Fetch TPC user to verify current password
                const userResponse = await fetchData(
                    'tblTPC',
                    {},
                    userIdFilter,
                    {}
                );

                if (!userResponse.success || !userResponse.data || userResponse.data.length === 0) {
                    res.locals.responseData = {
                        success: false,
                        status: 404,
                        message: 'User not found',
                        error: 'Profile not found'
                    };
                    return next();
                }

                const tpcUser = userResponse.data[0];

                // Verify current password
                const isPasswordValid = await bcrypt.compare(currentPassword, tpcUser.tpc_password);
                if (!isPasswordValid) {
                    res.locals.responseData = {
                        success: false,
                        status: 401,
                        message: 'Current password is incorrect',
                        error: 'Invalid current password'
                    };
                    return next();
                }

                // Hash new password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

                // Update password
                const response = await executeData(
                    'tblTPC',
                    {
                        tpc_password: hashedPassword,
                        updated_at: new Date().toISOString()
                    },
                    'u',
                    tpcSchema,
                    userIdFilter
                );

                if (!response.success) {
                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'Failed to change password',
                        error: response.error || 'Password update failed'
                    };
                    return next();
                }

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Password changed successfully',
                    data: {}
                };
                return next();
            }

            // Handle DeptTPC users
            if (normalizedUserRole === 'depttpc') {
                const { ObjectId } = await import('mongodb');
                const userIdFilter = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)
                    ? { _id: new ObjectId(userId), dept_tpc_deleted: false }
                    : { _id: userId, dept_tpc_deleted: false };

                // Fetch DeptTPC user to verify current password
                const userResponse = await fetchData(
                    'tblDeptTPC',
                    {},
                    userIdFilter,
                    {}
                );

                if (!userResponse.success || !userResponse.data || userResponse.data.length === 0) {
                    res.locals.responseData = {
                        success: false,
                        status: 404,
                        message: 'User not found',
                        error: 'Profile not found'
                    };
                    return next();
                }

                const deptTpcUser = userResponse.data[0];

                // Verify current password
                const isPasswordValid = await bcrypt.compare(currentPassword, deptTpcUser.dept_tpc_password);
                if (!isPasswordValid) {
                    res.locals.responseData = {
                        success: false,
                        status: 401,
                        message: 'Current password is incorrect',
                        error: 'Invalid current password'
                    };
                    return next();
                }

                // Hash new password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

                // Update password
                const response = await executeData(
                    'tblDeptTPC',
                    {
                        dept_tpc_password: hashedPassword,
                        updated_at: new Date().toISOString()
                    },
                    'u',
                    deptTpcSchema,
                    userIdFilter
                );

                if (!response.success) {
                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'Failed to change password',
                        error: response.error || 'Password update failed'
                    };
                    return next();
                }

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Password changed successfully',
                    data: {}
                };
                return next();
            }

            // Handle regular users (Students, etc.) - update tblPersonMaster
            // Fetch user to verify current password
            const userResponse = await fetchData(
                'tblPersonMaster',
                {},
                { _id: userId, person_deleted: false },
                {}
            );

            if (!userResponse.success || !userResponse.data || userResponse.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'Profile not found'
                };
                return next();
            }

            const user = userResponse.data[0];

            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.person_password);
            if (!isPasswordValid) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Current password is incorrect',
                    error: 'Invalid current password'
                };
                return next();
            }

            // Hash new password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

            // Update password
            const response = await executeData(
                'tblPersonMaster',
                {
                    person_password: hashedPassword,
                    updatedAt: new Date().toISOString()
                },
                'u',
                personMasterSchema,
                { _id: userId }
            );

            if (!response.success) {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to change password',
                    error: response.error || 'Password update failed'
                };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Password changed successfully',
                data: {}
            };
            next();
        } catch (error) {
            console.error('[Change Password] Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to change password',
                error: error.message
            };
            next();
        }
    }
}
