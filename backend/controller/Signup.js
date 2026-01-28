import { fetchData, executeData } from '../methods.js';
import bcrypt from 'bcrypt';
import personMasterSchema from '../schema/PersonMaster.js';

const tablename = "tblPersonMaster";

export default class signupcontroller {
    async signup(req, res, next) {
        try {
            const { 
                fullName, 
                email, 
                collegeId,  // Changed from collegeName to collegeId
                role, 
                password,
                department,
                semester,
                enrollmentNumber,
                contactNumber
            } = req.body;

            // Validation
            if (!fullName || !email || !password) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Full name, email, and password are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Invalid email format',
                    error: 'Please provide a valid email address'
                };
                return next();
            }

            // Password validation - Strong password requirements
            const passwordErrors = [];
            
            if (password.length < 8) {
                passwordErrors.push('at least 8 characters');
            }
            
            if (!/[A-Z]/.test(password)) {
                passwordErrors.push('one capital letter');
            }
            
            if (!/[a-z]/.test(password)) {
                passwordErrors.push('one lowercase letter');
            }
            
            if (!/[0-9]/.test(password)) {
                passwordErrors.push('one number');
            }
            
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
                passwordErrors.push('one special character');
            }
            
            if (passwordErrors.length > 0) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: `Password must contain ${passwordErrors.join(', ')}`,
                    error: 'Password does not meet requirements'
                };
                return next();
            }

            // Role validation
            const validRoles = ['Student', 'DeptTPC', 'TPC'];
            const normalizedRole = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'Student';
            const finalRole = normalizedRole === 'Dept-tpc' ? 'DeptTPC' : normalizedRole;
            
            if (!validRoles.includes(finalRole)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Invalid role. Allowed roles: Student, DeptTPC, TPC',
                    error: 'Invalid role'
                };
                return next();
            }

            // Validate college - must be from approved colleges list
            if (!collegeId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College selection is required',
                    error: 'Please select a college from the list'
                };
                return next();
            }

            // Check if college exists and is active
            // Convert collegeId to ObjectId if it's a string (for proper MongoDB matching)
            const { ObjectId } = await import('mongodb');
            let collegeFilter = { deleted: false };
            if (typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)) {
                collegeFilter._id = new ObjectId(collegeId);
            } else {
                collegeFilter._id = collegeId;
            }
            
            // Store ObjectId for later use in department validation
            const ObjectIdClass = ObjectId;

            const collegeResponse = await fetchData(
                'tblCollage',
                { _id: 1, collage_name: 1, collage_status: 1, collage_subscription_status: 1, collage_departments: 1, departments: 1 },
                collegeFilter
            );

            if (!collegeResponse.success || !collegeResponse.data || collegeResponse.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Selected college is not available. Please select a valid college from the list.',
                    error: 'Invalid college'
                };
                return next();
            }

            const selectedCollege = collegeResponse.data[0];

            // Check if college is active and subscription is active
            if (selectedCollege.collage_status !== 1) {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Selected college is currently inactive. Please contact administrator.',
                    error: 'College inactive'
                };
                return next();
            }

            if (selectedCollege.collage_subscription_status !== 'active') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Selected college subscription is inactive. Please contact administrator.',
                    error: 'College subscription inactive'
                };
                return next();
            }

            // Check if user already exists
            const existingUser = await fetchData(
                tablename,
                { person_email: 1 },
                {
                    person_email: email.toLowerCase().trim(),
                    person_deleted: false
                }
            );

            if (existingUser.success && existingUser.data && existingUser.data.length > 0) {
                res.locals.responseData = {
                    success: false,
                    status: 409,
                    message: 'Email already registered',
                    error: 'User with this email already exists'
                };
                return next();
            }

            // Hash password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Variable to store validated department ID (will be set during validation)
            let validatedDepartmentId = null;

            // Validate department - Required for Students and DeptTPC
            if (finalRole === 'Student' || finalRole === 'DeptTPC') {
                if (!department) {
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: 'Department selection is required for ' + (finalRole === 'Student' ? 'students' : 'Department TPC users'),
                        error: 'Department is required'
                    };
                    return next();
                }

                // Validate department exists and is active
                let departmentFilter = {
                    department_status: 1,
                    deleted: false
                };
                
                // Try to match by _id first (if it's an ObjectId string)
                if (typeof department === 'string' && /^[0-9a-fA-F]{24}$/.test(department)) {
                    departmentFilter._id = new ObjectIdClass(department);
                } else {
                    // Fallback: try department_id or _id as string
                    departmentFilter.$or = [
                        { department_id: department },
                        { _id: department }
                    ];
                }

                const departmentResponse = await fetchData(
                    'tblDepartments',
                    { _id: 1, department_id: 1, department_name: 1, department_code: 1 },
                    departmentFilter
                );

                if (!departmentResponse.success || !departmentResponse.data || departmentResponse.data.length === 0) {
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: 'Selected department is not available or inactive.',
                        error: 'Invalid department'
                    };
                    return next();
                }

                const selectedDepartment = departmentResponse.data[0];
                const departmentId = selectedDepartment._id?.toString() || selectedDepartment.department_id;
                const departmentObjectId = selectedDepartment._id;
                const originalDepartmentId = department; // Store original for comparison

                // Check if department is assigned to this college using multiple methods:
                // 1. Check legacy collage_departments array
                // 2. Check new departments array (embedded structure)
                // 3. Check if department has collage_id or department_college_id matching the college
                
                let isDepartmentInCollege = false;
                
                // Method 1: Check legacy collage_departments array
                const collegeDeptIds = selectedCollege.collage_departments || [];
                if (collegeDeptIds.length > 0) {
                    isDepartmentInCollege = collegeDeptIds.some(deptId => {
                        const deptIdStr = deptId?.toString();
                        return deptIdStr === departmentId || 
                               deptIdStr === originalDepartmentId || 
                               deptIdStr === selectedDepartment._id?.toString() ||
                               deptIdStr === selectedDepartment.department_id ||
                               (departmentObjectId && deptId?.toString() === departmentObjectId.toString());
                    });
                }
                
                // Method 2: Check new departments array (embedded structure)
                if (!isDepartmentInCollege && selectedCollege.departments && Array.isArray(selectedCollege.departments)) {
                    isDepartmentInCollege = selectedCollege.departments.some(dept => {
                        const deptId = dept.department_id?.toString() || dept.department_id;
                        return deptId === departmentId ||
                               deptId === originalDepartmentId ||
                               deptId === selectedDepartment._id?.toString() ||
                               deptId === selectedDepartment.department_id ||
                               (departmentObjectId && dept.department_id?.toString() === departmentObjectId.toString());
                    });
                }
                
                // Method 3: Check if department has collage_id or department_college_id matching the college
                if (!isDepartmentInCollege) {
                    const collegeIdStr = selectedCollege._id?.toString() || collegeId?.toString();
                    const departmentCollegeId = selectedDepartment.collage_id?.toString() || 
                                                selectedDepartment.department_college_id?.toString();
                    isDepartmentInCollege = departmentCollegeId === collegeIdStr;
                }

                if (!isDepartmentInCollege) {
                    console.error('[Signup] Department validation failed:', {
                        departmentId,
                        originalDepartmentId,
                        department: selectedDepartment,
                        collegeId: selectedCollege._id?.toString(),
                        collage_departments: selectedCollege.collage_departments,
                        departments: selectedCollege.departments,
                        departmentCollegeId: selectedDepartment.collage_id || selectedDepartment.department_college_id
                    });
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: 'Selected department is not available for this college.',
                        error: 'Department not assigned to college'
                    };
                    return next();
                }

                // Use the validated department ID for storage
                validatedDepartmentId = departmentId;
            } else if (department) {
                // For TPC role, department should not be provided
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Department should not be specified for TPC role. TPC manages the entire college.',
                    error: 'Invalid field for TPC role'
                };
                return next();
            }

            // Prepare user data
            // CRITICAL: Ensure department_id is always the ObjectId string, never the department name
            let finalDepartmentId = null;
            let finalDepartmentName = null;
            
            if ((finalRole === 'Student' || finalRole === 'DeptTPC') && department) {
                // Use validatedDepartmentId if available (from validation step)
                if (validatedDepartmentId) {
                    finalDepartmentId = validatedDepartmentId.toString();
                } else if (selectedDepartment) {
                    // Extract department_id from selectedDepartment
                    finalDepartmentId = selectedDepartment._id?.toString() || 
                                       selectedDepartment.department_id?.toString() || 
                                       selectedDepartment.id?.toString() || 
                                       null;
                    
                    // If department parameter is an ObjectId string, use it directly
                    if (!finalDepartmentId && typeof department === 'string' && /^[0-9a-fA-F]{24}$/.test(department)) {
                        finalDepartmentId = department;
                    }
                } else if (typeof department === 'string' && /^[0-9a-fA-F]{24}$/.test(department)) {
                    // Department parameter is already an ObjectId string
                    finalDepartmentId = department;
                }
                
                // Get department name for display
                if (selectedDepartment) {
                    finalDepartmentName =
                        selectedDepartment.department_name ||
                        selectedDepartment.department_code ||
                        selectedDepartment.name ||
                        selectedDepartment.value ||
                        null;
                } else if (finalDepartmentId) {
                    // If we have department_id but no selectedDepartment, try to fetch name
                    // (This shouldn't happen in normal flow, but handle gracefully)
                    finalDepartmentName = department; // Use provided value as fallback
                }
            }
            
            // Store BOTH:
            // - department_id: the department ObjectId string (for reliable filtering/joins) - CRITICAL
            // - department: a human-friendly department value (name/code) used by TPC/DeptTPC UI filters
            const userData = {
                person_name: fullName.trim(),
                person_email: email.toLowerCase().trim(),
                person_role: finalRole,
                person_password: hashedPassword,
                person_status: 'active',
                person_deleted: false,
                person_collage_id: collegeId, // Store college ID reference (ObjectId or string)
                college_name: selectedCollege.collage_name, // Store college name for reference
                department: finalDepartmentName || null, // Store name/code for DeptTPC filters & UI
                department_id: finalDepartmentId || null, // Store id for reliability - MUST be ObjectId string
                semester: finalRole === 'Student' && semester ? parseInt(semester) : null, // Semester only for students
                enrollment_number: finalRole === 'Student' && enrollmentNumber ? enrollmentNumber.trim() : null, // Enrollment only for students
                contact_number: contactNumber ? contactNumber.trim() : null
            };

            // Insert user into database
            const response = await executeData(tablename, userData, 'i', personMasterSchema);

            if (!response.success) {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Signup failed',
                    error: 'Failed to create user account'
                };
                return next();
            }

            // Prepare response (don't send password)
            res.locals.responseData = {
                success: true,
                status: 201,
                message: 'Account created successfully',
                data: {
                    user: {
                        id: response.data?.insertedId || response.data?._id,
                        name: userData.person_name,
                        email: userData.person_email,
                        role: userData.person_role,
                        status: userData.person_status
                    }
                }
            };

            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Signup failed',
                error: error.message
            };
            next();
        }
    }
}

