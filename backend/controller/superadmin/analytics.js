import { executeData, fetchData, getDB } from '../../methods.js';
import { ObjectId } from 'mongodb';

export default class superadminAnalyticsController {

    /**
     * Get platform-wide statistics with filters
     * Route: POST /superadmin/analytics/overview
     */
    async getPlatformOverview(req, res, next) {
        try {
            const { collegeId, departmentId } = req.body || {};
            const db = getDB();

            const collegeMatch = { deleted: false };
            if (collegeId) {
                const { ObjectId } = await import('mongodb');
                collegeMatch._id = typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
                    ? new ObjectId(collegeId) : collegeId;
            }

            let studentMatch = { person_role: { $regex: /^student$/i }, person_deleted: { $ne: true } };
            if (collegeId) studentMatch.person_collage_id = collegeId;
            if (departmentId) studentMatch.department = departmentId;

            // Phase 1: college stats + student stats + exam stats — all independent, run in parallel
            const [collegeStats, studentStats, examStats] = await Promise.all([
                db.collection('tblCollage').aggregate([
                    { $match: collegeMatch },
                    { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$collage_status", 1] }, 1, 0] } }, subscribed: { $sum: { $cond: [{ $eq: ["$collage_subscription_status", "active"] }, 1, 0] } } } }
                ]).toArray(),
                db.collection('tblPersonMaster').aggregate([
                    { $match: studentMatch },
                    { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$person_status", "active"] }, 1, 0] } } } }
                ]).toArray(),
                db.collection('tblExam').aggregate([
                    { $project: { exam_status: 1, isUpcoming: { $gt: ["$exam_date", new Date()] } } },
                    { $group: { _id: null, total: { $sum: 1 }, upcoming: { $sum: { $cond: [{ $and: ["$isUpcoming", { $ne: ["$exam_status", "completed"] }] }, 1, 0] } } } }
                ]).toArray()
            ]);

            const cStats = collegeStats[0] || { total: 0, active: 0, subscribed: 0 };
            const sStats = studentStats[0] || { total: 0, active: 0 };
            const eStats = examStats[0] || { total: 0, upcoming: 0 };

            // Phase 2: build student ID list if filtering, then run progress + scores in parallel
            let studentIds = [];
            if (collegeId || departmentId) {
                const students = await db.collection('tblPersonMaster')
                    .find(studentMatch).project({ person_id: 1 }).toArray();
                studentIds = students.map(s => s.person_id).filter(Boolean);
            }

            const progressMatch = (collegeId || departmentId) ? { student_id: { $in: studentIds } } : {};

            const [progressStats, scoreStats] = await Promise.all([
                db.collection('tblStudentProgress').aggregate([
                    { $match: progressMatch },
                    { $group: { _id: null, uniqueStudents: { $addToSet: "$student_id" }, totalDays: { $sum: { $size: { $ifNull: ["$days_completed", []] } } }, totalPracticeTests: { $sum: { $size: { $ifNull: ["$practice_tests", []] } } }, totalCoding: { $sum: { $size: { $ifNull: ["$coding_problems.completed", []] } } } } },
                    { $project: { withProgress: { $size: "$uniqueStudents" }, totalDays: 1, totalPracticeTests: 1, totalCoding: 1 } }
                ]).toArray(),
                db.collection('tblPracticeTest').aggregate([
                    { $match: progressMatch },
                    { $group: { _id: null, avgScore: { $avg: "$score" } } }
                ]).toArray()
            ]);

            const pStats = progressStats[0] || { withProgress: 0, totalDays: 0, totalPracticeTests: 0, totalCoding: 0 };

            // Engagement Rate
            const engagementRate = sStats.total > 0
                ? ((pStats.withProgress / sStats.total) * 100).toFixed(1)
                : 0;

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Platform overview fetched successfully',
                data: {
                    filters: {
                        collegeId: collegeId || null,
                        departmentId: departmentId || null
                    },
                    colleges: {
                        total: cStats.total,
                        active: cStats.active,
                        subscribed: cStats.subscribed,
                        inactive: cStats.total - cStats.active
                    },
                    students: {
                        total: sStats.total,
                        active: sStats.active,
                        inactive: sStats.total - sStats.active,
                        withProgress: pStats.withProgress,
                        engagementRate: parseFloat(engagementRate)
                    },
                    progress: {
                        totalDaysCompleted: pStats.totalDays,
                        totalPracticeTests: pStats.totalPracticeTests,
                        totalCodingProblems: pStats.totalCoding,
                        averageScore: Math.round(scoreStats[0]?.avgScore || 0)
                    },
                    exams: {
                        total: eStats.total,
                        upcoming: eStats.upcoming
                    }
                }
            };
            next();
        } catch (error) {
            console.error('Analytics Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch platform overview',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get college-wise statistics with filters
     * Route: POST /superadmin/analytics/colleges
     */
    async getCollegeStatistics(req, res, next) {
        try {
            const { collegeId, departmentId } = req.body || {};

            // Phase 1: colleges + all students in parallel (eliminates N+1)
            // NOTE: tblCollage has no collage_id field — the college id IS _id.
            let collegeFilter = { deleted: false };
            if (collegeId) collegeFilter._id = collegeId; // fetchData converts string _id to ObjectId

            let studentFilter = { person_role: { $regex: /^student$/i }, person_deleted: { $ne: true } };
            if (collegeId) studentFilter.person_collage_id = collegeId;
            if (departmentId) studentFilter.department = departmentId;

            const [collegesResponse, allStudentsRes] = await Promise.all([
                fetchData('tblCollage',
                    { collage_id: 1, collage_name: 1, collage_status: 1, collage_subscription_status: 1, collage_departments: 1 },
                    collegeFilter, {}),
                fetchData('tblPersonMaster',
                    { person_id: 1, person_status: 1, person_collage_id: 1 },
                    studentFilter, {})
            ]);

            const colleges = collegesResponse.data || [];
            const allStudents = allStudentsRes.data || [];
            // Use _id as the primary key — student_id in tblStudentProgress is stored as _id.toString()
            const allStudentIds = allStudents.map(s => (s._id || s.person_id)?.toString()).filter(Boolean);

            // Phase 2: progress + practice tests for known students in parallel
            const [progressRes, practiceRes] = await Promise.all([
                allStudentIds.length > 0
                    ? fetchData('tblStudentProgress', { student_id: 1, days_completed: 1 }, { student_id: { $in: allStudentIds } }, {})
                    : Promise.resolve({ data: [] }),
                allStudentIds.length > 0
                    ? fetchData('tblPracticeTest', { student_id: 1, score: 1 }, { student_id: { $in: allStudentIds } }, {})
                    : Promise.resolve({ data: [] })
            ]);

            // Build lookup maps for O(1) per-college assembly
            const studentsByCollege = {};
            allStudents.forEach(s => {
                const cid = String(s.person_collage_id || '');
                if (!studentsByCollege[cid]) studentsByCollege[cid] = [];
                studentsByCollege[cid].push(s);
            });

            const progressByStudent = {};
            (progressRes.data || []).forEach(p => {
                const sid = String(p.student_id || '');
                if (!progressByStudent[sid]) progressByStudent[sid] = [];
                progressByStudent[sid].push(p);
            });

            const scoresByStudent = {};
            (practiceRes.data || []).forEach(t => {
                const sid = String(t.student_id || '');
                if (!scoresByStudent[sid]) scoresByStudent[sid] = [];
                scoresByStudent[sid].push(t.score || 0);
            });

            // Assemble stats per college from maps (no extra DB calls)
            const collegeStats = colleges.map(college => {
                const cidStr = String(college.collage_id || college._id || '');
                const students = studentsByCollege[cidStr] || [];
                const activeStudents = students.filter(s => s.person_status === 'active').length;
                const studentsWithProgress = students.filter(s => progressByStudent[(s._id || s.person_id)?.toString() || '']).length;
                const totalDaysCompleted = students.reduce((sum, s) => {
                    const sid = (s._id || s.person_id)?.toString() || '';
                    return sum + (progressByStudent[sid] || []).reduce((a, p) => a + (p.days_completed?.length || 0), 0);
                }, 0);
                const allScores = students.flatMap(s => scoresByStudent[(s._id || s.person_id)?.toString() || ''] || []);
                const averageScore = allScores.length > 0
                    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
                    : 0;

                return {
                    // tblCollage has no collage_id field — returning it sent undefined
                    // to every consumer (college cards showed 0 students, filters broke)
                    collegeId: String(college._id),
                    collegeName: college.collage_name,
                    status: college.collage_status === 1 ? 'active' : 'inactive',
                    subscriptionStatus: college.collage_subscription_status || 'active',
                    departments: college.collage_departments || [],
                    students: { total: students.length, active: activeStudents, withProgress: studentsWithProgress },
                    progress: { totalDaysCompleted, averageScore: Math.round(averageScore) }
                };
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'College statistics fetched successfully',
                data: {
                    filters: { collegeId: collegeId || null, departmentId: departmentId || null },
                    colleges: collegeStats
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch college statistics',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get student performance analytics with filters
     * Route: GET /superadmin/analytics/students
     */
    async getStudentAnalytics(req, res, next) {
        try {
            const { collegeId, departmentId, limit = 100, page = 1, search, status, inactiveDays } = req.body || {};

            // Helper: match an id stored as either a string or an ObjectId
            const idMatch = (id) => {
                const s = String(id);
                return /^[0-9a-fA-F]{24}$/.test(s) ? { $in: [s, new ObjectId(s)] } : s;
            };

            // Build filter for students (exclude soft-deleted)
            let studentFilter = {
                person_role: { $regex: /^student$/i },
                person_deleted: { $ne: true } // Exclude soft-deleted students
            };
            if (collegeId) {
                studentFilter.person_collage_id = idMatch(collegeId);
            }
            if (departmentId) {
                // Students store the department reference in department_id (id) and
                // department (name/legacy id) — match either, as string or ObjectId.
                studentFilter.$and = [{
                    $or: [
                        { department_id: idMatch(departmentId) },
                        { department: String(departmentId) }
                    ]
                }];
            }
            if (status && status !== 'all') {
                studentFilter.person_status = status;
            }
            // Inactive-student radar: last_login older than N days, or never logged in.
            // last_login is stored as an ISO string, so lexicographic $lt is correct.
            const inactiveDaysNum = parseInt(inactiveDays);
            if (inactiveDaysNum > 0) {
                const cutoff = new Date(Date.now() - Math.min(inactiveDaysNum, 365) * 24 * 60 * 60 * 1000).toISOString();
                studentFilter.$and = [...(studentFilter.$and || []), {
                    $or: [
                        { last_login: { $lt: cutoff } },
                        { last_login: { $exists: false } },
                        { last_login: null }
                    ]
                }];
            }
            if (search && typeof search === 'string' && search.trim()) {
                const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const searchRegex = { $regex: escaped, $options: 'i' };
                const searchOr = {
                    $or: [
                        { person_name: searchRegex },
                        { person_email: searchRegex },
                        { enrollment_number: searchRegex }
                    ]
                };
                // Combine with the department $or (if any) via $and so both apply
                studentFilter.$and = [...(studentFilter.$and || []), searchOr];
            }

            // Pagination (page/limit) + total count for the UI
            const safeLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
            const safePage = Math.max(parseInt(page) || 1, 1);
            const skip = (safePage - 1) * safeLimit;

            const db = getDB();
            const totalCount = await db.collection('tblPersonMaster').countDocuments(studentFilter);

            // Get students
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                {
                    person_id: 1,
                    person_name: 1,
                    person_email: 1,
                    person_collage_id: 1,
                    person_status: 1,
                    department: 1,
                    department_id: 1,
                    last_login: 1
                },
                studentFilter,
                { limit: safeLimit, skip, sort: { person_name: 1 } }
            );
            const students = studentsResponse.data || [];

            // student_id in tblStudentProgress is stored as _id.toString() — use string keys
            const studentIds = students.map(s => (s._id || s.person_id)?.toString()).filter(Boolean);
            const [progressResponse, practiceTestResponse] = await Promise.all([
                studentIds.length > 0
                    ? fetchData('tblStudentProgress',
                        { student_id: 1, week: 1, days_completed: 1, practice_tests: 1, coding_problems: 1 },
                        { student_id: { $in: studentIds } }, {})
                    : Promise.resolve({ data: [] }),
                studentIds.length > 0
                    ? fetchData('tblPracticeTest',
                        { student_id: 1, score: 1, day: 1 },
                        { student_id: { $in: studentIds } }, {})
                    : Promise.resolve({ data: [] })
            ]);

            const progressData = progressResponse.data || [];
            const progressMap = new Map();
            progressData.forEach(p => {
                const sid = String(p.student_id || '');
                if (!progressMap.has(sid)) progressMap.set(sid, []);
                progressMap.get(sid).push(p);
            });

            const practiceTests = practiceTestResponse.data || [];
            const scoreMap = new Map();
            practiceTests.forEach(t => {
                const sid = String(t.student_id || '');
                if (!scoreMap.has(sid)) scoreMap.set(sid, []);
                scoreMap.get(sid).push(t.score || 0);
            });

            // Combine data
            const studentAnalytics = students.map(student => {
                const sid = (student._id || student.person_id)?.toString() || '';
                const studentProgress = progressMap.get(sid) || [];
                const studentScores = scoreMap.get(sid) || [];

                const totalDaysCompleted = studentProgress.reduce((sum, p) => sum + (p.days_completed?.length || 0), 0);
                const totalPracticeTests = studentProgress.reduce((sum, p) => sum + (p.practice_tests?.length || 0), 0);
                const totalCodingProblems = studentProgress.reduce((sum, p) => sum + (p.coding_problems?.completed?.length || 0), 0);
                const averageScore = studentScores.length > 0
                    ? studentScores.reduce((sum, s) => sum + s, 0) / studentScores.length
                    : 0;

                return {
                    studentId: sid || student.person_id,
                    name: student.person_name,
                    email: student.person_email,
                    collegeId: student.person_collage_id,
                    department: student.department,
                    status: student.person_status,
                    lastLogin: student.last_login || null,
                    progress: {
                        totalDaysCompleted,
                        totalPracticeTests,
                        totalCodingProblems,
                        averageScore: Math.round(averageScore)
                    }
                };
            });

            // Sort by average score (descending)
            studentAnalytics.sort((a, b) => b.progress.averageScore - a.progress.averageScore);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Student analytics fetched successfully',
                data: {
                    filters: {
                        collegeId: collegeId || null,
                        departmentId: departmentId || null
                    },
                    pagination: {
                        page: safePage,
                        limit: safeLimit,
                        total: totalCount,
                        totalPages: Math.max(1, Math.ceil(totalCount / safeLimit))
                    },
                    students: studentAnalytics
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch student analytics',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get graphical analytics data (for charts)
     * Route: GET /superadmin/analytics/graphical
     */
    async getGraphicalAnalytics(req, res, next) {
        try {
            const { collegeId, departmentId, chartType = 'overview' } = req.body || {};

            // Build student filter (exclude soft-deleted)
            let studentFilter = {
                person_role: { $regex: /^student$/i },
                person_deleted: { $ne: true }
            };
            if (collegeId) {
                studentFilter.person_collage_id = collegeId;
            }
            if (departmentId) {
                studentFilter.department = departmentId;
            }

            // Get students
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                { _id: 1, person_id: 1, person_collage_id: 1, department: 1 },
                studentFilter,
                {}
            );
            const students = studentsResponse.data || [];
            const studentIds = students.map(s => (s._id || s.person_id)?.toString()).filter(Boolean);

            let chartData = {};

            switch (chartType) {
                case 'college-distribution':
                    // Students by college
                    const collegeDistribution = {};
                    students.forEach(s => {
                        const cid = s.person_collage_id || 'unknown';
                        collegeDistribution[cid] = (collegeDistribution[cid] || 0) + 1;
                    });
                    chartData = { collegeDistribution };
                    break;

                case 'department-distribution':
                    // Students by department
                    const deptDistribution = {};
                    students.forEach(s => {
                        const dept = s.department || 'unknown';
                        deptDistribution[dept] = (deptDistribution[dept] || 0) + 1;
                    });
                    chartData = { departmentDistribution: deptDistribution };
                    break;

                case 'progress-timeline':
                    // Progress over time (by week)
                    const progressResponse = await fetchData(
                        'tblStudentProgress',
                        { student_id: 1, week: 1, days_completed: 1 },
                        studentIds.length > 0 ? { student_id: { $in: studentIds } } : { student_id: 'none' },
                        {}
                    );
                    const progressData = progressResponse.data || [];
                    const weekProgress = {};
                    progressData.forEach(p => {
                        const week = p.week || 1;
                        weekProgress[week] = (weekProgress[week] || 0) + (p.days_completed?.length || 0);
                    });
                    chartData = { weekProgress };
                    break;

                case 'score-distribution':
                    // Score distribution
                    const practiceTestResponse = await fetchData(
                        'tblPracticeTest',
                        { score: 1 },
                        studentIds.length > 0 ? { student_id: { $in: studentIds } } : { student_id: 'none' },
                        {}
                    );
                    const practiceTests = practiceTestResponse.data || [];
                    const scoreRanges = {
                        '0-20': 0,
                        '21-40': 0,
                        '41-60': 0,
                        '61-80': 0,
                        '81-100': 0
                    };
                    practiceTests.forEach(t => {
                        const score = t.score || 0;
                        if (score <= 20) scoreRanges['0-20']++;
                        else if (score <= 40) scoreRanges['21-40']++;
                        else if (score <= 60) scoreRanges['41-60']++;
                        else if (score <= 80) scoreRanges['61-80']++;
                        else scoreRanges['81-100']++;
                    });
                    chartData = { scoreDistribution: scoreRanges };
                    break;

                default:
                    // Overview - return all chart types
                    const collegeDist = {};
                    students.forEach(s => {
                        const cid = s.person_collage_id || 'unknown';
                        collegeDist[cid] = (collegeDist[cid] || 0) + 1;
                    });
                    const deptDist = {};
                    students.forEach(s => {
                        const dept = s.department || 'unknown';
                        deptDist[dept] = (deptDist[dept] || 0) + 1;
                    });
                    chartData = {
                        collegeDistribution: collegeDist,
                        departmentDistribution: deptDist
                    };
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Graphical analytics fetched successfully',
                data: {
                    filters: {
                        collegeId: collegeId || null,
                        departmentId: departmentId || null
                    },
                    chartType,
                    ...chartData
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch graphical analytics',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get recent platform activity
     * Route: POST /superadmin/analytics/recent-activity
     */
    async getRecentActivity(req, res, next) {
        try {
            const { limit = 10 } = req.body || {};

            // Fetch all three sources in parallel using fetchData
            const [studentsRes, testsRes, progressRes] = await Promise.all([
                fetchData('tblPersonMaster',
                    { person_name: 1, person_email: 1, created_at: 1, person_collage_id: 1 },
                    { person_role: { $regex: /^student$/i }, person_deleted: { $ne: true } },
                    { sort: { created_at: -1 }, limit: 5 }),
                fetchData('tblPracticeTest',
                    { student_id: 1, score: 1, day: 1, updated_at: 1 },
                    {},
                    { sort: { updated_at: -1 }, limit: 5 }),
                fetchData('tblStudentProgress',
                    { student_id: 1, week: 1, days_completed: 1, updated_at: 1 },
                    {},
                    { sort: { updated_at: -1 }, limit: 5 })
            ]);

            const recentStudents = studentsRes.data || [];
            const recentTests = testsRes.data || [];
            const recentProgress = progressRes.data || [];

            // Combine and format activities
            const activities = [];

            // Add student registrations
            recentStudents.forEach(student => {
                activities.push({
                    type: 'registration',
                    message: `New student registered: ${student.person_name}`,
                    timestamp: student.created_at || new Date(),
                    details: {
                        email: student.person_email,
                        collegeId: student.person_collage_id
                    }
                });
            });

            // Add test submissions
            recentTests.forEach(test => {
                activities.push({
                    type: 'test',
                    message: `Practice test completed (Day ${test.day}, Score: ${test.score || 0})`,
                    timestamp: test.updated_at || new Date(),
                    details: {
                        studentId: test.student_id,
                        score: test.score
                    }
                });
            });

            // Add progress updates
            recentProgress.forEach(progress => {
                activities.push({
                    type: 'progress',
                    message: `Week ${progress.week} progress updated (${progress.days_completed?.length || 0} days)`,
                    timestamp: progress.updated_at || new Date(),
                    details: {
                        studentId: progress.student_id,
                        week: progress.week
                    }
                });
            });

            // Sort by timestamp descending and limit
            activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const limitedActivities = activities.slice(0, parseInt(limit));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Recent activity fetched successfully',
                data: {
                    activities: limitedActivities,
                    total: limitedActivities.length
                }
            };
            next();
        } catch (error) {
            console.error('Recent Activity Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch recent activity',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get security violations summary
     * Route: GET /superadmin/analytics/security
     */
    async getSecurityViolations(req, res, next) {
        try {
            // Real violation data lives in tblBlockedTestRetake — one record per
            // student/week/test blocked for a proctoring violation (tab switch etc.).
            // blocked=true → still blocked; blocked=false + approved_at → resolved.
            const violationsRes = await fetchData(
                'tblBlockedTestRetake',
                {},
                {},
                { sort: { blocked_at: -1 }, limit: 500 }
            );
            const violations = violationsRes.data || [];

            // Enrich with student name / email / college
            const studentIds = [...new Set(violations.map(v => String(v.student_id || '')).filter(Boolean))];
            const objectIds = studentIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id)).map(id => new ObjectId(id));
            const personsRes = studentIds.length > 0
                ? await fetchData('tblPersonMaster',
                    { person_name: 1, person_email: 1, person_collage_id: 1, department: 1 },
                    { $or: [{ _id: { $in: objectIds } }, { _id: { $in: studentIds } }] })
                : { data: [] };
            const personMap = new Map((personsRes.data || []).map(p => [String(p._id), p]));

            // College names for grouping
            const collegesRes = await fetchData('tblCollage', { collage_name: 1 }, { deleted: false });
            const collegeNameById = new Map((collegesRes.data || []).map(c => [String(c._id), c.collage_name]));

            const enriched = violations.map(v => {
                const p = personMap.get(String(v.student_id));
                return {
                    _id: v._id,
                    student_id: v.student_id,
                    student_name: p?.person_name || 'Unknown',
                    student_email: p?.person_email || '',
                    college: collegeNameById.get(String(p?.person_collage_id)) || '—',
                    department: p?.department || '',
                    week: v.week,
                    test_type: v.test_type,
                    reason: v.blocked_reason || 'Violation',
                    blocked: v.blocked === true,
                    blocked_at: v.blocked_at,
                    approved_at: v.approved_at || null,
                };
            });

            // Aggregations
            const currentlyBlocked = enriched.filter(v => v.blocked).length;
            const resolved = enriched.filter(v => !v.blocked).length;

            const byReason = {};
            const byCollege = {};
            const violatorCounts = new Map();
            enriched.forEach(v => {
                // Normalize reason to a short key (first sentence)
                const reasonKey = String(v.reason).split('.')[0].slice(0, 60);
                byReason[reasonKey] = (byReason[reasonKey] || 0) + 1;
                byCollege[v.college] = (byCollege[v.college] || 0) + 1;
                const k = v.student_id;
                violatorCounts.set(k, {
                    student_name: v.student_name,
                    student_email: v.student_email,
                    college: v.college,
                    count: (violatorCounts.get(k)?.count || 0) + 1,
                });
            });
            const topViolators = [...violatorCounts.values()]
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Security violations fetched successfully',
                data: {
                    totalViolations: enriched.length,
                    currentlyBlocked,
                    resolved,
                    violationsByType: byReason,
                    violationsByCollege: byCollege,
                    topViolators,
                    recentViolations: enriched.slice(0, 100),
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch security violations',
                error: error.message
            };
            next();
        }
    }

    /**
     * AI + code-execution usage overview (cost visibility)
     * Route: POST /superadmin/ai-usage
     */
    async getAIUsage(req, res, next) {
        try {
            const { days = 14 } = req.body || {};
            const windowDays = Math.min(Math.max(parseInt(days) || 14, 1), 90);
            const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
            const sinceIso = since.toISOString();

            const db = getDB();

            // AI interactions (created_at stored as ISO string by executeData)
            const interactions = await db.collection('tblAIInteraction')
                .find({ $or: [{ created_at: { $gte: sinceIso } }, { created_at: { $gte: since } }] })
                .project({ interaction_type: 1, was_out_of_scope: 1, ai_provider: 1, student_id: 1, created_at: 1 })
                .toArray();

            const totalAllTime = await db.collection('tblAIInteraction').countDocuments({});

            const byType = {};
            const byDay = {};
            let outOfScope = 0;
            const perStudent = new Map();
            interactions.forEach(i => {
                byType[i.interaction_type || 'unknown'] = (byType[i.interaction_type || 'unknown'] || 0) + 1;
                const day = String(i.created_at).slice(0, 10);
                byDay[day] = (byDay[day] || 0) + 1;
                if (i.was_out_of_scope) outOfScope++;
                const sid = String(i.student_id || 'unknown');
                perStudent.set(sid, (perStudent.get(sid) || 0) + 1);
            });

            // Top AI consumers with names
            const topIds = [...perStudent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
            const idStrs = topIds.map(([id]) => id).filter(id => id !== 'unknown');
            const objIds = idStrs.filter(id => /^[0-9a-fA-F]{24}$/.test(id)).map(id => new ObjectId(id));
            const personsRes = idStrs.length > 0
                ? await fetchData('tblPersonMaster', { person_name: 1, person_email: 1 },
                    { $or: [{ _id: { $in: objIds } }, { _id: { $in: idStrs } }] })
                : { data: [] };
            const nameMap = new Map((personsRes.data || []).map(p => [String(p._id), p]));
            const topStudents = topIds.map(([id, count]) => ({
                student_name: nameMap.get(id)?.person_name || 'Unknown',
                student_email: nameMap.get(id)?.person_email || '',
                calls: count,
            }));

            // Code execution (JDoodle) estimate from stored submissions:
            // each submission ran test_results.length test cases ≈ that many credits.
            // "Run" calls aren't persisted, so this is a lower bound.
            const submissions = await db.collection('tblCodingSubmissions')
                .find({ submitted_at: { $gte: since } })
                .project({ submitted_at: 1, test_results: 1 })
                .toArray();
            const jdoodleByDay = {};
            let jdoodleCredits = 0;
            submissions.forEach(s => {
                const day = new Date(s.submitted_at).toISOString().slice(0, 10);
                const credits = Array.isArray(s.test_results) ? s.test_results.length : 1;
                jdoodleByDay[day] = (jdoodleByDay[day] || 0) + credits;
                jdoodleCredits += credits;
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'AI usage fetched successfully',
                data: {
                    windowDays,
                    ai: {
                        totalInWindow: interactions.length,
                        totalAllTime,
                        outOfScope,
                        byType,
                        byDay,
                        topStudents,
                    },
                    codeExecution: {
                        submissionsInWindow: submissions.length,
                        estimatedCredits: jdoodleCredits,
                        creditsByDay: jdoodleByDay,
                        note: 'Submit-only lower bound; Run calls are not persisted',
                    },
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch AI usage',
                error: error.message
            };
            next();
        }
    }

    /**
     * POST /superadmin/ops/health
     * Error-log intelligence for the ops dashboard: 24h/7d volume, a per-day
     * trend, a 4xx-vs-5xx split, the noisiest routes, and the most recent errors.
     * (Latency comes from the public /health ping and cost from /ai-usage — the
     * frontend composes those; this endpoint owns the error-trend piece.)
     */
    async getOpsHealth(req, res, next) {
        try {
            const db = getDB();
            const col = db.collection('tblerrorlog');
            const now = Date.now();
            const since24h = new Date(now - 24 * 60 * 60 * 1000);
            const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

            const [errors24h, errors7d, last7dDocs, recent] = await Promise.all([
                col.countDocuments({ timestamp: { $gte: since24h } }),
                col.countDocuments({ timestamp: { $gte: since7d } }),
                col.find({ timestamp: { $gte: since7d } })
                    .project({ http_status: 1, error_code: 1, route: 1, backend_route: 1, timestamp: 1 })
                    .toArray(),
                col.find({})
                    .project({ http_status: 1, error_code: 1, route: 1, backend_route: 1, error_message: 1, timestamp: 1 })
                    .sort({ timestamp: -1 })
                    .limit(8)
                    .toArray(),
            ]);

            // Per-day trend (last 7 days, oldest→newest, gap-filled with 0)
            const dayCounts = {};
            const statusSplit = { c4xx: 0, c5xx: 0, other: 0 };
            const routeCounts = {};
            for (const e of last7dDocs) {
                const key = new Date(e.timestamp).toISOString().slice(0, 10);
                dayCounts[key] = (dayCounts[key] || 0) + 1;

                const s = e.http_status;
                if (s >= 500) statusSplit.c5xx++;
                else if (s >= 400) statusSplit.c4xx++;
                else statusSplit.other++;

                const r = e.route || e.backend_route || 'unknown';
                routeCounts[r] = (routeCounts[r] || 0) + 1;
            }

            const byDay = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now - i * 24 * 60 * 60 * 1000);
                const key = d.toISOString().slice(0, 10);
                byDay.push({ date: key, count: dayCounts[key] || 0 });
            }

            const topRoutes = Object.entries(routeCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([route, count]) => ({ route, count }));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Ops health fetched',
                data: {
                    errors: {
                        last24h: errors24h,
                        last7d: errors7d,
                        byDay,
                        statusSplit,
                        topRoutes,
                        recent: recent.map(e => ({
                            route: e.route || e.backend_route || '',
                            error_code: e.error_code || '',
                            http_status: e.http_status ?? null,
                            error_message: e.error_message || '',
                            timestamp: e.timestamp,
                        })),
                    },
                }
            };
            next();
        } catch (error) {
            console.error('[Ops] getOpsHealth error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch ops health',
                error: error.message
            };
            next();
        }
    }
}
