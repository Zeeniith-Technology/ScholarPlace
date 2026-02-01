/**
 * Coding Problems Controller
 * Handles API requests for coding/programming problems
 */

import { getDB } from '../methods.js';
import fs from 'fs';
import path from 'path';

const COLLECTION_NAME = 'tblCodingProblem';

/**
 * Get all coding problems for a specific week
 * GET /coding-problems/week/:weekNum
 */
export async function getCodingProblemsByWeek(req, res) {
    try {
        const { weekNum } = req.params;
        const week = parseInt(weekNum);
        const studentId = req.user.id; // Corrected: Get student ID from auth middleware

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
            is_capstone: true // Only capstone problems for weekly test
        }).sort({ question_id: 1 }).toArray();

        // Check for submissions
        const submissionsCollection = db.collection('tblCodingSubmissions');

        // Enhance problems with status
        const problemsWithStatus = await Promise.all(problems.map(async (problem) => {
            // Find the latest passed submission for this student and problem
            const studentIdString = studentId.toString();
            const passedSubmission = await submissionsCollection.findOne({
                student_id: studentIdString,
                problem_id: problem.question_id,
                status: 'passed'
            });

            return {
                ...problem,
                status: passedSubmission ? 'passed' : 'pending'
            };
        }));

        console.log(`[getCodingProblemsByWeek] Week ${week}: Found ${problems.length} capstone problems`);

        res.status(200).json({
            success: true,
            week: week,
            count: problemsWithStatus.length,
            problems: problemsWithStatus
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
        const studentId = req.user.id; // Corrected: Get student ID from auth middleware

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
            is_capstone: false // Only daily problems, not capstone
        }).sort({ question_id: 1 }).toArray();

        // Check for submissions
        const submissionsCollection = db.collection('tblCodingSubmissions');

        // Enhance problems with status
        const problemsWithStatus = await Promise.all(problems.map(async (problem) => {
            // Find the latest passed submission for this student and problem
            const studentIdString = studentId.toString();
            let studentIdObj;
            try {
                // Import ObjectId if not already available in scope
                const { ObjectId } = await import('mongodb');
                studentIdObj = new ObjectId(studentIdString);
            } catch (e) {
                // Ignore if invalid object id
            }

            const query = {
                problem_id: problem.question_id,
                status: 'passed',
                $or: [
                    { student_id: studentIdString },
                    // Also check for trimmed version just in case of whitespace
                    { student_id: studentIdString.trim() }
                ]
            };

            if (studentIdObj) {
                query.$or.push({ student_id: studentIdObj });
            }

            // DEBUG LOGGING
            if (problem.title === 'Even or Odd' || problem.question_number === 'Q006') {
                console.log(`[StatusCheck] Checking for problem: ${problem.title}`);
                console.log(`[StatusCheck] Query:`, JSON.stringify(query));
            }

            const passedSubmission = await submissionsCollection.findOne(query);

            if ((problem.title === 'Even or Odd' || problem.question_number === 'Q006') && passedSubmission) {
                console.log(`[StatusCheck] FOUND passed submission for ${problem.title}`);
            } else if (problem.title === 'Even or Odd' || problem.question_number === 'Q006') {
                console.log(`[StatusCheck] NO passed submission found for ${problem.title}`);
            }

            return {
                ...problem,
                status: passedSubmission ? 'passed' : 'pending' // 'passed' if ANY passed submission exists
            };
        }));

        console.log(`[getDailyCodingProblems] Week ${week}, Day ${day}: Found ${problems.length} daily problems`);

        res.status(200).json({
            success: true,
            week: week,
            day: day,
            count: problemsWithStatus.length,
            problems: problemsWithStatus
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
        const studentId = req.user ? req.user.id : null;

        const db = getDB();
        const collection = db.collection(COLLECTION_NAME);

        const problem = await collection.findOne({
            question_id: problemId
        });

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Coding problem not found'
            });
        }

        // Check user status
        let status = 'pending';
        if (studentId) {
            const submissionsCollection = db.collection('tblCodingSubmissions');
            const passedSubmission = await submissionsCollection.findOne({
                student_id: studentId,
                problem_id: problemId,
                status: 'passed'
            });
            if (passedSubmission) {
                status = 'passed';
            }
        }

        res.status(200).json({
            success: true,
            problem: {
                ...problem,
                status: status
            }
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
// Helper to execute code using Piston API
async function executeWithPiston(language, code, stdin) {
    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: language,
                version: '*',
                files: [{ content: code }],
                stdin: stdin
            })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Piston API Error:", error);
        return { run: { error: "Execution API failed" } };
    }
}

