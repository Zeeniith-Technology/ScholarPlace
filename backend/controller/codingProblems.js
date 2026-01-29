/**
 * Coding Problems Controller
 * Handles API requests for coding/programming problems
 */

import { getDB } from '../methods.js';

const COLLECTION_NAME = 'tblCodingProblem';

/**
 * Get all coding problems for a specific week
 * GET /coding-problems/week/:weekNum
 */
export async function getCodingProblemsByWeek(req, res) {
    try {
        const { weekNum } = req.params;
        const week = parseInt(weekNum);

        if (isNaN(week) || week < 1 || week > 6) {
            return res.status(400).json({
                success: false,
                message: 'Invalid week number. Must be between 1 and 6.'
            });
        }

        const db = getDB();
        const collection = db.collection(COLLECTION_NAME);

        const problems = await collection.find({
            week: week,
            is_capstone: true, // Only capstone problems for weekly test
            deleted: false,
            status: 'active'
        }).sort({ question_id: 1 }).toArray();

        console.log(`[getCodingProblemsByWeek] Week ${week}: Found ${problems.length} capstone problems`);

        res.status(200).json({
            success: true,
            week: week,
            count: problems.length,
            problems: problems
        });

    } catch (error) {
        console.error('Error fetching coding problems by week:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching coding problems',
            error: error.message
        });
    }
}

/**
 * Get daily coding problems for a specific week and day
 * POST /coding-problems/daily/:weekNum/:dayNum
 */
export async function getDailyCodingProblems(req, res) {
    try {
        const { weekNum, dayNum } = req.params;
        const week = parseInt(weekNum);
        const day = parseInt(dayNum);

        if (isNaN(week) || week < 1 || week > 6) {
            return res.status(400).json({
                success: false,
                message: 'Invalid week number. Must be between 1 and 6.'
            });
        }

        if (isNaN(day) || day < 1 || day > 5) {
            return res.status(400).json({
                success: false,
                message: 'Invalid day number. Must be between 1 and 5.'
            });
        }

        const db = getDB();
        const collection = db.collection(COLLECTION_NAME);

        const problems = await collection.find({
            week: week,
            day: day,
            is_capstone: false, // Only daily problems, not capstone
            deleted: false,
            status: 'active'
        }).sort({ question_id: 1 }).toArray();

        console.log(`[getDailyCodingProblems] Week ${week}, Day ${day}: Found ${problems.length} daily problems`);

        res.status(200).json({
            success: true,
            week: week,
            day: day,
            count: problems.length,
            problems: problems
        });

    } catch (error) {
        console.error('Error fetching daily coding problems:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching daily coding problems',
            error: error.message
        });
    }
}


/**
 * Get specific coding problem by ID
 * GET /coding-problems/:problemId
 */
export async function getCodingProblemById(req, res) {
    try {
        const { problemId } = req.params;

        const db = getDB();
        const collection = db.collection(COLLECTION_NAME);

        const problem = await collection.findOne({
            question_id: problemId,
            deleted: false,
            status: 'active'
        });

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Coding problem not found'
            });
        }

        res.status(200).json({
            success: true,
            problem: problem
        });

    } catch (error) {
        console.error('Error fetching coding problem by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching coding problem',
            error: error.message
        });
    }
}

/**
 * Get all coding problems (admin/testing)
 * GET /coding-problems/all
 */
export async function getAllCodingProblems(req, res) {
    try {
        const db = getDB();
        const collection = db.collection(COLLECTION_NAME);

        const problems = await collection.find({
            deleted: false,
            status: 'active'
        }).sort({ week: 1, question_number: 1 }).toArray();

        // Group by week
        const problemsByWeek = {};
        for (const problem of problems) {
            if (!problemsByWeek[problem.week]) {
                problemsByWeek[problem.week] = [];
            }
            problemsByWeek[problem.week].push(problem);
        }

        res.status(200).json({
            success: true,
            total: problems.length,
            problemsByWeek: problemsByWeek,
            problems: problems
        });

    } catch (error) {
        console.error('Error fetching all coding problems:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching coding problems',
            error: error.message
        });
    }
}

