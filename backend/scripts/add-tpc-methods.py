"""
Script to add TPC practice test methods to tpc.js
This inserts the three new methods before the closing brace of the tpcController class
"""

# Read the tpc.js file
with open('d:/scholarplace/backend/controller/tpc.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The methods to add
new_methods = '''
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
    },

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
    },

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
            const studentInfo = await fetchData('tblPersonMaster',
                { person_id: 1, person_collage_id: 1, department: 1, person_name: 1, person_email: 1 },
                { person_id: test.student_id, person_role: { $regex: /^student$/i } });

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
'''

# Find the last closing brace and insert before it
lines = content.split('\n')
for i in range(len(lines) - 1, -1, -1):
    if lines[i].strip() == '}':
        # Insert the new methods before this line
        lines.insert(i, new_methods)
        break

# Write back
with open('d:/scholarplace/backend/controller/tpc.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print("Successfully added TPC practice test methods to tpc.js")
