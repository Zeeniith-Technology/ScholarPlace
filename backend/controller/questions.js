import { getDB } from '../methods.js';

export default class questionscontroller {

    /**
     * Get coding problems by day and week
     * Route: POST /questions/coding
     * Body: { day: 'day-1', week: 3 }
     *
     * NOTE (2026-08-19): This is the only method left in this controller. The former
     * static-file-backed methods (getWeek1QuestionsByDay, getAllWeek1Questions,
     * getWeek1QuestionsByDifficulty, getQuestionById, getWeek2QuestionsByDay,
     * getAllWeek2Questions, getCodingProblemById) served seed-era static data
     * (data/questions.js, week2Questions.js, codingProblems.js) that had drifted from
     * the DB. Their pages now redirect to the DB-backed flows, so the methods, their
     * routes, and the static imports were removed. Student content lives in the DB.
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
}
