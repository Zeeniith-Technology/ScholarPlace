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

            // Check if user's college is active and subscription is active
            // For TPC/DeptTPC, use collage_id directly; for PersonMaster, use person_collage_id
            const collegeIdForValidation = user.person_collage_id || user.collage_id;
            if (collegeIdForValidation) {
                const { ObjectId } = await import('mongodb');
                const collegeFilter = typeof collegeIdForValidation === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeIdForValidation)
                    ? { _id: new ObjectId(collegeIdForValidation), deleted: false }
                    : { _id: collegeIdForValidation, deleted: false };
                
                const collegeResponse = await fetchData(
                    'tblCollage',
                    { _id: 1, collage_status: 1, collage_subscription_status: 1, collage_name: 1 },
                    collegeFilter
                );

                if (collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0) {
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
                    
                    // Update college info in user object
                    if (!user.college_name && college.collage_name) {
                        user.college_name = college.collage_name;
                    }
                }
            }

            // Verify password hash
            // Password field name varies by table: person_password, tpc_password, dept_tpc_password
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

            console.log('[Login] Verifying password for user:', { 
                email: user.person_email || user.tpc_email || user.dept_tpc_email,
                role: detectedUserRole || user.person_role,
                hasPassword: !!userPassword,
                passwordLength: userPassword?.length || 0
            });
            
            const isValidPassword = await bcrypt.compare(password, userPassword);
            console.log('[Login] Password verification result:', isValidPassword);
            
            if (!isValidPassword) {
                console.log('[Login] Password verification failed');
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Invalid email or password',
                    error: 'Invalid password'
                };
                return next();
            }
            
            console.log('[Login] Password verified successfully');

            // Verify college membership for TPC and DeptTPC roles
            const userRole = detectedUserRole || user.person_role;
            if (userRole === 'TPC' || userRole === 'DeptTPC') {
                const collegeIdForCheck = user.person_collage_id || user.collage_id;
                if (!collegeIdForCheck) {
                    res.locals.responseData = {
                        success: false,
                        status: 403,
                        message: 'Your account is not associated with any college. Please contact administrator.',
                        error: 'College association missing'
                    };
                    return next();
                }
            }

            // Get college name and resolve department_id if needed
            let collegeName = user.college_name || user.collage_name;
            let collegeId = user.person_collage_id || user.collage_id;
            let departmentId = user.department_id || null;
            let departmentName = user.department || null;
            
            // For DeptTPC/Student: If department_id is missing but department name exists, try to resolve it
            const finalUserRole = detectedUserRole || user.person_role;
            if ((finalUserRole === 'DeptTPC' || finalUserRole === 'Student') && !departmentId && departmentName && collegeId) {
                const { ObjectId } = await import('mongodb');
                const collegeIdObj = typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
                    ? new ObjectId(collegeId)
                    : collegeId;
                
                // Try to get department_id from college document's departments array
                const collegeResponse = await fetchData(
                    'tblCollage',
                    { departments: 1, collage_departments: 1, collage_name: 1 },
                    { _id: collegeIdObj, deleted: false }
                );
                
                if (collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0) {
                    const college = collegeResponse.data[0];
                    if (!collegeName && college.collage_name) {
                        collegeName = college.collage_name;
                    }
                    
                    // Try embedded departments[] array first
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
                            console.log('[Login] Resolved department_id from college.departments[]:', departmentId);
                        }
                    }
                    
                    // Fallback: Try collage_departments[] → query tblDepartments
                    if (!departmentId && college.collage_departments && Array.isArray(college.collage_departments) && college.collage_departments.length > 0) {
                        const deptObjectIds = college.collage_departments.map(id => {
                            if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
                                return new ObjectId(id);
                            }
                            return id;
                        });
                        
                        const deptResponse = await fetchData(
                            'tblDepartments',
                            { _id: 1, department_name: 1, department_code: 1 },
                            {
                                _id: { $in: deptObjectIds },
                                deleted: false,
                                $or: [
                                    { department_name: departmentName.trim() },
                                    { department_code: departmentName.trim() },
                                    { department_name: { $regex: new RegExp(`^${departmentName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                                ]
                            }
                        );
                        
                        if (deptResponse.success && deptResponse.data && deptResponse.data.length > 0) {
                            const dept = deptResponse.data[0];
                            departmentId = dept._id?.toString?.() || dept._id || null;
                            console.log('[Login] Resolved department_id from collage_departments[] → tblDepartments:', departmentId);
                        }
                    }
                } else if (collegeId && !collegeName) {
                    // If college lookup failed, try simple lookup for college name only
                    const collegeFilter = typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
                        ? { _id: new ObjectId(collegeId), deleted: false }
                        : { _id: collegeId, deleted: false };
                        
                    const collegeInfo = await fetchData(
                        'tblCollage',
                        { collage_name: 1 },
                        collegeFilter
                    );
                    if (collegeInfo.success && collegeInfo.data && collegeInfo.data.length > 0) {
                        collegeName = collegeInfo.data[0].collage_name;
                    }
                }
            } else if (collegeId && !collegeName) {
                // For other roles, just get college name if missing
                const { ObjectId } = await import('mongodb');
                const collegeFilter = typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
                    ? { _id: new ObjectId(collegeId), deleted: false }
                    : { _id: collegeId, deleted: false };
                    
                const collegeInfo = await fetchData(
                    'tblCollage',
                    { collage_name: 1 },
                    collegeFilter
                );
                if (collegeInfo.success && collegeInfo.data && collegeInfo.data.length > 0) {
                    collegeName = collegeInfo.data[0].collage_name;
                }
            }

            // Generate JWT token (include department_id for DeptTPC/Student, college_id for all roles)
            const secret = process.env.JWT_SECRET || 'your-secret-key';
            const token = jwt.sign(
                {
                    id: user._id, // Always use PersonMaster._id (single source of truth)
                    email: user.person_email,
                    role: finalUserRole,
                    name: user.person_name,
                    department: departmentName || null, // Department name/code (for UI display)
                    department_id: departmentId || null, // Department id (for filtering - CRITICAL for DeptTPC)
                    college_name: collegeName || null,
                    college_id: collegeId || null // Always use person_collage_id from PersonMaster
                },
                secret,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );
            
            console.log('[Login] JWT token generated:', {
                id: user._id,
                email: user.person_email,
                role: finalUserRole,
                college_id: collegeId,
                department: departmentName,
                department_id: departmentId
            });

            // JWT token returned in response body (no cookies)

            // Update last login in PersonMaster (single source of truth)
            await executeData(
                'tblPersonMaster',
                { last_login: new Date().toISOString() },
                'u',
                null,
                { person_email: normalizedEmail }
            );

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

