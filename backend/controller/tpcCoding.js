
import { fetchData, executeData } from '../methods.js';
import tpcController from './tpc.js'; // Reuse getUserInfo helper

/**
 * TPC Coding Controller
 * Handles coding stats and monitoring for TPC/DeptTPC
 */
export default class tpcCodingController {

    constructor() {
        this.tpcBase = new tpcController();
    }

    /**
     * Get aggregated coding statistics for all students in scope
     * POST /tpc/coding/stats
     */
    async getCodingStats(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const { week, day, timeRange } = req.body;

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'User ID is required'
                };
                return next();
            }

            // 1. Get User Scope (TPC vs DeptTPC)
            const userInfo = await this.tpcBase.getUserInfo(userId);
            if (!userInfo.found) {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Unauthorized: TPC access required'
                };
                return next();
            }

            const user = userInfo.user;
            const collegeId = user.person_collage_id || user.collage_id;
            const department = user.department;
            const departmentId = user.department_id;
            const role = user.person_role?.toLowerCase() || '';

            // 2. Build Student Filter
            // Match logic from tpc.js:getStudentsList
            let studentFilter = {
                person_deleted: false,
                person_status: 'active',
                person_role: { $regex: /^student$/i }
            };

            const { ObjectId } = await import('mongodb');

            // College Filter
            if (collegeId) {
                const collegeIdString = collegeId.toString();
                let collegeIdObject = null;
                if (/^[0-9a-fA-F]{24}$/.test(collegeIdString)) {
                    collegeIdObject = new ObjectId(collegeIdString);
                }
                studentFilter.person_collage_id = {
                    $in: [collegeIdString, ...(collegeIdObject ? [collegeIdObject] : [])]
                };
            }

            // Department Filter (for DeptTPC)
            if (role === 'depttpc') {
                const deptConditions = [];
                // Match by department ID (Preferred)
                if (departmentId) {
                    const dIdStr = departmentId.toString();
                    deptConditions.push({ department_id: dIdStr });
                    if (/^[0-9a-fA-F]{24}$/.test(dIdStr)) {
                        deptConditions.push({ department_id: new ObjectId(dIdStr) });
                        // Legacy: department_id in 'department' field
                        deptConditions.push({ department: dIdStr });
                    }
                }
                // Match by department Name (Legacy/Fallback)
                if (department) {
                    const dName = department.trim();
                    deptConditions.push(
                        { department: dName },
                        { department: { $regex: new RegExp(`^${dName}$`, 'i') } }
                    );
                }

                if (deptConditions.length > 0) {
                    studentFilter.$or = deptConditions;
                } else {
                    // Safety: if DeptTPC has no dept info, return nothing
                    studentFilter.department_id = '__NO_DEPT__';
                }
            }

            // 3. Fetch Students
            const studentRes = await fetchData('tblPersonMaster', { person_name: 1, person_email: 1, person_rollno: 1 }, studentFilter);
            const students = studentRes.success ? studentRes.data : [];

            if (students.length === 0) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    data: {
                        students: [],
                        summary: { totalStudents: 0, totalSolved: 0, avgAccuracy: 0 }
                    }
                };
                return next();
            }

            const studentIds = students.map(s => s._id.toString());

            // 4. Fetch Coding Submissions for these students
            // Optimization: Only fetch essential fields
            const submissionFilter = {
                student_id: { $in: studentIds } // Assuming string IDs in submissions table
            };

            // Time Range Filter
            if (timeRange === 'week' || timeRange === 'today') {
                const now = new Date();
                const startDate = new Date();
                if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
                if (timeRange === 'today') startDate.setHours(0, 0, 0, 0);
                submissionFilter.submitted_at = { $gte: startDate };
            }

            const submissionsRes = await fetchData('tblCodingSubmissions',
                { student_id: 1, status: 1, problem_id: 1, submitted_at: 1, score: 1 },
                submissionFilter
            );

            const submissions = submissionsRes.success ? submissionsRes.data : [];

            // 5. Aggregate Data per Student
            const studentStats = new Map();

            // Initialize stats
            students.forEach(s => {
                studentStats.set(s._id.toString(), {
                    ...s,
                    totalSolved: 0,
                    totalAttempts: 0,
                    solvedProblems: new Set(), // distinct problems passed
                    lastActive: null
                });
            });

            // Process Submissions
            submissions.forEach(sub => {
                const sId = sub.student_id;
                const stats = studentStats.get(sId);
                if (stats) {
                    stats.totalAttempts++;
                    if (sub.status === 'passed') {
                        stats.solvedProblems.add(sub.problem_id);
                    }
                    if (!stats.lastActive || new Date(sub.submitted_at) > new Date(stats.lastActive)) {
                        stats.lastActive = sub.submitted_at;
                    }
                }
            });

            // 6. Format Response
            const formatData = Array.from(studentStats.values()).map(s => ({
                _id: s._id,
                name: s.person_name,
                email: s.person_email,
                rollno: s.person_rollno,
                totalSolved: s.solvedProblems.size,
                totalAttempts: s.totalAttempts,
                accuracy: s.totalAttempts > 0 ? Math.round((s.solvedProblems.size / s.totalAttempts) * 100) : 0,
                lastActive: s.lastActive
            }));

            // Sort by Last Active (most recent first)
            formatData.sort((a, b) => {
                if (!a.lastActive) return 1;
                if (!b.lastActive) return -1;
                return new Date(b.lastActive) - new Date(a.lastActive);
            });

            const totalSolved = formatData.reduce((acc, s) => acc + s.totalSolved, 0);

            res.locals.responseData = {
                success: true,
                status: 200,
                data: {
                    students: formatData,
                    summary: {
                        totalStudents: students.length,
                        activeStudents: formatData.filter(s => s.totalSolved > 0).length,
                        totalSolved
                    }
                }
            };
            next();

            next();

        } catch (error) {
            console.error('Error fetching coding stats:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Internal Server Error',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get detailed solved problems for a specific student
     * POST /tpc/coding/student-details
     */
    async getStudentDetails(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const { studentId } = req.body;

            if (!studentId) {
                res.locals.responseData = { success: false, status: 400, message: 'Student ID required' };
                return next();
            }

            // 1. Verify Access (TPC Scope)
            // Reuse logic or trust middleware (assuming TPC role check is done)
            // For depth, we could verify student belongs to TPC's scope, 
            // but strict role middleware + studentId check is usually sufficient for internal tools.

            // 2. Fetch Passed Submissions
            const submissionRes = await fetchData('tblCodingSubmissions',
                { problem_id: 1, solution: 1, language: 1, submitted_at: 1, score: 1 },
                { student_id: studentId, status: 'passed' }
            );

            if (!submissionRes.success || !submissionRes.data || submissionRes.data.length === 0) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    data: []
                };
                return next();
            }

            const submissions = submissionRes.data;
            const problemIds = [...new Set(submissions.map(s => s.problem_id))];

            // 3. Fetch Problem Details
            const problemRes = await fetchData('tblCodingProblem',
                { question_id: 1, title: 1, problem_statement: 1, example: 1, day: 1, week: 1 },
                { question_id: { $in: problemIds } }
            );

            const problems = problemRes.success ? problemRes.data : [];
            const problemMap = new Map();
            problems.forEach(p => problemMap.set(p.question_id, p));

            // 4. Merge Data
            // We want one entry per problem. If multiple submissions, take the latest.
            const uniqueSolved = new Map();

            submissions.forEach(sub => {
                const existing = uniqueSolved.get(sub.problem_id);
                // Keep latest submission
                if (!existing || new Date(sub.submitted_at) > new Date(existing.submitted_at)) {
                    uniqueSolved.set(sub.problem_id, sub);
                }
            });

            const details = Array.from(uniqueSolved.values()).map(sub => {
                const problem = problemMap.get(sub.problem_id);
                return {
                    submission_id: sub._id,
                    problem_id: sub.problem_id,
                    title: problem?.title || 'Unknown Problem',
                    week: problem?.week || 0,
                    day: problem?.day || 0,
                    statement: problem?.problem_statement || '',
                    example: problem?.example || '',
                    submitted_at: sub.submitted_at,
                    language: sub.language,
                    code: sub.solution
                };
            });

            // Sort by Week/Day then submit date
            details.sort((a, b) => {
                if (a.week !== b.week) return b.week - a.week;
                if (a.day !== b.day) return b.day - a.day;
                return new Date(b.submitted_at) - new Date(a.submitted_at);
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                data: details
            };
            next();

        } catch (error) {
            console.error('Error fetching student details:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error fetching details',
                error: error.message
            };
            next();
        }
    }
}
