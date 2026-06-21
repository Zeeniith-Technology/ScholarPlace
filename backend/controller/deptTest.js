import { executeData, fetchData } from '../methods.js';
import deptTestSchema from '../schema/deptTest.js';
import xlsx from 'xlsx';
import aiService from '../services/aiService.js';

/**
 * Department Test Controller
 * Handles creation and scheduling of tests by DeptTPC
 */
export default class DeptTestController {

    /**
     * Create a single test manually
     * Route: POST /dept-tpc/test/create
     */
    async createTest(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const {
                title, description, topic, module, question_count, difficulty, duration_minutes,
                assignment_type, assigned_to, scheduled_start, scheduled_end,
                content_source, manual_questions
            } = req.body;

            // 1. Validation
            if (!userId) {
                return this.sendError(res, 401, 'Unauthorized');
            }
            if (!title || !assignment_type || !scheduled_start || !scheduled_end) {
                return this.sendError(res, 400, 'Missing required fields: title, assignment_type, start/end time');
            }

            // Validate Manual Questions
            let finalManualQuestions = [];
            if (manual_questions && Array.isArray(manual_questions) && manual_questions.length > 0) {
                finalManualQuestions = manual_questions;
            } else if (content_source === 'manual') {
                return this.sendError(res, 400, 'Manual questions are required when content source is manual');
            }

            // 2. Get DeptTPC Info
            const userInfo = await this.getDeptTPCInfo(userId);
            if (!userInfo) {
                return this.sendError(res, 403, 'User is not a valid Department TPC');
            }

            // 3. Construct Test Object
            const newTest = {
                title,
                description,
                created_by: userId,
                department: userInfo.department,
                department_id: userInfo.department_id,
                college_id: userInfo.person_collage_id,

                test_type: 'practice',
                module: module || undefined, // Optional: DSA or Aptitude
                content_source: content_source || 'auto',
                manual_questions: finalManualQuestions,
                topic: topic || (content_source === 'manual' ? 'Custom' : 'General'),
                question_count: finalManualQuestions.length > 0 ? finalManualQuestions.length : (Number(question_count) || 10),
                difficulty: difficulty || 'Medium',
                duration_minutes: Number(duration_minutes) || 60,

                assignment_type,
                assigned_to: Array.isArray(assigned_to) ? assigned_to : [],

                scheduled_start: new Date(scheduled_start),
                scheduled_end: new Date(scheduled_end),

                status: 'active',
                created_at: new Date().toISOString()
            };

            // 5. Save to DB
            const result = await executeData('tblDeptTest', newTest, 'i', deptTestSchema);

            if (result.success) {
                res.locals.responseData = {
                    success: true,
                    status: 201,
                    message: 'Test scheduled successfully',
                    data: { id: result.data.insertedId }
                };
            } else {
                throw new Error('Failed to insert test record');
            }
            next();
        } catch (error) {
            console.error('[DeptTest] Create Error:', error);
            this.sendError(res, 500, error.message);
            next();
        }
    }

    /**
     * Generate test questions using AI
     * Route: POST /dept-tpc/test/generate-questions
     * Body: { module, topic, difficulty, count }
     */
    async generateQuestions(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const { module, topic, difficulty, count } = req.body;

            // 1. Validation
            if (!userId) {
                return this.sendError(res, 401, 'Unauthorized');
            }

            if (!module || !topic) {
                return this.sendError(res, 400, 'Module and topic are required');
            }

            const validModules = ['DSA', 'Aptitude'];
            if (!validModules.includes(module)) {
                return this.sendError(res, 400, 'Invalid module. Must be DSA or Aptitude');
            }

            const questionCount = Number(count) || 10;
            if (questionCount < 1 || questionCount > 50) {
                return this.sendError(res, 400, 'Question count must be between 1 and 50');
            }

            // 2. Verify user is DeptTPC
            const userInfo = await this.getDeptTPCInfo(userId);
            if (!userInfo) {
                return this.sendError(res, 403, 'User is not a valid Department TPC');
            }

            // 3. Call AI Service
            console.log(`[DeptTest] Generating ${questionCount} ${difficulty} questions for ${module} - ${topic}`);
            const questions = await aiService.generateTestQuestions(module, topic, difficulty, questionCount);

            if (!questions || questions.length === 0) {
                return this.sendError(res, 500, 'AI failed to generate questions. Please try again.');
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Generated ${questions.length} questions`,
                data: { questions }
            };
            next();


        } catch (error) {
            console.error('[DeptTest] AI Generation Error:', error);
            this.sendError(res, 500, error.message || 'Failed to generate questions');
            next();
        }
    }

    /**
     * List tests created by this DeptTPC
     * Route: POST /dept-tpc/test/list
     */
    async listTests(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            if (!userId) return this.sendError(res, 401, 'Unauthorized');

            // Confirm tenant (college + department) from DB
            const userInfo = await this.getDeptTPCInfo(userId);
            if (!userInfo) return this.sendError(res, 403, 'User is not a valid Department TPC');

            const tests = await fetchData(
                'tblDeptTest',
                {},
                {
                    created_by: userId,
                    deleted: false,
                    // tenant confirmation (tblCollage._id / tblDepartments._id)
                    college_id: userInfo.person_collage_id,
                    department_id: userInfo.department_id,
                },
                { sort: { created_at: -1 } }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Tests fetched successfully',
                data: tests.data || []
            };
            next();

        } catch (error) {
            console.error('[DeptTest] List Error:', error);
            this.sendError(res, 500, error.message);
            next();
        }
    }

    /**
     * Get available tests for a Student
     * Route: POST /student/tests/scheduled
     */
    async getAvailableTests(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            if (!userId) return this.sendError(res, 401, 'Unauthorized');

            // 1. Get Student Details (Semester, Dept)
            const userRes = await fetchData('tblPersonMaster', {}, { _id: userId });
            if (!userRes.data || userRes.data.length === 0) {
                return this.sendError(res, 404, 'Student not found');
            }
            const user = userRes.data[0];

            // 2. Build Query (Include past tests by removing scheduled_end filter)
            const collegeIdStr = user.person_collage_id ? user.person_collage_id.toString() : null;
            const { ObjectId } = await import('mongodb');
            const collegeIdObj = collegeIdStr && /^[0-9a-fA-F]{24}$/.test(collegeIdStr) ? new ObjectId(collegeIdStr) : null;
            
            const deptIdStr = user.department_id ? user.department_id.toString() : null;
            const deptIdObj = deptIdStr && /^[0-9a-fA-F]{24}$/.test(deptIdStr) ? new ObjectId(deptIdStr) : null;

            const query = {
                status: 'active',
                deleted: false,
                // Tenant confirmation: match both string and ObjectId formats
                college_id: { $in: [collegeIdStr, collegeIdObj].filter(Boolean) },
                $or: [
                    // All dept students (confirm same department)
                    { assignment_type: 'department', department_id: { $in: [deptIdStr, deptIdObj].filter(Boolean) } },
                    // Batch assignment (handling both string and number types)
                    { assignment_type: 'batch', assigned_to: { $in: [user.semester, String(user.semester), Number(user.semester)] } },
                    // Student assignment by userId
                    { assignment_type: 'student', assigned_to: userId.toString() },
                    // Student assignment by email
                    { assignment_type: 'student', assigned_to: user.person_email }
                ]
            };

            const testsRes = await fetchData(
                'tblDeptTest',
                {},
                query,
                { sort: { scheduled_start: -1 } } // Sort by newest first
            );
            const tests = testsRes.data || [];

            // 3. Fetch Attempts for these tests
            const testIds = tests.map(t => t._id.toString());
            const attemptsRes = await fetchData('tblDeptTestAttempt', {}, {
                student_id: userId.toString(),
                test_id: { $in: testIds }
            });
            const attempts = attemptsRes.data || [];

            // 4. Map Status — prefer submitted attempt over in_progress
            const testsWithStatus = tests.map(test => {
                const testIdStr = test._id.toString();
                const testAttempts = attempts.filter(a =>
                    a.test_id === testIdStr ||
                    a.test_id?.toString() === testIdStr
                );
                // Prefer submitted over in_progress
                const attempt = testAttempts.find(a => a.status === 'submitted') || testAttempts[0] || null;
                return {
                    ...test,
                    attempt_status: attempt ? attempt.status : null,
                    attempt_id: attempt ? attempt._id.toString() : null  // Always string
                };
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Available tests fetched',
                data: testsWithStatus
            };
            next();
        } catch (error) {
            console.error('[DeptTest] Student Fetch Error:', error);
            this.sendError(res, 500, error.message);
            next();
        }
    }

    /**
     * Search Students in Dept for Scheduling
     * Route: POST /dept-tpc/students/search
     */
    async searchStudents(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const { search = '' } = req.body;

            if (!userId) return this.sendError(res, 401, 'Unauthorized');

            const userInfo = await this.getDeptTPCInfo(userId);
            if (!userInfo) return this.sendError(res, 403, 'Unauthorized');

            const baseQuery = {
                person_role: { $regex: /^student$/i },
                person_deleted: false,
                person_status: { $regex: /^active$/i },
                // Tenant confirmation
                person_collage_id: userInfo.person_collage_id,
                department_id: userInfo.department_id,
            };

            const query = search
                ? {
                    $and: [
                        baseQuery,
                        {
                            $or: [
                                { person_name: { $regex: search, $options: 'i' } },
                                { person_email: { $regex: search, $options: 'i' } }
                            ]
                        }
                    ]
                }
                : baseQuery;

            const students = await fetchData(
                'tblPersonMaster',
                { person_name: 1, person_email: 1, _id: 1 },
                query,
                { limit: 20 }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Students fetched',
                data: students.data || []
            };
            next();

        } catch (error) {
            console.error('[DeptTest] Search Students Error:', error);
            this.sendError(res, 500, error.message);
            next();
        }
    }

    /**
     * Bulk Upload Tests via Excel
     */
    async bulkUpload(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const { tests } = req.body;

            if (!userId) return this.sendError(res, 401, 'Unauthorized');
            if (!tests || !Array.isArray(tests) || tests.length === 0) {
                return this.sendError(res, 400, 'No test data provided');
            }

            const userInfo = await this.getDeptTPCInfo(userId);
            if (!userInfo) return this.sendError(res, 403, 'Unauthorized DeptTPC');

            const results = {
                success: 0,
                failed: 0,
                errors: []
            };

            for (const row of tests) {
                try {
                    const testData = await this.processExcelRow(row, userInfo);
                    // Add creator ID here
                    testData.created_by = userId;

                    const saveRes = await executeData('tblDeptTest', testData, 'i');
                    if (saveRes.success) {
                        results.success++;
                    } else {
                        throw new Error('Database insert failed');
                    }
                } catch (err) {
                    results.failed++;
                    results.errors.push({ title: row.Title || 'Unknown', error: err.message });
                }
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Bulk upload complete. Success: ${results.success}, Failed: ${results.failed}`,
                data: results
            };
            next();

        } catch (error) {
            console.error('[DeptTest] Bulk Upload Error:', error);
            this.sendError(res, 500, error.message);
            next();
        }
    }

    // --- Helpers ---

    async getDeptTPCInfo(userId) {
        const res = await fetchData('tblPersonMaster', {}, { _id: userId });
        if (res.success && res.data && res.data.length > 0) {
            const user = res.data[0];
            if (['DeptTPC', 'depttpc'].includes(user.person_role)) {
                return {
                    department: user.department,
                    department_id: user.department_id,
                    person_collage_id: user.person_collage_id
                };
            }
        }
        return null;
    }

    async processExcelRow(row, userInfo) {
        const title = row['Title'] || row['Test_Title'];
        if (!title) throw new Error('Title is required');

        const assignmentType = (row['Target_Type'] || '').toLowerCase();
        if (!['student', 'batch', 'department'].includes(assignmentType)) {
            throw new Error(`Invalid Target_Type: ${assignmentType}`);
        }

        let assignedTo = [];
        const targetValue = row['Target_Value'] || '';

        if (assignmentType === 'student') {
            if (!targetValue) throw new Error('Target_Value (Email) required for Student type');
            const studentRes = await fetchData('tblPersonMaster', { _id: 1 }, { person_email: targetValue });
            if (!studentRes.data || studentRes.data.length === 0) {
                throw new Error(`Student with email ${targetValue} not found`);
            }
            assignedTo.push(studentRes.data[0]._id.toString());
        } else if (assignmentType === 'batch') {
            const sem = Number(targetValue);
            if (isNaN(sem)) throw new Error('Target_Value must be Semester Number');
            assignedTo.push(sem);
        }

        const start = new Date(row['Start_Time']);
        const end = new Date(row['End_Time']);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid Date format');
        if (start >= end) throw new Error('Start_Time must be before End_Time');

        return {
            title,
            description: row['Description'] || '',
            department: userInfo.department,
            department_id: userInfo.department_id,
            college_id: userInfo.person_collage_id,
            test_type: 'practice',
            topic: row['Topic'] || 'General',
            question_count: Number(row['Question_Count']) || 10,
            difficulty: row['Difficulty'] || 'Medium',
            duration_minutes: Number(row['Duration_Minutes']) || 60,
            assignment_type: assignmentType,
            assigned_to: assignedTo,
            scheduled_start: start,
            scheduled_end: end,
            status: 'active',
            created_at: new Date().toISOString()
        };
    }

    /**
     * Student: Start a test
     * Route: POST /student/dept-test/start
     * Body: { test_id }
     */
    async startTest(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const { test_id } = req.body;

            console.log('[startTest] Request:', { userId, test_id });

            if (!userId) return this.sendError(res, 401, 'Unauthorized');
            if (!test_id) return this.sendError(res, 400, 'Test ID is required');

            // 1. Get student info
            console.log('[startTest] Fetching student...');
            const studentRes = await fetchData('tblPersonMaster', {}, { _id: userId });
            if (!studentRes.data || studentRes.data.length === 0) {
                return this.sendError(res, 404, 'Student not found');
            }
            const student = studentRes.data[0];
            console.log('[startTest] Student found:', student.person_name);

            // 2. Get test — use $ne:true to handle both deleted:false and deleted:undefined
            console.log('[startTest] Fetching test...');
            const testRes = await fetchData('tblDeptTest', {}, { _id: test_id, deleted: { $ne: true } });
            if (!testRes.data || testRes.data.length === 0) {
                console.log('[startTest] Test not found for id:', test_id);
                return this.sendError(res, 404, 'Test not found');
            }
            const test = testRes.data[0];
            console.log('[startTest] Test found:', test.title, 'status:', test.status);

            // 3. Validate test is active and within schedule
            const now = new Date();
            if (test.status !== 'active') {
                return this.sendError(res, 400, 'Test is not active');
            }
            if (now < new Date(test.scheduled_start)) {
                return this.sendError(res, 400, `Test starts at ${new Date(test.scheduled_start).toLocaleString()}`);
            }
            if (now > new Date(test.scheduled_end)) {
                return this.sendError(res, 400, 'Test has ended');
            }

            // 4. Check student is assigned to this test
            // assigned_to may contain ObjectId objects or strings — normalize to strings for comparison
            const assignedToStrings = (test.assigned_to || []).map(a => a.toString());
            console.log('[startTest] assigned_to (normalized):', assignedToStrings);
            console.log('[startTest] userId:', userId.toString(), 'email:', student.person_email, 'semester:', student.semester);

            const isAssigned =
                (test.assignment_type === 'batch' && assignedToStrings.includes(String(student.semester))) ||
                (test.assignment_type === 'student' && (
                    assignedToStrings.includes(userId.toString()) ||
                    assignedToStrings.includes(student.person_email)
                )) ||
                (test.assignment_type === 'department' && test.department_id === student.department_id);

            console.log('[startTest] Assignment check:', { assignment_type: test.assignment_type, isAssigned });

            if (!isAssigned) {
                return this.sendError(res, 403, 'You are not assigned to this test');
            }

            // 5. Check if already attempted
            const existingAttempt = await fetchData('tblDeptTestAttempt', {}, {
                test_id: test_id.toString(),
                student_id: userId.toString(),
                status: { $in: ['in_progress', 'submitted'] }
            });

            if (existingAttempt.data && existingAttempt.data.length > 0) {
                // Prefer submitted over in_progress (handles orphaned in_progress records)
                const submitted = existingAttempt.data.find(a => a.status === 'submitted');
                const attempt = submitted || existingAttempt.data[0];

                if (attempt.status === 'submitted') {
                    return this.sendError(res, 400, 'You have already completed this test');
                }
                // Return existing in-progress attempt
                const questionsWithoutAnswers = test.manual_questions.map((q, idx) => ({
                    index: idx,
                    text: q.text,
                    options: q.options,
                    marks: q.marks || 1
                }));

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Resuming existing attempt',
                    data: {
                        attempt_id: attempt._id.toString(),
                        test: {
                            title: test.title,
                            description: test.description,
                            module: test.module,
                            topic: test.topic,
                            difficulty: test.difficulty,
                            duration_minutes: test.duration_minutes,
                            total_questions: test.manual_questions.length,
                            questions: questionsWithoutAnswers
                        },
                        started_at: attempt.started_at
                    }
                };
                return next();
            }

            // 6. Create new attempt
            const attemptData = {
                test_id: test_id.toString(),
                student_id: userId.toString(),
                student_name: student.person_name,
                student_email: student.person_email,
                test_title: test.title,
                test_module: test.module,
                test_topic: test.topic,
                test_difficulty: test.difficulty,
                started_at: new Date(),
                status: 'in_progress',
                total_questions: test.manual_questions.length,
                total_marks: test.manual_questions.reduce((sum, q) => sum + (q.marks || 1), 0)
            };

            const attemptRes = await executeData('tblDeptTestAttempt', attemptData, 'i');
            if (!attemptRes.success) {
                throw new Error('Failed to create attempt record');
            }

            // 7. Return test questions WITHOUT correct_option
            const questionsWithoutAnswers = test.manual_questions.map((q, idx) => ({
                index: idx,
                text: q.text,
                options: q.options,
                marks: q.marks || 1
            }));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Test started successfully',
                data: {
                    attempt_id: attemptRes.data.insertedId.toString(),
                    test: {
                        title: test.title,
                        description: test.description,
                        module: test.module,
                        topic: test.topic,
                        difficulty: test.difficulty,
                        duration_minutes: test.duration_minutes,
                        total_questions: test.manual_questions.length,
                        questions: questionsWithoutAnswers
                    },
                    started_at: new Date()
                }
            };
            next();

        } catch (error) {
            console.error('[DeptTest] Start Test Error:', error);
            this.sendError(res, 500, error.message);
            next();
        }
    }

    /**
     * Student: Submit test answers
     * Route: POST /student/dept-test/submit
     * Body: { attempt_id, answers: [{ question_index, selected_option }] }
     */
    async submitTest(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const { attempt_id, answers } = req.body;

            if (!userId) return this.sendError(res, 401, 'Unauthorized');
            if (!attempt_id || !Array.isArray(answers)) {
                return this.sendError(res, 400, 'Attempt ID and answers array are required');
            }

            // 1. Get attempt
            const attemptRes = await fetchData('tblDeptTestAttempt', {}, { _id: attempt_id });
            if (!attemptRes.data || attemptRes.data.length === 0) {
                return this.sendError(res, 404, 'Attempt not found');
            }
            const attempt = attemptRes.data[0];

            // 2. Validate ownership
            if (attempt.student_id !== userId.toString()) {
                return this.sendError(res, 403, 'Unauthorized attempt');
            }

            // 3. Check if already submitted
            if (attempt.status === 'submitted') {
                return this.sendError(res, 400, 'Test already submitted');
            }

            // 4. Get original test with correct answers
            const testRes = await fetchData('tblDeptTest', {}, { _id: attempt.test_id });
            if (!testRes.data || testRes.data.length === 0) {
                return this.sendError(res, 404, 'Original test not found');
            }
            const test = testRes.data[0];

            // 5. Validate and score answers
            const validatedAnswers = [];
            let correctCount = 0;
            let wrongCount = 0;
            let unansweredCount = 0;
            let obtainedMarks = 0;

            const answerMap = {};
            answers.forEach(a => {
                answerMap[a.question_index] = a.selected_option;
            });

            test.manual_questions.forEach((question, idx) => {
                const selectedOption = answerMap[idx];
                const isAnswered = selectedOption !== undefined && selectedOption !== null;
                const isCorrect = isAnswered && selectedOption === question.correct_option;
                const marksAwarded = isCorrect ? (question.marks || 1) : 0;

                if (isCorrect) correctCount++;
                else if (isAnswered) wrongCount++;
                else unansweredCount++;

                obtainedMarks += marksAwarded;

                validatedAnswers.push({
                    question_index: idx,
                    question_text: question.text,
                    options: question.options || [],
                    selected_option: selectedOption,
                    selected_option_text: isAnswered ? (question.options?.[selectedOption] ?? null) : null,
                    correct_option: question.correct_option,
                    correct_option_text: question.options?.[question.correct_option] ?? null,
                    is_correct: isCorrect,
                    marks_awarded: marksAwarded
                });
            });

            const percentage = attempt.total_marks > 0
                ? Math.round((obtainedMarks / attempt.total_marks) * 100)
                : 0;

            // 6. Calculate duration
            const startedAt = new Date(attempt.started_at);
            const submittedAt = new Date();
            const durationMinutes = Math.round((submittedAt - startedAt) / 60000);

            // 7. Update attempt with results
            const updateData = {
                student_answers: validatedAnswers,
                submitted_at: submittedAt,
                duration_taken_minutes: durationMinutes,
                correct_answers: correctCount,
                wrong_answers: wrongCount,
                unanswered: unansweredCount,
                obtained_marks: obtainedMarks,
                percentage: percentage,
                status: 'submitted',
                updated_at: new Date().toISOString()
            };

            await executeData('tblDeptTestAttempt', updateData, 'u', null, { _id: attempt_id });

            // 8. Return detailed results
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Test submitted successfully',
                data: {
                    score: {
                        total_questions: attempt.total_questions,
                        correct_answers: correctCount,
                        wrong_answers: wrongCount,
                        unanswered: unansweredCount,
                        total_marks: attempt.total_marks,
                        obtained_marks: obtainedMarks,
                        percentage: percentage,
                        duration_taken_minutes: durationMinutes
                    },
                    detailed_results: validatedAnswers
                }
            };
            next();

        } catch (error) {
            console.error('[DeptTest] Submit Test Error:', error);
            this.sendError(res, 500, error.message);
            next();
        }
    }

    /**
     * Student: Get all test attempts/results
     * Route: POST /student/dept-test/results
     */
    async getTestResults(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            if (!userId) return this.sendError(res, 401, 'Unauthorized');

            // Fetch all submitted attempts for this student
            const attempts = await fetchData(
                'tblDeptTestAttempt',
                {},
                { student_id: userId.toString(), status: 'submitted' },
                { sort: { submitted_at: -1 } }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Results fetched successfully',
                data: attempts.data || []
            };
            next();

        } catch (error) {
            console.error('[DeptTest] Get Results Error:', error);
            this.sendError(res, 500, error.message);
            next();
        }
    }

    /**
     * Get analytics for a specific test (DeptTPC)
     * Route: POST /dept-tpc/test/analytics
     */
    async getTestAnalytics(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            const { test_id } = req.body;

            if (!userId) return this.sendError(res, 401, 'Unauthorized');
            if (userRole?.toLowerCase() !== 'depttpc') return this.sendError(res, 403, 'Access denied');
            if (!test_id) return this.sendError(res, 400, 'Test ID is required');

            // 1. Verify test ownership
            const testRes = await fetchData('tblDeptTest', {}, { _id: test_id, created_by: userId });
            if (!testRes.data || testRes.data.length === 0) {
                return this.sendError(res, 404, 'Test not found or unauthorized');
            }
            const test = testRes.data[0];

            // 2. Get only submitted attempts
            const attemptsRes = await fetchData('tblDeptTestAttempt', {}, { test_id: test_id, status: 'submitted' });
            const attempts = attemptsRes.data || [];

            // 3. Get student details
            const studentIds = [...new Set(attempts.map(a => a.student_id))];

            // Dynamic import for ObjectId
            const { ObjectId } = await import('mongodb');
            const studentObjectIds = studentIds.map(id => {
                try { return new ObjectId(id); } catch (e) { return null; }
            }).filter(id => id !== null);

            const studentsRes = await fetchData('tblPersonMaster', { person_name: 1, person_email: 1, _id: 1 }, {
                $or: [
                    { _id: { $in: studentObjectIds } },
                    { _id: { $in: studentIds } },
                    { person_id: { $in: studentIds } } // Safety check for custom IDs
                ]
            });
            const students = studentsRes.data || [];

            // 4. Merge data
            const results = attempts.map(attempt => {
                const student = students.find(s =>
                    s._id.toString() === attempt.student_id ||
                    s.person_id === attempt.student_id
                );
                return {
                    attempt_id: attempt._id,
                    student_name: student?.person_name || 'Unknown',
                    student_email: student?.person_email || 'Unknown',
                    score: attempt.obtained_marks,
                    total_marks: attempt.total_marks,
                    percentage: attempt.percentage,
                    status: attempt.status,
                    submitted_at: attempt.submitted_at,
                    duration_minutes: attempt.duration_taken_minutes
                };
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Test analytics fetched successfully',
                data: {
                    test_title: test.title,
                    total_attempts: results.length,
                    results: results
                }
            };
            next();

        } catch (error) {
            console.error('[DeptTest] Analytics Error:', error);
            this.sendError(res, 500, error.message);
            next();
        }
    }

    sendError(res, status, message) {
        res.locals.responseData = { success: false, status, message };
    }
}