/**
 * Submit solution for evaluation with real execution
 * POST /coding-problems/submit
 */
export async function submitSolution(req, res) {
    try {
        const { problemId, solution, language } = req.body;
        const studentId = req.user.id; // Corrected: Get student ID from auth middleware

        if (!problemId || !solution) {
            return res.status(400).json({
                success: false,
                message: 'Problem ID and solution are required'
            });
        }

        const db = getDB();
        const problemsCollection = db.collection(COLLECTION_NAME);

        // 1. Get the problem and its test cases
        const problem = await problemsCollection.findOne({ question_id: problemId });

        if (!problem) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        // Handle nested structure legacy issue
        let testCases = problem.test_cases;
        if (!testCases && problem.problem_statement && problem.problem_statement.test_cases) {
            testCases = problem.problem_statement.test_cases;
        }
        if (!testCases && problem.example) {
            // Fallback for Q001 which might only have 'example'
            testCases = [problem.example];
        }

        if (!testCases || testCases.length === 0) {
            // Only for Q001 fallback if even example is missing but we saw it in logs
            testCases = [];
        }

        // 2. Execute code against test cases
        const testResults = [];
        let passedCases = 0;
        let totalCases = testCases.length;

        // Map frontend language to Piston language
        const langMap = {
            'cpp': 'cpp',
            'c': 'c',
            'javascript': 'javascript',
            'python': 'python'
        };
        const pistonLang = langMap[language] || language;

        for (const testCase of testCases) {
            const input = testCase.input || '';
            const expectedOutput = (testCase.expected_output || testCase.output || '').trim();

            const executionResult = await executeWithPiston(pistonLang, solution, input);

            // Piston returns { run: { stdout: "...", stderr: "...", code: 0 } }
            const actualOutput = (executionResult.run?.stdout || '').trim();
            const stderr = executionResult.run?.stderr || '';

            const isCorrect = actualOutput === expectedOutput;
            if (isCorrect) passedCases++;

            testResults.push({
                input: input,
                expectedOutput: expectedOutput,
                actualOutput: actualOutput,
                stderr: stderr,
                passed: isCorrect
            });
        }

        // 3. Save submission
        const status = totalCases > 0 && passedCases === totalCases ? 'passed' : 'failed';

        const submissionsCollection = db.collection('tblCodingSubmissions');
        const submission = {
            student_id: studentId,
            problem_id: problemId,
            solution: solution,
            language: language,
            submitted_at: new Date(),
            status: status,
            test_results: testResults,
            score: totalCases > 0 ? (passedCases / totalCases) * 100 : 0
        };

        await submissionsCollection.insertOne(submission);

        res.status(200).json({
            success: true,
            message: status === 'passed' ? 'All test cases passed!' : `Passed ${passedCases}/${totalCases} test cases`,
            status: status,
            testResults: testResults,
            submission_id: submission._id
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
 * Run solution against test cases (test only, no save)
 * POST /coding-problems/run
 */
export async function runSolution(req, res) {
    try {
        const { problemId, solution, language } = req.body;

        if (!problemId || !solution) {
            return res.status(400).json({
                success: false,
                message: 'Problem ID and solution are required'
            });
        }

        const db = getDB();
        const problemsCollection = db.collection(COLLECTION_NAME);

        // 1. Get the problem and its test cases
        const problem = await problemsCollection.findOne({ question_id: problemId });

        if (!problem) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        // Handle nested structure legacy issue
        let testCases = problem.test_cases;
        if (!testCases && problem.problem_statement && problem.problem_statement.test_cases) {
            testCases = problem.problem_statement.test_cases;
        }
        if (!testCases && problem.example) {
            testCases = [problem.example];
        }

        if (!testCases || testCases.length === 0) {
            testCases = [];
        }

        // 2. Execute code against test cases
        const testResults = [];
        let passedCases = 0;
        let totalCases = testCases.length;

        const langMap = {
            'cpp': 'cpp',
            'c': 'c',
            'javascript': 'javascript',
            'python': 'python'
        };
        const pistonLang = langMap[language] || language;

        for (const testCase of testCases) {
            const input = testCase.input || '';
            const expectedOutput = (testCase.expected_output || testCase.output || '').trim();

            const executionResult = await executeWithPiston(pistonLang, solution, input);

            const actualOutput = (executionResult.run?.stdout || '').trim();
            const stderr = executionResult.run?.stderr || '';

            const isCorrect = actualOutput === expectedOutput;
            if (isCorrect) passedCases++;

            testResults.push({
                input: input,
                expectedOutput: expectedOutput,
                actualOutput: actualOutput,
                stderr: stderr,
                passed: isCorrect
            });
        }

        const status = totalCases > 0 && passedCases === totalCases ? 'passed' : 'failed';

        res.status(200).json({
            success: true,
            message: status === 'passed' ? 'All test cases passed!' : `Passed ${passedCases}/${totalCases} test cases`,
            status: status,
            testResults: testResults
        });

    } catch (error) {
        console.error('Error running solution:', error);
        res.status(500).json({
            success: false,
            message: 'Error running solution',
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
        const studentId = res.locals.person_id || req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers?.['x-user-id'];

        if (!studentId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

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
        const studentId = res.locals.person_id || req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers?.['x-user-id']; // Handle different auth middleware

        if (!studentId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const week = parseInt(weekNum);

        if (isNaN(week)) {
            return res.status(400).json({ success: false, message: 'Invalid week number' });
        }

        const db = getDB();

        // 1. Get all daily problems for this week
        const problemsCollection = db.collection(COLLECTION_NAME);
        const dailyProblems = await problemsCollection.find({
            week: week,
            day: { $lte: 5 }, // Ensure we only count standard 5 days
            is_capstone: false,
            deleted: { $ne: true }
        }).project({ question_id: 1, title: 1, day: 1, question_number: 1 }).toArray();

        const totalDailyProblems = dailyProblems.length;
        const dailyProblemIds = dailyProblems.map(p => p.question_id);

        // 2. Get user's submissions for these problems
        const submissionsCollection = db.collection('tblCodingSubmissions');

        // Convert studentId to string for consistent matching
        // (Assuming student_id in submissions is stored as string like in other collections)
        const studentIdString = studentId.toString();

        const submissions = await submissionsCollection.find({
            student_id: studentIdString,
            problem_id: { $in: dailyProblemIds },
            status: 'passed' // Only count passed submissions
        }).project({ problem_id: 1 }).toArray();

        // Count unique completed problems
        const completedProblemIds = new Set(submissions.map(s => s.problem_id));
        const completedCount = completedProblemIds.size;

        // Identify pending problems
        const pendingProblems = dailyProblems
            .filter(p => !completedProblemIds.has(p.question_id))
            .map(p => ({
                question_id: p.question_id,
                title: p.title,
                day: p.day,
                question_number: p.question_number
            }));

        // Dynamic: require all daily problems for this week to unlock capstone (works for any count per week)
        const requiredToUnlock = totalDailyProblems;
        const isEligible = completedCount >= requiredToUnlock;

        res.status(200).json({
            success: true,
            week: week,
            totalDailyProblems,
            requiredToUnlock,
            completedDailyProblems: completedCount,
            isEligible,
            completedIds: Array.from(completedProblemIds),
            pendingProblems: pendingProblems.sort((a, b) => a.day - b.day || a.question_number - b.question_number)
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
