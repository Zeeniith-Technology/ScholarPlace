import week1Questions from '../data/questions.js';
import week2Questions from '../data/week2Questions.js';
import { getCodingProblemsByDay, getCodingProblemById, getAllCodingProblems } from '../data/codingProblems.js';
import { getDB } from '../methods.js';

export default class questionscontroller {

    /**
     * Get questions by day for Week 1
     * Route: POST /questions/week1
     */
    async getWeek1QuestionsByDay(req, res, next) {
        try {
            const { day } = req.body || {};

            // Validate day parameter
            const validDays = ['pre-week', 'day-1', 'day-2', 'day-3', 'day-4', 'day-5'];
            if (!day) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Day parameter is required',
                    data: null
                };
                return next();
            }

            if (!validDays.includes(day)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: `Invalid day. Must be one of: ${validDays.join(', ')}`,
                    data: null
                };
                return next();
            }

            // Filter questions by day
            const dayQuestions = week1Questions.filter(q => q.day === day);

            // Organize by difficulty level
            const organized = {
                easy: dayQuestions.filter(q => q.question_type === 'easy'),
                intermediate: dayQuestions.filter(q => q.question_type === 'intermediate'),
                difficult: dayQuestions.filter(q => q.question_type === 'difficult')
            };

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Questions for ${day} fetched successfully`,
                data: {
                    day: day,
                    total: dayQuestions.length,
                    easy: organized.easy.length,
                    intermediate: organized.intermediate.length,
                    difficult: organized.difficult.length,
                    questions: dayQuestions,
                    organized: organized
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch questions',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get all Week 1 questions organized by day
     * Route: GET /questions/week1/all
     */
    async getAllWeek1Questions(req, res, next) {
        try {
            // Organize questions by day
            const organizedByDay = {
                'pre-week': week1Questions.filter(q => q.day === 'pre-week'),
                'day-1': week1Questions.filter(q => q.day === 'day-1'),
                'day-2': week1Questions.filter(q => q.day === 'day-2'),
                'day-3': week1Questions.filter(q => q.day === 'day-3'),
                'day-4': week1Questions.filter(q => q.day === 'day-4'),
                'day-5': week1Questions.filter(q => q.day === 'day-5')
            };

            // Calculate statistics
            const stats = {};
            Object.keys(organizedByDay).forEach(day => {
                const questions = organizedByDay[day];
                stats[day] = {
                    total: questions.length,
                    easy: questions.filter(q => q.question_type === 'easy').length,
                    intermediate: questions.filter(q => q.question_type === 'intermediate').length,
                    difficult: questions.filter(q => q.question_type === 'difficult').length
                };
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'All Week 1 questions fetched successfully',
                data: {
                    total: week1Questions.length,
                    statistics: stats,
                    questionsByDay: organizedByDay
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch questions',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get questions by difficulty level for a specific day
     * Route: GET /questions/week1?day=day-1&difficulty=easy|intermediate|difficult
     */
    async getWeek1QuestionsByDifficulty(req, res, next) {
        try {
            const { day, difficulty } = req.query;

            // Validate day parameter
            const validDays = ['pre-week', 'day-1', 'day-2', 'day-3', 'day-4', 'day-5'];
            const validDifficulties = ['easy', 'intermediate', 'difficult'];

            if (!day || !difficulty) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Both day and difficulty parameters are required',
                    data: null
                };
                return next();
            }

            if (!validDays.includes(day)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: `Invalid day. Must be one of: ${validDays.join(', ')}`,
                    data: null
                };
                return next();
            }

            if (!validDifficulties.includes(difficulty)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`,
                    data: null
                };
                return next();
            }

            // Filter questions by day and difficulty
            const filteredQuestions = week1Questions.filter(
                q => q.day === day && q.question_type === difficulty
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `${difficulty} questions for ${day} fetched successfully`,
                data: {
                    day: day,
                    difficulty: difficulty,
                    count: filteredQuestions.length,
                    questions: filteredQuestions
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch questions',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get a single question by ID
     * Route: GET /questions/week1/:questionId
     */
    async getQuestionById(req, res, next) {
        try {
            const { questionId } = req.body || {};

            if (!questionId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Question ID is required',
                    data: null
                };
                return next();
            }

            const question = week1Questions.find(q => q.question_id === questionId);

            if (!question) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Question not found',
                    data: null
                };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Question fetched successfully',
                data: question
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch question',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get coding problems by day
     * Route: GET /questions/coding?day=pre-week|day-1|day-2|day-3|day-4|day-5
     */
    /**
     * Get coding problems by day and week
     * Route: POST /questions/coding
     * Body: { day: 'day-1', week: 3 }
     */
    async getCodingProblemsByDay(req, res, next) {
        try {
            const { day, week } = req.body || {};

            // Validate day parameter
            if (!day) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Day parameter is required',
                    data: null
                };
                return next();
            }

            // Default to Week 1 if not provided (for backward compatibility)
            const weekNum = week ? parseInt(week) : 1;

            const db = getDB();
            const collection = db.collection('tblQuestion');

            // Query: question_type='coding', week=weekNum, day=day
            // Note: day in DB is like '1', '2' or 'day-1'? 
            // My insertion script mapped: day: q.metadata.day 
            // The JSON had "day": 1 (integer). The frontend sends 'day-1'.
            // I need to handle this mapping.

            let dayNum;
            if (day.startsWith('day-')) {
                dayNum = parseInt(day.split('-')[1]);
            } else if (day === 'pre-week') {
                dayNum = 0; // Assuming pre-week is handled or mapped differently. 
                // If DB doesn't have pre-week, this might return empty. 
                // week1_part1.json had pre-week? No, usually starts day 1. 
                // Actually, let's check the inserted data format.
            } else {
                dayNum = parseInt(day);
            }

            const query = {
                question_type: 'coding',
                week: weekNum,
                day: dayNum
            };

            const problems = await collection.find(query).toArray();

            // Fetch user's submissions for these problems to check status
            const userId = req.user?.id;
            let submissionMap = {};

            if (userId && problems.length > 0) {
                const problemIds = problems.map(p => p.question_id);
                const submissionsCollection = db.collection('tblCodingSubmissions');

                // Find passed submissions for these problems
                const submissions = await submissionsCollection.find({
                    user_id: userId,
                    problem_id: { $in: problemIds },
                    status: 'passed'
                }).toArray();

                // Create a map of passed problem IDs
                submissions.forEach(sub => {
                    submissionMap[sub.problem_id] = true;
                });
            }

            // Map to frontend expected format
            const problemsWithTemplates = problems.map(p => ({
                problem_id: p.question_id,
                day: day, // Return the requested day string
                title: p.subtopic || p.topic, // Use subtopic as title if available
                description: p.question_text,
                problem_type: 'learning', // Default or map from somewhere
                difficulty: p.difficulty.toLowerCase(),
                language: 'javascript', // Default
                code_templates: null, // DB might not have this populated yet
                code_template: '// Write your code here',
                test_cases: p.test_cases || [],
                explanation: p.hints && p.hints.length > 0 ? p.hints[0].hint_text : '',
                status: submissionMap[p.question_id] ? 'passed' : 'pending'
            }));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Coding problems for Week ${weekNum} ${day} fetched successfully`,
                data: {
                    day: day,
                    week: weekNum,
                    count: problemsWithTemplates.length,
                    problems: problemsWithTemplates
                }
            };
            next();
        } catch (error) {
            console.error('Error fetching coding problems:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch coding problems',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get coding problem by ID
     * Route: GET /questions/coding/:problemId
     */
    async getCodingProblemById(req, res, next) {
        try {
            const { problemId } = req.body || {};

            if (!problemId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Problem ID is required',
                    data: null
                };
                return next();
            }

            const problem = getCodingProblemById(problemId);

            if (!problem) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Coding problem not found',
                    data: null
                };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Coding problem fetched successfully',
                data: problem
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch coding problem',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get questions by day for Week 2
     * Route: POST /questions/week2
     */
    async getWeek2QuestionsByDay(req, res, next) {
        try {
            const { day } = req.body || {};

            // Validate day parameter
            const validDays = ['day-1', 'day-2', 'day-3', 'day-4', 'day-5'];
            if (!day) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Day parameter is required',
                    data: null
                };
                return next();
            }

            if (!validDays.includes(day)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: `Invalid day. Must be one of: ${validDays.join(', ')}`,
                    data: null
                };
                return next();
            }

            // Filter questions by day
            const dayQuestions = week2Questions.filter(q => q.day === day);

            // Organize by difficulty level
            const organized = {
                easy: dayQuestions.filter(q => q.question_type === 'easy'),
                intermediate: dayQuestions.filter(q => q.question_type === 'intermediate'),
                difficult: dayQuestions.filter(q => q.question_type === 'difficult')
            };

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Questions for ${day} fetched successfully`,
                data: {
                    day: day,
                    total: dayQuestions.length,
                    easy: organized.easy.length,
                    intermediate: organized.intermediate.length,
                    difficult: organized.difficult.length,
                    questions: dayQuestions,
                    organized: organized
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch questions',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get all Week 2 questions organized by day
     * Route: POST /questions/week2/all
     */
    async getAllWeek2Questions(req, res, next) {
        try {
            // Organize questions by day
            const organizedByDay = {
                'day-1': week2Questions.filter(q => q.day === 'day-1'),
                'day-2': week2Questions.filter(q => q.day === 'day-2'),
                'day-3': week2Questions.filter(q => q.day === 'day-3'),
                'day-4': week2Questions.filter(q => q.day === 'day-4'),
                'day-5': week2Questions.filter(q => q.day === 'day-5')
            };

            // Calculate statistics
            const stats = {};
            Object.keys(organizedByDay).forEach(day => {
                const questions = organizedByDay[day];
                stats[day] = {
                    total: questions.length,
                    easy: questions.filter(q => q.question_type === 'easy').length,
                    intermediate: questions.filter(q => q.question_type === 'intermediate').length,
                    difficult: questions.filter(q => q.question_type === 'difficult').length
                };
            });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'All Week 2 questions fetched successfully',
                data: {
                    total: week2Questions.length,
                    statistics: stats,
                    questionsByDay: organizedByDay
                }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch questions',
                error: error.message
            };
            next();
        }
    }
}
