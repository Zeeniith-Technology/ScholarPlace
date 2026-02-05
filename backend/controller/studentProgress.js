import { executeData, fetchData } from '../methods.js';
import studentProgressSchema from '../schema/studentProgress.js';
import { getCollegeAndDepartmentForStudent } from '../utils/tenantKeys.js';

export default class studentProgressController {

    /**
     * Helper: Convert userId to string format for student_id (schema requires String)
     * Also creates $or filter to match both ObjectId and string formats in database
     */
    async _normalizeStudentId(userId) {
        const studentIdString = userId.toString();
        const { ObjectId } = await import('mongodb');
        const isObjectId = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId);

        return {
            studentIdString,
            filter: {
                $or: [
                    { student_id: studentIdString },
                    { student_id: isObjectId ? new ObjectId(userId) : userId }
                ]
            }
        };
    }

    /**
     * Get student progress for a specific week or all weeks
     * Route: POST /student-progress/list
     */
    async listStudentProgress(req, res, next) {
        try {
            const { projection, filter, options } = req.body;

            // For students: automatically filter by their student_id
            // For admin/superadmin: can view all or filter by student_id
            const userRole = req.user?.role || req.userId?.role || req.headers['x-user-role'];
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            console.log('[StudentProgress] List request:', {
                userRole,
                userId,
                userIdType: typeof userId,
                userIdSource: {
                    reqUserId: req.userId,
                    reqUser_id: req.user?.id,
                    reqUser_userId: req.user?.userId,
                    reqUser_person_id: req.user?.person_id,
                    header: req.headers['x-user-id']
                },
                filter
            });

            let finalFilter = filter || {};

            let studentIdString = null;
            let isObjectId = false;

            // If student, only show their own progress
            if (userRole === 'Student' && userId) {
                // Convert userId to string for consistent matching (student_id is stored as String in schema)
                studentIdString = userId.toString();

                // Handle both ObjectId and string formats in database
                const { ObjectId } = await import('mongodb');
                isObjectId = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId);

                // Try to match student_id as both string and ObjectId
                finalFilter = {
                    ...finalFilter,
                    $or: [
                        { student_id: studentIdString },
                        { student_id: isObjectId ? new ObjectId(userId) : userId }
                    ]
                };

                console.log('[StudentProgress] Filtering by student_id:', {
                    studentIdString,
                    isObjectId,
                    finalFilter,
                    note: 'This should ONLY return data for the current logged-in student'
                });
            } else {
                console.warn('[StudentProgress] WARNING: Not filtering by student_id!', { userRole, userId });
            }
            // Admin and Superadmin can view all or filter by student_id

            // If we already filtered by student_id manually (for Student role), 
            // do NOT pass 'req' to fetchData options to avoid double-filtering in applyRoleBasedFilter
            const fetchOptions = {
                ...(options || {}),
                ...((userRole !== 'Student' && req) ? { req: req } : {})
            };

            console.log('[StudentProgress] List Query Details:', {
                studentIdString,
                isObjectId,
                finalFilter: JSON.stringify(finalFilter),
                collection: 'tblStudentProgress'
            });

            const response = await fetchData(
                'tblStudentProgress',
                projection || {},
                finalFilter,
                fetchOptions
            );

            console.log('[StudentProgress] List Result:', {
                count: response.data?.length || 0,
                firstRecord: response.data?.[0] ? {
                    _id: response.data[0]._id,
                    week: response.data[0].week,
                    days_completed: response.data[0].days_completed
                } : 'None'
            });

            // Attach verified_days per week (days where student passed ALL daily coding problems)
            if (response.data?.length > 0 && studentIdString) {
                try {
                    const weeksInResponse = [...new Set(response.data.map(r => r.week).filter(Boolean))];
                    const problemsRes = await fetchData(
                        'tblCodingProblem',
                        { week: 1, day: 1, question_id: 1 },
                        { week: { $in: weeksInResponse }, is_capstone: false, day: { $in: ['day-1', 'day-2', 'day-3', 'day-4', 'day-5', 1, 2, 3, 4, 5] }, deleted: { $ne: true } },
                        {}
                    );
                    const subsRes = await fetchData(
                        'tblCodingSubmissions',
                        { problem_id: 1 },
                        { ...finalFilter, status: 'passed' },
                        {}
                    );
                    const allDaily = problemsRes.data || [];
                    const passedIds = new Set((subsRes.data || []).map(s => s.problem_id).filter(Boolean));
                    const dayKey = (w, d) => `${w}-${typeof d === 'number' && d >= 1 && d <= 5 ? 'day-' + d : String(d || '')}`;
                    const problemsByDay = {};
                    allDaily.forEach(p => {
                        const key = dayKey(p.week, p.day);
                        if (!problemsByDay[key]) problemsByDay[key] = [];
                        problemsByDay[key].push(p.question_id);
                    });
                    const verifiedByWeek = {};
                    Object.entries(problemsByDay).forEach(([key, qIds]) => {
                        if (qIds.length > 0 && qIds.every(id => passedIds.has(id))) {
                            const dayPart = key.replace(/^\d+-/, '');
                            const weekNum = parseInt(key.split('-')[0], 10);
                            if (!verifiedByWeek[weekNum]) verifiedByWeek[weekNum] = [];
                            if (!verifiedByWeek[weekNum].includes(dayPart)) verifiedByWeek[weekNum].push(dayPart);
                        }
                    });
                    response.data.forEach(record => {
                        record.verified_days = verifiedByWeek[record.week] || [];
                    });
                } catch (err) {
                    console.warn('[StudentProgress] List verified_days attach failed:', err.message);
                }
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Student progress fetched successfully',
                data: response.data
            };
            next();
        } catch (error) {
            console.error('[StudentProgress] Error:', error);
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
     * Create or update student progress
     * Route: POST /student-progress/upsert
     */
    async upsertStudentProgress(req, res, next) {
        try {
            const progressData = req.body;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            console.log('[StudentProgress] Upsert request:', { userId, progressData });

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            // Ensure student_id matches authenticated user (for students)
            // Convert to string for consistent storage (schema defines student_id as String)
            const userRole = req.user?.role || req.headers['x-user-role'];
            if (userRole === 'Student') {
                progressData.student_id = userId.toString();
            } else if (progressData.student_id) {
                // For admin/superadmin, ensure student_id is string format
                progressData.student_id = progressData.student_id.toString();
            }

            // Check if progress already exists - handle both string and ObjectId formats
            const { ObjectId } = await import('mongodb');
            const studentIdString = progressData.student_id.toString();
            const isObjectId = typeof progressData.student_id === 'string' && /^[0-9a-fA-F]{24}$/.test(progressData.student_id);

            const existingFilter = {
                week: progressData.week,
                $or: [
                    { student_id: studentIdString },
                    { student_id: isObjectId ? new ObjectId(progressData.student_id) : progressData.student_id }
                ]
            };

            const existing = await fetchData(
                'tblStudentProgress',
                {},
                existingFilter,
                {}
            );

            let response;
            if (existing.data && existing.data.length > 0) {
                // Update existing
                progressData.updated_at = new Date().toISOString();
                response = await executeData(
                    'tblStudentProgress',
                    progressData,
                    'u',
                    studentProgressSchema,
                    { student_id: progressData.student_id, week: progressData.week }
                );
            } else {
                // Insert new
                progressData.student_id = progressData.student_id || userId;
                progressData.created_at = new Date().toISOString();
                progressData.updated_at = new Date().toISOString();
                const tenant = await getCollegeAndDepartmentForStudent(progressData.student_id, req, fetchData);
                if (tenant.college_id) progressData.college_id = tenant.college_id;
                if (tenant.department_id) progressData.department_id = tenant.department_id;
                response = await executeData(
                    'tblStudentProgress',
                    progressData,
                    'i',
                    studentProgressSchema
                );
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Student progress updated successfully',
                data: response.data
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

    /**
     * Update progress when student completes a day
     * Route: POST /student-progress/complete-day
     * 
     * Dynamic completion logic:
     * 1. Fetches syllabus data to determine total days, assignments, and tests required
     * 2. Tracks days completed
     * 3. Checks if all requirements are met (days + assignments + tests)
     * 4. Only marks week as completed when ALL requirements are satisfied
     */
    async completeDay(req, res, next) {
        // Store 'this' reference at the start to ensure it's available
        const controller = this;

        try {
            const { week, day } = req.body;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            console.log('[StudentProgress] Complete day request:', { userId, week, day });

            if (!userId || !week || !day) {
                const missing = [];
                if (!userId) missing.push('userId');
                if (!week) missing.push('week');
                if (!day) missing.push('day');

                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: `Missing required fields: ${missing.join(', ')}`,
                    error: 'Missing required fields'
                };
                return next();
            }

            // Fetch syllabus data to get week structure
            const syllabusResponse = await fetchData(
                'tblSyllabus',
                {},
                { week: week },
                {}
            );

            let totalDays = 6; // Default fallback for Week 1
            let requiredAssignments = 0;
            let requiredTests = 0;
            let expectedDays = [];

            if (syllabusResponse.data && syllabusResponse.data.length > 0) {
                const syllabus = syllabusResponse.data[0];

                // Get total days from syllabus days array or calculate from structure
                if (syllabus.days && Array.isArray(syllabus.days)) {
                    totalDays = syllabus.days.length;
                    expectedDays = syllabus.days.map(d => d.id || d.day_id || d.day).filter(Boolean);
                } else {
                    // Fallback: For Week 1, we know it's 6 days (pre-week + day-1 to day-5)
                    if (week === 1) {
                        totalDays = 6;
                        expectedDays = ['pre-week', 'day-1', 'day-2', 'day-3', 'day-4', 'day-5'];
                    } else {
                        // For other weeks, default to assignments count or a reasonable default
                        totalDays = syllabus.assignments || 5;
                    }
                }

                requiredAssignments = syllabus.assignments || 0;
                requiredTests = syllabus.tests || 0;
            } else {
                // Fallback for Week 1 if syllabus not found
                if (week === 1) {
                    totalDays = 6;
                    expectedDays = ['pre-week', 'day-1', 'day-2', 'day-3', 'day-4', 'day-5'];
                    requiredAssignments = 6; // Week 1 has 6 practice assignments
                    requiredTests = 1; // Week 1 has 1 test
                }
            }

            // Get existing progress - handle both ObjectId and string formats explicitly
            const { ObjectId } = await import('mongodb');
            const studentIdString = userId.toString();
            let studentIdFilter = {};

            if (/^[0-9a-fA-F]{24}$/.test(studentIdString)) {
                studentIdFilter = {
                    $or: [
                        { student_id: studentIdString }, // String format
                        { student_id: new ObjectId(studentIdString) } // ObjectId format
                    ]
                };
            } else {
                studentIdFilter = { student_id: studentIdString };
            }

            const existingFilter = {
                week: week,
                ...studentIdFilter
            };

            const existing = await fetchData(
                'tblStudentProgress',
                {},
                existingFilter,
                {}
            );

            let daysCompleted = [];
            let assignmentsCompleted = 0;
            let testsCompleted = 0;
            let practiceTestsCompleted = 0;
            let progressPercentage = 0;
            let status = 'in_progress';

            if (existing.data && existing.data.length > 0) {
                const currentProgress = existing.data[0];
                daysCompleted = currentProgress.days_completed || [];
                assignmentsCompleted = currentProgress.assignments_completed || 0;
                testsCompleted = currentProgress.tests_completed || 0;
                practiceTestsCompleted = currentProgress.practice_tests_completed || 0;

                // Add day if not already completed
                if (!daysCompleted.includes(day)) {
                    daysCompleted.push(day);
                }
            } else {
                daysCompleted = [day];
                assignmentsCompleted = 0;
                testsCompleted = 0;
                practiceTestsCompleted = 0;
            }

            // Calculate progress percentage based on all requirements
            // Use weighted average instead of minimum to show overall progress
            const totalItems = totalDays + requiredAssignments + requiredTests;

            if (totalItems > 0) {
                const daysWeight = totalDays / totalItems;
                const assignmentsWeight = requiredAssignments / totalItems;
                const testsWeight = requiredTests / totalItems;

                const daysProgress = (daysCompleted.length / totalDays) * 100;
                const assignmentsProgress = requiredAssignments > 0
                    ? (assignmentsCompleted / requiredAssignments) * 100
                    : 100; // If no assignments required, consider it 100%
                const testsProgress = requiredTests > 0
                    ? (testsCompleted / requiredTests) * 100
                    : 100; // If no tests required, consider it 100%

                // Calculate weighted average progress
                progressPercentage = Math.round(
                    (daysProgress * daysWeight) +
                    (assignmentsProgress * assignmentsWeight) +
                    (testsProgress * testsWeight)
                );
            } else {
                progressPercentage = 0;
            }

            // Check if all requirements are met for completion
            const allDaysCompleted = daysCompleted.length >= totalDays;
            const allAssignmentsCompleted = requiredAssignments === 0 || assignmentsCompleted >= requiredAssignments;
            const allTestsCompleted = requiredTests === 0 || testsCompleted >= requiredTests;

            // Update status based on completion criteria
            if (allDaysCompleted && allAssignmentsCompleted && allTestsCompleted) {
                status = 'completed';
            } else if (daysCompleted.length > 0 || assignmentsCompleted > 0 || testsCompleted > 0) {
                status = 'in_progress';
            } else {
                status = 'start';
            }

            // Note: studentIdString and studentIdFilter are already declared above (line 289)
            // Reuse them here instead of redeclaring

            // Upsert progress
            const progressData = {
                student_id: studentIdString, // ALWAYS string format (already normalized above)
                week: week,
                status: status,
                progress_percentage: progressPercentage,
                days_completed: daysCompleted,
                assignments_completed: assignmentsCompleted,
                assignments_total: requiredAssignments,
                tests_completed: testsCompleted,
                tests_total: requiredTests,
                practice_tests_completed: practiceTestsCompleted,
                last_accessed: new Date(),
                completed_at: status === 'completed' ? new Date() : undefined,
                updated_at: new Date().toISOString()
            };

            // Check if progress already exists - use $or to match both formats
            const existingCheck = await fetchData(
                'tblStudentProgress',
                {},
                { week: week, ...studentIdFilter },
                {}
            );

            // Atomic update to ensure days_completed is preserved even if other requests are concurrent
            if (existingCheck.data && existingCheck.data.length > 0) {
                // Update existing - Use atomic operators
                const updatePayload = {
                    $addToSet: { days_completed: day },
                    $set: {
                        last_accessed: new Date(),
                        updated_at: new Date().toISOString(),
                        status: status, // This might be slightly stale if calculated before add, but acceptable for now
                        progress_percentage: progressPercentage,
                        assignments_completed: assignmentsCompleted,
                        tests_completed: testsCompleted,
                        practice_tests_completed: practiceTestsCompleted
                    }
                };

                if (status === 'completed') {
                    updatePayload.$set.completed_at = new Date();
                }

                response = await executeData(
                    'tblStudentProgress',
                    updatePayload,
                    'u',
                    // Pass null for schema when using operators to avoid schema validation affecting operators
                    // But we still want type conversion if possible. 
                    // executeData handles operators by skipping schema wrapping, but applies defaults?
                    // Let's pass null to be safe and rely on manual construction
                    null,
                    { week: week, ...studentIdFilter }
                );
            } else {
                // Insert new (keep as is)
                progressData.created_at = new Date().toISOString();
                const tenant = await getCollegeAndDepartmentForStudent(userId, req, fetchData);
                if (tenant.college_id) progressData.college_id = tenant.college_id;
                if (tenant.department_id) progressData.department_id = tenant.department_id;
                response = await executeData(
                    'tblStudentProgress',
                    progressData,
                    'i',
                    studentProgressSchema
                );
            }

            // Check and update week completion status after day completion
            let completionStatus;
            try {
                // Call the helper method using stored controller reference
                if (controller && typeof controller.checkAndUpdateWeekCompletion === 'function') {
                    completionStatus = await controller.checkAndUpdateWeekCompletion(userId, week);
                } else {
                    console.error('checkAndUpdateWeekCompletion not available, controller:', controller);
                    throw new Error('checkAndUpdateWeekCompletion method not available');
                }
            } catch (error) {
                console.error('Error in checkAndUpdateWeekCompletion:', error);
                // Fallback completion status - use already calculated values
                completionStatus = {
                    completed: status === 'completed',
                    status: status,
                    progressPercentage: progressPercentage
                };
            }

            // Emit real-time progress update via Socket.io
            const io = req.app.get('io');
            if (io) {
                io.to(`user:${userId}`).emit('progress-updated', {
                    week,
                    day,
                    action: 'day-completed',
                    progressData: {
                        ...progressData,
                        completion_status: completionStatus
                    },
                    timestamp: new Date()
                });
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Day marked as completed',
                data: {
                    ...progressData,
                    completion_status: {
                        days: { completed: daysCompleted.length, total: totalDays, met: allDaysCompleted },
                        assignments: { completed: assignmentsCompleted, total: requiredAssignments, met: allAssignmentsCompleted },
                        tests: { completed: testsCompleted, total: requiredTests, met: allTestsCompleted },
                        week_completed: status === 'completed'
                    },
                    week_completion_status: completionStatus
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to complete day',
                error: error.message
            };
            next();
        }
    }

    /**
     * Helper function to check and update week completion status
     * This is called after any progress update (day, assignment, test)
     */
    async checkAndUpdateWeekCompletion(userId, week) {
        try {
            // Fetch syllabus data
            const syllabusResponse = await fetchData(
                'tblSyllabus',
                {},
                { week: week },
                {}
            );

            let totalDays = 6;
            let requiredAssignments = 0;
            let requiredTests = 0;

            if (syllabusResponse.data && syllabusResponse.data.length > 0) {
                const syllabus = syllabusResponse.data[0];
                if (syllabus.days && Array.isArray(syllabus.days)) {
                    totalDays = syllabus.days.length;
                } else if (week === 1) {
                    totalDays = 6;
                }
                requiredAssignments = syllabus.assignments || 0;
                requiredTests = syllabus.tests || 0;
            } else if (week === 1) {
                totalDays = 6;
                requiredAssignments = 6;
                requiredTests = 1;
            }

            // Get current progress
            const existing = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: userId, week: week },
                {}
            );

            if (!existing.data || existing.data.length === 0) {
                return { completed: false, status: 'start' };
            }

            const currentProgress = existing.data[0];
            const daysCompleted = currentProgress.days_completed || [];
            const assignmentsCompleted = currentProgress.assignments_completed || 0;
            const testsCompleted = currentProgress.tests_completed || 0;

            // Check completion criteria
            const allDaysCompleted = daysCompleted.length >= totalDays;
            const allAssignmentsCompleted = requiredAssignments === 0 || assignmentsCompleted >= requiredAssignments;
            const allTestsCompleted = requiredTests === 0 || testsCompleted >= requiredTests;

            let status = currentProgress.status || 'start';
            let progressPercentage = currentProgress.progress_percentage || 0;

            if (allDaysCompleted && allAssignmentsCompleted && allTestsCompleted) {
                status = 'completed';
                progressPercentage = 100;
            } else if (daysCompleted.length > 0 || assignmentsCompleted > 0 || testsCompleted > 0) {
                status = 'in_progress';
                // Calculate progress percentage using weighted average
                const totalItems = totalDays + requiredAssignments + requiredTests;

                if (totalItems > 0) {
                    const daysWeight = totalDays / totalItems;
                    const assignmentsWeight = requiredAssignments / totalItems;
                    const testsWeight = requiredTests / totalItems;

                    const daysProgress = (daysCompleted.length / totalDays) * 100;
                    const assignmentsProgress = requiredAssignments > 0
                        ? (assignmentsCompleted / requiredAssignments) * 100
                        : 100;
                    const testsProgress = requiredTests > 0
                        ? (testsCompleted / requiredTests) * 100
                        : 100;

                    // Calculate weighted average progress
                    progressPercentage = Math.round(
                        (daysProgress * daysWeight) +
                        (assignmentsProgress * assignmentsWeight) +
                        (testsProgress * testsWeight)
                    );
                } else {
                    progressPercentage = 0;
                }
            }

            // Update status if changed
            if (status !== currentProgress.status || progressPercentage !== currentProgress.progress_percentage) {
                await executeData(
                    'tblStudentProgress',
                    {
                        status: status,
                        progress_percentage: progressPercentage,
                        completed_at: status === 'completed' ? new Date() : currentProgress.completed_at,
                        updated_at: new Date().toISOString()
                    },
                    'u',
                    studentProgressSchema,
                    { student_id: userId, week: week }
                );
            }

            return {
                completed: status === 'completed',
                status: status,
                progressPercentage: progressPercentage
            };
        } catch (error) {
            console.error('Error checking week completion:', error);
            return { completed: false, status: 'in_progress' };
        }
    }

    /**
     * Update practice test score
     * Route: POST /student-progress/update-practice-score
     * Also updates assignments_completed count (practice tests count as assignments)
     */
    async updatePracticeScore(req, res, next) {
        // Store 'this' reference at the start to ensure it's available
        const controller = this;

        try {
            const { week, day, score } = req.body;
            const userId = req.user?.id || req.headers['x-user-id'];

            if (!userId || !week || !day || score === undefined) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Week, day, and score are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Get existing progress
            const existing = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: userId, week: week },
                {}
            );

            let practiceTestScores = [];
            let practiceTestsCompleted = 0;
            let assignmentsCompleted = 0;

            if (existing.data && existing.data.length > 0) {
                const currentProgress = existing.data[0];
                practiceTestScores = currentProgress.practice_test_scores || [];
                practiceTestsCompleted = currentProgress.practice_tests_completed || 0;
                assignmentsCompleted = currentProgress.assignments_completed || 0;

                // Check if test for this day already exists
                const existingTestIndex = practiceTestScores.findIndex(
                    t => t.day === day
                );

                if (existingTestIndex >= 0) {
                    const existingTest = practiceTestScores[existingTestIndex];
                    // Check for max attempts (Limit: 3)
                    if ((existingTest.attempt || 1) >= 3) {
                        res.locals.responseData = {
                            success: false,
                            status: 403,
                            message: 'Maximum attempts (3) reached for this test.',
                            error: 'Max attempts reached',
                            data: {
                                attempts: existingTest.attempt,
                                previousScore: existingTest.score,
                                canRetake: false
                            }
                        };
                        return next();
                    }

                    // Only allow retake if previous score was < 70%
                    if (existingTest.score >= 70) {
                        res.locals.responseData = {
                            success: false,
                            status: 403,
                            message: 'Test already completed with score >= 70%. Retake not allowed.',
                            error: 'Test already passed',
                            data: {
                                previousScore: existingTest.score,
                                canRetake: false
                            }
                        };
                        return next();
                    }
                    // Update existing test score (retake allowed because score < 80%)
                    practiceTestScores[existingTestIndex] = {
                        day: day,
                        score: score,
                        date: new Date(),
                        attempt: (existingTest.attempt || 1) + 1,
                        previousScore: existingTest.score
                    };
                } else {
                    // Add new test score (first attempt)
                    practiceTestScores.push({
                        day: day,
                        score: score,
                        date: new Date(),
                        attempt: 1
                    });
                    practiceTestsCompleted += 1;
                    assignmentsCompleted += 1; // Practice test counts as an assignment
                }
            } else {
                practiceTestScores = [{
                    day: day,
                    score: score,
                    date: new Date(),
                    attempt: 1
                }];
                practiceTestsCompleted = 1;
                assignmentsCompleted = 1;
            }

            // Note: studentIdString and studentIdFilter are already declared above (line 289)
            // Reuse them here - no need to redeclare

            // Upsert progress
            const progressData = {
                student_id: studentIdString, // ALWAYS string format
                week: week,
                practice_tests_completed: practiceTestsCompleted,
                practice_test_scores: practiceTestScores,
                assignments_completed: assignmentsCompleted,
                last_accessed: new Date(),
                updated_at: new Date().toISOString()
            };

            // Check if progress already exists - use $or to match both formats
            const existingCheck = await fetchData(
                'tblStudentProgress',
                {},
                { week: week, ...studentIdFilter },
                {}
            );

            let response;
            if (existingCheck.data && existingCheck.data.length > 0) {
                // Update existing - merge with existing data
                const existing = existingCheck.data[0];
                const mergedData = {
                    ...existing,
                    ...progressData,
                    days_completed: existing.days_completed || [],
                    status: existing.status || 'in_progress',
                    progress_percentage: existing.progress_percentage || 0
                };
                response = await executeData(
                    'tblStudentProgress',
                    mergedData,
                    'u',
                    studentProgressSchema,
                    { week: week, ...studentIdFilter }
                );
            } else {
                // Insert new
                progressData.created_at = new Date().toISOString();
                progressData.status = 'in_progress';
                progressData.progress_percentage = 0;
                progressData.days_completed = [];
                const tenantDay = await getCollegeAndDepartmentForStudent(userId, req, fetchData);
                if (tenantDay.college_id) progressData.college_id = tenantDay.college_id;
                if (tenantDay.department_id) progressData.department_id = tenantDay.department_id;
                response = await executeData(
                    'tblStudentProgress',
                    progressData,
                    'i',
                    studentProgressSchema
                );
            }

            // Check and update week completion status after practice test
            // This will recalculate and update the progress percentage
            let completionStatus;
            try {
                // Call the helper method using stored controller reference
                if (controller && typeof controller.checkAndUpdateWeekCompletion === 'function') {
                    completionStatus = await controller.checkAndUpdateWeekCompletion(userId, week);
                } else {
                    console.error('checkAndUpdateWeekCompletion not available, controller:', controller);
                    throw new Error('checkAndUpdateWeekCompletion method not available');
                }
            } catch (error) {
                console.error('Error in checkAndUpdateWeekCompletion:', error);
                // Fallback completion status
                completionStatus = {
                    completed: false,
                    status: 'in_progress',
                    progressPercentage: 0
                };
            }

            // Fetch updated progress to get the recalculated percentage
            const updatedProgress = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: userId, week: week },
                {}
            );

            let finalProgressData = progressData;
            if (updatedProgress.data && updatedProgress.data.length > 0) {
                finalProgressData = updatedProgress.data[0];
            }

            // Emit real-time progress update via Socket.io
            const io = req.app.get('io');
            if (io) {
                io.to(`user:${userId}`).emit('progress-updated', {
                    week,
                    day,
                    action: 'practice-test-completed',
                    progressData: {
                        ...finalProgressData,
                        week_completion_status: completionStatus
                    },
                    timestamp: new Date()
                });
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Practice test score updated',
                data: {
                    ...finalProgressData,
                    week_completion_status: completionStatus
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to update practice score',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get student progress summary (for dashboard)
     * Route: GET /student-progress/summary
     */
    async getStudentProgressSummary(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            console.log('[StudentProgress] Summary request:', { userId });

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required',
                    error: 'Authentication required'
                };
                return next();
            }

            // Convert userId to string for consistent matching
            const { studentIdString, filter: studentIdFilter } = await this._normalizeStudentId(userId);

            // Try to match student_id as both string and ObjectId
            const progressFilter = {
                ...studentIdFilter
            };

            console.log('[StudentProgress] Summary filter:', { studentIdString, progressFilter });

            // Get all progress for this student
            const allProgress = await fetchData(
                'tblStudentProgress',
                {},
                progressFilter,
                { sort: { week: 1 } }
            );

            const progressData = allProgress.data || [];

            // Syllabus has 6 weeks; use for progress denominator
            const SYLLABUS_TOTAL_WEEKS = 6;
            const totalWeeks = Math.max(SYLLABUS_TOTAL_WEEKS, progressData.length > 0 ? Math.max(...progressData.map(p => p.week)) : 0);
            const currentWeek = progressData.find(p => p.status === 'in_progress' || p.status === 'start')?.week || 1;

            const totalTimeSpent = progressData.reduce((sum, p) => sum + (p.time_spent || 0), 0);

            // Verified days completed: count (week, day) where student has passed ALL daily coding problems for that day
            let totalDaysCompleted = 0;
            let weeksCompleted = 0;
            try {
                const problemsRes = await fetchData(
                    'tblCodingProblem',
                    { week: 1, day: 1, question_id: 1 },
                    { is_capstone: false, day: { $in: ['day-1', 'day-2', 'day-3', 'day-4', 'day-5', 1, 2, 3, 4, 5] }, deleted: { $ne: true } },
                    {}
                );
                const allDailyProblems = problemsRes.data || [];
                const subsRes = await fetchData(
                    'tblCodingSubmissions',
                    { problem_id: 1 },
                    { ...progressFilter, status: 'passed' },
                    {}
                );
                const submissions = subsRes.data || [];
                const passedProblemIds = new Set(submissions.map(s => s.problem_id).filter(Boolean));

                // Group problems by (week, day) -> list of question_ids
                const dayKey = (w, d) => {
                    const dayStr = typeof d === 'number' && d >= 1 && d <= 5 ? `day-${d}` : String(d || '');
                    return `${w}-${dayStr}`;
                };
                const problemsByDay = {};
                allDailyProblems.forEach(p => {
                    const key = dayKey(p.week, p.day);
                    if (!problemsByDay[key]) problemsByDay[key] = [];
                    problemsByDay[key].push(p.question_id);
                });

                // A day is verified only if ALL its problems are passed
                const verifiedDays = Object.entries(problemsByDay).filter(([, qIds]) =>
                    qIds.length > 0 && qIds.every(id => passedProblemIds.has(id))
                );
                totalDaysCompleted = verifiedDays.length;

                // Weeks completed = count of weeks where all 5 days (day-1..day-5) are verified
                const maxWeek = progressData.length > 0 ? Math.max(...progressData.map(p => p.week), 1) : 1;
                const totalWeeksNum = Math.max(SYLLABUS_TOTAL_WEEKS, maxWeek);
                for (let w = 1; w <= totalWeeksNum; w++) {
                    const allFive = [1, 2, 3, 4, 5].every(d => {
                        const key = `${w}-day-${d}`;
                        const qIds = problemsByDay[key];
                        return qIds && qIds.length > 0 && qIds.every(id => passedProblemIds.has(id));
                    });
                    if (allFive) weeksCompleted++;
                }
            } catch (err) {
                console.warn('[StudentProgress] Verified days computation failed, falling back to tblStudentProgress:', err.message);
                totalDaysCompleted = progressData.reduce((sum, p) => sum + (p.days_completed?.length || 0), 0);
                weeksCompleted = progressData.filter(p => p.status === 'completed').length;
            }

            // Actual practice test count and streak from tblPracticeTest
            let totalPracticeTests = 0;
            let averagePracticeScore = 0;
            let currentStreak = 0;
            let aptitudeWeeksCompleted = 0;
            let overallProgressPercent = totalWeeks > 0 ? Math.round((weeksCompleted / totalWeeks) * 100) : 0;
            try {
                const practiceRes = await fetchData(
                    'tblPracticeTest',
                    { score: 1, completed_at: 1, created_at: 1, week: 1, category: 1 },
                    progressFilter,
                    { sort: { completed_at: -1, created_at: -1 } }
                );
                const tests = practiceRes.data || [];
                totalPracticeTests = tests.length;
                const scores = tests.map(t => t.score).filter(s => s != null);
                averagePracticeScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                // Aptitude weeks completed: distinct weeks where student passed Aptitude weekly test (score > 75)
                const aptitudePassedWeeks = new Set();
                tests.forEach(t => {
                    const cat = (t.category || '').toString().toLowerCase();
                    if (cat === 'aptitude' && t.score != null && t.score > 75 && t.week != null) {
                        aptitudePassedWeeks.add(t.week);
                    }
                });
                aptitudeWeeksCompleted = aptitudePassedWeeks.size;
                // Overall progress = average of DSA % and Aptitude % (both tracks)
                const totalWeeksNum = Math.max(totalWeeks, 1);
                const dsaPercent = (weeksCompleted / totalWeeksNum) * 100;
                const aptitudePercent = (aptitudeWeeksCompleted / totalWeeksNum) * 100;
                overallProgressPercent = Math.round((dsaPercent + aptitudePercent) / 2);
                // Consecutive days streak from completed_at
                const sortedByDate = [...tests].filter(t => t.completed_at || t.created_at).sort((a, b) => {
                    const da = new Date(a.completed_at || a.created_at).getTime();
                    const db = new Date(b.completed_at || b.created_at).getTime();
                    return db - da;
                });
                let lastDate = null;
                for (const test of sortedByDate) {
                    const testDate = new Date(test.completed_at || test.created_at);
                    testDate.setHours(0, 0, 0, 0);
                    if (!lastDate) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (testDate.getTime() === today.getTime() || testDate.getTime() === today.getTime() - 86400000) {
                            currentStreak = 1;
                            lastDate = testDate;
                        } else break;
                    } else {
                        const dayDiff = Math.floor((lastDate - testDate) / 86400000);
                        if (dayDiff === 0) continue;
                        else if (dayDiff === 1) {
                            currentStreak++;
                            lastDate = testDate;
                        } else break;
                    }
                }
            } catch (err) {
                console.warn('[StudentProgress] Summary practice/streak fetch failed:', err.message);
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Progress summary fetched successfully',
                data: {
                    weeksCompleted,
                    aptitudeWeeksCompleted,
                    totalWeeks,
                    currentWeek,
                    totalPracticeTests,
                    averagePracticeScore,
                    totalTimeSpent,
                    totalDaysCompleted,
                    currentStreak,
                    overallProgressPercent,
                    progressByWeek: progressData
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch progress summary',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get all students progress (Admin/Superadmin only)
     * Route: POST /student-progress/admin/list-all
     */
    async listAllStudentsProgress(req, res, next) {
        try {
            const { projection, filter, options } = req.body;

            const fetchOptions = {
                ...(options || {}),
                ...(req ? { req: req } : {})
            };

            const response = await fetchData(
                'tblStudentProgress',
                projection || {},
                filter || {},
                fetchOptions
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'All students progress fetched successfully',
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
     * Mark coding problem as completed
     * Route: POST /student-progress/complete-coding-problem
     */
    async completeCodingProblem(req, res, next) {
        try {
            const { week, problem_id } = req.body;
            const userId = req.user?.id || req.headers['x-user-id'];

            if (!userId || !week || !problem_id) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Week and problem_id are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Get existing progress
            const existing = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: userId, week: week },
                {}
            );

            let codingProblemsCompleted = [];

            if (existing.data && existing.data.length > 0) {
                const currentProgress = existing.data[0];
                codingProblemsCompleted = currentProgress.coding_problems_completed || [];

                // Add problem_id if not already present
                if (!codingProblemsCompleted.includes(problem_id)) {
                    codingProblemsCompleted.push(problem_id);
                }
            } else {
                // Create new progress record
                codingProblemsCompleted = [problem_id];
            }

            // CRITICAL: Normalize student_id to string format
            const { studentIdString, filter: studentIdFilter } = await this._normalizeStudentId(userId);

            // Update progress: set status to 'in_progress' when at least one problem is completed (so week shows "Continue")
            const currentStatus = existing.data?.[0]?.status || 'start';
            const newStatus = (codingProblemsCompleted.length > 0 && currentStatus !== 'completed') ? 'in_progress' : currentStatus;

            if (existing.data && existing.data.length > 0) {
                // Partial update: only set these fields so we don't overwrite days_completed, etc.
                const result = await executeData(
                    'tblStudentProgress',
                    {
                        $set: {
                            coding_problems_completed: codingProblemsCompleted,
                            status: newStatus,
                            updated_at: new Date().toISOString()
                        }
                    },
                    'u',
                    null,
                    { week: week, ...studentIdFilter }
                );
                if (!result.success) {
                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'Failed to update coding problem completion',
                        error: result.error || 'Database error'
                    };
                    return next();
                }
            } else {
                // Insert new progress record
                const progressData = {
                    student_id: studentIdString,
                    week: week,
                    coding_problems_completed: codingProblemsCompleted,
                    status: newStatus,
                    updated_at: new Date().toISOString()
                };
                const tenant = await getCollegeAndDepartmentForStudent(studentIdString, req, fetchData);
                if (tenant.college_id) progressData.college_id = tenant.college_id;
                if (tenant.department_id) progressData.department_id = tenant.department_id;
                const result = await executeData(
                    'tblStudentProgress',
                    progressData,
                    'i',
                    studentProgressSchema,
                    {}
                );
                if (!result.success) {
                    res.locals.responseData = {
                        success: false,
                        status: 500,
                        message: 'Failed to save coding problem completion',
                        error: result.error || 'Database error'
                    };
                    return next();
                }
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Coding problem marked as completed',
                data: {
                    coding_problems_completed: codingProblemsCompleted,
                    total_completed: codingProblemsCompleted.length
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error updating coding problem completion',
                error: error.message
            };
            next();
        }
    }

    /**
     * Check if student is eligible to take weekly test
     * Route: POST /student-progress/check-weekly-test-eligibility
     * Requirements:
     * 1. All practice tests must have score >= 70%
     * 2. All coding problems must be completed
     */
    async checkWeeklyTestEligibility(req, res, next) {
        try {
            const { week, track } = req.body;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            console.log('[StudentProgress] Check weekly test eligibility request:', { userId, week, track });

            if (!userId || !week) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: week ? 'User ID is required' : userId ? 'Week is required' : 'Week and user ID are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Get student progress
            const progressResult = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: userId, week: week },
                {}
            );

            // Get all practice tests for this week
            const practiceTestResult = await fetchData(
                'tblPracticeTest',
                {},
                { student_id: userId, week: week },
                { sort: { day: 1, attempt: -1 } } // Get latest attempt for each day
            );

            // Get all coding problems for this week
            // Define required practice-test days: aptitude has no pre-week, only day-1..day-5
            const weekDays = track === 'aptitude'
                ? ['day-1', 'day-2', 'day-3', 'day-4', 'day-5']
                : ['pre-week', 'day-1', 'day-2', 'day-3', 'day-4', 'day-5'];
            const allCodingProblems = [];

            // Import coding problems data
            try {
                const codingProblemsData = await import('../data/codingProblems.js');
                const allProblems = codingProblemsData.default || [];

                // Filter problems for this week
                // For Week 1, all problems in the file are for Week 1
                const weekProblems = week === 1
                    ? allProblems
                    : allProblems.filter(p => p.week === week);

                // Get unique problem IDs
                weekProblems.forEach(problem => {
                    if (problem.problem_id && !allCodingProblems.includes(problem.problem_id)) {
                        allCodingProblems.push(problem.problem_id);
                    }
                });
            } catch (error) {
                console.error('Error loading coding problems data:', error);
                // If import fails, try to get from questions controller
                // For now, we'll continue with empty array and let the check proceed
            }

            const progress = progressResult.data && progressResult.data.length > 0 ? progressResult.data[0] : null;
            const practiceTests = practiceTestResult.data || [];
            const codingProblemsCompleted = progress?.coding_problems_completed || [];

            // Check practice test scores (>= 70% for each day)
            const practiceTestEligibility = {
                eligible: true,
                days: [],
                missing: [],
                failed: []
            };

            // Get latest attempt for each day
            const latestTestsByDay = {};
            const attemptsByDay = {};

            practiceTests.forEach(test => {
                // Count attempts
                if (!attemptsByDay[test.day]) {
                    attemptsByDay[test.day] = 0;
                }
                attemptsByDay[test.day]++;

                // Track latest attempt
                if (!latestTestsByDay[test.day] || test.attempt > latestTestsByDay[test.day].attempt) {
                    latestTestsByDay[test.day] = test;
                }
            });

            // Check each day
            for (const day of weekDays) {
                const test = latestTestsByDay[day];
                const attemptCount = attemptsByDay[day] || 0;

                // Weekly test (aptitude) requires >75%; other practice days require >=70%
                const threshold = day === 'weekly-test' ? 75 : 70;
                if (!test) {
                    practiceTestEligibility.missing.push(day);
                    practiceTestEligibility.eligible = false;
                } else if (test.score < threshold) {
                    practiceTestEligibility.failed.push({
                        day,
                        score: test.score,
                        attempts: attemptCount
                    });
                    practiceTestEligibility.eligible = false;
                } else {
                    practiceTestEligibility.days.push({
                        day,
                        score: test.score,
                        attempts: attemptCount
                    });
                }
            }

            // Add raw attempts map for frontend lookups
            practiceTestEligibility.attempts_by_day = attemptsByDay;

            // Check coding problems completion
            // If no coding problems exist for this week, or track is 'aptitude' (no coding in aptitude), consider requirement met
            const codingRequired = track !== 'aptitude';
            const codingProblemsEligibility = {
                eligible: !codingRequired || allCodingProblems.length === 0 || allCodingProblems.every(id => codingProblemsCompleted.includes(id)),
                total: allCodingProblems.length,
                completed: codingProblemsCompleted.length,
                missing: allCodingProblems.filter(id => !codingProblemsCompleted.includes(id))
            };

            // Check if Weekly Test itself is completed (day: 'weekly-test')
            // results are already in 'practiceTests' array drawn from tblPracticeTest
            const weeklyTestAttempts = practiceTests.filter(t => t.day === 'weekly-test');
            const weeklyAttemptCount = weeklyTestAttempts.length;
            const latestWeeklyTest = weeklyTestAttempts.sort((a, b) => b.attempt - a.attempt)[0];

            const weeklyTestStatus = {
                attempted: weeklyAttemptCount > 0,
                score: latestWeeklyTest ? latestWeeklyTest.score : 0,
                completed: !!latestWeeklyTest,
                passed: latestWeeklyTest ? latestWeeklyTest.score > 75 : false,
                attempts: weeklyAttemptCount,
                max_attempts: 3
            };

            // Overall eligibility
            const isEligible = practiceTestEligibility.eligible && codingProblemsEligibility.eligible;

            res.locals.responseData = {
                success: true,
                status: 200,
                message: isEligible ? 'Student is eligible for weekly test' : 'Student is not eligible for weekly test',
                data: {
                    eligible: isEligible,
                    practice_tests: practiceTestEligibility,
                    coding_problems: codingProblemsEligibility,
                    weekly_test_status: weeklyTestStatus,
                    requirements: {
                        practice_test_threshold: 70,
                        weekly_test_threshold: 75,
                        coding_problems_required: 'all'
                    }
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error checking weekly test eligibility',
                error: error.message
            };
            next();
        }
    }

    /**
     * Block student from retaking test after violation
     * Route: POST /student-progress/block-test-retake
     */
    async blockTestRetake(req, res, next) {
        try {
            const { week, test_type, reason } = req.body;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            if (!userId || !week || !test_type) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Student ID, week, and test type are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            const { ObjectId } = await import('mongodb');
            const studentIdString = userId.toString();

            // Get student's department_id so DeptTPC can filter blocked records by department
            let department_id = null;
            const studentIdForFetch = /^[0-9a-fA-F]{24}$/.test(studentIdString)
                ? new ObjectId(studentIdString)
                : studentIdString;
            const studentRes = await fetchData(
                'tblPersonMaster',
                {},
                { _id: studentIdForFetch, person_role: 'student' }
            );
            if (studentRes?.data?.[0]) {
                const d = studentRes.data[0].department_id ?? studentRes.data[0].department;
                if (d && (typeof d === 'string' && /^[0-9a-fA-F]{24}$/.test(d))) {
                    department_id = d;
                } else if (d && typeof d?.toString === 'function' && /^[0-9a-fA-F]{24}$/.test(d.toString())) {
                    department_id = d.toString();
                }
            }

            // Create or update blocked test record
            const blockedTestData = {
                student_id: studentIdString,
                week: week,
                test_type: test_type, // 'weekly' or 'practice'
                blocked: true,
                blocked_reason: reason || 'window_switch_violation',
                blocked_at: new Date(),
                approved_by: null,
                approved_at: null,
                ...(department_id && { department_id }),
            };

            console.log('[blockTestRetake] Blocking student:', {
                userId,
                studentIdString,
                week,
                test_type,
                reason
            });

            // Check if record exists
            const existing = await fetchData(
                'tblBlockedTestRetake',
                {},
                { student_id: studentIdString, week: week, test_type: test_type }
            );

            if (existing.data && existing.data.length > 0) {
                // Update existing record
                console.log('[blockTestRetake] Updating existing record:', existing.data[0]._id);
                await executeData(
                    'tblBlockedTestRetake',
                    { $set: blockedTestData },
                    'u',
                    null,
                    { _id: new ObjectId(existing.data[0]._id) }
                );
            } else {
                // Create new record
                console.log('[blockTestRetake] Creating new blocked record');
                const insertResult = await executeData('tblBlockedTestRetake', blockedTestData, 'i', null);
                console.log('[blockTestRetake] Insert result:', insertResult);
            }

            // Verify the record was saved
            const verify = await fetchData(
                'tblBlockedTestRetake',
                {},
                { student_id: studentIdString, week: week, test_type: test_type }
            );
            console.log('[blockTestRetake] Verification - records found:', verify.data?.length || 0);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Student blocked from retaking test',
                data: { blocked: true }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error blocking student from retake',
                error: error.message
            };
            next();
        }
    }

    /**
     * Check if student is blocked from retaking test
     * Route: POST /student-progress/check-blocked-retake
     */
    async checkBlockedRetake(req, res, next) {
        try {
            const { week, test_type } = req.body;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            if (!userId || !week || !test_type) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Student ID, week, and test type are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            const studentIdString = userId.toString();

            const result = await fetchData(
                'tblBlockedTestRetake',
                {},
                { student_id: studentIdString, week: week, test_type: test_type }
            );

            const blocked = result.data && result.data.length > 0 && result.data[0].blocked === true;
            const approved = result.data && result.data.length > 0 && result.data[0].approved_by !== null;

            res.locals.responseData = {
                success: true,
                status: 200,
                message: blocked && !approved ? 'Student is blocked from retaking test' : 'Student can retake test',
                data: {
                    blocked: blocked && !approved,
                    approved: approved,
                    blockedRecord: result.data && result.data.length > 0 ? result.data[0] : null
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error checking blocked retake status',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get bookmarks for a specific week
     * Route: POST /student-progress/bookmarks/get
     */
    async getBookmarks(req, res, next) {
        try {
            const { week } = req.body || {};
            const weekNum = week ? parseInt(week) : null;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            console.log('[StudentProgress] Get bookmarks request:', { userId, week, weekNum });

            if (!userId || !weekNum) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: weekNum ? 'User ID is required' : userId ? 'Week is required' : 'Week and user ID are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // CRITICAL: Convert userId to string for consistent querying
            const { studentIdString, filter: studentIdFilter } = await this._normalizeStudentId(userId);

            // Get student progress for the week - use $or to match both ObjectId and string formats
            const progressResponse = await fetchData(
                'tblStudentProgress',
                { bookmarks: 1 },
                {
                    week: weekNum,
                    ...studentIdFilter
                },
                { limit: 1 }
            );

            if (progressResponse.success && progressResponse.data && progressResponse.data.length > 0) {
                const bookmarks = progressResponse.data[0].bookmarks || [];
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Bookmarks fetched successfully',
                    data: bookmarks
                };
            } else {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'No bookmarks found',
                    data: []
                };
            }
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error fetching bookmarks',
                error: error.message
            };
            next();
        }
    }

    /**
     * Save bookmarks for a specific week
     * Route: POST /student-progress/bookmarks/save
     */
    async saveBookmarks(req, res, next) {
        try {
            const { week, bookmarks } = req.body;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            console.log('[StudentProgress] Save bookmarks request:', { userId, week, bookmarksCount: bookmarks?.length });

            const weekNum = week ? parseInt(week) : null;

            if (!userId || !weekNum || !Array.isArray(bookmarks)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Week and user ID are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // CRITICAL: Convert userId to string for consistent storage (schema defines student_id as String)
            const { studentIdString, filter: studentIdFilter } = await this._normalizeStudentId(userId);

            // Get or create student progress for the week - use $or to match both ObjectId and string formats
            const existing = await fetchData(
                'tblStudentProgress',
                {},
                {
                    week: weekNum,
                    ...studentIdFilter
                },
                { limit: 1 }
            );

            if (existing.data && existing.data.length > 0) {
                // Update existing progress with bookmarks - use $or to match both formats
                await executeData(
                    'tblStudentProgress',
                    { bookmarks: bookmarks, updated_at: new Date().toISOString() },
                    'u',
                    studentProgressSchema,
                    {
                        week: weekNum,
                        ...studentIdFilter
                    }
                );
            } else {
                // Create new progress record with bookmarks - ALWAYS use string format
                const newProgress = {
                    student_id: studentIdString, // ALWAYS string format
                    week: weekNum,
                    status: 'start',
                    progress_percentage: 0,
                    days_completed: [],
                    time_spent: 0,
                    bookmarks: bookmarks,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                const tenantBm = await getCollegeAndDepartmentForStudent(userId, req, fetchData);
                if (tenantBm.college_id) newProgress.college_id = tenantBm.college_id;
                if (tenantBm.department_id) newProgress.department_id = tenantBm.department_id;
                await executeData(
                    'tblStudentProgress',
                    newProgress,
                    'i',
                    studentProgressSchema
                );
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Bookmarks saved successfully',
                data: bookmarks
            };
            next();
        } catch (error) {
            console.error('[StudentProgress] Error saving bookmarks:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error saving bookmarks',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get My Practice History
     * Route: POST /student/practice-history
     */
    async getMyPracticeHistory(req, res, next) {
        try {
            const studentId = req.userId || req.user?.id;
            if (!studentId) {
                res.locals.responseData = { success: false, status: 401, message: 'Unauthorized' };
                return next();
            }

            const studentIdString = this._normalizeStudentId(studentId);
            const practiceTests = await fetchData('tblPracticeTest', {},
                { student_id: studentIdString.stringId },
                { sort: { completed_at: -1 } });

            const tests = practiceTests.data || [];

            const response = {
                overview: { totalAttempts: tests.length, averageScore: 0, bestScore: 0, totalTimeSpent: 0, currentStreak: 0, improvementRate: 0 },
                byWeek: {},
                byDifficulty: {
                    easy: { attempted: 0, correct: 0, accuracy: 0 },
                    medium: { attempted: 0, correct: 0, accuracy: 0 },
                    hard: { attempted: 0, correct: 0, accuracy: 0 },
                    expert: { attempted: 0, correct: 0, accuracy: 0 }
                },
                topicPerformance: {},
                recentTests: [],
                progressTrend: { direction: 'stable', percentage: 0, comparison: 'last_month' }
            };

            if (tests.length === 0) {
                res.locals.responseData = { success: true, status: 200, message: 'No practice history found', data: response };
                return next();
            }

            let totalScore = 0, totalTime = 0;
            const scores = [];

            tests.forEach(test => {
                const score = test.score || 0;
                totalScore += score;
                totalTime += test.time_spent || 0;
                scores.push(score);

                const weekKey = `week_${test.week}`;
                if (!response.byWeek[weekKey]) {
                    response.byWeek[weekKey] = { week: test.week, attempts: 0, averageScore: 0, bestScore: 0, timeSpent: 0, scores: [] };
                }
                response.byWeek[weekKey].attempts++;
                response.byWeek[weekKey].scores.push(score);
                response.byWeek[weekKey].timeSpent += test.time_spent || 0;
                if (score > response.byWeek[weekKey].bestScore) response.byWeek[weekKey].bestScore = score;

                if (test.questions_attempted && Array.isArray(test.questions_attempted)) {
                    test.questions_attempted.forEach(q => {
                        const difficulty = (q.difficulty || 'medium').toLowerCase();
                        if (response.byDifficulty[difficulty]) {
                            response.byDifficulty[difficulty].attempted++;
                            if (q.is_correct) response.byDifficulty[difficulty].correct++;
                        }

                        const topics = q.question_topic || [];
                        topics.forEach(topic => {
                            if (!response.topicPerformance[topic]) {
                                response.topicPerformance[topic] = { topic: topic, attempted: 0, correct: 0, accuracy: 0 };
                            }
                            response.topicPerformance[topic].attempted++;
                            if (q.is_correct) response.topicPerformance[topic].correct++;
                        });
                    });
                }
            });

            response.overview.averageScore = Math.round(totalScore / tests.length);
            response.overview.bestScore = Math.max(...scores);
            response.overview.totalTimeSpent = totalTime;

            if (tests.length >= 4) {
                const midpoint = Math.floor(tests.length / 2);
                const recentTests = tests.slice(0, midpoint);
                const oldTests = tests.slice(midpoint);
                const recentAvg = recentTests.reduce((sum, t) => sum + (t.score || 0), 0) / recentTests.length;
                const oldAvg = oldTests.reduce((sum, t) => sum + (t.score || 0), 0) / oldTests.length;

                if (oldAvg > 0) {
                    response.overview.improvementRate = Math.round(((recentAvg - oldAvg) / oldAvg) * 100);
                    if (response.overview.improvementRate > 5) {
                        response.progressTrend.direction = 'improving';
                        response.progressTrend.percentage = response.overview.improvementRate;
                    } else if (response.overview.improvementRate < -5) {
                        response.progressTrend.direction = 'declining';
                        response.progressTrend.percentage = Math.abs(response.overview.improvementRate);
                    } else {
                        response.progressTrend.direction = 'stable';
                        response.progressTrend.percentage = Math.abs(response.overview.improvementRate);
                    }
                }
            }

            const sortedByDate = [...tests].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
            let streak = 0, lastDate = null;
            for (const test of sortedByDate) {
                const testDate = new Date(test.completed_at);
                testDate.setHours(0, 0, 0, 0);
                if (!lastDate) {
                    streak = 1;
                    lastDate = testDate;
                } else {
                    const dayDiff = Math.floor((lastDate - testDate) / (1000 * 60 * 60 * 24));
                    if (dayDiff === 0) continue;
                    else if (dayDiff === 1) {
                        streak++;
                        lastDate = testDate;
                    } else break;
                }
            }
            response.overview.currentStreak = streak;

            Object.keys(response.byWeek).forEach(weekKey => {
                const week = response.byWeek[weekKey];
                week.averageScore = Math.round(week.scores.reduce((a, b) => a + b, 0) / week.scores.length);
                delete week.scores;
            });

            Object.keys(response.byDifficulty).forEach(diff => {
                const data = response.byDifficulty[diff];
                data.accuracy = data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0;
            });

            Object.keys(response.topicPerformance).forEach(topic => {
                const data = response.topicPerformance[topic];
                data.accuracy = data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0;
            });

            const topicArray = Object.values(response.topicPerformance);
            topicArray.sort((a, b) => a.accuracy - b.accuracy);
            const weakTopics = topicArray.filter(t => t.accuracy < 70).slice(0, 5);
            const strongTopics = topicArray.filter(t => t.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);

            response.recentTests = tests.slice(0, 10).map(test => ({
                _id: test._id,
                week: test.week,
                day: test.day,
                score: test.score,
                total_questions: test.total_questions,
                correct_answers: test.correct_answers,
                incorrect_answers: test.incorrect_answers,
                time_spent: test.time_spent,
                completed_at: test.completed_at,
                category: test.category || 'aptitude'
            }));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Practice history fetched successfully',
                data: {
                    overview: response.overview,
                    byWeek: Object.values(response.byWeek).sort((a, b) => a.week - b.week),
                    byDifficulty: response.byDifficulty,
                    weakTopics: weakTopics,
                    strongTopics: strongTopics,
                    recentTests: response.recentTests,
                    progressTrend: response.progressTrend
                }
            };

            next();
        } catch (error) {
            console.error('[StudentProgress] Error fetching practice history:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error fetching practice history',
                error: error.message
            };
            next();
        }
    }
}
