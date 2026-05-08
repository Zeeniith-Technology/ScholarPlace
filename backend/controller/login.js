import { fetchData, executeData } from '../methods.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

export default class logincontroller {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Email and password are required',
                    error: 'Missing credentials'
                };
                return next();
            }

            // Normalize email to lowercase for case-insensitive matching
            // Emails are stored in lowercase in database (from signup)
            const normalizedEmail = email.toLowerCase().trim();

            // STRICTLY use tblPersonMaster as single source of truth for ALL users
            // All users (Student, TPC, DeptTPC, Superadmin) must be in PersonMaster
            const response = await fetchData(
                'tblPersonMaster',
                {}, // projection - get all fields
                {
                    person_email: normalizedEmail,
                    person_deleted: false,
                    person_status: 'active'
                }
            );

            let user = null;
            let userTable = 'tblPersonMaster';
            let detectedUserRole = null;

            // Check if user exists in PersonMaster
            if (response.success && response.data && response.data.length > 0) {
                // User found in PersonMaster - use it (STRICT PersonMaster-only login)
                user = response.data[0];
                detectedUserRole = user.person_role;
                console.log('[Login] User found in PersonMaster:', {
                    _id: user._id,
                    email: user.person_email,
                    role: user.person_role,
                    college_id: user.person_collage_id,
                    department: user.department,
                    department_id: user.department_id
                });
            } else {
                // User not found in PersonMaster - reject login (no fallback to old tables)
                // This enforces strict PersonMaster-only authentication
                console.log('[Login] User not found in PersonMaster:', {
                    email: normalizedEmail,
                    responseSuccess: response.success,
                    dataLength: response.data?.length || 0
                });
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Invalid email or password',
                    error: 'User not found in PersonMaster. Please ensure your account is migrated to PersonMaster.'
                };
                return next();
            }

            // Fetch college data AND verify password concurrently to save ~100-200ms
            const userPassword = user.person_password || user.tpc_password || user.dept_tpc_password;
            if (!userPassword) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Invalid email or password',
                    error: 'User password not found'
                };
                return next();
            }

            const collegeIdForValidation = user.person_collage_id || user.collage_id;
            let collegePromise = Promise.resolve({ success: true, data: [] });
            
            if (collegeIdForValidation) {
                const { ObjectId } = await import('mongodb');
                const collegeFilter = typeof collegeIdForValidation === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeIdForValidation)
                    ? { _id: new ObjectId(collegeIdForValidation), deleted: false }
                    : { _id: collegeIdForValidation, deleted: false };

                // Fetch all needed fields in ONE query
                collegePromise = fetchData(
                    'tblCollage',
                    { _id: 1, collage_status: 1, collage_subscription_status: 1, collage_name: 1, departments: 1, collage_departments: 1 },
                    collegeFilter
                );
            }

            const bcryptPromise = bcrypt.compare(password, userPassword);

            // Await both operations concurrently
            const [collegeResponse, isValidPassword] = await Promise.all([collegePromise, bcryptPromise]);

            if (!isValidPassword) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Invalid email or password',
                    error: 'Invalid password'
                };
                return next();
            }

            // Verify college and extract details
            let collegeName = user.college_name || user.collage_name;
            let collegeId = collegeIdForValidation;
            let departmentId = user.department_id || null;
            let departmentName = user.department || null;
            const finalUserRole = detectedUserRole || user.person_role;

            if (collegeIdForValidation && collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0) {
                const college = collegeResponse.data[0];

                if (college.collage_status !== 1) {
                    res.locals.responseData = {
                        success: false,
                        status: 403,
                        message: 'Your college account is currently inactive. Please contact administrator.',
                        error: 'College inactive'
                    };
                    return next();
                }

                if (college.collage_subscription_status !== 'active') {
                    res.locals.responseData = {
                        success: false,
                        status: 403,
                        message: 'Your college subscription is inactive. Please contact administrator.',
                        error: 'College subscription inactive'
                    };
                    return next();
                }

                if (!collegeName && college.collage_name) {
                    collegeName = college.collage_name;
                }

                // Resolve department_id efficiently from the pre-fetched college data
                if ((finalUserRole === 'DeptTPC' || finalUserRole === 'Student') && !departmentId && departmentName) {
                    if (college.departments && Array.isArray(college.departments)) {
                        const trimmedDeptName = departmentName.trim();
                        const matchingDept = college.departments.find(dept => {
                            const deptName = (dept.department_name || '').trim();
                            const deptCode = (dept.department_code || '').trim();
                            return deptName.toLowerCase() === trimmedDeptName.toLowerCase() ||
                                deptCode.toLowerCase() === trimmedDeptName.toLowerCase();
                        });

                        if (matchingDept && matchingDept.department_id) {
                            departmentId = matchingDept.department_id?.toString?.() || matchingDept.department_id || null;
                        }
                    }
                }
            } else if ((finalUserRole === 'TPC' || finalUserRole === 'DeptTPC') && !collegeIdForValidation) {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Your account is not associated with any college. Please contact administrator.',
                    error: 'College association missing'
                };
                return next();
            }

            // Generate JWT token
            const secret = process.env.JWT_SECRET || 'your-secret-key';
            const token = jwt.sign(
                {
                    id: user._id,
                    email: user.person_email,
                    role: finalUserRole,
                    name: user.person_name,
                    department: departmentName || null,
                    department_id: departmentId || null,
                    college_name: collegeName || null,
                    college_id: collegeId || null
                },
                secret,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            // Update last login in PersonMaster without blocking the response
            executeData(
                'tblPersonMaster',
                { last_login: new Date().toISOString() },
                'u',
                null,
                { person_email: normalizedEmail }
            ).catch(err => console.error('[Login] Failed to update last_login:', err));

            // Prepare response (include token for JWT-based authentication)
            // All fields come from PersonMaster (single source of truth)
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Login successful',
                data: {
                    token: token, // Include JWT token in response
                    user: {
                        id: user._id, // PersonMaster._id
                        name: user.person_name,
                        email: user.person_email,
                        role: finalUserRole,
                        status: user.person_status
                    }
                }
            };

            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Login failed',
                error: error.message
            };
            next();
        }
    }
}