/**
 * Submit solution for evaluation (placeholder)
 * POST /coding-problems/submit
 */
export async function submitSolution(req, res) {
    try {
        const { problemId, solution, language } = req.body;
        const studentId = res.locals.person_id;

        if (!problemId || !solution) {
            return res.status(400).json({
                success: false,
                message: 'Problem ID and solution are required'
            });
        }

        // TODO: Implement code execution and testing
        // For now, this is a placeholder that stores the submission

        const db = getDB();
        const submissionsCollection = db.collection('tblCodingSubmissions');

        const submission = {
            student_id: studentId,
            problem_id: problemId,
            solution: solution,
            language: language || 'cpp',
            submitted_at: new Date(),
            status: 'pending', // pending, passed, failed
            test_results: []
        };

        await submissionsCollection.insertOne(submission);

        res.status(200).json({
            success: true,
            message: 'Solution submitted successfully',
            submission_id: submission._id,
            note: 'Code evaluation feature coming soon'
        });

    } catch (error) {
        console.error('Error submitting solution:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting solution',
            error: error.message
        });
    }
}

/**
 * Get student's submissions for a problem
 * GET /coding-problems/:problemId/submissions
 */
export async function getStudentSubmissions(req, res) {
    try {
        const { problemId } = req.params;
        const studentId = res.locals.person_id;

        const db = getDB();
        const collection = db.collection('tblCodingSubmissions');

        const submissions = await collection.find({
            student_id: studentId,
            problem_id: problemId
        }).sort({ submitted_at: -1 }).toArray();

        res.status(200).json({
            success: true,
            count: submissions.length,
            submissions: submissions
        });

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching submissions',
            error: error.message
        });
    }
}

/**
 * Get student's progress for weekly coding problems
 * Checks if they have completed all daily problems to unlock capstone
 * GET /coding-problems/progress/:weekNum
 */
export async function getWeeklyCodingProgress(req, res) {
    try {
        const { weekNum } = req.params;
        const studentId = res.locals.person_id || req.userId; // Handle different auth middleware
        const week = parseInt(weekNum);

        if (isNaN(week)) {
            return res.status(400).json({ success: false, message: 'Invalid week number' });
        }

        const db = getDB();

        // 1. Get all daily problems for this week
        const problemsCollection = db.collection(COLLECTION_NAME);
        const dailyProblems = await problemsCollection.find({
            week: week,
            is_capstone: false,
            deleted: false
        }).project({ question_id: 1 }).toArray();

        const totalDailyProblems = dailyProblems.length;
        const dailyProblemIds = dailyProblems.map(p => p.question_id);

        // 2. Get user's submissions for these problems
        const submissionsCollection = db.collection('tblCodingSubmissions');

        // Convert studentId to string for consistent matching
        // (Assuming student_id in submissions is stored as string like in other collections)
        const studentIdString = studentId.toString();

        const submissions = await submissionsCollection.find({
            student_id: studentIdString,
            problem_id: { $in: dailyProblemIds }
        }).project({ problem_id: 1, status: 1 }).toArray();

        // Count unique completed problems
        // For now, any submission counts as "attempted/completed" since we don't have a real judge yet
        // In future, might filter by status: 'passed'
        const completedProblemIds = new Set(submissions.map(s => s.problem_id));
        const completedCount = completedProblemIds.size;

        const isEligible = completedCount >= totalDailyProblems;

        res.status(200).json({
            success: true,
            week: week,
            totalDailyProblems,
            completedDailyProblems: completedCount,
            isEligible,
            completedIds: Array.from(completedProblemIds)
        });

    } catch (error) {
        console.error('Error fetching weekly coding progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking weekly progress',
            error: error.message
        });
    }
}
