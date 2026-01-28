import { executeData, fetchData } from '../../methods.js';

export default class superadminAnalyticsController {

    /**
     * Get platform-wide statistics with filters
     * Route: POST /superadmin/analytics/overview
     */
    async getPlatformOverview(req, res, next) {
        try {
            const { collegeId, departmentId } = req.body || {};
            
            // Build college filter
            let collegeFilter = { deleted: false }; // Exclude soft-deleted colleges
            if (collegeId) {
                collegeFilter.collage_id = collegeId;
            }

            // Get all colleges (excluding deleted ones)
            const collegesResponse = await fetchData(
                'tblCollage',
                { collage_name: 1, collage_status: 1, collage_subscription_status: 1 },
                collegeFilter,
                {}
            );
            const colleges = collegesResponse.data || [];
            const activeColleges = colleges.filter(c => c.collage_status === 1).length;
            const subscribedColleges = colleges.filter(c => c.collage_subscription_status === 'active').length;
            const totalColleges = colleges.length;

            // Build student filter (exclude soft-deleted)
            let studentFilter = { 
                person_role: 'Student',
                person_deleted: { $ne: true } // Exclude soft-deleted students
            };
            if (collegeId) {
                studentFilter.person_collage_id = collegeId;
            }
            if (departmentId) {
                studentFilter.department = departmentId;
            }

            // Get all students
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                { person_id: 1, person_email: 1, person_status: 1, person_collage_id: 1 },
                studentFilter,
                {}
            );
            const students = studentsResponse.data || [];
            const activeStudents = students.filter(s => s.person_status === 'active').length;
            const totalStudents = students.length;

            // Get student progress data
            const studentIds = students.map(s => s.person_id);
            const progressResponse = await fetchData(
                'tblStudentProgress',
                { student_id: 1, week: 1, days_completed: 1, practice_tests: 1, coding_problems: 1 },
                studentIds.length > 0 ? { student_id: { $in: studentIds } } : { student_id: 'none' },
                {}
            );
            const progressData = progressResponse.data || [];
            
            // Calculate progress metrics
            const studentsWithProgress = new Set(progressData.map(p => p.student_id)).size;
            const totalDaysCompleted = progressData.reduce((sum, p) => sum + (p.days_completed?.length || 0), 0);
            const totalPracticeTests = progressData.reduce((sum, p) => sum + (p.practice_tests?.length || 0), 0);
            const totalCodingProblems = progressData.reduce((sum, p) => sum + (p.coding_problems?.completed?.length || 0), 0);

            // Get practice test data
            const practiceTestResponse = await fetchData(
                'tblPracticeTest',
                { student_id: 1, score: 1, day: 1 },
                studentIds.length > 0 ? { student_id: { $in: studentIds } } : { student_id: 'none' },
                {}
            );
            const practiceTests = practiceTestResponse.data || [];
            const averageScore = practiceTests.length > 0
                ? practiceTests.reduce((sum, t) => sum + (t.score || 0), 0) / practiceTests.length
                : 0;

            // Get exams
            const examsResponse = await fetchData(
                'tblExam',
                { exam_id: 1, exam_date: 1, exam_status: 1 },
                {},
                {}
            );
            const exams = examsResponse.data || [];
            const upcomingExams = exams.filter(e => {
                const examDate = new Date(e.exam_date);
                return examDate > new Date() && e.exam_status !== 'completed';
            }).length;

            // Calculate engagement metrics
            const engagementRate = totalStudents > 0 
                ? ((studentsWithProgress / totalStudents) * 100).toFixed(1)
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
                        total: totalColleges,
                        active: activeColleges,
                        subscribed: subscribedColleges,
                        inactive: totalColleges - activeColleges
                    },
                    students: {
                        total: totalStudents,
                        active: activeStudents,
                        inactive: totalStudents - activeStudents,
                        withProgress: studentsWithProgress,
                        engagementRate: parseFloat(engagementRate)
                    },
                    progress: {
                        totalDaysCompleted: totalDaysCompleted,
                        totalPracticeTests: totalPracticeTests,
                        totalCodingProblems: totalCodingProblems,
                        averageScore: Math.round(averageScore)
                    },
                    exams: {
                        total: exams.length,
                        upcoming: upcomingExams
                    }
                }
            };
            next();
        } catch (error) {
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

            // Build college filter (exclude deleted colleges)
            let collegeFilter = { deleted: false };
            if (collegeId) {
                collegeFilter.collage_id = collegeId;
            }

            // Get all colleges (excluding deleted ones)
            const collegesResponse = await fetchData(
                'tblCollage',
                { collage_id: 1, collage_name: 1, collage_status: 1, collage_subscription_status: 1, collage_departments: 1 },
                collegeFilter,
                {}
            );
            const colleges = collegesResponse.data || [];

            // Get statistics for each college
            const collegeStats = await Promise.all(colleges.map(async (college) => {
                // Build student filter (exclude soft-deleted)
                let studentFilter = { 
                    person_role: 'Student',
                    person_collage_id: college.collage_id,
                    person_deleted: { $ne: true } // Exclude soft-deleted students
                };
                if (departmentId) {
                    studentFilter.department = departmentId;
                }

                // Get students for this college
                const studentsResponse = await fetchData(
                    'tblPersonMaster',
                    { person_id: 1, person_status: 1, department: 1 },
                    studentFilter,
                    {}
                );
                const students = studentsResponse.data || [];
                const activeStudents = students.filter(s => s.person_status === 'active').length;

                // Get progress for students in this college
                const studentIds = students.map(s => s.person_id);
                const progressResponse = await fetchData(
                    'tblStudentProgress',
                    { student_id: 1, days_completed: 1, practice_tests: 1 },
                    studentIds.length > 0 ? { student_id: { $in: studentIds } } : { student_id: 'none' },
                    {}
                );
                const progressData = progressResponse.data || [];
                const studentsWithProgress = new Set(progressData.map(p => p.student_id)).size;
                const totalDaysCompleted = progressData.reduce((sum, p) => sum + (p.days_completed?.length || 0), 0);

                // Get practice test scores
                const practiceTestResponse = await fetchData(
                    'tblPracticeTest',
                    { score: 1 },
                    studentIds.length > 0 ? { student_id: { $in: studentIds } } : { student_id: 'none' },
                    {}
                );
                const practiceTests = practiceTestResponse.data || [];
                const averageScore = practiceTests.length > 0
                    ? practiceTests.reduce((sum, t) => sum + (t.score || 0), 0) / practiceTests.length
                    : 0;

                return {
                    collegeId: college.collage_id,
                    collegeName: college.collage_name,
                    status: college.collage_status === 1 ? 'active' : 'inactive',
                    subscriptionStatus: college.collage_subscription_status || 'active',
                    departments: college.collage_departments || [],
                    students: {
                        total: students.length,
                        active: activeStudents,
                        withProgress: studentsWithProgress
                    },
                    progress: {
                        totalDaysCompleted: totalDaysCompleted,
                        averageScore: Math.round(averageScore)
                    }
                };
            }));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'College statistics fetched successfully',
                data: {
                    filters: {
                        collegeId: collegeId || null,
                        departmentId: departmentId || null
                    },
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
            const { collegeId, departmentId, limit = 100, search, status } = req.body || {};

            // Build filter for students (exclude soft-deleted)
            let studentFilter = { 
                person_role: 'Student',
                person_deleted: { $ne: true } // Exclude soft-deleted students
            };
            if (collegeId) {
                studentFilter.person_collage_id = collegeId;
            }
            if (departmentId) {
                studentFilter.department = departmentId;
            }
            if (status && status !== 'all') {
                studentFilter.person_status = status;
            }
            if (search && typeof search === 'string' && search.trim()) {
                const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const searchRegex = { $regex: escaped, $options: 'i' };
                studentFilter.$or = [
                    { person_name: searchRegex },
                    { person_email: searchRegex },
                    { enrollment_number: searchRegex }
                ];
            }

            // Get students
            const studentsResponse = await fetchData(
                'tblPersonMaster',
                { 
                    person_id: 1, 
                    person_name: 1, 
                    person_email: 1, 
                    person_collage_id: 1,
                    person_status: 1,
                    department: 1
                },
                studentFilter,
                { limit: parseInt(limit) }
            );
            const students = studentsResponse.data || [];

            // Get progress for all students
            const studentIds = students.map(s => s.person_id);
            const progressResponse = await fetchData(
                'tblStudentProgress',
                { 
                    student_id: 1, 
                    week: 1,
                    days_completed: 1, 
                    practice_tests: 1,
                    coding_problems: 1 
                },
                studentIds.length > 0 ? { student_id: { $in: studentIds } } : { student_id: 'none' },
                {}
            );
            const progressData = progressResponse.data || [];
            const progressMap = new Map();
            progressData.forEach(p => {
                if (!progressMap.has(p.student_id)) {
                    progressMap.set(p.student_id, []);
                }
                progressMap.get(p.student_id).push(p);
            });

            // Get practice test scores
            const practiceTestResponse = await fetchData(
                'tblPracticeTest',
                { student_id: 1, score: 1, day: 1 },
                studentIds.length > 0 ? { student_id: { $in: studentIds } } : { student_id: 'none' },
                {}
            );
            const practiceTests = practiceTestResponse.data || [];
            const scoreMap = new Map();
            practiceTests.forEach(t => {
                if (!scoreMap.has(t.student_id)) {
                    scoreMap.set(t.student_id, []);
                }
                scoreMap.get(t.student_id).push(t.score || 0);
            });

            // Combine data
            const studentAnalytics = students.map(student => {
                const studentProgress = progressMap.get(student.person_id) || [];
                const studentScores = scoreMap.get(student.person_id) || [];
                
                const totalDaysCompleted = studentProgress.reduce((sum, p) => sum + (p.days_completed?.length || 0), 0);
                const totalPracticeTests = studentProgress.reduce((sum, p) => sum + (p.practice_tests?.length || 0), 0);
                const totalCodingProblems = studentProgress.reduce((sum, p) => sum + (p.coding_problems?.completed?.length || 0), 0);
                const averageScore = studentScores.length > 0
                    ? studentScores.reduce((sum, s) => sum + s, 0) / studentScores.length
                    : 0;

                return {
                    studentId: student.person_id,
                    name: student.person_name,
                    email: student.person_email,
                    collegeId: student.person_collage_id,
                    department: student.department,
                    status: student.person_status,
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
                person_role: 'Student',
                person_deleted: { $ne: true } // Exclude soft-deleted students
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
                { person_id: 1, person_collage_id: 1, department: 1 },
                studentFilter,
                {}
            );
            const students = studentsResponse.data || [];
            const studentIds = students.map(s => s.person_id);

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
     * Get security violations summary
     * Route: GET /superadmin/analytics/security
     */
    async getSecurityViolations(req, res, next) {
        try {
            // Note: This assumes you have a security violations collection
            // For now, we'll return a structure that can be populated later
            // You can create a tblSecurityViolations collection if needed

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Security violations fetched successfully',
                data: {
                    totalViolations: 0,
                    violationsByType: {},
                    recentViolations: [],
                    topViolators: []
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
}
