import { fetchData, executeData } from '../methods.js';

/**
 * TPC and DeptTPC Controller
 * Handles data fetching for TPC and Department TPC roles
 */
export default class tpcController {

    /**
     * Helper function to get user info from all tables (PersonMaster, TPC, DeptTPC)
     */
    async getUserInfo(userId) {
        // Check tblPersonMaster first (for Students)
        let userResponse = await fetchData(
            'tblPersonMaster',
            { person_collage_id: 1, department: 1, department_id: 1, person_role: 1, person_name: 1, person_email: 1, person_rollno: 1 },
            { _id: userId, person_deleted: false }
        );

        if (userResponse.success && userResponse.data && userResponse.data.length > 0) {
            const user = userResponse.data[0];
            return {
                found: true,
                user: {
                    person_role: user.person_role,
                    person_collage_id: user.person_collage_id,
                    collage_id: user.person_collage_id,
                    department: user.department,
                    department_id: user.department_id || null
                }
            };
        }

        // Check tblCollage.tpc_users[] and departments[].dept_tpc[] for person_id references
        // Since all users are now in PersonMaster, we check if userId is referenced in college documents
        const { ObjectId } = await import('mongodb');
        const userIdFilter = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)
            ? new ObjectId(userId)
            : userId;

        const collegesResponse = await fetchData(
            'tblCollage',
            { _id: 1, tpc_users: 1, departments: 1 },
            {
                $or: [
                    { 'tpc_users.person_id': userIdFilter },
                    { 'departments.dept_tpc.person_id': userIdFilter }
                ],
                deleted: false
            },
            {}
        );

        if (collegesResponse.success && collegesResponse.data && collegesResponse.data.length > 0) {
            // Check TPC users
            for (const college of collegesResponse.data) {
                if (college.tpc_users && Array.isArray(college.tpc_users)) {
                    const tpcUser = college.tpc_users.find(
                        tpc => (tpc.person_id?.toString() === userIdFilter.toString() ||
                            tpc.person_id?.toString() === userId.toString())
                    );

                    if (tpcUser) {
                        return {
                            found: true,
                            user: {
                                person_role: 'TPC',
                                person_collage_id: college._id,
                                collage_id: college._id,
                                department: null
                            }
                        };
                    }
                }

                // Check DeptTPC users
                if (college.departments && Array.isArray(college.departments)) {
                    for (const dept of college.departments) {
                        if (dept.dept_tpc &&
                            (dept.dept_tpc.person_id?.toString() === userIdFilter.toString() ||
                                dept.dept_tpc.person_id?.toString() === userId.toString())) {
                            // Also check PersonMaster for department_id (single source of truth)
                            const personMasterCheck = await fetchData(
                                'tblPersonMaster',
                                { department_id: 1, department: 1 },
                                { _id: userIdFilter, person_deleted: false }
                            );

                            let finalDeptId = (dept.department_id?.toString?.() || dept.department_id || null);
                            let finalDept = dept.department_name || dept.department_code || null;

                            if (personMasterCheck.success && personMasterCheck.data && personMasterCheck.data.length > 0) {
                                const pmDeptId = personMasterCheck.data[0].department_id;
                                const pmDept = personMasterCheck.data[0].department;
                                if (pmDeptId) finalDeptId = pmDeptId?.toString?.() || pmDeptId;
                                if (pmDept) finalDept = pmDept;
                            }

                            return {
                                found: true,
                                user: {
                                    person_role: 'DeptTPC',
                                    person_collage_id: college._id,
                                    collage_id: college._id,
                                    department: finalDept,
                                    department_id: finalDeptId
                                }
                            };
                        }
                    }
                }
            }
        }

        // Fallback: Check old tblTPC table (backward compatibility)
        userResponse = await fetchData(
            'tblTPC',
            { collage_id: 1, tpc_status: 1 },
            { _id: userIdFilter, tpc_deleted: false }
        );

        if (userResponse.success && userResponse.data && userResponse.data.length > 0) {
            const tpcUser = userResponse.data[0];
            return {
                found: true,
                user: {
                    person_role: 'TPC',
                    person_collage_id: tpcUser.collage_id,
                    collage_id: tpcUser.collage_id,
                    department: null
                }
            };
        }

        // Fallback: Check old tblDeptTPC table (backward compatibility)
        userResponse = await fetchData(
            'tblDeptTPC',
            { collage_id: 1, department_name: 1, department_code: 1, dept_tpc_status: 1 },
            { _id: userIdFilter, dept_tpc_deleted: false }
        );

        if (userResponse.success && userResponse.data && userResponse.data.length > 0) {
            const deptTpcUser = userResponse.data[0];
            return {
                found: true,
                user: {
                    person_role: 'DeptTPC',
                    person_collage_id: deptTpcUser.collage_id,
                    collage_id: deptTpcUser.collage_id,
                    department: deptTpcUser.department_name || deptTpcUser.department_code
                }
            };
        }

