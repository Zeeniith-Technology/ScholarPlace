import { executeData, fetchData } from '../methods.js';
import deptTestSchema from '../schema/deptTest.js';
import xlsx from 'xlsx';

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
                title, description, topic, question_count, difficulty, duration_minutes,
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
            if (content_source === 'manual') {
                if (!manual_questions || !Array.isArray(manual_questions) || manual_questions.length === 0) {
                    return this.sendError(res, 400, 'Manual questions are required when content source is manual');
                }
                finalManualQuestions = manual_questions;
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
                content_source: content_source || 'auto',
                manual_questions: finalManualQuestions,
                topic: topic || (content_source === 'manual' ? 'Custom' : 'General'),
                question_count: content_source === 'manual' ? finalManualQuestions.length : (Number(question_count) || 10),
                difficulty: difficulty || 'Medium',
                duration_minutes: Number(duration_minutes) || 60,

                assignment_type,
                assigned_to: Array.isArray(assigned_to) ? assigned_to : [],

                scheduled_start: new Date(scheduled_start),
                scheduled_end: new Date(scheduled_end),

                status: 'active',
                created_at: new Date()
            };

            // 5. Save to DB
            const result = await executeData('tblDeptTest', newTest);

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
     * List tests created by this DeptTPC
     * Route: POST /dept-tpc/test/list
     */
    async listTests(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            if (!userId) return this.sendError(res, 401, 'Unauthorized');

            const tests = await fetchData(
                'tblDeptTest',
                {},
                { created_by: userId, deleted: false },
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

            // 2. Build Query
            const query = {
                status: 'active',
                deleted: false,
                scheduled_end: { $gte: new Date() }, // Only future/current tests
                $or: [
                    { assignment_type: 'department', department_id: user.department_id }, // All dept students
                    { assignment_type: 'batch', assigned_to: user.semester }, // Matches semester in array
                    { assignment_type: 'student', assigned_to: userId.toString() } // Matches ID in array
                ]
            };

            const tests = await fetchData(
                'tblDeptTest',
                {},
                query,
                { sort: { scheduled_start: 1 } }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Available tests fetched',
                data: tests.data || []
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

            const query = {
                person_role: { $in: ['Student', 'student'] },
                department_id: userInfo.department_id,
                person_deleted: false,
                status: { $in: ['active', 'Active'] }
            };

            if (search) {
                query.$or = [
                    { person_name: { $regex: search, $options: 'i' } },
                    { person_email: { $regex: search, $options: 'i' } }
                ];
            }

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

                    const saveRes = await executeData('tblDeptTest', testData);
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
            created_at: new Date()
        };
    }

    sendError(res, status, message) {
        res.locals.responseData = { success: false, status, message };
    }
}
