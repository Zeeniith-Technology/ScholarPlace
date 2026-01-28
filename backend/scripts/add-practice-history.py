"""
Add getMyPracticeHistory method to studentProgress.js
"""

# Read the file
with open('d:/scholarplace/backend/controller/studentProgress.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The method to add
new_method = '''
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

            const sorted ByDate = [...tests].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
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
    }'''

# Find the last closing brace and insert before it
lines = content.split('\n')
for i in range(len(lines) - 1, -1, -1):
    if lines[i].strip() == '}':
        lines.insert(i, new_method)
        break

# Write back
with open('d:/scholarplace/backend/controller/studentProgress.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print("Successfully added getMyPracticeHistory method to studentProgress.js")