        return { found: false, user: null };
    }
    /**
     * Get Dashboard Statistics
     * For TPC: All students in college
     * For DeptTPC: Students in their department
     * Route: POST /tpc/dashboard/stats
     */
    async getDashboardStats(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const userCollegeId = req.user?.college_id || req.user?.collegeId;
            const userDepartment = req.user?.department;
            const { department } = req.body || {}; // Department filter from request

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            // Get user details to verify college/department
            const userInfo = await this.getUserInfo(userId);

            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            let collegeId = user.person_collage_id || user.collage_id || userCollegeId;
            let deptFilter = user.department || userDepartment;

            // Build filter based on role
            const { ObjectId } = await import('mongodb');
            let studentFilter = {
                person_deleted: false,
                person_status: 'active',
                person_role: { $regex: /^student$/i } // Case-insensitive
            };

            // Use role from user object or JWT
            const finalUserRole = (user.person_role || userRole || '').toLowerCase();
            const normalizedRole = finalUserRole === 'tpc' ? 'tpc' : (finalUserRole === 'depttpc' ? 'depttpc' : null);

            if (normalizedRole === 'tpc') {
                // TPC sees all students in their college
                if (collegeId) {
                    const collegeIdString = collegeId?.toString?.() || collegeId;
                    const collegeIdObject = (typeof collegeIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeIdString))
                        ? new ObjectId(collegeIdString)
                        : (collegeId instanceof ObjectId ? collegeId : null);

                    // Match both ObjectId and string formats (legacy support)
                    studentFilter.person_collage_id = {
                        $in: [
                            ...(collegeIdObject ? [collegeIdObject] : []),
                            collegeIdString
                        ]
                    };
                }

                // Apply department filter if provided (for TPC)
                if (department && department !== 'all') {
                    const deptFilterValue = department.trim();
                    const trimmedValue = deptFilterValue.trim();
                    const escaped = trimmedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    console.log('[TPC Dashboard] Department filter received:', deptFilterValue);

                    // Check if department value is an ObjectId (legacy case)
                    const isObjectId = typeof deptFilterValue === 'string' && /^[0-9a-fA-F]{24}$/.test(deptFilterValue);
                    let deptObjectId = null;
                    let resolvedDeptId = null;

                    if (isObjectId) {
                        deptObjectId = new ObjectId(deptFilterValue);
                        resolvedDeptId = deptFilterValue;
                        console.log('[TPC Dashboard] Department value is ObjectId:', resolvedDeptId);
                    } else {
                        // Department value is a name, need to resolve to department_id
                        console.log('[TPC Dashboard] Resolving department name to ID:', deptFilterValue);
                        const deptResponse = await fetchData(
                            'tblDepartments',
                            { _id: 1, department_name: 1, department_code: 1 },
                            {
                                $or: [
                                    { department_name: trimmedValue },
                                    { department_code: trimmedValue },
                                    { department_name: { $regex: new RegExp(`^${escaped}$`, 'i') } },
                                    { department_code: { $regex: new RegExp(`^${escaped}$`, 'i') } }
                                ],
                                deleted: false
                            }
                        );

                        console.log('[TPC Dashboard] Department lookup result:', {
                            success: deptResponse.success,
                            found: deptResponse.data?.length || 0,
                            data: deptResponse.data
                        });

                        if (deptResponse.success && deptResponse.data && deptResponse.data.length > 0) {
                            const dept = deptResponse.data[0];
                            resolvedDeptId = dept._id?.toString() || dept._id;
                            if (resolvedDeptId && /^[0-9a-fA-F]{24}$/.test(resolvedDeptId)) {
                                deptObjectId = new ObjectId(resolvedDeptId);
                            }
                            console.log('[TPC Dashboard] Resolved department_id from tblDepartments:', resolvedDeptId);
                        } else {
                            console.log('[TPC Dashboard] WARNING: Could not resolve department name to ID from tblDepartments');
                            // Fallback: Try to find a student with this department name to get their department_id
                            console.log('[TPC Dashboard] Trying to find department_id from student records...');
                            const tempStudentCheck = await fetchData(
                                'tblPersonMaster',
                                { department_id: 1, department: 1 },
                                {
                                    person_deleted: false,
                                    person_role: { $regex: /^student$/i },
                                    person_collage_id: studentFilter.person_collage_id,
                                    $or: [
                                        { department: trimmedValue },
                                        { department: { $regex: new RegExp(`^${escaped}$`, 'i') } }
                                    ],
                                    department_id: { $exists: true, $ne: null }
                                },
                                { limit: 1 }
                            );

                            if (tempStudentCheck.success && tempStudentCheck.data && tempStudentCheck.data.length > 0) {
                                const sampleStudent = tempStudentCheck.data[0];
                                if (sampleStudent.department_id) {
                                    const foundDeptId = sampleStudent.department_id?.toString() || sampleStudent.department_id;
                                    console.log('[TPC Dashboard] Found department_id from student records:', foundDeptId);
                                    if (/^[0-9a-fA-F]{24}$/.test(foundDeptId)) {
                                        resolvedDeptId = foundDeptId;
                                        deptObjectId = new ObjectId(foundDeptId);
                                    }
                                }
                            }
                        }
                    }

                    // Build department filter conditions
                    const deptConditions = [];

                    // Always match by department name (exact and case-insensitive, with trimmed variants)
                    deptConditions.push(
                        { department: trimmedValue },
                        { department: { $regex: new RegExp(`^${escaped}$`, 'i') } },
                        // Also try with potential trailing spaces (common issue)
                        { department: { $regex: new RegExp(`^${escaped}\\s*$`, 'i') } }
                    );

                    // Match by department_id (if we resolved it)
                    if (resolvedDeptId) {
                        if (deptObjectId) {
                            deptConditions.push(
                                { department_id: deptObjectId },
                                { department_id: resolvedDeptId }
                            );
                        } else {
                            deptConditions.push({ department_id: resolvedDeptId });
                        }

                        // LEGACY: Also match if department_id was stored in department field
                        deptConditions.push({ department: resolvedDeptId });
                    } else if (isObjectId) {
                        // If value is ObjectId but we couldn't resolve, still try to match
                        deptConditions.push(
                            { department_id: deptObjectId },
                            { department_id: deptFilterValue },
                            { department: deptFilterValue } // Legacy: department_id in department field
                        );
                    }

                    console.log('[TPC Dashboard] Department filter conditions:', JSON.stringify(deptConditions, null, 2));
                    studentFilter.$or = deptConditions;
                    console.log('[TPC Dashboard] Final studentFilter with department:', JSON.stringify(studentFilter, null, 2));
                }
            } else if (normalizedRole === 'depttpc') {
                // DeptTPC sees only students in their department
                if (collegeId) {
                    const collegeIdString = collegeId?.toString?.() || collegeId;
                    const collegeIdObject = (typeof collegeIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeIdString))
                        ? new ObjectId(collegeIdString)
                        : (collegeId instanceof ObjectId ? collegeId : null);

                    // Match both ObjectId and string formats (legacy support)
                    studentFilter.person_collage_id = {
                        $in: [
                            ...(collegeIdObject ? [collegeIdObject] : []),
                            collegeIdString
                        ]
                    };
                }

                // Resolve department_id for DeptTPC
                let deptIdFilter = user.department_id || null;
                deptFilter = deptFilter || user.department || null;

                // Try to get department_id from PersonMaster if missing
                if (!deptIdFilter) {
                    const personMasterResponse = await fetchData(
                        'tblPersonMaster',
                        { department_id: 1, department: 1 },
                        { _id: userId, person_deleted: false }
                    );

                    if (personMasterResponse.success && personMasterResponse.data && personMasterResponse.data.length > 0) {
                        const person = personMasterResponse.data[0];
                        deptIdFilter = person.department_id || null;
                        if (!deptFilter) {
                            deptFilter = person.department || null;
                        }
                    }
                }

                // Apply department filter
                if (deptFilter || deptIdFilter) {
                    const deptOrConditions = [];

                    // Add department_id filter (handle both ObjectId and string formats)
                    if (deptIdFilter) {
                        const deptIdString = deptIdFilter?.toString?.() || deptIdFilter;
                        let deptIdObject = null;
                        if (typeof deptIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdString)) {
                            deptIdObject = new ObjectId(deptIdString);
                        }

                        // Match department_id field (preferred - correct storage)
                        if (deptIdObject) {
                            deptOrConditions.push(
                                { department_id: deptIdObject },
                                { department_id: deptIdString }
                            );
                        } else {
                            deptOrConditions.push({ department_id: deptIdString });
                        }

                        // LEGACY FIX: Also match department field if it contains ObjectId string
                        if (deptIdString && /^[0-9a-fA-F]{24}$/.test(deptIdString)) {
                            deptOrConditions.push({ department: deptIdString });
                        }
                    }

                    // Add department name/code filter (trimmed)
                    if (deptFilter) {
                        const trimmedDept = deptFilter.trim();
                        deptOrConditions.push(
                            { department: trimmedDept },
                            { department: { $regex: new RegExp(`^${trimmedDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                        );
                    }

                    if (deptOrConditions.length > 0) {
                        studentFilter.$or = deptOrConditions;
                    } else {
                        // If we can't determine department for DeptTPC, return no students instead of leaking data
                        studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
                    }
                } else {
                    // If we can't determine department for DeptTPC, return no students instead of leaking data
                    studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
                }
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC and DeptTPC can access this resource'
                };
                return next();
            }

            // Get all students matching the filter
            console.log('[TPC Dashboard] Fetching students with filter:', JSON.stringify(studentFilter, null, 2));
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                {},
                studentFilter
            );

            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            console.log('[TPC Dashboard] Students found:', students.length);
            if (students.length > 0) {
                console.log('[TPC Dashboard] Sample student departments:', students.slice(0, 3).map(s => ({
                    name: s.person_name,
                    department: s.department,
                    department_id: s.department_id
                })));
            }

            // Get student progress data
            const progressResponse = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: { $in: students.map(s => s._id || s.person_id) } }
            );

            const progressData = progressResponse.success && progressResponse.data ? progressResponse.data : [];

            // FALLBACK: Get practice test data to derive scores when progress is empty/null
            const studentIds = students.map(s => s._id || s.person_id);
            const studentIdStrings = studentIds.map(id => (id && typeof id.toString === 'function' ? id.toString() : String(id)));
            const practiceFilter = studentIdStrings.length ? { student_id: { $in: studentIdStrings } } : { _id: null };
            const practiceResponse = await fetchData('tblPracticeTest', { student_id: 1, score: 1 }, practiceFilter);
            const practiceTests = practiceResponse.success && practiceResponse.data ? practiceResponse.data : [];

            // Calculate average by student from practice tests
            const avgByStudent = {};
            for (const t of practiceTests) {
                const sid = (t.student_id && typeof t.student_id.toString === 'function' ? t.student_id.toString() : String(t.student_id));
                if (!avgByStudent[sid]) avgByStudent[sid] = { sum: 0, count: 0 };
                avgByStudent[sid].sum += (t.score || 0);
                avgByStudent[sid].count += 1;
            }

            // Calculate statistics
            const totalStudents = students.length;
            const activeStudents = students.filter(s => s.person_status === 'active').length;

            // Calculate average score: prefer progress.average_score, fallback to practice test average
            let totalScore = 0;
            let scoreCount = 0;
            let totalTestsCompleted = 0;
            let totalDaysCompleted = 0;
            let topPerformers = 0;

            students.forEach(student => {
                const sid = (student._id && typeof student._id.toString === 'function' ? student._id.toString() : String(student._id));
                const progress = progressData.find(p =>
                    (String(p.student_id) === sid || String(p.student_id) === String(student.person_id))
                );

                // Get score from progress OR derive from practice tests
                let studentScore = null;
                if (progress && progress.average_score !== undefined && progress.average_score !== null && progress.average_score > 0) {
                    studentScore = progress.average_score;
                } else {
                    // Fallback: calculate from practice tests
                    const practice = avgByStudent[sid];
                    if (practice && practice.count > 0) {
                        studentScore = Math.round(practice.sum / practice.count);
                    }
                }

                if (studentScore !== null) {
                    totalScore += studentScore;
                    scoreCount++;
                    if (studentScore >= 85) {
                        topPerformers++;
                    }
                }

                // Tests completed: prefer progress, fallback to practice test count
                if (progress && progress.total_practice_tests) {
                    totalTestsCompleted += progress.total_practice_tests;
                } else {
                    const practice = avgByStudent[sid];
                    if (practice && practice.count > 0) {
                        totalTestsCompleted += practice.count;
                    }
                }

                if (progress && progress.total_days_completed) {
                    totalDaysCompleted += progress.total_days_completed;
                }
            });

            const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

            // Get students needing attention (score < 50 or no progress)
            const needsAttention = students.filter(student => {
                const studentProgress = progressData.find(p =>
                    (p.student_id === student._id || p.student_id === student.person_id)
                );
                return !studentProgress || (studentProgress.average_score && studentProgress.average_score < 50);
            }).length;

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Dashboard statistics fetched successfully',
                data: {
                    totalStudents,
                    activeStudents,
                    averageScore,
                    testsCompleted: totalTestsCompleted,
                    daysCompleted: totalDaysCompleted,
                    topPerformers,
                    needsAttention,
                    collegeId,
                    department: userRole === 'DeptTPC' ? department : null
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch dashboard statistics',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Students List
     * For TPC: All students in college
     * For DeptTPC: Students in their department
     * Route: POST /tpc/students/list
     */
    async getStudentsList(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRoleRaw = req.user?.role;
            const userRole = userRoleRaw ? userRoleRaw.toString() : null;
            const userCollegeId = req.user?.college_id || req.user?.collegeId;
            const userDepartment = req.user?.department;
            const userDepartmentId = req.user?.department_id;
            const { search, status, department } = req.body || {};

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            // Get user details
            const userInfo = await this.getUserInfo(userId);

            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            let collegeId = user.person_collage_id || user.collage_id || userCollegeId;
            const collegeIdString = collegeId?.toString?.() || collegeId || null;
            let deptFilter = user.department || userDepartment;
            let deptIdFilter = user.department_id || userDepartmentId;
            const normalizedRole = (userRole || user.person_role || '').toString().toLowerCase();

            // Convert collegeId to ObjectId if it's a string (for proper MongoDB matching)
            let collegeIdObject = null;
            const { ObjectId } = await import('mongodb');
            if (collegeId) {
                if (typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)) {
                    collegeIdObject = new ObjectId(collegeId);
                    collegeId = collegeIdObject;
                } else if (collegeId instanceof ObjectId) {
                    collegeIdObject = collegeId;
                }
            }

            // For DeptTPC: Normalize department filter and resolve department_id if needed
            if (normalizedRole === 'depttpc' && !deptIdFilter && deptFilter) {
                deptFilter = deptFilter.trim();

                // 1) Try to read department_id from DeptTPC's PersonMaster record (newer data)
                const personMasterResponse = await fetchData(
                    'tblPersonMaster',
                    { department_id: 1 },
                    { _id: userId, person_deleted: false }
                );

                if (personMasterResponse.success && personMasterResponse.data && personMasterResponse.data.length > 0) {
                    const personDeptId = personMasterResponse.data[0].department_id;
                    if (personDeptId) deptIdFilter = personDeptId;
                }

                // 2) If still missing, resolve via college's collage_departments list (authoritative mapping)
                // This matches how /department/list resolves departments for a college.
                if (!deptIdFilter && collegeIdString) {
                    const collegeResponse = await fetchData(
                        'tblCollage',
                        { collage_departments: 1, departments: 1 },
                        { _id: collegeIdObject || collegeIdString, deleted: false }
                    );

                    const college = (collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0)
                        ? collegeResponse.data[0]
                        : null;

                    // a) Prefer embedded departments[] if present (new schema)
                    if (college?.departments && Array.isArray(college.departments)) {
                        const match = college.departments.find(d => {
                            const dn = (d.department_name || '').trim().toLowerCase();
                            const dc = (d.department_code || '').trim().toLowerCase();
                            const target = deptFilter.trim().toLowerCase();
                            return dn === target || dc === target;
                        });
                        if (match?.department_id) {
                            deptIdFilter = match.department_id?.toString?.() || match.department_id;
                        }
                    }

                    // b) If still missing, use collage_departments[] → query tblDepartments and match by name/code
                    if (!deptIdFilter && college?.collage_departments && Array.isArray(college.collage_departments) && college.collage_departments.length > 0) {
                        const deptObjectIds = college.collage_departments.map(id => {
                            try {
                                if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) return new ObjectId(id);
                            } catch (_) { /* ignore */ }
                            return id;
                        });

                        const deptListResp = await fetchData(
                            'tblDepartments',
                            { _id: 1, department_name: 1, department_code: 1 },
                            { _id: { $in: deptObjectIds }, deleted: false }
                        );

                        if (deptListResp.success && Array.isArray(deptListResp.data)) {
                            const target = deptFilter.trim().toLowerCase();
                            const deptMatch = deptListResp.data.find(d => {
                                const dn = (d.department_name || '').trim().toLowerCase();
                                const dc = (d.department_code || '').trim().toLowerCase();
                                return dn === target || dc === target;
                            });
                            if (deptMatch?._id) {
                                deptIdFilter = deptMatch._id?.toString?.() || deptMatch._id;
                                deptFilter = deptMatch.department_name || deptMatch.department_code || deptFilter;
                            }
                        }
                    }

                    // c) Final fallback (older schema): query tblDepartments by collegeId link fields and name/code
                    // Some colleges don't have collage_departments populated.
                    if (!deptIdFilter) {
                        const escaped = deptFilter.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const deptLookupFilterFixed = {
                            $and: [
                                {
                                    $or: [
                                        { department_name: deptFilter.trim() },
                                        { department_code: deptFilter.trim() },
                                        { department_name: { $regex: new RegExp(`^${escaped}$`, 'i') } },
                                        { department_code: { $regex: new RegExp(`^${escaped}$`, 'i') } },
                                    ]
                                },
                                {
                                    $or: [
                                        { collage_id: collegeIdString },
                                        { department_college_id: collegeIdString },
                                        ...(collegeIdObject ? [{ collage_id: collegeIdObject }, { department_college_id: collegeIdObject }] : [])
                                    ]
                                }
                            ]
                        };

                        const deptResponse = await fetchData(
                            'tblDepartments',
                            { _id: 1, department_name: 1, department_code: 1 },
                            deptLookupFilterFixed
                        );

                        if (deptResponse.success && Array.isArray(deptResponse.data) && deptResponse.data.length > 0) {
                            const dept = deptResponse.data[0];
                            deptIdFilter = dept._id?.toString?.() || dept._id || null;
                            deptFilter = dept.department_name || dept.department_code || deptFilter;
                        }
                    }
                }
            } else if (deptFilter) {
                // Trim department name for all roles
                deptFilter = deptFilter.trim();
            }

            console.log('[TPC/DeptTPC Students] Context:', {
                normalizedRole,
                userId,
                collegeIdString,
                collegeIdObject: collegeIdObject?.toString?.() || null,
                deptFilter: deptFilter?.trim?.() || deptFilter,
                deptIdFilter,
                request: { search, status, department }
            });

            // Build filter
            let studentFilter = {
                person_deleted: false,
                // IMPORTANT: historical data may store person_role as 'Student' or 'student'
                person_role: { $regex: /^student$/i }
            };

            if (normalizedRole === 'tpc') {
                if (collegeIdString) {
                    // IMPORTANT: person_collage_id can be stored as string OR ObjectId depending on older inserts
                    studentFilter.person_collage_id = {
                        $in: [
                            ...(collegeIdObject ? [collegeIdObject] : []),
                            collegeIdString
                        ]
                    };
                }
            } else if (normalizedRole === 'depttpc') {
                if (collegeIdString) {
                    studentFilter.person_collage_id = {
                        $in: [
                            ...(collegeIdObject ? [collegeIdObject] : []),
                            collegeIdString
                        ]
                    };
                }
                // DeptTPC must be restricted to their department.
                // Support both legacy (department name/code) and new (department_id) storage.
                // Also handle legacy data where department_id was stored in department field
                if (deptFilter || deptIdFilter) {
                    const deptOrConditions = [];

                    // Add department_id filter (handle both ObjectId and string formats)
                    if (deptIdFilter) {
                        const deptIdString = deptIdFilter?.toString?.() || deptIdFilter;
                        let deptIdObject = null;
                        if (typeof deptIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdString)) {
                            deptIdObject = new ObjectId(deptIdString);
                        }

                        // Match department_id field (preferred - correct storage)
                        if (deptIdObject) {
                            deptOrConditions.push(
                                { department_id: deptIdObject },
                                { department_id: deptIdString }
                            );
                        } else {
                            deptOrConditions.push({ department_id: deptIdString });
                        }

                        // LEGACY FIX: Also match department field if it contains ObjectId string
                        // This handles old data where department_id was stored in department field
                        if (deptIdString && /^[0-9a-fA-F]{24}$/.test(deptIdString)) {
                            deptOrConditions.push({ department: deptIdString });
                        }
                    }

                    // Add department name/code filter (trimmed)
                    if (deptFilter) {
                        const trimmedDept = deptFilter.trim();
                        deptOrConditions.push(
                            { department: trimmedDept },
                            { department: { $regex: new RegExp(`^${trimmedDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                        );
                    }

                    if (deptOrConditions.length > 0) {
                        studentFilter.$or = deptOrConditions;
                    } else {
                        // If we can't determine department for DeptTPC, return no students instead of leaking data
                        studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
                    }
                } else {
                    // If we can't determine department for DeptTPC, return no students instead of leaking data
                    studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
                }
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC and DeptTPC can access this resource'
                };
                return next();
            }

            // Apply status filter if provided
            if (status && status !== 'all') {
                studentFilter.person_status = status;
            }

            // Apply department filter if provided (for TPC)
            if (department && department !== 'all' && normalizedRole === 'tpc') {
                const { ObjectId } = await import('mongodb');
                const deptFilterValue = department.trim();

                // Check if department value is an ObjectId (legacy case)
                const isObjectId = typeof deptFilterValue === 'string' && /^[0-9a-fA-F]{24}$/.test(deptFilterValue);
                let deptObjectId = null;
                let resolvedDeptId = null;

                if (isObjectId) {
                    deptObjectId = new ObjectId(deptFilterValue);
                    resolvedDeptId = deptFilterValue;
                } else {
                    // Department value is a name, need to resolve to department_id
                    // Try to find department in tblDepartments by name/code
                    const deptResponse = await fetchData(
                        'tblDepartments',
                        { _id: 1, department_name: 1, department_code: 1 },
                        {
                            $or: [
                                { department_name: deptFilterValue },
                                { department_code: deptFilterValue },
                                { department_name: { $regex: new RegExp(`^${deptFilterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                                { department_code: { $regex: new RegExp(`^${deptFilterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                            ],
                            deleted: false
                        }
                    );

                    if (deptResponse.success && deptResponse.data && deptResponse.data.length > 0) {
                        const dept = deptResponse.data[0];
                        resolvedDeptId = dept._id?.toString() || dept._id;
                        if (resolvedDeptId && /^[0-9a-fA-F]{24}$/.test(resolvedDeptId)) {
                            deptObjectId = new ObjectId(resolvedDeptId);
                        }
                    }
                }

                // Build department filter conditions
                const deptConditions = [];

                // Match by department name (exact and case-insensitive)
                const escaped = deptFilterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                deptConditions.push(
                    { department: deptFilterValue },
                    { department: { $regex: new RegExp(`^${escaped}$`, 'i') } }
                );

                // Match by department_id (if we resolved it)
                if (resolvedDeptId) {
                    if (deptObjectId) {
                        deptConditions.push(
                            { department_id: deptObjectId },
                            { department_id: resolvedDeptId }
                        );
                    } else {
                        deptConditions.push({ department_id: resolvedDeptId });
                    }

                    // LEGACY: Also match if department_id was stored in department field
                    deptConditions.push({ department: resolvedDeptId });
                } else if (isObjectId) {
                    // If value is ObjectId but we couldn't resolve, still try to match
                    deptConditions.push(
                        { department_id: deptObjectId },
                        { department_id: deptFilterValue },
                        { department: deptFilterValue } // Legacy: department_id in department field
                    );
                }

                // If we already have an $or condition (from DeptTPC), merge it
                // Otherwise, create new $or condition
                if (studentFilter.$or) {
                    // Merge with existing $or (for DeptTPC case)
                    studentFilter.$and = [
                        { $or: studentFilter.$or },
                        { $or: deptConditions }
                    ];
                    delete studentFilter.$or;
                } else {
                    studentFilter.$or = deptConditions;
                }
            }

            // Get students
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                {},
                studentFilter
            );

            let students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            console.log('[TPC/DeptTPC Students] studentFilter:', JSON.stringify(studentFilter, null, 2));
            console.log('[TPC/DeptTPC Students] students count before search filter:', students.length);

            // Normalize student department data (fix students with department_id in wrong field)
            // This handles legacy data where department_id was stored in department field
            if (students.length > 0 && normalizedRole === 'depttpc' && deptIdFilter) {
                const { ObjectId } = await import('mongodb');
                const deptIdString = deptIdFilter?.toString?.() || deptIdFilter;

                // Check if any students need normalization
                const needsNormalization = students.some(s => {
                    // Student has department_id in department field (wrong field)
                    const deptField = s.department;
                    return deptField && typeof deptField === 'string' && /^[0-9a-fA-F]{24}$/.test(deptField) && !s.department_id;
                });

                if (needsNormalization) {
                    console.log('[TPC/DeptTPC Students] Normalizing student department data...');
                    // Filter students: include those with department_id match OR department field match
                    students = students.filter(s => {
                        // Normal case: department_id matches
                        if (s.department_id) {
                            const sDeptId = s.department_id?.toString?.() || s.department_id;
                            return sDeptId === deptIdString;
                        }

                        // Legacy case: department field contains ObjectId string
                        const deptField = s.department;
                        if (deptField && typeof deptField === 'string' && /^[0-9a-fA-F]{24}$/.test(deptField)) {
                            return deptField === deptIdString;
                        }

                        // Name match (fallback)
                        if (deptFilter && s.department) {
                            const sDept = (s.department || '').trim().toLowerCase();
                            const targetDept = deptFilter.trim().toLowerCase();
                            return sDept === targetDept;
                        }

                        return false;
                    });
                    console.log(`[TPC/DeptTPC Students] After normalization: ${students.length} students`);
                }
            }

            // Apply search filter
            if (search && search.trim()) {
                const searchLower = search.toLowerCase().trim();
                students = students.filter(student => {
                    const name = (student.person_name || '').toLowerCase();
                    const email = (student.person_email || '').toLowerCase();
                    const enrollment = (student.enrollment_number || '').toLowerCase();
                    return name.includes(searchLower) ||
                        email.includes(searchLower) ||
                        enrollment.includes(searchLower);
                });
            }

            // Get progress data for each student (tblStudentProgress stores student_id as string)
            const studentIds = students.map(s => s._id || s.person_id);
            const studentIdStrings = studentIds.map(id => (id?.toString?.() || id)).filter(Boolean);
            const progressFilter = studentIdStrings.length
                ? { $or: [{ student_id: { $in: studentIdStrings } }, { student_id: { $in: studentIds } }] }
                : { _id: null };
            const progressResponse = await fetchData(
                'tblStudentProgress',
                {},
                progressFilter
            );
            const progressData = progressResponse.success && progressResponse.data ? progressResponse.data : [];

            // Get practice test data: tblPracticeTest stores student_id as STRING (see practiceTest.save)
            // Match both string and ObjectId so we find records regardless of storage format
            const practiceFilter = studentIdStrings.length
                ? { $or: [{ student_id: { $in: studentIdStrings } }, { student_id: { $in: studentIds } }] }
                : { _id: null };
            const practiceResponse = await fetchData('tblPracticeTest', { student_id: 1, score: 1 }, practiceFilter);
            const practiceTests = practiceResponse.success && practiceResponse.data ? practiceResponse.data : [];

            const practiceByStudent = {};
            for (const t of practiceTests) {
                const sid = (t.student_id != null && typeof t.student_id.toString === 'function') ? t.student_id.toString() : String(t.student_id);
                if (!practiceByStudent[sid]) practiceByStudent[sid] = { sum: 0, count: 0 };
                practiceByStudent[sid].sum += (t.score != null ? Number(t.score) : 0);
                practiceByStudent[sid].count += 1;
            }

            console.log('[getStudentsList] students:', students.length, 'progressDocs:', progressData.length, 'practiceTests:', practiceTests.length, 'practiceByStudent keys:', Object.keys(practiceByStudent));

            // Combine: always prefer derived from practice tests when progress has no/zero score or test count
            const studentsWithProgress = students.map(student => {
                const sid = (student._id != null && typeof student._id.toString === 'function') ? student._id.toString() : String(student._id);
                const sidAlt = (student.person_id != null && typeof student.person_id.toString === 'function') ? student.person_id.toString() : String(student.person_id || '');
                const progress = progressData.find(p =>
                    (String(p.student_id) === sid || String(p.student_id) === sidAlt)
                );
                let practice = practiceByStudent[sid] || practiceByStudent[sidAlt];
                if (!practice && Object.keys(practiceByStudent).length > 0) {
                    const matchKey = Object.keys(practiceByStudent).find(k => k === sid || k === sidAlt || String(k) === sid || String(k) === sidAlt);
                    if (matchKey) practice = practiceByStudent[matchKey];
                }
                const derivedAvg = practice && practice.count > 0 ? Math.round(practice.sum / practice.count) : 0;
                const derivedTestCount = practice ? practice.count : 0;
                const progressScore = progress && progress.average_score != null && Number(progress.average_score) > 0 ? Number(progress.average_score) : null;
                const progressTests = progress && progress.total_practice_tests != null && Number(progress.total_practice_tests) > 0 ? Number(progress.total_practice_tests) : null;
                const averageScore = progressScore != null ? progressScore : derivedAvg;
                const totalPracticeTests = progressTests != null ? progressTests : derivedTestCount;
                return {
                    ...student,
                    progress: {
                        ...(progress || {}),
                        average_score: averageScore,
                        total_days_completed: progress?.total_days_completed ?? 0,
                        total_practice_tests: totalPracticeTests,
                        total_coding_problems: progress?.total_coding_problems ?? 0
                    }
                };
            });

            // Sort by average score (descending)
            studentsWithProgress.sort((a, b) => {
                const scoreA = a.progress?.average_score || 0;
                const scoreB = b.progress?.average_score || 0;
                return scoreB - scoreA;
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Students list fetched successfully',
                data: studentsWithProgress
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch students list',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Top Performers
     * Route: POST /tpc/students/top-performers
     */
    async getTopPerformers(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const { limit = 10, department } = req.body || {}; // Department filter from request

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            // Get user details
            const userInfo = await this.getUserInfo(userId);

            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            let collegeId = user.person_collage_id || user.collage_id;
            let deptFilter = user.department;

            // Build filter based on role (same logic as getDashboardStats)
            const { ObjectId } = await import('mongodb');
            let studentFilter = {
                person_deleted: false,
                person_status: 'active',
                person_role: { $regex: /^student$/i } // Case-insensitive
            };

            // Use role from user object or JWT
            const finalUserRole = (user.person_role || userRole || '').toLowerCase();
            const normalizedRole = finalUserRole === 'tpc' ? 'tpc' : (finalUserRole === 'depttpc' ? 'depttpc' : null);

            if (normalizedRole === 'tpc') {
                // TPC sees all students in their college
                if (collegeId) {
                    const collegeIdString = collegeId?.toString?.() || collegeId;
                    const collegeIdObject = (typeof collegeIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeIdString))
                        ? new ObjectId(collegeIdString)
                        : (collegeId instanceof ObjectId ? collegeId : null);

                    // Match both ObjectId and string formats (legacy support)
                    studentFilter.person_collage_id = {
                        $in: [
                            ...(collegeIdObject ? [collegeIdObject] : []),
                            collegeIdString
                        ]
                    };
                }

                // Apply department filter if provided (for TPC) - same logic as getDashboardStats
                if (department && department !== 'all') {
                    const deptFilterValue = department.trim();

                    // Check if department value is an ObjectId (legacy case)
                    const isObjectId = typeof deptFilterValue === 'string' && /^[0-9a-fA-F]{24}$/.test(deptFilterValue);
                    let deptObjectId = null;
                    let resolvedDeptId = null;

                    if (isObjectId) {
                        deptObjectId = new ObjectId(deptFilterValue);
                        resolvedDeptId = deptFilterValue;
                    } else {
                        // Department value is a name, need to resolve to department_id
                        const deptResponse = await fetchData(
                            'tblDepartments',
                            { _id: 1, department_name: 1, department_code: 1 },
                            {
                                $or: [
                                    { department_name: deptFilterValue },
                                    { department_code: deptFilterValue },
                                    { department_name: { $regex: new RegExp(`^${deptFilterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                                    { department_code: { $regex: new RegExp(`^${deptFilterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                                ],
                                deleted: false
                            }
                        );

                        if (deptResponse.success && deptResponse.data && deptResponse.data.length > 0) {
                            const dept = deptResponse.data[0];
                            resolvedDeptId = dept._id?.toString() || dept._id;
                            if (resolvedDeptId && /^[0-9a-fA-F]{24}$/.test(resolvedDeptId)) {
                                deptObjectId = new ObjectId(resolvedDeptId);
                            }
                        }
                    }

                    // Build department filter conditions
                    const deptConditions = [];

                    // Match by department name (exact and case-insensitive)
                    const escaped = deptFilterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    deptConditions.push(
                        { department: deptFilterValue },
                        { department: { $regex: new RegExp(`^${escaped}$`, 'i') } }
                    );

                    // Match by department_id (if we resolved it)
                    if (resolvedDeptId) {
                        if (deptObjectId) {
                            deptConditions.push(
                                { department_id: deptObjectId },
                                { department_id: resolvedDeptId }
                            );
                        } else {
                            deptConditions.push({ department_id: resolvedDeptId });
                        }

                        // LEGACY: Also match if department_id was stored in department field
                        deptConditions.push({ department: resolvedDeptId });
                    } else if (isObjectId) {
                        // If value is ObjectId but we couldn't resolve, still try to match
                        deptConditions.push(
                            { department_id: deptObjectId },
                            { department_id: deptFilterValue },
                            { department: deptFilterValue } // Legacy: department_id in department field
                        );
                    }

                    studentFilter.$or = deptConditions;
                }
            } else if (normalizedRole === 'depttpc') {
                // DeptTPC sees only students in their department
                if (collegeId) {
                    const collegeIdString = collegeId?.toString?.() || collegeId;
                    const collegeIdObject = (typeof collegeIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeIdString))
                        ? new ObjectId(collegeIdString)
                        : (collegeId instanceof ObjectId ? collegeId : null);

                    // Match both ObjectId and string formats (legacy support)
                    studentFilter.person_collage_id = {
                        $in: [
                            ...(collegeIdObject ? [collegeIdObject] : []),
                            collegeIdString
                        ]
                    };
                }

                // Resolve department_id for DeptTPC - same logic as getDashboardStats
                let deptIdFilter = user.department_id || null;
                deptFilter = deptFilter || user.department || null;

                // Try to get department_id from PersonMaster if missing
                if (!deptIdFilter) {
                    const personMasterResponse = await fetchData(
                        'tblPersonMaster',
                        { department_id: 1, department: 1 },
                        { _id: userId, person_deleted: false }
                    );

                    if (personMasterResponse.success && personMasterResponse.data && personMasterResponse.data.length > 0) {
                        const person = personMasterResponse.data[0];
                        deptIdFilter = person.department_id || null;
                        if (!deptFilter) {
                            deptFilter = person.department || null;
                        }
                    }
                }

                // Apply department filter - same logic as getDashboardStats
                if (deptFilter || deptIdFilter) {
                    const deptOrConditions = [];

                    // Add department_id filter (handle both ObjectId and string formats)
                    if (deptIdFilter) {
                        const deptIdString = deptIdFilter?.toString?.() || deptIdFilter;
                        let deptIdObject = null;
                        if (typeof deptIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdString)) {
                            deptIdObject = new ObjectId(deptIdString);
                        }

                        // Match department_id field (preferred - correct storage)
                        if (deptIdObject) {
                            deptOrConditions.push(
                                { department_id: deptIdObject },
                                { department_id: deptIdString }
                            );
                        } else {
                            deptOrConditions.push({ department_id: deptIdString });
                        }

                        // LEGACY FIX: Also match department field if it contains ObjectId string
                        if (deptIdString && /^[0-9a-fA-F]{24}$/.test(deptIdString)) {
                            deptOrConditions.push({ department: deptIdString });
                        }
                    }

                    // Add department name/code filter (trimmed)
                    if (deptFilter) {
                        const trimmedDept = deptFilter.trim();
                        deptOrConditions.push(
                            { department: trimmedDept },
                            { department: { $regex: new RegExp(`^${trimmedDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                        );
                    }

                    if (deptOrConditions.length > 0) {
                        studentFilter.$or = deptOrConditions;
                    } else {
                        // If we can't determine department for DeptTPC, return no students instead of leaking data
                        studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
                    }
                } else {
                    // If we can't determine department for DeptTPC, return no students instead of leaking data
                    studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
                }
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC and DeptTPC can access this resource'
                };
                return next();
            }

            // Get students
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                {},
                studentFilter
            );

            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);
            const studentIdStrings = studentIds.map(id => (id && typeof id.toString === 'function' ? id.toString() : String(id)));

            // Get progress data
            const progressResponse = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: { $in: studentIdStrings.length ? studentIdStrings : studentIds } }
            );

            const progressData = progressResponse.success && progressResponse.data ? progressResponse.data : [];

            // Get practice test scores so we can derive average when progress.average_score is missing
            const practiceIds = [...new Set([...studentIdStrings, ...studentIds])];
            const practiceFilter = practiceIds.length ? { student_id: { $in: practiceIds } } : { _id: null };
            const practiceResponse = await fetchData('tblPracticeTest', { student_id: 1, score: 1 }, practiceFilter);
            const practiceTests = practiceResponse.success && practiceResponse.data ? practiceResponse.data : [];
            const avgByStudent = {};
            for (const t of practiceTests) {
                const sid = (t.student_id && typeof t.student_id.toString === 'function' ? t.student_id.toString() : String(t.student_id));
                if (!avgByStudent[sid]) avgByStudent[sid] = { sum: 0, count: 0 };
                avgByStudent[sid].sum += (t.score || 0);
                avgByStudent[sid].count += 1;
            }

            // Combine: use progress.average_score when present, else average from practice tests
            const studentsWithScore = students.map(student => {
                const sid = (student._id && typeof student._id.toString === 'function' ? student._id.toString() : String(student._id));
                const sidAlt = (student.person_id && typeof student.person_id.toString === 'function' ? student.person_id.toString() : String(student.person_id));
                const progress = progressData.find(p =>
                    (String(p.student_id) === sid || String(p.student_id) === sidAlt)
                );
                const practiceAvg = avgByStudent[sid] || avgByStudent[sidAlt];
                const derivedAvg = practiceAvg && practiceAvg.count > 0
                    ? Math.round(practiceAvg.sum / practiceAvg.count)
                    : 0;
                const averageScore = (progress && (progress.average_score !== undefined && progress.average_score !== null && progress.average_score > 0))
                    ? progress.average_score
                    : derivedAvg;
                return {
                    ...student,
                    progress: {
                        ...(progress || {}),
                        average_score: averageScore,
                        total_days_completed: progress?.total_days_completed ?? 0,
                        total_practice_tests: progress?.total_practice_tests ?? (practiceAvg?.count || 0),
                        total_coding_problems: progress?.total_coding_problems ?? 0
                    }
                };
            });

            const topPerformers = studentsWithScore
                .filter(student => student.progress.average_score >= 85)
                .sort((a, b) => b.progress.average_score - a.progress.average_score)
                .slice(0, limit);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Top performers fetched successfully',
                data: topPerformers
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch top performers',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Students Needing Attention
     * Route: POST /tpc/students/needs-attention
     */
    async getStudentsNeedingAttention(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const { department } = req.body || {}; // Department filter from request

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            // Get user details
            const userInfo = await this.getUserInfo(userId);

            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            let collegeId = user.person_collage_id || user.collage_id;
            let deptFilter = user.department;

            // Build filter based on role (same logic as getDashboardStats)
            const { ObjectId } = await import('mongodb');
            let studentFilter = {
                person_deleted: false,
                person_status: 'active',
                person_role: { $regex: /^student$/i } // Case-insensitive
            };

            // Use role from user object or JWT
            const finalUserRole = (user.person_role || userRole || '').toLowerCase();
            const normalizedRole = finalUserRole === 'tpc' ? 'tpc' : (finalUserRole === 'depttpc' ? 'depttpc' : null);

            if (normalizedRole === 'tpc') {
                // TPC sees all students in their college
                if (collegeId) {
                    const collegeIdString = collegeId?.toString?.() || collegeId;
                    const collegeIdObject = (typeof collegeIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeIdString))
                        ? new ObjectId(collegeIdString)
                        : (collegeId instanceof ObjectId ? collegeId : null);

                    // Match both ObjectId and string formats (legacy support)
                    studentFilter.person_collage_id = {
                        $in: [
                            ...(collegeIdObject ? [collegeIdObject] : []),
                            collegeIdString
                        ]
                    };
                }

                // Apply department filter if provided (for TPC) - same logic as getDashboardStats
                if (department && department !== 'all') {
                    const deptFilterValue = department.trim();

                    // Check if department value is an ObjectId (legacy case)
                    const isObjectId = typeof deptFilterValue === 'string' && /^[0-9a-fA-F]{24}$/.test(deptFilterValue);
                    let deptObjectId = null;
                    let resolvedDeptId = null;

                    if (isObjectId) {
                        deptObjectId = new ObjectId(deptFilterValue);
                        resolvedDeptId = deptFilterValue;
                    } else {
                        // Department value is a name, need to resolve to department_id
                        const deptResponse = await fetchData(
                            'tblDepartments',
                            { _id: 1, department_name: 1, department_code: 1 },
                            {
                                $or: [
                                    { department_name: deptFilterValue },
                                    { department_code: deptFilterValue },
                                    { department_name: { $regex: new RegExp(`^${deptFilterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                                    { department_code: { $regex: new RegExp(`^${deptFilterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                                ],
                                deleted: false
                            }
                        );

                        if (deptResponse.success && deptResponse.data && deptResponse.data.length > 0) {
                            const dept = deptResponse.data[0];
                            resolvedDeptId = dept._id?.toString() || dept._id;
                            if (resolvedDeptId && /^[0-9a-fA-F]{24}$/.test(resolvedDeptId)) {
                                deptObjectId = new ObjectId(resolvedDeptId);
                            }
                        }
                    }

                    // Build department filter conditions
                    const deptConditions = [];

                    // Match by department name (exact and case-insensitive)
                    const escaped = deptFilterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    deptConditions.push(
                        { department: deptFilterValue },
                        { department: { $regex: new RegExp(`^${escaped}$`, 'i') } }
                    );

                    // Match by department_id (if we resolved it)
                    if (resolvedDeptId) {
                        if (deptObjectId) {
                            deptConditions.push(
                                { department_id: deptObjectId },
                                { department_id: resolvedDeptId }
                            );
                        } else {
                            deptConditions.push({ department_id: resolvedDeptId });
                        }

                        // LEGACY: Also match if department_id was stored in department field
                        deptConditions.push({ department: resolvedDeptId });
                    } else if (isObjectId) {
                        // If value is ObjectId but we couldn't resolve, still try to match
                        deptConditions.push(
                            { department_id: deptObjectId },
                            { department_id: deptFilterValue },
                            { department: deptFilterValue } // Legacy: department_id in department field
                        );
                    }

                    studentFilter.$or = deptConditions;
                }
            } else if (normalizedRole === 'depttpc') {
                // DeptTPC sees only students in their department
                if (collegeId) {
                    const collegeIdString = collegeId?.toString?.() || collegeId;
                    const collegeIdObject = (typeof collegeIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeIdString))
                        ? new ObjectId(collegeIdString)
                        : (collegeId instanceof ObjectId ? collegeId : null);

                    // Match both ObjectId and string formats (legacy support)
                    studentFilter.person_collage_id = {
                        $in: [
                            ...(collegeIdObject ? [collegeIdObject] : []),
                            collegeIdString
                        ]
                    };
                }

                // Resolve department_id for DeptTPC - same logic as getDashboardStats
                let deptIdFilter = user.department_id || null;
                deptFilter = deptFilter || user.department || null;

                // Try to get department_id from PersonMaster if missing
                if (!deptIdFilter) {
                    const personMasterResponse = await fetchData(
                        'tblPersonMaster',
                        { department_id: 1, department: 1 },
                        { _id: userId, person_deleted: false }
                    );

                    if (personMasterResponse.success && personMasterResponse.data && personMasterResponse.data.length > 0) {
                        const person = personMasterResponse.data[0];
                        deptIdFilter = person.department_id || null;
                        if (!deptFilter) {
                            deptFilter = person.department || null;
                        }
                    }
                }

                // Apply department filter - same logic as getDashboardStats
                if (deptFilter || deptIdFilter) {
                    const deptOrConditions = [];

                    // Add department_id filter (handle both ObjectId and string formats)
                    if (deptIdFilter) {
                        const deptIdString = deptIdFilter?.toString?.() || deptIdFilter;
                        let deptIdObject = null;
                        if (typeof deptIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdString)) {
                            deptIdObject = new ObjectId(deptIdString);
                        }

                        // Match department_id field (preferred - correct storage)
                        if (deptIdObject) {
                            deptOrConditions.push(
                                { department_id: deptIdObject },
                                { department_id: deptIdString }
                            );
                        } else {
                            deptOrConditions.push({ department_id: deptIdString });
                        }

                        // LEGACY FIX: Also match department field if it contains ObjectId string
                        if (deptIdString && /^[0-9a-fA-F]{24}$/.test(deptIdString)) {
                            deptOrConditions.push({ department: deptIdString });
                        }
                    }

                    // Add department name/code filter (trimmed)
                    if (deptFilter) {
                        const trimmedDept = deptFilter.trim();
                        deptOrConditions.push(
                            { department: trimmedDept },
                            { department: { $regex: new RegExp(`^${trimmedDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                        );
                    }

                    if (deptOrConditions.length > 0) {
                        studentFilter.$or = deptOrConditions;
                    } else {
                        // If we can't determine department for DeptTPC, return no students instead of leaking data
                        studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
                    }
                } else {
                    // If we can't determine department for DeptTPC, return no students instead of leaking data
                    studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
                }
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC and DeptTPC can access this resource'
                };
                return next();
            }

            // Get students
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                {},
                studentFilter
            );

            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);

            // Get progress data
            const progressResponse = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: { $in: studentIds } }
            );

            const progressData = progressResponse.success && progressResponse.data ? progressResponse.data : [];

            // FALLBACK: Get practice test data to derive scores when progress is empty/null
            const studentIdStrings = studentIds.map(id => (id && typeof id.toString === 'function' ? id.toString() : String(id)));
            const practiceFilter = studentIdStrings.length ? { student_id: { $in: studentIdStrings } } : { _id: null };
            const practiceResponse = await fetchData('tblPracticeTest', { student_id: 1, score: 1 }, practiceFilter);
            const practiceTests = practiceResponse.success && practiceResponse.data ? practiceResponse.data : [];

            // Calculate average by student from practice tests
            const avgByStudent = {};
            for (const t of practiceTests) {
                const sid = (t.student_id && typeof t.student_id.toString === 'function' ? t.student_id.toString() : String(t.student_id));
                if (!avgByStudent[sid]) avgByStudent[sid] = { sum: 0, count: 0 };
                avgByStudent[sid].sum += (t.score || 0);
                avgByStudent[sid].count += 1;
            }

            // Find students needing attention: derive score from progress OR practice tests, then filter by score < 50
            const needsAttention = students
                .map(student => {
                    const sid = (student._id && typeof student._id.toString === 'function' ? student._id.toString() : String(student._id));
                    const progress = progressData.find(p =>
                        (String(p.student_id) === sid || String(p.student_id) === String(student.person_id))
                    );

                    // Get score from progress OR derive from practice tests
                    let studentScore = null;
                    if (progress && progress.average_score !== undefined && progress.average_score !== null && progress.average_score > 0) {
                        studentScore = progress.average_score;
                    } else {
                        // Fallback: calculate from practice tests
                        const practice = avgByStudent[sid];
                        if (practice && practice.count > 0) {
                            studentScore = Math.round(practice.sum / practice.count);
                        }
                    }

                    return {
                        ...student,
                        progress: progress ? {
                            ...progress,
                            average_score: studentScore || 0
                        } : {
                            average_score: studentScore || 0,
                            total_practice_tests: avgByStudent[sid]?.count || 0
                        }
                    };
                })
                .filter(student => {
                    // Only include students with score < 50 OR no score at all
                    const score = student.progress?.average_score;
                    return score === null || score === 0 || score < 50;
                })
                .slice(0, 20); // Limit to 20

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Students needing attention fetched successfully',
                data: needsAttention
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch students needing attention',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Departments List for TPC College
     * Route: POST /tpc-college/departments/list
     */
    async getDepartmentsList(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const userCollegeId = req.user?.college_id || req.user?.collegeId;

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'TPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC can access this resource'
                };
                return next();
            }

            // Get user details
            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const collegeId = userInfo.user.collage_id || userCollegeId;
            if (!collegeId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID not found',
                    error: 'College information missing'
                };
                return next();
            }

            // Get all unique departments from students in this college
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                { department: 1 },
                {
                    person_collage_id: collegeId,
                    person_deleted: false,
                    person_role: 'Student',
                    department: { $exists: true, $ne: null, $ne: '' }
                }
            );

            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];

            // Extract unique departments
            const departmentsSet = new Set();
            students.forEach(student => {
                if (student.department && student.department.trim()) {
                    departmentsSet.add(student.department.trim());
                }
            });

            const departments = Array.from(departmentsSet).sort().map(dept => ({
                name: dept,
                code: dept, // You can enhance this to get department code from tblDepartments if needed
                value: dept // Add value field for frontend compatibility
            }));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Departments list fetched successfully',
                data: departments
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch departments list',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Department Performance Analytics
     * For TPC: Compare all departments in college
     * Route: POST /tpc-college/analytics/department-performance
     */
    async getDepartmentPerformance(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const userCollegeId = req.user?.college_id || req.user?.collegeId;
            const { department } = req.body || {};

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'TPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC can access this resource'
                };
                return next();
            }

            // Get user details
            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const collegeId = userInfo.user.collage_id || userCollegeId;
            if (!collegeId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID not found',
                    error: 'College information missing'
                };
                return next();
            }

            // Normalize collegeId: match both ObjectId and string formats (legacy)
            const { ObjectId } = await import('mongodb');
            const collegeIdString = collegeId?.toString?.() || collegeId;
            const collegeIdObject = (typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId))
                ? new ObjectId(collegeId)
                : (collegeId instanceof ObjectId ? collegeId : null);

            // Get all students in college
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                { department: 1, department_id: 1, person_name: 1, person_email: 1, person_status: 1 },
                {
                    person_collage_id: {
                        $in: [
                            ...(collegeIdObject ? [collegeIdObject] : []),
                            collegeIdString
                        ]
                    },
                    person_deleted: false,
                    person_status: 'active',
                    person_role: { $regex: /^student$/i },
                    ...(department && department !== 'all'
                        ? { $or: [{ department: department }, { department_id: department }] }
                        : {})
                }
            );

            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);
            const studentIdStrings = studentIds.map(id => id?.toString?.() || id).filter(Boolean);

            // Get progress data
            const progressResponse = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: { $in: studentIdStrings } }
            );
            const progressData = progressResponse.success && progressResponse.data ? progressResponse.data : [];

            // Get practice test data
            const practiceTestResponse = await fetchData(
                'tblPracticeTest',
                { student_id: 1, score: 1, week: 1, day: 1 },
                { student_id: { $in: studentIdStrings } }
            );
            const practiceTests = practiceTestResponse.success && practiceTestResponse.data ? practiceTestResponse.data : [];

            // First, get all departments assigned to this college from tblDepartments
            const collegeIdFilter = collegeIdObject || collegeIdString;

            // Get college info to check collage_departments array
            const collegeResponse = await fetchData(
                'tblCollage',
                { collage_departments: 1 },
                { _id: collegeIdFilter, deleted: false }
            );

            const college = collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0
                ? collegeResponse.data[0]
                : null;

            const collegeDepartmentIds = college?.collage_departments || [];

            // Get departments from tblDepartments
            let departmentFilter = {
                department_status: 1,
                deleted: false
            };

            if (collegeDepartmentIds.length > 0) {
                // Convert department IDs to ObjectId if they're strings
                const departmentObjectIds = collegeDepartmentIds.map(id => {
                    if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
                        return new ObjectId(id);
                    }
                    return id;
                });
                // Match by _id (MongoDB's default _id field)
                departmentFilter._id = { $in: departmentObjectIds };
            } else {
                departmentFilter.$or = [
                    { collage_id: collegeIdFilter },
                    { department_college_id: collegeIdFilter }
                ];
            }

            const departmentsResponse = await fetchData(
                'tblDepartments',
                { _id: 1, department_name: 1, department_code: 1 },
                departmentFilter
            );

            const officialDepartments = departmentsResponse.success && departmentsResponse.data ? departmentsResponse.data : [];

            // Build departmentId â†’ departmentName map (and also allow lookup by name)
            const deptIdToName = new Map();
            officialDepartments.forEach(dept => {
                const name = (dept.department_name || dept.department_code || '').trim();
                const idStr = dept._id?.toString?.() || null;
                if (idStr && name) deptIdToName.set(idStr, name);
            });

            // Initialize department stats for all official departments (keyed by NAME)
            const departmentStats = {};
            officialDepartments.forEach(dept => {
                const deptName = dept.department_name || dept.department_code || '';
                if (deptName && deptName.trim()) {
                    departmentStats[deptName.trim()] = {
                        department: deptName.trim(),
                        department_id: dept._id?.toString?.() || null,
                        totalStudents: 0,
                        activeStudents: 0,
                        totalScores: [],
                        totalTests: 0,
                        totalDaysCompleted: 0,
                        students: []
                    };
                }
            });

            // Group students by department
            students.forEach(student => {
                // Normalize department label:
                // - If student.department_id exists, map to name
                // - Else if student.department looks like ObjectId, map to name
                // - Else treat student.department as name/code
                const rawDeptId = student.department_id?.toString?.() || null;
                const rawDept = (student.department || '').toString().trim();
                const looksLikeId = rawDept && /^[0-9a-fA-F]{24}$/.test(rawDept);
                const resolvedName =
                    (rawDeptId && deptIdToName.get(rawDeptId)) ||
                    (looksLikeId && deptIdToName.get(rawDept)) ||
                    (rawDept || 'Unknown');
                const deptKey = resolvedName;

                if (!departmentStats[deptKey]) {
                    departmentStats[deptKey] = {
                        department: deptKey,
                        department_id: rawDeptId || (looksLikeId ? rawDept : null),
                        totalStudents: 0,
                        activeStudents: 0,
                        totalScores: [],
                        totalTests: 0,
                        totalDaysCompleted: 0,
                        students: []
                    };
                }

                departmentStats[deptKey].totalStudents++;
                if (student.person_status === 'active') {
                    departmentStats[deptKey].activeStudents++;
                }

                const progress = progressData.find(p =>
                    (p.student_id === (student._id?.toString?.() || student._id) || p.student_id === (student.person_id?.toString?.() || student.person_id))
                );

                if (progress) {
                    if (progress.average_score) {
                        departmentStats[deptKey].totalScores.push(progress.average_score);
                    }
                    departmentStats[deptKey].totalDaysCompleted += progress.total_days_completed || 0;
                }

                const deptTests = practiceTests.filter(t =>
                    (t.student_id === (student._id?.toString?.() || student._id) || t.student_id === (student.person_id?.toString?.() || student.person_id))
                );
                departmentStats[deptKey].totalTests += deptTests.length;

                if (deptTests.length > 0) {
                    const avgTestScore = deptTests.reduce((sum, t) => sum + (t.score || 0), 0) / deptTests.length;
                    if (!departmentStats[deptKey].totalScores.includes(avgTestScore)) {
                        departmentStats[deptKey].totalScores.push(avgTestScore);
                    }
                }
            });

            // Calculate averages and format
            const departmentPerformance = Object.values(departmentStats).map(dept => ({
                department: dept.department,
                department_id: dept.department_id || null,
                totalStudents: dept.totalStudents,
                activeStudents: dept.activeStudents,
                averageScore: dept.totalScores.length > 0
                    ? Math.round(dept.totalScores.reduce((a, b) => a + b, 0) / dept.totalScores.length)
                    : 0,
                totalTests: dept.totalTests,
                totalDaysCompleted: dept.totalDaysCompleted,
                engagementRate: dept.totalStudents > 0
                    ? Math.round((dept.activeStudents / dept.totalStudents) * 100)
                    : 0
            })).sort((a, b) => b.averageScore - a.averageScore);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Department performance fetched successfully',
                data: departmentPerformance
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch department performance',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Performance Trends
     * Route: POST /tpc-college/analytics/trends
     */
    async getPerformanceTrends(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const { weeks = 8, department } = req.body || {};

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'TPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC can access this resource'
                };
                return next();
            }

            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const collegeId = userInfo.user.collage_id;
            if (!collegeId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID not found',
                    error: 'College information missing'
                };
                return next();
            }

            // Build student filter
            let studentFilter = {
                person_collage_id: collegeId,
                person_deleted: false,
                person_status: 'active',
                person_role: 'Student'
            };
            if (department && department !== 'all') {
                studentFilter.department = department;
            }

            const studentsResponse = await fetchData('tblPersonMaster', {}, studentFilter);
            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);

            // Get practice tests grouped by week
            const practiceTestResponse = await fetchData(
                'tblPracticeTest',
                { week: 1, score: 1, student_id: 1, completed_at: 1 },
                {
                    student_id: { $in: studentIds },
                    week: { $lte: weeks }
                }
            );
            const practiceTests = practiceTestResponse.success && practiceTestResponse.data ? practiceTestResponse.data : [];

            // Group by week
            const weeklyTrends = [];
            for (let week = 1; week <= weeks; week++) {
                const weekTests = practiceTests.filter(t => t.week === week);
                const avgScore = weekTests.length > 0
                    ? Math.round(weekTests.reduce((sum, t) => sum + (t.score || 0), 0) / weekTests.length)
                    : 0;

                weeklyTrends.push({
                    week,
                    averageScore: avgScore,
                    totalTests: weekTests.length,
                    studentsParticipated: new Set(weekTests.map(t => t.student_id)).size
                });
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Performance trends fetched successfully',
                data: weeklyTrends
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch performance trends',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Test List and Results
     * Route: POST /tpc-college/tests/list
     */
    async getTestsList(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const { status, dateFrom, dateTo, department } = req.body || {};

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'TPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC can access this resource'
                };
                return next();
            }

            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const collegeIdRaw = userInfo.user.person_collage_id || userInfo.user.collage_id || userInfo.user.college_id;
            const collegeId = collegeIdRaw?.toString?.() || collegeIdRaw;
            if (!collegeId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID not found',
                    error: 'College information missing'
                };
                return next();
            }

            // Build student filter
            let studentFilter = {
                // Confirm tenant by college (tblCollage._id) - support string/ObjectId storage
                person_collage_id: { $in: [collegeId].filter(Boolean) },
                person_deleted: false,
                person_role: { $regex: /^student$/i }
            };

            // Apply department filter if provided
            if (department && department !== 'all') {
                studentFilter.department = department;
            }

            // Get all students in college (filtered by department if specified)
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                { _id: 1 },
                studentFilter
            );
            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);

            // Build filter for practice tests
            // Tenant confirmation on practice tests too (college_id is now present on docs)
            let testFilter = { student_id: { $in: studentIds }, college_id: collegeId };
            if (dateFrom || dateTo) {
                testFilter.completed_at = {};
                if (dateFrom) testFilter.completed_at.$gte = new Date(dateFrom);
                if (dateTo) testFilter.completed_at.$lte = new Date(dateTo);
            }

            // Get practice tests
            const practiceTestResponse = await fetchData(
                'tblPracticeTest',
                {},
                testFilter,
                { sort: { completed_at: -1 } }
            );
            const tests = practiceTestResponse.success && practiceTestResponse.data ? practiceTestResponse.data : [];

            // Group tests by week and day
            const testGroups = {};
            tests.forEach(test => {
                const key = `Week ${test.week} - Day ${test.day}`;
                if (!testGroups[key]) {
                    testGroups[key] = {
                        week: test.week,
                        day: test.day,
                        tests: [],
                        totalStudents: 0,
                        averageScore: 0,
                        totalAttempts: 0
                    };
                }
                testGroups[key].tests.push(test);
                testGroups[key].totalAttempts++;
            });

            // Calculate statistics for each group
            const testList = Object.values(testGroups).map(group => {
                const scores = group.tests.map(t => t.score || 0);
                const uniqueStudents = new Set(group.tests.map(t => (t.student_id?.toString?.() || String(t.student_id))));

                return {
                    week: group.week,
                    day: group.day,
                    testName: `Week ${group.week} - Day ${group.day} Practice Test`,
                    totalAttempts: group.totalAttempts,
                    studentsParticipated: uniqueStudents.size,
                    averageScore: scores.length > 0
                        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                        : 0,
                    highestScore: Math.max(...scores, 0),
                    lowestScore: Math.min(...scores, 0),
                    passRate: scores.length > 0
                        ? Math.round((scores.filter(s => s >= 50).length / scores.length) * 100)
                        : 0
                };
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Tests list fetched successfully',
                data: testList
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch tests list',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Test Results for a specific test
     * Route: POST /tpc-college/tests/results
     */
    async getTestResults(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const { week, day, department } = req.body || {};

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'TPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC can access this resource'
                };
                return next();
            }

            if (!week || !day) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Week and day are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const collegeIdRaw = userInfo.user.person_collage_id || userInfo.user.collage_id || userInfo.user.college_id;
            const collegeId = collegeIdRaw?.toString?.() || collegeIdRaw;
            if (!collegeId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID not found',
                    error: 'College information missing'
                };
                return next();
            }

            // Get students
            let studentFilter = {
                // Confirm tenant by college (tblCollage._id) - support string/ObjectId storage
                person_collage_id: { $in: [collegeId].filter(Boolean) },
                person_deleted: false,
                person_role: { $regex: /^student$/i }
            };
            if (department && department !== 'all') {
                studentFilter.department = department;
            }

            const studentsResponse = await fetchData('tblPersonMaster', {}, studentFilter);
            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);

            // Get test results
            const testResponse = await fetchData(
                'tblPracticeTest',
                {},
                {
                    student_id: { $in: studentIds },
                    // Tenant confirmation: only this college's tests
                    college_id: collegeId,
                    week: week,
                    day: day
                },
                { sort: { score: -1 } }
            );
            const tests = testResponse.success && testResponse.data ? testResponse.data : [];

            // Combine with student data
            const results = tests.map(test => {
                const student = students.find(s =>
                    (s._id === test.student_id || s.person_id === test.student_id)
                );
                return {
                    studentId: test.student_id,
                    studentName: student?.person_name || 'Unknown',
                    studentEmail: student?.person_email || '',
                    department: student?.department || '',
                    enrollmentNumber: student?.enrollment_number || '',
                    score: test.score || 0,
                    totalQuestions: test.total_questions || 0,
                    correctAnswers: test.correct_answers || 0,
                    incorrectAnswers: test.incorrect_answers || 0,
                    timeSpent: test.time_spent || 0,
                    attempt: test.attempt || 1,
                    completedAt: test.completed_at || test.created_at
                };
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Test results fetched successfully',
                data: {
                    week,
                    day,
                    testName: `Week ${week} - Day ${day} Practice Test`,
                    totalStudents: results.length,
                    averageScore: results.length > 0
                        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
                        : 0,
                    passRate: results.length > 0
                        ? Math.round((results.filter(r => r.score >= 50).length / results.length) * 100)
                        : 0,
                    results
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch test results',
                error: error.message
            };
            next();
        }
    }

    /**
     * Generate Report
     * Route: POST /tpc-college/reports/generate
     */
    async generateReport(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const { reportType, dateFrom, dateTo, department } = req.body || {};

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'TPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC can access this resource'
                };
                return next();
            }

            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const collegeIdRaw = userInfo.user.person_collage_id || userInfo.user.collage_id || userInfo.user.college_id;
            const collegeId = collegeIdRaw?.toString?.() || collegeIdRaw;
            if (!collegeId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID not found',
                    error: 'College information missing'
                };
                return next();
            }

            // Get students
            let studentFilter = {
                // Tenant confirmation: restrict to this college (tblCollage._id)
                person_collage_id: { $in: [collegeId].filter(Boolean) },
                person_deleted: false,
                person_role: { $regex: /^student$/i }
            };
            if (department && department !== 'all') {
                studentFilter.department = department;
            }

            const studentsResponse = await fetchData('tblPersonMaster', {}, studentFilter);
            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);

            // Get progress data
            const progressResponse = await fetchData(
                'tblStudentProgress',
                {},
                {
                    student_id: { $in: studentIds },
                    // Tenant confirmation on progress docs too (new fields)
                    college_id: collegeId
                }
            );
            const progressData = progressResponse.success && progressResponse.data ? progressResponse.data : [];

            // Get practice tests
            let testFilter = { student_id: { $in: studentIds }, college_id: collegeId };
            if (dateFrom || dateTo) {
                testFilter.completed_at = {};
                if (dateFrom) testFilter.completed_at.$gte = new Date(dateFrom);
                if (dateTo) testFilter.completed_at.$lte = new Date(dateTo);
            }

            const practiceTestResponse = await fetchData('tblPracticeTest', {}, testFilter);
            const practiceTests = practiceTestResponse.success && practiceTestResponse.data ? practiceTestResponse.data : [];

            // Generate report based on type
            let reportData = {};

            if (reportType === 'performance' || !reportType) {
                // Performance Summary Report
                const studentsWithProgress = students.map(student => {
                    const progress = progressData.find(p =>
                        (p.student_id === student._id || p.student_id === student.person_id)
                    );
                    const studentTests = practiceTests.filter(t =>
                        (t.student_id === student._id || t.student_id === student.person_id)
                    );
                    const avgTestScore = studentTests.length > 0
                        ? Math.round(studentTests.reduce((sum, t) => sum + (t.score || 0), 0) / studentTests.length)
                        : 0;

                    return {
                        name: student.person_name,
                        email: student.person_email,
                        department: student.department || '',
                        enrollmentNumber: student.enrollment_number || '',
                        averageScore: progress?.average_score || avgTestScore || 0,
                        daysCompleted: progress?.total_days_completed || 0,
                        testsCompleted: studentTests.length,
                        status: student.person_status
                    };
                });

                reportData = {
                    reportType: 'performance',
                    generatedAt: new Date().toISOString(),
                    dateRange: { from: dateFrom, to: dateTo },
                    summary: {
                        totalStudents: students.length,
                        activeStudents: students.filter(s => s.person_status === 'active').length,
                        averageScore: studentsWithProgress.length > 0
                            ? Math.round(studentsWithProgress.reduce((sum, s) => sum + s.averageScore, 0) / studentsWithProgress.length)
                            : 0,
                        totalTests: practiceTests.length
                    },
                    students: studentsWithProgress.sort((a, b) => b.averageScore - a.averageScore)
                };
            } else if (reportType === 'department') {
                // Department Comparison Report
                const deptStats = {};
                students.forEach(student => {
                    const dept = student.department || 'Unknown';
                    if (!deptStats[dept]) {
                        deptStats[dept] = {
                            department: dept,
                            students: [],
                            totalStudents: 0,
                            totalScores: []
                        };
                    }
                    deptStats[dept].students.push(student);
                    deptStats[dept].totalStudents++;

                    const progress = progressData.find(p =>
                        (p.student_id === student._id || p.student_id === student.person_id)
                    );
                    if (progress?.average_score) {
                        deptStats[dept].totalScores.push(progress.average_score);
                    }
                });

                reportData = {
                    reportType: 'department',
                    generatedAt: new Date().toISOString(),
                    departments: Object.values(deptStats).map(dept => ({
                        department: dept.department,
                        totalStudents: dept.totalStudents,
                        averageScore: dept.totalScores.length > 0
                            ? Math.round(dept.totalScores.reduce((a, b) => a + b, 0) / dept.totalScores.length)
                            : 0
                    })).sort((a, b) => b.averageScore - a.averageScore)
                };
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Report generated successfully',
                data: reportData
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to generate report',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Departments List for a College
     * For TPC: Get all departments in their college
     * Route: POST /tpc-college/departments/list
     */
    async getDepartmentsList(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'TPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only TPC can access this resource'
                };
                return next();
            }

            // Get user details
            const userInfo = await this.getUserInfo(userId);

            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            const collegeId = user.person_collage_id || user.collage_id;

            if (!collegeId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID not found',
                    error: 'College information missing'
                };
                return next();
            }

            // First, try to get departments from tblDepartments table (official departments assigned to college)
            const { ObjectId } = await import('mongodb');
            const collegeIdFilter = typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
                ? new ObjectId(collegeId)
                : collegeId;

            // Get college info to check collage_departments array
            const collegeResponse = await fetchData(
                'tblCollage',
                { collage_departments: 1 },
                { _id: collegeIdFilter, deleted: false }
            );

            const college = collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0
                ? collegeResponse.data[0]
                : null;

            const collegeDepartmentIds = college?.collage_departments || [];

            // Get departments from tblDepartments that are assigned to this college
            // Check multiple possible fields: collage_id, department_college_id, or in collage_departments array
            let departmentFilter = {
                department_status: 1,
                deleted: false
            };

            // If college has collage_departments array, use it
            // collage_departments contains _id values (ObjectIds) of departments
            if (collegeDepartmentIds.length > 0) {
                // Convert department IDs to ObjectId if they're strings
                const departmentObjectIds = collegeDepartmentIds.map(id => {
                    if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
                        return new ObjectId(id);
                    }
                    return id;
                });
                // Match by _id (MongoDB's default _id field)
                departmentFilter._id = { $in: departmentObjectIds };
            } else {
                // Otherwise, check collage_id or department_college_id
                departmentFilter.$or = [
                    { collage_id: collegeIdFilter },
                    { department_college_id: collegeIdFilter }
                ];
            }

            const departmentsResponse = await fetchData(
                'tblDepartments',
                { department_name: 1, department_code: 1, department_id: 1 },
                departmentFilter
            );

            const officialDepartments = departmentsResponse.success && departmentsResponse.data ? departmentsResponse.data : [];

            // Also get unique departments from students in this college (in case some departments have students but aren't in tblDepartments)
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                { department: 1 },
                {
                    person_collage_id: collegeIdFilter,
                    person_deleted: false,
                    person_role: 'Student',
                    department: { $exists: true, $ne: null, $ne: '' }
                }
            );

            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];

            // Combine departments from both sources
            const departmentMap = new Map();

            // Add official departments from tblDepartments
            officialDepartments.forEach(dept => {
                const deptName = dept.department_name || dept.department_code || '';
                if (deptName && deptName.trim()) {
                    departmentMap.set(deptName.trim(), {
                        name: deptName.trim(),
                        value: deptName.trim(),
                        code: dept.department_code || ''
                    });
                }
            });

            // Add departments from students (in case some aren't in tblDepartments)
            students.forEach(student => {
                if (student.department && student.department.trim()) {
                    const deptName = student.department.trim();
                    if (!departmentMap.has(deptName)) {
                        departmentMap.set(deptName, {
                            name: deptName,
                            value: deptName,
                            code: ''
                        });
                    }
                }
            });

            const departments = Array.from(departmentMap.values()).sort((a, b) => a.name.localeCompare(b.name));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Departments fetched successfully',
                data: departments
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch departments',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Department Performance Analytics (for DeptTPC)
     * For DeptTPC: Their department performance only
     * Route: POST /tpc-dept/analytics/performance
     */
    async getDeptTPCPerformance(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'DeptTPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only DeptTPC can access this resource'
                };
                return next();
            }

            // Get user details
            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            let collegeId = user.person_collage_id || user.collage_id;
            let deptFilter = user.department;
            let deptIdFilter = user.department_id || (typeof user.department === 'string' && /^[0-9a-fA-F]{24}$/.test(user.department) ? user.department : null);

            if (!collegeId || (!deptFilter && !deptIdFilter)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID or Department info not found',
                    error: 'Department information missing'
                };
                return next();
            }

            const { ObjectId } = await import('mongodb');
            const collegeIdString = collegeId?.toString?.() || collegeId || null;
            let collegeIdObject = null;
            if (collegeId && typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)) {
                collegeIdObject = new ObjectId(collegeId);
            } else if (collegeId && typeof collegeId === 'object' && collegeId.toString) {
                collegeIdObject = collegeId;
            }

            // Resolve department_id same as generateDeptTPCReport (PersonMaster, college, tblDepartments)
            if (deptFilter && typeof deptFilter === 'string') deptFilter = deptFilter.trim();
            if (!deptIdFilter && deptFilter) {
                const personMasterResponse = await fetchData('tblPersonMaster', { department_id: 1 }, { _id: userId, person_deleted: false });
                if (personMasterResponse.success && personMasterResponse.data && personMasterResponse.data.length > 0 && personMasterResponse.data[0].department_id) {
                    deptIdFilter = personMasterResponse.data[0].department_id;
                }
            }
            if (!deptIdFilter && deptFilter && collegeIdString) {
                const collegeResponse = await fetchData('tblCollage', { collage_departments: 1, departments: 1 }, { _id: collegeIdObject || collegeIdString, deleted: false });
                const college = collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0 ? collegeResponse.data[0] : null;
                if (college?.departments && Array.isArray(college.departments)) {
                    const target = deptFilter.trim().toLowerCase();
                    const match = college.departments.find(d => {
                        const dn = (d.department_name || '').trim().toLowerCase();
                        const dc = (d.department_code || '').trim().toLowerCase();
                        return dn === target || dc === target;
                    });
                    if (match?.department_id) deptIdFilter = match.department_id?.toString?.() || match.department_id;
                }
                if (!deptIdFilter && college?.collage_departments && Array.isArray(college.collage_departments) && college.collage_departments.length > 0) {
                    const deptObjectIds = college.collage_departments.map(id => (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id));
                    const deptListResp = await fetchData('tblDepartments', { _id: 1, department_name: 1, department_code: 1 }, { _id: { $in: deptObjectIds }, deleted: false });
                    if (deptListResp.success && Array.isArray(deptListResp.data)) {
                        const target = deptFilter.trim().toLowerCase();
                        const deptMatch = deptListResp.data.find(d => {
                            const dn = (d.department_name || '').trim().toLowerCase();
                            const dc = (d.department_code || '').trim().toLowerCase();
                            return dn === target || dc === target;
                        });
                        if (deptMatch?._id) {
                            deptIdFilter = deptMatch._id?.toString?.() || deptMatch._id;
                            deptFilter = deptMatch.department_name || deptMatch.department_code || deptFilter;
                        }
                    }
                }
                if (!deptIdFilter) {
                    const escaped = deptFilter.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const deptLookupFilter = {
                        $and: [
                            { $or: [{ department_name: deptFilter.trim() }, { department_code: deptFilter.trim() }, { department_name: { $regex: new RegExp(`^${escaped}$`, 'i') } }, { department_code: { $regex: new RegExp(`^${escaped}$`, 'i') } }] },
                            { $or: [{ collage_id: collegeIdString }, { department_college_id: collegeIdString }, ...(collegeIdObject ? [{ collage_id: collegeIdObject }, { department_college_id: collegeIdObject }] : [])] }
                        ]
                    };
                    const deptResponse = await fetchData('tblDepartments', { _id: 1, department_name: 1, department_code: 1 }, deptLookupFilter);
                    if (deptResponse.success && Array.isArray(deptResponse.data) && deptResponse.data.length > 0) {
                        const dept = deptResponse.data[0];
                        deptIdFilter = dept._id?.toString?.() || dept._id || null;
                        deptFilter = dept.department_name || dept.department_code || deptFilter;
                    }
                }
            }

            const department = deptFilter;
            const studentFilter = {
                person_deleted: false,
                person_role: { $regex: /^student$/i }
            };
            if (collegeIdString) {
                studentFilter.person_collage_id = { $in: [...(collegeIdObject ? [collegeIdObject] : []), collegeIdString] };
            }
            const deptOrConditions = [];
            if (deptIdFilter) {
                const deptIdString = deptIdFilter?.toString?.() || deptIdFilter;
                const deptIdObject = typeof deptIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdString) ? new ObjectId(deptIdString) : null;
                if (deptIdObject) {
                    deptOrConditions.push({ department_id: deptIdObject }, { department_id: deptIdString });
                    deptOrConditions.push({ department: deptIdString });
                } else {
                    deptOrConditions.push({ department_id: deptIdString });
                }
            }
            if (deptFilter) {
                const trimmedDept = (typeof deptFilter === 'string' ? deptFilter : '').trim();
                if (trimmedDept) {
                    deptOrConditions.push(
                        { department: trimmedDept },
                        { department: { $regex: new RegExp(`^${trimmedDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                    );
                }
            }
            if (deptOrConditions.length > 0) {
                studentFilter.$or = deptOrConditions;
            } else {
                studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
            }

            const studentsResponse = await fetchData('tblPersonMaster', { department: 1, person_name: 1, person_email: 1, person_status: 1 }, studentFilter);
            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);
            const studentIdStrings = studentIds.map(id => (id && typeof id === 'object' && typeof id.toString === 'function') ? id.toString() : String(id));
            const studentIdObjectIds = studentIds.filter(id => id && (typeof id === 'object' || (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)))).map(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id).filter(id => id && typeof id === 'object');

            const studentIdOrConditions = [];
            if (studentIdStrings.length) studentIdOrConditions.push({ student_id: { $in: studentIdStrings } });
            if (studentIdObjectIds.length) studentIdOrConditions.push({ student_id: { $in: studentIdObjectIds } });
            const progressFilter = studentIdOrConditions.length ? { $or: studentIdOrConditions } : { student_id: '__NO_STUDENT__' };
            const testFilter = studentIdOrConditions.length ? { $or: [...studentIdOrConditions] } : { student_id: '__NO_STUDENT__' };

            const progressResponse = await fetchData('tblStudentProgress', {}, progressFilter);
            const progressData = progressResponse.success && progressResponse.data ? progressResponse.data : [];
            const practiceTestResponse = await fetchData('tblPracticeTest', { student_id: 1, score: 1, week: 1, day: 1 }, testFilter);
            const practiceTests = practiceTestResponse.success && practiceTestResponse.data ? practiceTestResponse.data : [];

            // DSA: Fetch passed coding submissions (source of truth for DSA problems solved)
            const dsaFilter = studentIdOrConditions.length ? { $and: [{ $or: studentIdOrConditions }, { status: 'passed' }] } : { status: '__none__' };
            const submissionsResponse = await fetchData('tblCodingSubmissions', { student_id: 1, problem_id: 1 }, dsaFilter);
            const dsaSubmissions = submissionsResponse.success && submissionsResponse.data ? submissionsResponse.data : [];
            const toStr = (id) => (id && typeof id === 'object' && typeof id.toString === 'function' ? id.toString() : String(id));
            const dsaByStudent = {};
            dsaSubmissions.forEach(sub => {
                const sid = toStr(sub.student_id);
                if (!dsaByStudent[sid]) dsaByStudent[sid] = new Set();
                if (sub.problem_id) dsaByStudent[sid].add(sub.problem_id);
            });
            const totalDSAProblemsSolved = Object.values(dsaByStudent).reduce((sum, set) => sum + set.size, 0);
            const studentsWithDSAActivity = Object.keys(dsaByStudent).length;

            // Calculate department statistics
            const totalStudents = students.length;
            const activeStudents = students.filter(s => s.person_status === 'active').length;

            // Calculate average score (Aptitude + Coding) and build studentDetails
            let totalScore = 0;
            let scoreCount = 0;
            let totalTestsCompleted = 0;
            let totalDaysCompleted = 0;
            let topPerformers = 0;
            const studentDetails = [];

            // Estimated total coding problems per week to calculate percentage
            const ESTIMATED_CODING_PROBLEMS_PER_WEEK = 5;

            students.forEach(student => {
                const sid = toStr(student._id || student.person_id);
                const progress = progressData.find(p => toStr(p.student_id) === sid);
                const dsaCount = (dsaByStudent[sid] && dsaByStudent[sid].size) || 0;
                const progressCodingCount = progress && progress.coding_problems_completed ? new Set(progress.coding_problems_completed).size : 0;
                const codingProblemsSolved = Math.max(dsaCount, progressCodingCount);

                let aptitudeScore = (progress && progress.average_score !== undefined && progress.average_score !== null) ? progress.average_score : null;
                let codingScore = null;
                if (codingProblemsSolved > 0) {
                    codingScore = Math.min(100, Math.round((codingProblemsSolved / ESTIMATED_CODING_PROBLEMS_PER_WEEK) * 10)) * 10;
                }

                let compositeScore = null;
                if (aptitudeScore !== null && codingScore !== null) {
                    compositeScore = Math.round((aptitudeScore + codingScore) / 2);
                } else if (aptitudeScore !== null) {
                    compositeScore = aptitudeScore;
                } else if (codingScore !== null) {
                    compositeScore = codingScore;
                }
                if (compositeScore === null && practiceTests.length > 0) {
                    const myTests = practiceTests.filter(t => toStr(t.student_id) === sid);
                    if (myTests.length > 0) {
                        const sum = myTests.reduce((a, b) => a + (b.score || 0), 0);
                        compositeScore = Math.round(sum / myTests.length);
                    }
                }

                if (compositeScore !== null) {
                    totalScore += compositeScore;
                    scoreCount++;
                    if (compositeScore >= 85) topPerformers++;
                }

                const myPracticeTests = practiceTests.filter(t => toStr(t.student_id) === sid);
                totalTestsCompleted += myPracticeTests.length + codingProblemsSolved;
                const daysCompletedVal = progress && (progress.total_days_completed !== undefined || progress.days_completed);
                const daysCount = !daysCompletedVal ? 0 : (Array.isArray(progress.days_completed) ? progress.days_completed.length : (typeof progress.total_days_completed === 'number' ? progress.total_days_completed : (progress.days_completed?.length || 0)));
                totalDaysCompleted += daysCount;

                studentDetails.push({
                    id: sid,
                    name: student.person_name,
                    email: student.person_email,
                    status: student.person_status || 'inactive',
                    compositeScore: compositeScore ?? 0,
                    testsCompleted: myPracticeTests.length,
                    codingProblemsSolved,
                    daysCompleted: daysCount
                });
            });

            const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
            const engagementRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Department performance fetched successfully',
                data: {
                    department: department,
                    totalStudents,
                    activeStudents,
                    averageScore,
                    totalTests: totalTestsCompleted,
                    totalDaysCompleted,
                    topPerformers,
                    engagementRate,
                    totalDSAProblemsSolved,
                    studentsWithDSAActivity,
                    studentDetails,
                    needsAttention: studentDetails.filter(s => s.compositeScore < 50 && s.status === 'active').length
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch department performance',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Performance Trends (for DeptTPC)
     * Route: POST /tpc-dept/analytics/trends
     */
    async getDeptTPCTrends(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const { weeks = 8 } = req.body || {};

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'DeptTPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only DeptTPC can access this resource'
                };
                return next();
            }

            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            let collegeId = user.person_collage_id || user.collage_id;
            let deptFilter = user.department;
            let deptIdFilter = user.department_id || (typeof user.department === 'string' && /^[0-9a-fA-F]{24}$/.test(user.department) ? user.department : null);

            if (!collegeId || (!deptFilter && !deptIdFilter)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID or Department not found',
                    error: 'Department information missing'
                };
                return next();
            }

            const { ObjectId } = await import('mongodb');
            const collegeIdString = collegeId?.toString?.() || collegeId || null;
            let collegeIdObject = null;
            if (collegeId && typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)) {
                collegeIdObject = new ObjectId(collegeId);
            } else if (collegeId && typeof collegeId === 'object' && collegeId.toString) {
                collegeIdObject = collegeId;
            }
            if (deptFilter && typeof deptFilter === 'string') deptFilter = deptFilter.trim();
            if (!deptIdFilter && deptFilter) {
                const personMasterResponse = await fetchData('tblPersonMaster', { department_id: 1 }, { _id: userId, person_deleted: false });
                if (personMasterResponse.success && personMasterResponse.data && personMasterResponse.data.length > 0 && personMasterResponse.data[0].department_id) {
                    deptIdFilter = personMasterResponse.data[0].department_id;
                }
            }
            if (!deptIdFilter && deptFilter && collegeIdString) {
                const collegeResponse = await fetchData('tblCollage', { collage_departments: 1, departments: 1 }, { _id: collegeIdObject || collegeIdString, deleted: false });
                const college = collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0 ? collegeResponse.data[0] : null;
                if (college?.departments && Array.isArray(college.departments)) {
                    const target = deptFilter.trim().toLowerCase();
                    const match = college.departments.find(d => {
                        const dn = (d.department_name || '').trim().toLowerCase();
                        const dc = (d.department_code || '').trim().toLowerCase();
                        return dn === target || dc === target;
                    });
                    if (match?.department_id) deptIdFilter = match.department_id?.toString?.() || match.department_id;
                }
                if (!deptIdFilter && college?.collage_departments && Array.isArray(college.collage_departments) && college.collage_departments.length > 0) {
                    const deptObjectIds = college.collage_departments.map(id => (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id));
                    const deptListResp = await fetchData('tblDepartments', { _id: 1, department_name: 1, department_code: 1 }, { _id: { $in: deptObjectIds }, deleted: false });
                    if (deptListResp.success && Array.isArray(deptListResp.data)) {
                        const target = deptFilter.trim().toLowerCase();
                        const deptMatch = deptListResp.data.find(d => {
                            const dn = (d.department_name || '').trim().toLowerCase();
                            const dc = (d.department_code || '').trim().toLowerCase();
                            return dn === target || dc === target;
                        });
                        if (deptMatch?._id) {
                            deptIdFilter = deptMatch._id?.toString?.() || deptMatch._id;
                            deptFilter = deptMatch.department_name || deptMatch.department_code || deptFilter;
                        }
                    }
                }
                if (!deptIdFilter) {
                    const escaped = deptFilter.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const deptLookupFilter = {
                        $and: [
                            { $or: [{ department_name: deptFilter.trim() }, { department_code: deptFilter.trim() }, { department_name: { $regex: new RegExp(`^${escaped}$`, 'i') } }, { department_code: { $regex: new RegExp(`^${escaped}$`, 'i') } }] },
                            { $or: [{ collage_id: collegeIdString }, { department_college_id: collegeIdString }, ...(collegeIdObject ? [{ collage_id: collegeIdObject }, { department_college_id: collegeIdObject }] : [])] }
                        ]
                    };
                    const deptResponse = await fetchData('tblDepartments', { _id: 1, department_name: 1, department_code: 1 }, deptLookupFilter);
                    if (deptResponse.success && Array.isArray(deptResponse.data) && deptResponse.data.length > 0) {
                        const dept = deptResponse.data[0];
                        deptIdFilter = dept._id?.toString?.() || dept._id || null;
                        deptFilter = dept.department_name || dept.department_code || deptFilter;
                    }
                }
            }
            const studentFilter = {
                person_deleted: false,
                person_role: { $regex: /^student$/i }
            };
            if (collegeIdString) {
                studentFilter.person_collage_id = { $in: [...(collegeIdObject ? [collegeIdObject] : []), collegeIdString] };
            }
            const deptOrConditions = [];
            if (deptIdFilter) {
                const deptIdString = deptIdFilter?.toString?.() || deptIdFilter;
                const deptIdObject = typeof deptIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdString) ? new ObjectId(deptIdString) : null;
                if (deptIdObject) {
                    deptOrConditions.push({ department_id: deptIdObject }, { department_id: deptIdString });
                    deptOrConditions.push({ department: deptIdString });
                } else {
                    deptOrConditions.push({ department_id: deptIdString });
                }
            }
            if (deptFilter) {
                const trimmedDept = (typeof deptFilter === 'string' ? deptFilter : '').trim();
                if (trimmedDept) {
                    deptOrConditions.push(
                        { department: trimmedDept },
                        { department: { $regex: new RegExp(`^${trimmedDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                    );
                }
            }
            if (deptOrConditions.length > 0) {
                studentFilter.$or = deptOrConditions;
            } else {
                studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
            }
            const studentsResponse = await fetchData('tblPersonMaster', {}, studentFilter);
            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);
            const studentIdStrings = studentIds.map(id => (id && typeof id === 'object' && typeof id.toString === 'function') ? id.toString() : String(id));
            const studentIdObjectIds = studentIds.filter(id => id && (typeof id === 'object' || (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)))).map(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id).filter(id => id && typeof id === 'object');
            const studentIdOrConditions = [];
            if (studentIdStrings.length) studentIdOrConditions.push({ student_id: { $in: studentIdStrings } });
            if (studentIdObjectIds.length) studentIdOrConditions.push({ student_id: { $in: studentIdObjectIds } });
            const studentIdFilter = studentIdOrConditions.length ? { $or: studentIdOrConditions } : { student_id: '__NO_STUDENT__' };

            const practiceTestResponse = await fetchData(
                'tblPracticeTest',
                { week: 1, score: 1, student_id: 1 },
                { ...studentIdFilter, week: { $lte: weeks } }
            );
            const practiceTests = practiceTestResponse.success && practiceTestResponse.data ? practiceTestResponse.data : [];

            const analysisResponse = await fetchData(
                'tblTestAnalysis',
                { week: 1, score: 1, student_id: 1, test_type: 1 },
                {
                    ...studentIdFilter,
                    week: { $lte: weeks },
                    test_type: 'weekly'
                }
            );
            const weeklyTests = analysisResponse.success && analysisResponse.data ? analysisResponse.data : [];

            const progressResponse = await fetchData(
                'tblStudentProgress',
                { week: 1, coding_problems_completed: 1, average_score: 1, student_id: 1 },
                { ...studentIdFilter, week: { $lte: weeks } }
            );
            const progressData = progressResponse.success && progressResponse.data ? progressResponse.data : [];

            // DSA: Fetch passed coding submissions and map problem_id -> week via tblCodingProblem
            const dsaSubsFilter = studentIdOrConditions.length ? { $and: [{ $or: studentIdOrConditions }, { status: 'passed' }] } : { status: '__none__' };
            const dsaSubsRes = await fetchData('tblCodingSubmissions', { student_id: 1, problem_id: 1 }, dsaSubsFilter);
            const dsaSubmissions = dsaSubsRes.success && dsaSubsRes.data ? dsaSubsRes.data : [];
            const problemIds = [...new Set(dsaSubmissions.map(s => s.problem_id).filter(Boolean))];
            let problemIdToWeek = {};
            if (problemIds.length > 0) {
                const problemsRes = await fetchData('tblCodingProblem', { question_id: 1, week: 1 }, { question_id: { $in: problemIds }, deleted: { $ne: true } });
                const problems = problemsRes.success && problemsRes.data ? problemsRes.data : [];
                problems.forEach(p => { if (p.question_id && p.week) problemIdToWeek[p.question_id] = p.week; });
            }
            const toStr = (id) => (id && typeof id === 'object' && typeof id.toString === 'function' ? id.toString() : String(id));
            const dsaByWeek = {};
            for (let w = 1; w <= weeks; w++) dsaByWeek[w] = { submissions: [], students: new Set() };
            dsaSubmissions.forEach(sub => {
                const week = problemIdToWeek[sub.problem_id];
                if (week && week <= weeks) {
                    dsaByWeek[week].submissions.push(sub);
                    dsaByWeek[week].students.add(toStr(sub.student_id));
                }
            });
            const dsaByWeekByStudent = {};
            for (let w = 1; w <= weeks; w++) {
                dsaByWeekByStudent[w] = {};
                dsaByWeek[w].submissions.forEach(sub => {
                    const sid = toStr(sub.student_id);
                    if (!dsaByWeekByStudent[w][sid]) dsaByWeekByStudent[w][sid] = new Set();
                    dsaByWeekByStudent[w][sid].add(sub.problem_id);
                });
            }

            const weeklyTrends = [];
            const ESTIMATED_CODING_PROBLEMS_PER_WEEK = 5;

            for (let week = 1; week <= weeks; week++) {
                const pTests = practiceTests.filter(t => t.week === week);
                const wTests = weeklyTests.filter(t => t.week === week);
                const wProgress = progressData.filter(p => p.week === week);

                const participants = new Set([
                    ...pTests.map(t => toStr(t.student_id)),
                    ...wTests.map(t => toStr(t.student_id)),
                    ...wProgress.map(p => toStr(p.student_id)),
                    ...dsaByWeek[week].students
                ]);

                let totalWeekScore = 0;
                let studentCount = 0;

                participants.forEach(studentId => {
                    const myPTests = pTests.filter(t => toStr(t.student_id) === studentId);
                    let practiceScore = null;
                    if (myPTests.length > 0) {
                        practiceScore = myPTests.reduce((a, b) => a + (b.score || 0), 0) / myPTests.length;
                    }

                    const myWTest = wTests.find(t => toStr(t.student_id) === studentId);
                    let weeklyScore = myWTest ? myWTest.score : null;

                    const myProgress = wProgress.find(p => toStr(p.student_id) === studentId);
                    let codingScore = null;
                    if (myProgress && myProgress.coding_problems_completed?.length > 0) {
                        const unique = new Set(myProgress.coding_problems_completed).size;
                        codingScore = Math.min(100, Math.round((unique / ESTIMATED_CODING_PROBLEMS_PER_WEEK) * 10)) * 10;
                    }
                    if (codingScore === null && dsaByWeekByStudent[week] && dsaByWeekByStudent[week][studentId]) {
                        const dsaCount = dsaByWeekByStudent[week][studentId].size;
                        if (dsaCount > 0) {
                            codingScore = Math.min(100, Math.round((dsaCount / ESTIMATED_CODING_PROBLEMS_PER_WEEK) * 10)) * 10;
                        }
                    }

                    let components = [];
                    if (practiceScore !== null) components.push(practiceScore);
                    if (weeklyScore !== null) components.push(weeklyScore);
                    if (codingScore !== null) components.push(codingScore);

                    if (components.length === 0 && myProgress && myProgress.average_score) {
                        components.push(myProgress.average_score);
                    }

                    if (components.length > 0) {
                        const studentAvg = components.reduce((a, b) => a + b, 0) / components.length;
                        totalWeekScore += studentAvg;
                        studentCount++;
                    }
                });

                const avgScore = studentCount > 0 ? Math.round(totalWeekScore / studentCount) : 0;
                const dsaSolvedThisWeek = dsaByWeek[week].submissions.length;
                const totalActivities = pTests.length + wTests.length + wProgress.filter(p => p.coding_problems_completed?.length > 0).length + dsaSolvedThisWeek;

                weeklyTrends.push({
                    week,
                    averageScore: avgScore,
                    totalTests: totalActivities,
                    studentsParticipated: participants.size,
                    dsaProblemsSolved: dsaSolvedThisWeek
                });
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Performance trends fetched successfully',
                data: weeklyTrends
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch performance trends',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Score Distribution (for DeptTPC)
     * Route: POST /tpc-dept/analytics/distribution
     */
    async getDeptTPCDistribution(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'DeptTPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only DeptTPC can access this resource'
                };
                return next();
            }

            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            let collegeId = user.person_collage_id || user.collage_id;
            let deptFilter = user.department;
            let deptIdFilter = user.department_id || (typeof user.department === 'string' && /^[0-9a-fA-F]{24}$/.test(user.department) ? user.department : null);

            if (!collegeId || (!deptFilter && !deptIdFilter)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID or Department not found',
                    error: 'Department information missing'
                };
                return next();
            }

            const { ObjectId } = await import('mongodb');
            const collegeIdString = collegeId?.toString?.() || collegeId || null;
            let collegeIdObject = null;
            if (collegeId && typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)) {
                collegeIdObject = new ObjectId(collegeId);
            } else if (collegeId && typeof collegeId === 'object' && collegeId.toString) {
                collegeIdObject = collegeId;
            }
            if (deptFilter && typeof deptFilter === 'string') deptFilter = deptFilter.trim();
            if (!deptIdFilter && deptFilter) {
                const personMasterResponse = await fetchData('tblPersonMaster', { department_id: 1 }, { _id: userId, person_deleted: false });
                if (personMasterResponse.success && personMasterResponse.data && personMasterResponse.data.length > 0 && personMasterResponse.data[0].department_id) {
                    deptIdFilter = personMasterResponse.data[0].department_id;
                }
            }
            if (!deptIdFilter && deptFilter && collegeIdString) {
                const collegeResponse = await fetchData('tblCollage', { collage_departments: 1, departments: 1 }, { _id: collegeIdObject || collegeIdString, deleted: false });
                const college = collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0 ? collegeResponse.data[0] : null;
                if (college?.departments && Array.isArray(college.departments)) {
                    const target = deptFilter.trim().toLowerCase();
                    const match = college.departments.find(d => {
                        const dn = (d.department_name || '').trim().toLowerCase();
                        const dc = (d.department_code || '').trim().toLowerCase();
                        return dn === target || dc === target;
                    });
                    if (match?.department_id) deptIdFilter = match.department_id?.toString?.() || match.department_id;
                }
                if (!deptIdFilter && college?.collage_departments && Array.isArray(college.collage_departments) && college.collage_departments.length > 0) {
                    const deptObjectIds = college.collage_departments.map(id => (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id));
                    const deptListResp = await fetchData('tblDepartments', { _id: 1, department_name: 1, department_code: 1 }, { _id: { $in: deptObjectIds }, deleted: false });
                    if (deptListResp.success && Array.isArray(deptListResp.data)) {
                        const target = deptFilter.trim().toLowerCase();
                        const deptMatch = deptListResp.data.find(d => {
                            const dn = (d.department_name || '').trim().toLowerCase();
                            const dc = (d.department_code || '').trim().toLowerCase();
                            return dn === target || dc === target;
                        });
                        if (deptMatch?._id) {
                            deptIdFilter = deptMatch._id?.toString?.() || deptMatch._id;
                            deptFilter = deptMatch.department_name || deptMatch.department_code || deptFilter;
                        }
                    }
                }
                if (!deptIdFilter) {
                    const escaped = deptFilter.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const deptLookupFilter = {
                        $and: [
                            { $or: [{ department_name: deptFilter.trim() }, { department_code: deptFilter.trim() }, { department_name: { $regex: new RegExp(`^${escaped}$`, 'i') } }, { department_code: { $regex: new RegExp(`^${escaped}$`, 'i') } }] },
                            { $or: [{ collage_id: collegeIdString }, { department_college_id: collegeIdString }, ...(collegeIdObject ? [{ collage_id: collegeIdObject }, { department_college_id: collegeIdObject }] : [])] }
                        ]
                    };
                    const deptResponse = await fetchData('tblDepartments', { _id: 1, department_name: 1, department_code: 1 }, deptLookupFilter);
                    if (deptResponse.success && Array.isArray(deptResponse.data) && deptResponse.data.length > 0) {
                        const dept = deptResponse.data[0];
                        deptIdFilter = dept._id?.toString?.() || dept._id || null;
                        deptFilter = dept.department_name || dept.department_code || deptFilter;
                    }
                }
            }
            const department = deptFilter;
            const studentFilter = {
                person_deleted: false,
                person_role: { $regex: /^student$/i }
            };
            if (collegeIdString) {
                studentFilter.person_collage_id = { $in: [...(collegeIdObject ? [collegeIdObject] : []), collegeIdString] };
            }
            const deptOrConditions = [];
            if (deptIdFilter) {
                const deptIdString = deptIdFilter?.toString?.() || deptIdFilter;
                const deptIdObject = typeof deptIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdString) ? new ObjectId(deptIdString) : null;
                if (deptIdObject) {
                    deptOrConditions.push({ department_id: deptIdObject }, { department_id: deptIdString });
                    deptOrConditions.push({ department: deptIdString });
                } else {
                    deptOrConditions.push({ department_id: deptIdString });
                }
            }
            if (deptFilter) {
                const trimmedDept = (typeof deptFilter === 'string' ? deptFilter : '').trim();
                if (trimmedDept) {
                    deptOrConditions.push(
                        { department: trimmedDept },
                        { department: { $regex: new RegExp(`^${trimmedDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                    );
                }
            }
            if (deptOrConditions.length > 0) {
                studentFilter.$or = deptOrConditions;
            } else {
                studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
            }
            const studentsResponse = await fetchData('tblPersonMaster', {}, studentFilter);
            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);
            const studentIdStrings = studentIds.map(id => (id && typeof id === 'object' && typeof id.toString === 'function') ? id.toString() : String(id));
            const studentIdObjectIds = studentIds.filter(id => id && (typeof id === 'object' || (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)))).map(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id).filter(id => id && typeof id === 'object');
            const studentIdOrConditions = [];
            if (studentIdStrings.length) studentIdOrConditions.push({ student_id: { $in: studentIdStrings } });
            if (studentIdObjectIds.length) studentIdOrConditions.push({ student_id: { $in: studentIdObjectIds } });
            const progressFilter = studentIdOrConditions.length ? { $or: studentIdOrConditions } : { student_id: '__NO_STUDENT__' };
            const testFilter = studentIdOrConditions.length ? { $or: [...studentIdOrConditions] } : { student_id: '__NO_STUDENT__' };

            const progressResponse = await fetchData('tblStudentProgress', {}, progressFilter);
            const progressData = progressResponse.success && progressResponse.data ? progressResponse.data : [];
            const practiceTestResponse = await fetchData('tblPracticeTest', { score: 1, student_id: 1 }, testFilter);
            const practiceTests = practiceTestResponse.success && practiceTestResponse.data ? practiceTestResponse.data : [];

            // DSA: passed coding submissions for composite / distribution
            const dsaSubsFilterDist = studentIdOrConditions.length ? { $and: [{ $or: studentIdOrConditions }, { status: 'passed' }] } : { status: '__none__' };
            const dsaSubsResDist = await fetchData('tblCodingSubmissions', { student_id: 1, problem_id: 1 }, dsaSubsFilterDist);
            const dsaSubsDist = dsaSubsResDist.success && dsaSubsResDist.data ? dsaSubsResDist.data : [];
            const toStrDist = (id) => (id && typeof id === 'object' && typeof id.toString === 'function' ? id.toString() : String(id));
            const dsaByStudentDist = {};
            dsaSubsDist.forEach(sub => {
                const sid = toStrDist(sub.student_id);
                if (!dsaByStudentDist[sid]) dsaByStudentDist[sid] = new Set();
                if (sub.problem_id) dsaByStudentDist[sid].add(sub.problem_id);
            });

            const allScores = [];
            const ESTIMATED_CODING_PROBLEMS_PER_WEEK = 5;

            students.forEach(student => {
                const sid = toStrDist(student._id || student.person_id);
                const progress = progressData.find(p => toStrDist(p.student_id) === sid);
                const dsaCount = (dsaByStudentDist[sid] && dsaByStudentDist[sid].size) || 0;
                const progressCoding = progress && progress.coding_problems_completed ? new Set(progress.coding_problems_completed).size : 0;
                const codingProblems = Math.max(dsaCount, progressCoding);

                let aptScore = (progress && progress.average_score !== undefined && progress.average_score !== null) ? progress.average_score : null;
                let codeScore = null;
                if (codingProblems > 0) {
                    codeScore = Math.min(100, Math.round((codingProblems / ESTIMATED_CODING_PROBLEMS_PER_WEEK) * 10)) * 10;
                }

                if (aptScore !== null && codeScore !== null) {
                    allScores.push(Math.round((aptScore + codeScore) / 2));
                } else if (aptScore !== null) {
                    allScores.push(aptScore);
                } else if (codeScore !== null) {
                    allScores.push(codeScore);
                } else {
                    const myTests = practiceTests.filter(t => toStrDist(t.student_id) === sid);
                    if (myTests.length > 0) {
                        const sum = myTests.reduce((a, b) => a + (b.score || 0), 0);
                        allScores.push(Math.round(sum / myTests.length));
                    }
                }
            });

            // Calculate distribution
            const distribution = {
                excellent: allScores.filter(s => s >= 85).length,
                good: allScores.filter(s => s >= 70 && s < 85).length,
                average: allScores.filter(s => s >= 50 && s < 70).length,
                poor: allScores.filter(s => s < 50).length,
                noData: students.length - allScores.length
            };

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Score distribution fetched successfully',
                data: {
                    department,
                    totalStudents: students.length,
                    studentsWithScores: allScores.length,
                    distribution,
                    averageScore: allScores.length > 0
                        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
                        : 0
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch score distribution',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Test List (for DeptTPC)
     * Route: POST /tpc-dept/tests/list
     */
    async getDeptTPCTestsList(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const { status, dateFrom, dateTo } = req.body || {};

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'DeptTPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only DeptTPC can access this resource'
                };
                return next();
            }

            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            const collegeId = user.person_collage_id || user.collage_id;
            const department = user.department;

            const departmentId = user.department_id || (typeof user.department === 'string' && user.department.match(/^[0-9a-fA-F]{24}$/) ? user.department : null);

            if (!collegeId || (!department && !departmentId)) {
                res.locals.responseData = { success: false, status: 400, message: 'Department info missing' };
                return next();
            }

            // Build department filter
            let departmentFilter = {};
            if (department && departmentId) {
                departmentFilter = { $or: [{ department: department }, { department: departmentId }, { department_id: departmentId }] };
            } else if (departmentId) {
                departmentFilter = { $or: [{ department: departmentId }, { department_id: departmentId }] };
            } else {
                departmentFilter = { department: department };
            }

            // Get students in department
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                { _id: 1 },
                {
                    person_collage_id: collegeId,
                    ...departmentFilter,
                    person_deleted: false,
                    person_role: 'Student',
                    person_status: 'active'
                }
            );
            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);

            // If no students in department, return empty list
            if (studentIds.length === 0) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Tests list fetched successfully',
                    data: []
                };
                return next();
            }

            // Build filter for practice tests
            const collegeIdStr = collegeId?.toString?.() || collegeId;
            const deptIdStr = departmentId?.toString?.() || departmentId;
            let testFilter = {
                student_id: { $in: studentIds },
                // Tenant confirmation on practice tests
                ...(collegeIdStr ? { college_id: collegeIdStr } : {}),
                ...(deptIdStr ? { department_id: deptIdStr } : {}),
            };
            if (dateFrom || dateTo) {
                testFilter.completed_at = {};
                if (dateFrom) testFilter.completed_at.$gte = new Date(dateFrom);
                if (dateTo) testFilter.completed_at.$lte = new Date(dateTo);
            }

            // Get practice tests
            const practiceTestResponse = await fetchData(
                'tblPracticeTest',
                {},
                testFilter,
                { sort: { completed_at: -1 } }
            );
            const tests = practiceTestResponse.success && practiceTestResponse.data ? practiceTestResponse.data : [];

            // Group tests by week and day
            const testGroups = {};
            tests.forEach(test => {
                const key = `Week ${test.week} - Day ${test.day}`;
                if (!testGroups[key]) {
                    testGroups[key] = {
                        week: test.week,
                        day: test.day,
                        tests: [],
                        totalStudents: 0,
                        averageScore: 0,
                        totalAttempts: 0
                    };
                }
                testGroups[key].tests.push(test);
                testGroups[key].totalAttempts++;
            });

            // Calculate statistics for each group
            const testList = Object.values(testGroups).map(group => {
                const scores = group.tests.map(t => t.score || 0);
                const uniqueStudents = new Set(group.tests.map(t => (t.student_id?.toString?.() || String(t.student_id))));

                return {
                    week: group.week,
                    day: group.day,
                    testName: `Week ${group.week} - Day ${group.day} Practice Test`,
                    totalAttempts: group.totalAttempts,
                    studentsParticipated: uniqueStudents.size,
                    averageScore: scores.length > 0
                        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                        : 0,
                    highestScore: Math.max(...scores, 0),
                    lowestScore: Math.min(...scores, 0),
                    passRate: scores.length > 0
                        ? Math.round((scores.filter(s => s >= 50).length / scores.length) * 100)
                        : 0
                };
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Tests list fetched successfully',
                data: testList
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch tests list',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Test Results (for DeptTPC)
     * Route: POST /tpc-dept/tests/results
     */
    async getDeptTPCTestResults(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const { week, day } = req.body || {};

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole !== 'DeptTPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only DeptTPC can access this resource'
                };
                return next();
            }

            if (!week || !day) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Week and day are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            const collegeId = user.person_collage_id || user.collage_id;
            const department = user.department;
            const departmentId = user.department_id || (typeof user.department === 'string' && user.department.match(/^[0-9a-fA-F]{24}$/) ? user.department : null);

            if (!collegeId || !department) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID or Department not found',
                    error: 'Department information missing'
                };
                return next();
            }

            // Get students in department
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                {},
                {
                    person_collage_id: collegeId,
                    department: department,
                    person_deleted: false,
                    person_role: 'Student'
                }
            );
            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);

            // Get test results
            const testResponse = await fetchData(
                'tblPracticeTest',
                {},
                {
                    student_id: { $in: studentIds },
                    // Tenant confirmation on practice tests
                    ...(collegeId ? { college_id: (collegeId?.toString?.() || collegeId) } : {}),
                    ...(departmentId ? { department_id: (departmentId?.toString?.() || departmentId) } : {}),
                    week: week,
                    day: day
                },
                { sort: { score: -1 } }
            );
            const tests = testResponse.success && testResponse.data ? testResponse.data : [];

            // Combine with student data
            const results = tests.map(test => {
                const student = students.find(s =>
                    (s._id === test.student_id || s.person_id === test.student_id)
                );
                return {
                    studentId: test.student_id,
                    studentName: student?.person_name || 'Unknown',
                    studentEmail: student?.person_email || '',
                    department: student?.department || department,
                    enrollmentNumber: student?.enrollment_number || '',
                    score: test.score || 0,
                    totalQuestions: test.total_questions || 0,
                    correctAnswers: test.correct_answers || 0,
                    incorrectAnswers: test.incorrect_answers || 0,
                    timeSpent: test.time_spent || 0,
                    attempt: test.attempt || 1,
                    completedAt: test.completed_at || test.created_at
                };
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Test results fetched successfully',
                data: {
                    week,
                    day,
                    testName: `Week ${week} - Day ${day} Practice Test`,
                    department,
                    totalStudents: results.length,
                    averageScore: results.length > 0
                        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
                        : 0,
                    passRate: results.length > 0
                        ? Math.round((results.filter(r => r.score >= 50).length / results.length) * 100)
                        : 0,
                    results
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch test results',
                error: error.message
            };
            next();
        }
    }

    /**
     * Generate Report (for DeptTPC)
     * Route: POST /tpc-dept/reports/generate
     */
    async generateDeptTPCReport(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id;
            const userRole = (req.user?.role || req.user?.person_role || '').toString();
            const { reportType, dateFrom, dateTo } = req.body || {};

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            if (userRole.toLowerCase() !== 'depttpc') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'Only DeptTPC can access this resource'
                };
                return next();
            }

            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found',
                    error: 'User not found in database'
                };
                return next();
            }

            const user = userInfo.user;
            let collegeId = user.person_collage_id || user.collage_id;
            let deptFilter = user.department;
            let deptIdFilter = user.department_id || (typeof user.department === 'string' && /^[0-9a-fA-F]{24}$/.test(user.department) ? user.department : null);

            if (!collegeId || (!deptFilter && !deptIdFilter)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'College ID or Department not found',
                    error: 'Department information missing'
                };
                return next();
            }

            const { ObjectId } = await import('mongodb');
            const collegeIdString = collegeId?.toString?.() || collegeId || null;
            let collegeIdObject = null;
            if (collegeId && typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)) {
                collegeIdObject = new ObjectId(collegeId);
            } else if (collegeId && typeof collegeId === 'object' && collegeId.toString) {
                collegeIdObject = collegeId;
            }

            // Resolve department_id same as getStudentsList (PersonMaster, then college departments / tblDepartments)
            if (deptFilter && typeof deptFilter === 'string') deptFilter = deptFilter.trim();
            if (!deptIdFilter && deptFilter) {
                const personMasterResponse = await fetchData('tblPersonMaster', { department_id: 1 }, { _id: userId, person_deleted: false });
                if (personMasterResponse.success && personMasterResponse.data && personMasterResponse.data.length > 0 && personMasterResponse.data[0].department_id) {
                    deptIdFilter = personMasterResponse.data[0].department_id;
                }
            }
            if (!deptIdFilter && deptFilter && collegeIdString) {
                const collegeResponse = await fetchData('tblCollage', { collage_departments: 1, departments: 1 }, { _id: collegeIdObject || collegeIdString, deleted: false });
                const college = collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0 ? collegeResponse.data[0] : null;
                if (college?.departments && Array.isArray(college.departments)) {
                    const target = deptFilter.trim().toLowerCase();
                    const match = college.departments.find(d => {
                        const dn = (d.department_name || '').trim().toLowerCase();
                        const dc = (d.department_code || '').trim().toLowerCase();
                        return dn === target || dc === target;
                    });
                    if (match?.department_id) deptIdFilter = match.department_id?.toString?.() || match.department_id;
                }
                if (!deptIdFilter && college?.collage_departments && Array.isArray(college.collage_departments) && college.collage_departments.length > 0) {
                    const deptObjectIds = college.collage_departments.map(id => (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id));
                    const deptListResp = await fetchData('tblDepartments', { _id: 1, department_name: 1, department_code: 1 }, { _id: { $in: deptObjectIds }, deleted: false });
                    if (deptListResp.success && Array.isArray(deptListResp.data)) {
                        const target = deptFilter.trim().toLowerCase();
                        const deptMatch = deptListResp.data.find(d => {
                            const dn = (d.department_name || '').trim().toLowerCase();
                            const dc = (d.department_code || '').trim().toLowerCase();
                            return dn === target || dc === target;
                        });
                        if (deptMatch?._id) {
                            deptIdFilter = deptMatch._id?.toString?.() || deptMatch._id;
                            deptFilter = deptMatch.department_name || deptMatch.department_code || deptFilter;
                        }
                    }
                }
                if (!deptIdFilter) {
                    const escaped = deptFilter.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const deptLookupFilter = {
                        $and: [
                            { $or: [{ department_name: deptFilter.trim() }, { department_code: deptFilter.trim() }, { department_name: { $regex: new RegExp(`^${escaped}$`, 'i') } }, { department_code: { $regex: new RegExp(`^${escaped}$`, 'i') } }] },
                            { $or: [{ collage_id: collegeIdString }, { department_college_id: collegeIdString }, ...(collegeIdObject ? [{ collage_id: collegeIdObject }, { department_college_id: collegeIdObject }] : [])] }
                        ]
                    };
                    const deptResponse = await fetchData('tblDepartments', { _id: 1, department_name: 1, department_code: 1 }, deptLookupFilter);
                    if (deptResponse.success && Array.isArray(deptResponse.data) && deptResponse.data.length > 0) {
                        const dept = deptResponse.data[0];
                        deptIdFilter = dept._id?.toString?.() || dept._id || null;
                        deptFilter = dept.department_name || dept.department_code || deptFilter;
                    }
                }
            }

            // Build student filter same as getStudentsList (person_collage_id $in, person_role regex, $or for department)
            const studentFilter = {
                person_deleted: false,
                person_role: { $regex: /^student$/i }
            };
            if (collegeIdString) {
                studentFilter.person_collage_id = { $in: [...(collegeIdObject ? [collegeIdObject] : []), collegeIdString] };
            }
            const deptOrConditions = [];
            if (deptIdFilter) {
                const deptIdString = deptIdFilter?.toString?.() || deptIdFilter;
                const deptIdObject = typeof deptIdString === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdString) ? new ObjectId(deptIdString) : null;
                if (deptIdObject) {
                    deptOrConditions.push({ department_id: deptIdObject }, { department_id: deptIdString });
                    deptOrConditions.push({ department: deptIdString });
                } else {
                    deptOrConditions.push({ department_id: deptIdString });
                }
            }
            if (deptFilter) {
                const trimmedDept = (typeof deptFilter === 'string' ? deptFilter : '').trim();
                if (trimmedDept) {
                    deptOrConditions.push(
                        { department: trimmedDept },
                        { department: { $regex: new RegExp(`^${trimmedDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                    );
                }
            }
            if (deptOrConditions.length > 0) {
                studentFilter.$or = deptOrConditions;
            } else {
                studentFilter.$or = [{ department_id: '__NO_DEPT__' }];
            }

            const department = deptFilter; // for report payload labels

            // Get students in department (all students, not just active)
            const studentsResponse = await fetchData('tblPersonMaster', {}, studentFilter);
            const students = studentsResponse.success && studentsResponse.data ? studentsResponse.data : [];
            const studentIds = students.map(s => s._id || s.person_id);
            // tblStudentProgress and tblPracticeTest may store student_id as string or ObjectId
            const studentIdStrings = studentIds.map(id => (id && typeof id === 'object' && typeof id.toString === 'function') ? id.toString() : String(id));
            const studentIdObjectIds = studentIds.filter(id => id && (typeof id === 'object' || (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)))).map(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id).filter(id => id && typeof id === 'object');

            // Match both string and ObjectId (mixed storage in DB); only add non-empty $in
            const studentIdOrConditions = [];
            if (studentIdStrings.length) studentIdOrConditions.push({ student_id: { $in: studentIdStrings } });
            if (studentIdObjectIds.length) studentIdOrConditions.push({ student_id: { $in: studentIdObjectIds } });
            // Tenant confirmation on activity collections (new fields): college_id + department_id
            const progressFilterBase = studentIdOrConditions.length ? { $or: studentIdOrConditions } : { student_id: '__NO_STUDENT__' };
            let testFilterBase = studentIdOrConditions.length ? { $or: [...studentIdOrConditions] } : { student_id: '__NO_STUDENT__' };
            const collegeIdTenant = collegeIdString;
            const deptIdTenant = deptIdFilter?.toString?.() || deptIdFilter || null;
            const tenantClauses = [
                ...(collegeIdTenant ? [{ college_id: collegeIdTenant }] : []),
                ...(deptIdTenant ? [{ department_id: deptIdTenant }] : []),
            ];
            const progressFilter = tenantClauses.length ? { $and: [progressFilterBase, ...tenantClauses] } : progressFilterBase;
            let testFilter = tenantClauses.length ? { $and: [testFilterBase, ...tenantClauses] } : testFilterBase;

            // Get progress data
            const progressResponse = await fetchData(
                'tblStudentProgress',
                {},
                progressFilter
            );
            const progressData = progressResponse.success && progressResponse.data ? progressResponse.data : [];

            // Get practice tests (match both string and ObjectId)
            if (dateFrom || dateTo) {
                testFilter.completed_at = {};
                if (dateFrom) testFilter.completed_at.$gte = new Date(dateFrom);
                if (dateTo) testFilter.completed_at.$lte = new Date(dateTo);
            }

            const practiceTestResponse = await fetchData('tblPracticeTest', {}, testFilter);
            const practiceTests = practiceTestResponse.success && practiceTestResponse.data ? practiceTestResponse.data : [];

            // Generate report
            let reportData = {};

            if (reportType === 'performance' || !reportType) {
                // Performance Summary Report (student_id in DB may be string or ObjectId)
                const toStr = (id) => (id && typeof id === 'object' && typeof id.toString === 'function' ? id.toString() : String(id));
                const studentsWithProgress = students.map(student => {
                    const sid = toStr(student._id || student.person_id);
                    const progress = progressData.find(p => toStr(p.student_id) === sid);
                    const studentTests = practiceTests.filter(t => toStr(t.student_id) === sid);
                    const avgTestScore = studentTests.length > 0
                        ? Math.round(studentTests.reduce((sum, t) => sum + (t.score || 0), 0) / studentTests.length)
                        : 0;

                    return {
                        name: student.person_name,
                        email: student.person_email,
                        department: student.department || department,
                        enrollmentNumber: student.enrollment_number || '',
                        averageScore: progress?.average_score || avgTestScore || 0,
                        daysCompleted: progress?.total_days_completed || 0,
                        testsCompleted: studentTests.length,
                        status: student.person_status
                    };
                });

                reportData = {
                    reportType: 'performance',
                    generatedAt: new Date().toISOString(),
                    dateRange: { from: dateFrom, to: dateTo },
                    department: department,
                    summary: {
                        totalStudents: students.length,
                        activeStudents: students.filter(s => s.person_status === 'active').length,
                        averageScore: studentsWithProgress.length > 0
                            ? Math.round(studentsWithProgress.reduce((sum, s) => sum + s.averageScore, 0) / studentsWithProgress.length)
                            : 0,
                        totalTests: practiceTests.length
                    },
                    students: studentsWithProgress.sort((a, b) => b.averageScore - a.averageScore)
                };
            } else if (reportType === 'test-results') {
                // Build student id -> details map (normalize id to string for lookup)
                const toStr = (id) => (id && typeof id === 'object' && typeof id.toString === 'function' ? id.toString() : String(id));
                const studentMap = {};
                students.forEach(s => {
                    const sid = toStr(s._id || s.person_id);
                    studentMap[sid] = {
                        studentId: sid,
                        studentName: s.person_name || 'Unknown',
                        studentEmail: s.person_email || '',
                        enrollmentNumber: s.enrollment_number || s.person_rollno || ''
                    };
                });

                // Test Results Report with student details in each result
                const testResultsByWeek = {};
                practiceTests.forEach(test => {
                    const key = `Week ${test.week} - Day ${test.day}`;
                    const sid = toStr(test.student_id);
                    const studentInfo = studentMap[sid] || { studentName: 'Unknown', studentEmail: '', enrollmentNumber: '' };
                    if (!testResultsByWeek[key]) {
                        testResultsByWeek[key] = {
                            week: test.week,
                            day: test.day,
                            testName: key,
                            results: [],
                            totalAttempts: 0,
                            averageScore: 0
                        };
                    }
                    testResultsByWeek[key].results.push({
                        studentId: sid,
                        studentName: studentInfo.studentName,
                        studentEmail: studentInfo.studentEmail,
                        enrollmentNumber: studentInfo.enrollmentNumber,
                        score: test.score || 0,
                        totalQuestions: test.total_questions || 0,
                        correctAnswers: test.correct_answers || 0,
                        completedAt: test.completed_at || test.created_at
                    });
                    testResultsByWeek[key].totalAttempts++;
                });

                // Calculate averages
                Object.values(testResultsByWeek).forEach(testGroup => {
                    const scores = testGroup.results.map(r => r.score);
                    testGroup.averageScore = scores.length > 0
                        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                        : 0;
                });

                const uniqueStudentIdsInTests = new Set(practiceTests.map(t => toStr(t.student_id)));
                // Student-wise summary for "download this student" and batch export
                const studentWiseReport = [];
                uniqueStudentIdsInTests.forEach(sid => {
                    const info = studentMap[sid] || { studentName: 'Unknown', studentEmail: '', enrollmentNumber: '' };
                    const studentTests = practiceTests.filter(t => toStr(t.student_id) === sid).map(t => ({
                        week: t.week,
                        day: t.day,
                        testName: `Week ${t.week} - Day ${t.day}`,
                        score: t.score || 0,
                        totalQuestions: t.total_questions || 0,
                        correctAnswers: t.correct_answers || 0,
                        completedAt: t.completed_at || t.created_at
                    }));
                    studentWiseReport.push({
                        studentId: sid,
                        studentName: info.studentName,
                        studentEmail: info.studentEmail,
                        enrollmentNumber: info.enrollmentNumber,
                        testsCount: studentTests.length,
                        tests: studentTests
                    });
                });

                reportData = {
                    reportType: 'test-results',
                    generatedAt: new Date().toISOString(),
                    dateRange: { from: dateFrom, to: dateTo },
                    department: department,
                    summary: {
                        totalTests: practiceTests.length,
                        uniqueTests: Object.keys(testResultsByWeek).length,
                        totalStudents: students.length,
                        studentsWithTestActivity: uniqueStudentIdsInTests.size
                    },
                    tests: Object.values(testResultsByWeek),
                    studentWiseReport
                };
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Report generated successfully',
                data: reportData
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to generate report',
                error: error.message
            };
            next();
        }
    }

    /**
     * Approve student test retake (DeptTPC only)
     * Route: POST /tpc/approve-test-retake
     */
    async approveTestRetake(req, res, next) {
        try {
            const { student_id, week, test_type } = req.body;
            const approverId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const approverRole = req.user?.role || req.userId?.role || req.headers['x-user-role'];

            if (!student_id || !week || !test_type) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Student ID, week, and test type are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Only DeptTPC can approve
            if (approverRole !== 'depttpc' && approverRole !== 'DeptTPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Only Department TPC can approve test retakes',
                    error: 'Unauthorized'
                };
                return next();
            }

            const { ObjectId } = await import('mongodb');
            const studentIdString = student_id.toString();

            // Check if blocked record exists
            const blockedRecord = await fetchData(
                'tblBlockedTestRetake',
                {},
                { student_id: studentIdString, week: week, test_type: test_type }
            );

            if (!blockedRecord.data || blockedRecord.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'No blocked test retake record found for this student',
                    error: 'Record not found'
                };
                return next();
            }

            // Update record to approve
            // executeData(collectionName, data, operation, schema, filter)
            await executeData(
                'tblBlockedTestRetake',
                {
                    $set: {
                        blocked: false,
                        approved_by: approverId.toString(),
                        approved_at: new Date()
                    }
                },
                'u',
                null,
                { _id: new ObjectId(blockedRecord.data[0]._id) }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Test retake approved successfully',
                data: { approved: true }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error approving test retake',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get list of blocked students needing approval (DeptTPC only)
     * Route: POST /tpc/blocked-students
     */
    async getBlockedStudents(req, res, next) {
        try {
            const approverRole = req.user?.role || req.userId?.role || req.headers['x-user-role'];
            const approverId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            console.log('[getBlockedStudents] Request:', { approverRole, approverId });

            // Only DeptTPC can view blocked students
            if (approverRole !== 'depttpc' && approverRole !== 'DeptTPC') {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Only Department TPC can view blocked students',
                    error: 'Unauthorized'
                };
                return next();
            }

            // Get DeptTPC's department - call getUserInfo correctly
            const userId = approverId;
            const userInfoResult = await this.getUserInfo(userId);
            const userInfo = userInfoResult?.user || {};
            const deptId = userInfo.department_id || userInfo.department;

            console.log('[getBlockedStudents] DeptTPC Info:', { userId, deptId, userInfo });

            if (!deptId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Department information not found',
                    error: 'Missing department'
                };
                return next();
            }

            // Get all blocked students (without department filter first)
            const blockedRecords = await fetchData(
                'tblBlockedTestRetake',
                {},
                { blocked: true, approved_by: null }
            );

            console.log('[getBlockedStudents] All blocked records:', blockedRecords.data?.length || 0);
            if (blockedRecords.data && blockedRecords.data.length > 0) {
                console.log('[getBlockedStudents] Blocked records sample:', JSON.stringify(blockedRecords.data[0], null, 2));
            }

            if (!blockedRecords.data || blockedRecords.data.length === 0) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'No blocked students found',
                    data: []
                };
                return next();
            }

            // Get student details for blocked students - handle both ObjectId and string formats
            const { ObjectId } = await import('mongodb');
            const studentIds = blockedRecords.data.map(r => r.student_id).filter(Boolean);

            console.log('[getBlockedStudents] Student IDs from blocked records:', studentIds);

            // Create filter: match _id or person_id (ObjectId and string), case-insensitive person_role, exclude deleted
            const orClauses = [];
            for (const id of studentIds) {
                const idString = id?.toString() || id;
                const isObjId = /^[0-9a-fA-F]{24}$/.test(idString);
                if (isObjId) {
                    const o = new ObjectId(idString);
                    orClauses.push({ _id: o }, { _id: idString }, { person_id: o }, { person_id: idString });
                } else {
                    orClauses.push({ _id: idString }, { person_id: idString });
                }
            }
            const students = await fetchData(
                'tblPersonMaster',
                {},
                {
                    $or: orClauses,
                    person_role: { $regex: /^student$/i },
                    person_deleted: { $ne: true }
                }
            );

            console.log('[getBlockedStudents] Students found:', students.data?.length || 0);
            if (students.data && students.data.length > 0) {
                console.log('[getBlockedStudents] Sample student:', {
                    _id: students.data[0]._id,
                    department_id: students.data[0].department_id,
                    department: students.data[0].department,
                    person_name: students.data[0].person_name
                });
            }

            // Filter by department - handle both ObjectId and string formats
            const deptIdString = deptId.toString();
            const deptIdObjectId = /^[0-9a-fA-F]{24}$/.test(deptIdString) ? new ObjectId(deptIdString) : null;

            const deptStudents = (students.data || []).filter(s => {
                const sDeptId = s.department_id?.toString() || s.department_id;
                const sDept = s.department?.toString() || s.department;

                // Match by ObjectId if both are ObjectIds
                if (deptIdObjectId && s.department_id) {
                    try {
                        const sDeptIdObj = s.department_id instanceof ObjectId ? s.department_id : new ObjectId(s.department_id);
                        if (sDeptIdObj.equals(deptIdObjectId)) {
                            console.log('[getBlockedStudents] Matched student by ObjectId:', s.person_name);
                            return true;
                        }
                    } catch (e) {
                        // Not a valid ObjectId, continue with string comparison
                    }
                }

                // Match by string
                const matches = (sDeptId && sDeptId === deptIdString) ||
                    (sDept && sDept === deptIdString) ||
                    (sDeptId && deptIdString && sDeptId.toString() === deptIdString.toString());

                if (matches) {
                    console.log('[getBlockedStudents] Matched student by string:', s.person_name, {
                        sDeptId,
                        sDept,
                        deptIdString
                    });
                }

                return matches;
            });

            console.log('[getBlockedStudents] Students in department:', deptStudents.length);
            console.log('[getBlockedStudents] Department ID being matched:', deptIdString);

            // Combine blocked records with student info
            // Include when: (1) student is in DeptTPC's department, or (2) blocked.department_id matches (fallback if student has no department_id)
            const blockedStudents = blockedRecords.data
                .map(blocked => {
                    const student = deptStudents.find(s => {
                        const sId = s._id?.toString() || s.person_id?.toString();
                        const blockedId = blocked.student_id?.toString();
                        return sId === blockedId;
                    });
                    if (student) {
                        return {
                            student_id: blocked.student_id,
                            week: blocked.week,
                            test_type: blocked.test_type,
                            blocked: blocked.blocked,
                            blocked_reason: blocked.blocked_reason,
                            blocked_at: blocked.blocked_at,
                            student_name: student.person_name,
                            student_email: student.person_email,
                            enrollment_number: student.enrollment_number
                        };
                    }
                    // Fallback: student has no department_id in tblPersonMaster but blocked record has department_id
                    const b = blocked.department_id;
                    const blockedDeptMatches = b && (
                        (deptIdString && (b?.toString?.() || b) === deptIdString) ||
                        (deptIdObjectId && (() => { try { const o = b instanceof ObjectId ? b : new ObjectId(b); return o.equals(deptIdObjectId); } catch (e) { return false; } })())
                    );
                    if (blockedDeptMatches) {
                        const anyStudent = (students.data || []).find(s => (s._id?.toString() || s.person_id?.toString()) === (blocked.student_id?.toString()));
                        return {
                            student_id: blocked.student_id,
                            week: blocked.week,
                            test_type: blocked.test_type,
                            blocked: blocked.blocked,
                            blocked_reason: blocked.blocked_reason,
                            blocked_at: blocked.blocked_at,
                            student_name: anyStudent?.person_name ?? null,
                            student_email: anyStudent?.person_email ?? null,
                            enrollment_number: anyStudent?.enrollment_number ?? null
                        };
                    }
                    return null;
                })
                .filter(Boolean);

            console.log('[getBlockedStudents] Final blocked students:', blockedStudents.length);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Blocked students fetched successfully',
                data: blockedStudents
            };
            next();
        } catch (error) {
            console.error('[getBlockedStudents] Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error fetching blocked students',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get Student Practice Tests
     * Route: POST /tpc/student/practice-tests
     */
    async getStudentPracticeTests(req, res, next) {
        try {
            const { student_id, week, category } = req.body;
            const userId = req.userId || req.user?.id;
            const userRole = req.userRole || req.user?.role;

            if (!student_id) {
                res.locals.responseData = { success: false, status: 400, message: 'Student ID is required' };
                return next();
            }

            const userInfoResult = await this.getUserInfo(userId);
            const userInfo = userInfoResult?.user || userInfoResult;
            if (!userInfo) {
                res.locals.responseData = { success: false, status: 404, message: 'User not found' };
                return next();
            }

            const studentInfo = await fetchData('tblPersonMaster',
                { person_id: 1, person_collage_id: 1, department: 1, person_name: 1, person_email: 1 },
                { person_id: student_id, person_role: { $regex: /^student$/i } });

            if (!studentInfo.data || studentInfo.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'Student not found' };
                return next();
            }

            const student = studentInfo.data[0];
            if (userRole === 'tpc-college' || userRole === 'TPC') {
                const userCollegeId = userInfo.person_collage_id || userInfo.collage_id;
                if (student.person_collage_id !== userCollegeId) {
                    res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                    return next();
                }
            } else if (userRole === 'tpc-dept' || userRole === 'DeptTPC') {
                if (student.department !== userInfo.department) {
                    res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                    return next();
                }
            }

            const filter = { student_id: student_id };
            if (week) filter.week = parseInt(week);
            if (category) filter.category = category;

            const practiceTests = await fetchData('tblPracticeTest', {}, filter, { sort: { completed_at: -1 } });

            let totalAttempts = 0, averageScore = 0, bestScore = 0, totalTimeSpent = 0, weeklyStats = {};
            if (practiceTests.data && practiceTests.data.length > 0) {
                totalAttempts = practiceTests.data.length;
                const scores = practiceTests.data.map(t => t.score || 0);
                averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalAttempts);
                bestScore = Math.max(...scores);
                totalTimeSpent = practiceTests.data.reduce((sum, t) => sum + (t.time_spent || 0), 0);

                practiceTests.data.forEach(test => {
                    const weekKey = `week_${test.week}`;
                    if (!weeklyStats[weekKey]) weeklyStats[weekKey] = { week: test.week, attempts: 0, scores: [] };
                    weeklyStats[weekKey].attempts++;
                    weeklyStats[weekKey].scores.push(test.score || 0);
                });

                Object.keys(weeklyStats).forEach(week => {
                    const scores = weeklyStats[week].scores;
                    weeklyStats[week].averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                    delete weeklyStats[week].scores;
                });
            }

            res.locals.responseData = {
                success: true, status: 200, message: 'Practice tests fetched successfully',
                data: {
                    student: { person_id: student.person_id, full_name: student.person_name, email: student.person_email },
                    summary: { totalAttempts, averageScore, bestScore, totalTimeSpent, weeklyStats: Object.values(weeklyStats) },
                    tests: practiceTests.data || []
                }
            };
            next();
        } catch (error) {
            console.error('[TPC] Error fetching student practice tests:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Error fetching practice tests', error: error.message };
            next();
        }
    }

    /**
     * Get Practice Test Analytics
     * Route: POST /tpc/practice-analytics
     */
    async getPracticeTestAnalytics(req, res, next) {
        try {
            const { week, category, timeframe } = req.body;
            const userId = req.userId || req.user?.id;
            const userRole = req.userRole || req.user?.role;

            const userInfoResult = await this.getUserInfo(userId);
            const userInfo = userInfoResult?.user || userInfoResult;
            if (!userInfo) {
                res.locals.responseData = { success: false, status: 404, message: 'User not found' };
                return next();
            }

            let studentFilter = { person_role: { $regex: /^student$/i } };
            if (userRole === 'tpc-college' || userRole === 'TPC') {
                studentFilter.person_collage_id = userInfo.person_collage_id || userInfo.collage_id;
            } else if (userRole === 'tpc-dept' || userRole === 'DeptTPC') {
                studentFilter.department = userInfo.department;
            }

            const students = await fetchData('tblPersonMaster', { person_id: 1 }, studentFilter);
            if (!students.data || students.data.length === 0) {
                res.locals.responseData = { success: true, status: 200, message: 'No students found', data: { totalStudents: 0, analytics: {} } };
                return next();
            }

            const studentIds = students.data.map(s => s.person_id);
            const practiceFilter = { student_id: { $in: studentIds } };
            if (week) practiceFilter.week = parseInt(week);
            if (category) practiceFilter.category = category;
            if (timeframe) {
                const date = new Date();
                if (timeframe === 'week') date.setDate(date.getDate() - 7);
                else if (timeframe === 'month') date.setMonth(date.getMonth() - 1);
                practiceFilter.completed_at = { $gte: date };
            }

            const practiceTests = await fetchData('tblPracticeTest', {}, practiceFilter);

            const analytics = {
                totalAttempts: 0, uniqueStudents: new Set(), averageScore: 0, completionRate: 0,
                averageTimeSpent: 0, byWeek: {},
                byDifficulty: {
                    easy: { attempted: 0, correct: 0, accuracy: 0 },
                    medium: { attempted: 0, correct: 0, accuracy: 0 },
                    hard: { attempted: 0, correct: 0, accuracy: 0 },
                    expert: { attempted: 0, correct: 0, accuracy: 0 }
                },
                topicPerformance: {}
            };

            if (practiceTests.data && practiceTests.data.length > 0) {
                analytics.totalAttempts = practiceTests.data.length;
                let totalScore = 0, totalTime = 0;

                practiceTests.data.forEach(test => {
                    analytics.uniqueStudents.add(test.student_id);
                    totalScore += test.score || 0;
                    totalTime += test.time_spent || 0;

                    const weekKey = `week_${test.week}`;
                    if (!analytics.byWeek[weekKey]) analytics.byWeek[weekKey] = { week: test.week, attempts: 0, scores: [] };
                    analytics.byWeek[weekKey].attempts++;
                    analytics.byWeek[weekKey].scores.push(test.score || 0);

                    if (test.questions_attempted && Array.isArray(test.questions_attempted)) {
                        test.questions_attempted.forEach(q => {
                            const difficulty = (q.difficulty || 'medium').toLowerCase();
                            if (analytics.byDifficulty[difficulty]) {
                                analytics.byDifficulty[difficulty].attempted++;
                                if (q.is_correct) analytics.byDifficulty[difficulty].correct++;
                            }

                            const topics = q.question_topic || [];
                            topics.forEach(topic => {
                                if (!analytics.topicPerformance[topic]) {
                                    analytics.topicPerformance[topic] = { attempted: 0, correct: 0, accuracy: 0 };
                                }
                                analytics.topicPerformance[topic].attempted++;
                                if (q.is_correct) analytics.topicPerformance[topic].correct++;
                            });
                        });
                    }
                });

                analytics.averageScore = Math.round(totalScore / analytics.totalAttempts);
                analytics.averageTimeSpent = Math.round(totalTime / analytics.totalAttempts);
                analytics.uniqueStudents = analytics.uniqueStudents.size;
                analytics.completionRate = Math.round((analytics.uniqueStudents / studentIds.length) * 100);

                Object.keys(analytics.byWeek).forEach(week => {
                    const scores = analytics.byWeek[week].scores;
                    analytics.byWeek[week].averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                    delete analytics.byWeek[week].scores;
                });

                Object.keys(analytics.byDifficulty).forEach(diff => {
                    const data = analytics.byDifficulty[diff];
                    data.accuracy = data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0;
                });

                Object.keys(analytics.topicPerformance).forEach(topic => {
                    const data = analytics.topicPerformance[topic];
                    data.accuracy = data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0;
                });
            }

            res.locals.responseData = {
                success: true, status: 200, message: 'Practice test analytics fetched successfully',
                data: {
                    totalStudents: studentIds.length,
                    analytics: {
                        totalAttempts: analytics.totalAttempts,
                        uniqueStudents: analytics.uniqueStudents,
                        averageScore: analytics.averageScore,
                        completionRate: analytics.completionRate,
                        averageTimeSpent: analytics.averageTimeSpent,
                        byWeek: Object.values(analytics.byWeek),
                        byDifficulty: analytics.byDifficulty,
                        topicPerformance: analytics.topicPerformance
                    }
                }
            };
            next();
        } catch (error) {
            console.error('[TPC] Error fetching practice analytics:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Error fetching analytics', error: error.message };
            next();
        }
    }

    /**
     * Get Student Practice Details
     * Route: POST /tpc/student/practice-details
     */
    async getStudentPracticeDetails(req, res, next) {
        try {
            const { test_id } = req.body;
            const userId = req.userId || req.user?.id;
            const userRole = req.userRole || req.user?.role;

            if (!test_id) {
                res.locals.responseData = { success: false, status: 400, message: 'Test ID is required' };
                return next();
            }

            const userInfoResult = await this.getUserInfo(userId);
            const userInfo = userInfoResult?.user || userInfoResult;
            if (!userInfo) {
                res.locals.responseData = { success: false, status: 404, message: 'User not found' };
                return next();
            }

            const { ObjectId } = await import('mongodb');
            const practiceTest = await fetchData('tblPracticeTest', {}, { _id: new ObjectId(test_id) });

            if (!practiceTest.data || practiceTest.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'Practice test not found' };
                return next();
            }

            const test = practiceTest.data[0];

            // Robust student lookup
            const studentProjection = { person_id: 1, person_collage_id: 1, department: 1, person_name: 1, person_email: 1, person_rollno: 1 };
            let studentInfo = await fetchData('tblPersonMaster', studentProjection, { _id: test.student_id });

            if (!studentInfo.data || studentInfo.data.length === 0) {
                // Try parsing ObjectId
                if (typeof test.student_id === 'string' && /^[0-9a-fA-F]{24}$/.test(test.student_id)) {
                    studentInfo = await fetchData('tblPersonMaster', studentProjection, { _id: new ObjectId(test.student_id) });
                }
            }

            if (!studentInfo.data || studentInfo.data.length === 0) {
                // Fallback to person_id
                studentInfo = await fetchData('tblPersonMaster', studentProjection, { person_id: test.student_id });
            }

            if (!studentInfo.data || studentInfo.data.length === 0) {
                console.log('[TPC] Student not found for practice details:', test.student_id);
                res.locals.responseData = { success: false, status: 404, message: 'Student not found' };
                return next();
            }

            const student = studentInfo.data[0];
            if (userRole === 'tpc-college' || userRole === 'TPC') {
                const userCollegeId = userInfo.person_collage_id || userInfo.collage_id;
                if (student.person_collage_id !== userCollegeId) {
                    res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                    return next();
                }
            } else if (userRole === 'tpc-dept' || userRole === 'DeptTPC') {
                if (student.department !== userInfo.department) {
                    res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                    return next();
                }
            }

            const analysis = await fetchData('tblTestAnalysis', {},
                { student_id: test.student_id, test_id: test_id, test_type: 'practice' });

            res.locals.responseData = {
                success: true, status: 200, message: 'Practice test details fetched successfully',
                data: {
                    student: { person_id: student.person_id, full_name: student.person_name, email: student.person_email },
                    test: test,
                    ai_analysis: analysis.data && analysis.data.length > 0 ? analysis.data[0] : null
                }
            };
            next();
        } catch (error) {
            console.error('[TPC] Error fetching practice details:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Error fetching practice details', error: error.message };
            next();
        }
    }

    /**
     * Get Department TPC Performance Analytics
     * Route: POST /tpc-dept/analytics/performance
     */
    async getDeptTPCPerformance(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;

            console.log('[DeptTPC] Performance Request by:', userId, userRole);

            if (userRole !== 'DeptTPC') {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                return next();
            }

            const userInfo = await this.getUserInfo(userId);
            if (!userInfo.found || !userInfo.user) throw new Error('User not found');

            const deptTpcUser = userInfo.user;
            const deptFilter = deptTpcUser.department;
            const deptIdFilter = deptTpcUser.department_id;
            const collegeId = deptTpcUser.person_collage_id || deptTpcUser.collage_id;

            console.log('[DeptTPC] User Dept:', deptFilter, 'ID:', deptIdFilter, 'College:', collegeId);

            if (!deptFilter && !deptIdFilter) throw new Error('Department not assigned to user');

            const studentFilter = {
                person_role: { $regex: /^student$/i },
                person_collage_id: collegeId,
                person_deleted: false
            };

            const deptOrConditions = [];
            if (deptIdFilter) {
                deptOrConditions.push({ department_id: deptIdFilter });
                try {
                    const { ObjectId } = await import('mongodb');
                    if (typeof deptIdFilter === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdFilter)) {
                        deptOrConditions.push({ department_id: new ObjectId(deptIdFilter) });
                    }
                } catch (e) { }
            }
            if (deptFilter) {
                const trimmed = deptFilter.trim();
                deptOrConditions.push(
                    { department: trimmed },
                    { department: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                );
            }
            if (deptOrConditions.length > 0) studentFilter.$or = deptOrConditions;

            // Fetch Students
            const studentsRes = await fetchData('tblPersonMaster',
                { _id: 1, person_id: 1, person_name: 1, person_email: 1, person_status: 1, enrollment_number: 1 },
                studentFilter
            );
            const students = studentsRes.data || [];
            const studentIds = students.map(s => (s._id || s.person_id).toString());

            console.log('[DeptTPC] Students found:', students.length);

            // Fetch Progress (DSA/Daily) - Check multiple collection names if needed, but assuming tblStudentProgress
            const progressRes = await fetchData('tblStudentProgress', {}, { student_id: { $in: studentIds } });
            const progressData = progressRes.data || [];

            // Fetch Practice Tests (Aptitude) - RAW DATA for accurate average
            const practiceRes = await fetchData('tblPracticeTest', { score: 1, student_id: 1 }, { student_id: { $in: studentIds } });
            const practiceTests = practiceRes.data || [];

            console.log('[DeptTPC] Progress records:', progressData.length, 'Practice tests:', practiceTests.length);

            // Calculate Stats
            const totalStudents = students.length;
            const activeStudents = students.filter(s => s.person_status === 'active').length;

            let totalScoreSum = 0;
            let totalPracticeTests = practiceTests.length;
            let totalDays = 0;
            let studentDetails = [];

            students.forEach(s => {
                const sId = (s._id || s.person_id).toString();

                // Get Progress
                const prog = progressData.find(p => (p.student_id?.toString() || p.student_id) === sId);
                const completedDays = (prog?.completed_days || prog?.days_completed || []).length;
                const codingProblems = (prog?.coding_problems_completed || []).length;
                if (prog) totalDays += completedDays;

                // Get Practice Tests for THIS student
                const studentTests = practiceTests.filter(t => (t.student_id?.toString() || t.student_id) === sId);
                const testCount = studentTests.length;

                // Calculate average from RAW tests if available, fallback to progress
                let average = 0;
                if (testCount > 0) {
                    const sum = studentTests.reduce((acc, t) => acc + (t.score || 0), 0);
                    average = Math.round(sum / testCount);
                } else {
                    average = prog?.average_score || 0;
                }

                totalScoreSum += average;

                studentDetails.push({
                    id: sId,
                    name: s.person_name,
                    email: s.person_email,
                    status: s.person_status || 'inactive',
                    compositeScore: average,
                    testsCompleted: testCount,
                    codingProblemsSolved: codingProblems,
                    daysCompleted: completedDays
                });
            });

            // Dept Average: Average of student averages
            const averageScore = totalStudents > 0 ? Math.round(totalScoreSum / totalStudents) : 0;

            const topPerformers = studentDetails.filter(s => s.compositeScore >= 85).length;
            const needsAttention = studentDetails.filter(s => s.compositeScore < 50 && s.status === 'active').length;
            const engagementRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

            console.log('[DeptTPC] Stats:', { averageScore, totalPracticeTests, totalDays });

            res.locals.responseData = {
                success: true,
                status: 200,
                data: {
                    department: deptFilter,
                    totalStudents,
                    activeStudents,
                    averageScore,
                    topPerformers,
                    needsAttention,
                    totalTests: totalPracticeTests, // Count of all practice tests taken
                    totalDaysCompleted: totalDays,
                    engagementRate,
                    studentDetails
                }
            };
            next();
        } catch (error) {
            console.error('[TPC] Dept Performance Error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Fetch failed', error: error.message };
            next();
        }
    }

    /**
     * Get Department TPC Score Distribution
     * Route: POST /tpc-dept/analytics/distribution
     */
    async getDeptTPCDistribution(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            if (userRole !== 'DeptTPC') return next();

            const userInfo = await this.getUserInfo(userId);
            const deptTpcUser = userInfo.user;
            const deptFilter = deptTpcUser.department;
            const deptIdFilter = deptTpcUser.department_id;
            const collegeId = deptTpcUser.person_collage_id || deptTpcUser.collage_id;

            const studentFilter = { person_role: { $regex: /^student$/i }, person_collage_id: collegeId, person_deleted: false };
            const deptOrConditions = [];
            if (deptIdFilter) {
                deptOrConditions.push({ department_id: deptIdFilter });
                try {
                    const { ObjectId } = await import('mongodb');
                    if (typeof deptIdFilter === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdFilter)) {
                        deptOrConditions.push({ department_id: new ObjectId(deptIdFilter) });
                    }
                } catch (e) { }
            }
            if (deptFilter) {
                const trimmed = deptFilter.trim();
                deptOrConditions.push(
                    { department: trimmed },
                    { department: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                );
            }
            if (deptOrConditions.length > 0) studentFilter.$or = deptOrConditions;

            const studentsRes = await fetchData('tblPersonMaster', { _id: 1, person_id: 1 }, studentFilter);
            const students = studentsRes.data || [];
            const studentIds = students.map(s => (s._id || s.person_id).toString());

            // Fetch raw tests to calculate real average
            const practiceRes = await fetchData('tblPracticeTest', { score: 1, student_id: 1 }, { student_id: { $in: studentIds } });
            const practiceTests = practiceRes.data || [];

            const distribution = { excellent: 0, good: 0, average: 0, poor: 0, noData: 0 };

            students.forEach(s => {
                const sId = (s._id || s.person_id).toString();
                const studentTests = practiceTests.filter(t => (t.student_id?.toString() || t.student_id) === sId);

                if (studentTests.length === 0) {
                    distribution.noData++;
                } else {
                    const sum = studentTests.reduce((acc, t) => acc + (t.score || 0), 0);
                    const avg = sum / studentTests.length;

                    if (avg >= 85) distribution.excellent++;
                    else if (avg >= 70) distribution.good++;
                    else if (avg >= 50) distribution.average++;
                    else distribution.poor++;
                }
            });

            res.locals.responseData = {
                success: true, status: 200,
                data: { distribution }
            };
            next();
        } catch (error) {
            console.error('[TPC] Dept Distribution Error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Fetch failed', error: error.message };
            next();
        }
    }

    /**
     * Get Department TPC Trends
     * Route: POST /tpc-dept/analytics/trends
     */
    async getDeptTPCTrends(req, res, next) {
        try {
            const { weeks = 8 } = req.body;
            const userId = req.userId || req.user?.id;

            const { ObjectId } = await import('mongodb'); // Move import to top

            const userInfo = await this.getUserInfo(userId);
            const deptTpcUser = userInfo.user;
            const deptFilter = deptTpcUser.department;
            const deptIdFilter = deptTpcUser.department_id;
            const collegeId = deptTpcUser.person_collage_id || deptTpcUser.collage_id;

            const studentFilter = { person_role: { $regex: /^student$/i }, person_collage_id: collegeId, person_deleted: false };
            const deptOrConditions = [];
            if (deptIdFilter) {
                deptOrConditions.push({ department_id: deptIdFilter });
                try {
                    if (typeof deptIdFilter === 'string' && /^[0-9a-fA-F]{24}$/.test(deptIdFilter)) {
                        deptOrConditions.push({ department_id: new ObjectId(deptIdFilter) });
                    }
                } catch (e) { }
            }
            if (deptFilter) {
                const trimmed = deptFilter.trim();
                deptOrConditions.push(
                    { department: trimmed },
                    { department: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                );
            }
            if (deptOrConditions.length > 0) studentFilter.$or = deptOrConditions;

            const studentsRes = await fetchData('tblPersonMaster', { _id: 1, person_id: 1 }, studentFilter);
            const trendStudents = studentsRes.data || []; // Renamed variable
            const studentIds = trendStudents.map(s => (s._id || s.person_id).toString());

            const trendsRes = await fetchData('tblPracticeTest',
                { week: 1, score: 1, student_id: 1 },
                { student_id: { $in: studentIds }, week: { $lte: weeks } }
            );

            const tests = trendsRes.data || [];

            const weekStats = {};
            tests.forEach(t => {
                if (!t.week) return;
                if (!weekStats[t.week]) weekStats[t.week] = { sum: 0, count: 0, students: new Set() };
                weekStats[t.week].sum += (t.score || 0);
                weekStats[t.week].count++;
                weekStats[t.week].students.add(t.student_id);
            });

            const trendsData = [];
            Object.keys(weekStats).forEach(w => {
                const stat = weekStats[w];
                if (stat.count > 0) {
                    trendsData.push({
                        week: parseInt(w),
                        averageScore: Math.round(stat.sum / stat.count),
                        studentsParticipated: stat.students.size
                    });
                }
            });

            trendsData.sort((a, b) => a.week - b.week);

            console.log('[DeptTPC] Trends weeks:', trendsData.length);

            res.locals.responseData = {
                success: true, status: 200,
                data: trendsData
            };
            next();
        } catch (error) {
            console.error('[TPC] Dept Trends Error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Fetch failed', error: error.message };
            next();
        }
    }

    /**
     * Get Student Detailed Analytics
     * Route: POST /tpc-dept/student/details
     */
    async getStudentDetailedAnalytics(req, res, next) {
        try {
            const { student_id } = req.body;
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;

            if (userRole !== 'DeptTPC') {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                return next();
            }

            if (!student_id) {
                res.locals.responseData = { success: false, status: 400, message: 'Student ID is required' };
                return next();
            }

            // Verify DeptTPC Access
            const userInfo = await this.getUserInfo(userId);
            const deptTpcUser = userInfo.user;
            const deptFilter = deptTpcUser.department;
            const deptIdFilter = deptTpcUser.department_id;
            const collegeId = deptTpcUser.person_collage_id || deptTpcUser.collage_id;

            // Fetch Student
            const { ObjectId } = await import('mongodb');
            let studentFilter = {
                person_role: { $regex: /^student$/i },
                person_collage_id: collegeId,
                $or: [
                    { person_id: student_id },
                    { _id: student_id }
                ]
            };

            // Try treating student_id as ObjectId if valid
            if (typeof student_id === 'string' && /^[0-9a-fA-F]{24}$/.test(student_id)) {
                studentFilter.$or.push({ _id: new ObjectId(student_id) });
            }

            const studentRes = await fetchData('tblPersonMaster', {}, studentFilter);
            const student = studentRes.data?.[0];

            if (!student) {
                res.locals.responseData = { success: false, status: 404, message: 'Student not found in your college' };
                return next();
            }

            // Simple access grant for now
            const accessGranted = true;

            const sIdString = (student._id || student.person_id).toString();

            // Fetch Aptitude Tests
            const practiceRes = await fetchData('tblPracticeTest', {}, {
                $or: [
                    { student_id: sIdString },
                    { student_id: student._id }
                ]
            });
            const practiceTests = practiceRes.data || [];

            // Fetch DSA Progress
            const progressRes = await fetchData('tblStudentProgress', {}, {
                $or: [
                    { student_id: sIdString },
                    { student_id: new ObjectId(sIdString) }
                ]
            });
            const progress = progressRes.data?.[0] || null;

            // Fetch DSA Problem Submissions for daily progress
            const submissionsRes = await fetchData('tblProblemSubmission', {}, {
                $or: [
                    { student_id: sIdString },
                    { student_id: new ObjectId(sIdString) }
                ]
            });
            const submissions = submissionsRes.data || [];

            // Group submissions by date for daily progress
            const dailyProgress = {};
            submissions.forEach(sub => {
                if (sub.status === 'solved' || sub.status === 'accepted') {
                    const date = new Date(sub.submitted_at || sub.created_at);
                    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
                    if (!dailyProgress[dateKey]) {
                        dailyProgress[dateKey] = {
                            date: dateKey,
                            problems: [],
                            count: 0
                        };
                    }
                    dailyProgress[dateKey].problems.push({
                        id: sub.problem_id,
                        title: sub.problem_title || 'Problem',
                        status: sub.status
                    });
                    dailyProgress[dateKey].count++;
                }
            });

            // Convert to array and sort by date (newest first)
            const dailyProgressArray = Object.values(dailyProgress)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            res.locals.responseData = {
                success: true,
                status: 200,
                data: {
                    student: {
                        id: sIdString,
                        name: student.person_name,
                        email: student.person_email,
                        enrollment: student.enrollment_number,
                        department: student.department
                    },
                    aptitude: practiceTests.map(t => ({
                        id: t._id,
                        week: t.week,
                        score: t.score,
                        totalQuestions: t.total_questions,
                        correct: t.correct_answers,
                        date: t.created_at
                    })).sort((a, b) => b.week - a.week),
                    dsa: {
                        weeksCompleted: progress?.completed_weeks || [],
                        daysCompleted: progress?.completed_days || progress?.days_completed || [],
                        problemsSolved: submissions.filter(s => s.status === 'solved' || s.status === 'accepted').length,
                        totalSubmissions: submissions.length,
                        currentStreak: progress?.current_streak || 0,
                        dailyProgress: dailyProgressArray
                    }
                }
            };
            next();
        } catch (error) {
            console.error('[TPC] Student Detail Error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Fetch failed', error: error.message };
            next();
        }
    }
}
