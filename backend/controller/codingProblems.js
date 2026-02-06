/**
 * Coding Problems Controller
 * Handles API requests for coding/programming problems
 */

import { getDB, fetchData } from '../methods.js';
import { ObjectId } from 'mongodb';
import aiService from '../services/aiService.js';
import fs from 'fs';
import path from 'path';

const COLLECTION_NAME = 'tblCodingProblem';
const CODE_REVIEW_COLLECTION = 'tblCodeReview';

// Concurrency cap + queue so no student gets 503 under normal load (requests wait in queue until a slot is free)
const MAX_CONCURRENT_CODING_SUBMITS = parseInt(process.env.MAX_CONCURRENT_CODING_SUBMITS, 10) || 100;
const MAX_SUBMIT_QUEUE_SIZE = parseInt(process.env.MAX_SUBMIT_QUEUE_SIZE, 10) || 2000;
let activeCodingSubmits = 0;
const submitQueue = [];

/**
 * Trigger AI code review when submission passes all test cases.
 * Runs async (fire-and-forget) so submit response is not delayed.
 * Saves result to tblCodeReview with person_id, department_id, college_id for multi-tenant.
 */
async function triggerCodeReview(params) {
    const { db, submissionId, personId, departmentId, collegeId, problemId, solution, language, problem } = params;
    try {
        const problemDesc = problem?.problem_statement?.description
            || problem?.problem_statement
            || (typeof problem?.problem_statement === 'string' ? problem.problem_statement : '')
            || (problem?.title ? `Problem: ${problem.title}` : 'Coding problem');
        const problemContext = `${problem?.title || 'Problem'}\n\n${problemDesc}`;

        const aiReview = await aiService.reviewCode(solution, language, problemContext);

        const reviewDoc = {
            person_id: String(personId),
            department_id: departmentId ? String(departmentId) : null,
            college_id: collegeId ? String(collegeId) : null,
            submission_id: submissionId,
            problem_id: problemId,
            week: problem?.week ?? null,
            day: problem?.day ?? null,
            is_capstone: problem?.is_capstone ?? false,
            problem_title: problem?.title || problem?.metadata?.title || 'Coding Problem',
            problem_description: typeof problemDesc === 'string' ? problemDesc : JSON.stringify(problemDesc),
            submitted_code: solution,
            language: language,
            ai_review: aiReview,
            created_at: new Date().toISOString(),
            deleted: false,
        };

        const reviewCollection = db.collection(CODE_REVIEW_COLLECTION);
        await reviewCollection.insertOne(reviewDoc);
        console.log(`[CodeReview] Saved review for submission ${submissionId}, problem ${problemId}`);
    } catch (err) {
        console.error('[CodeReview] Failed to generate/save review:', err);
    }
}

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
 * Process one submit job (called by queue worker). Sends response to client.
 */
async function doSubmit(req, res) {
    try {
        const { problemId, solution: solutionBody, code, language } = req.body;
        const solution = solutionBody || code; // Support both "solution" and "code" (capstone UI)
        const studentId = req.user.id; // Corrected: Get student ID from auth middleware

        if (!problemId || !solution) {
            res.status(400).json({
                success: false,
                message: 'Problem ID and solution/code are required'
            });
            return;
        }

        const db = getDB();
        const problemsCollection = db.collection(COLLECTION_NAME);
        const problem = await problemsCollection.findOne({ question_id: problemId });

        if (!problem) {
            res.status(404).json({ success: false, message: 'Problem not found' });
            return;
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
        const collegeId = req.user?.college_id ?? req.user?.person_collage_id ?? null;
        const departmentId = req.user?.department_id ?? null;
        const submission = {
            student_id: studentId,
            problem_id: problemId,
            solution: solution,
            language: language,
            submitted_at: new Date(),
            status: status,
            test_results: testResults,
            score: totalCases > 0 ? (passedCases / totalCases) * 100 : 0,
            ...(collegeId != null && collegeId !== '' && { college_id: typeof collegeId === 'string' ? collegeId : collegeId?.toString?.() }),
            ...(departmentId != null && departmentId !== '' && { department_id: typeof departmentId === 'string' ? departmentId : departmentId?.toString?.() }),
        };

        const insertResult = await submissionsCollection.insertOne(submission);
        const submissionId = insertResult.insertedId;

        // When all test cases pass, trigger AI code review (async, do not block response)
        if (status === 'passed') {
            const personId = req.user?.id || req.user?.person_id || studentId;
            const departmentId = req.user?.department_id ?? null;
            const collegeId = req.user?.college_id ?? req.user?.collegeId ?? null;
            triggerCodeReview({
                db,
                submissionId,
                personId,
                departmentId,
                collegeId,
                problemId,
                solution,
                language,
                problem,
            }).catch((err) => console.error('[CodeReview] Trigger error:', err));
        }

        res.status(200).json({
            success: true,
            message: status === 'passed' ? 'All test cases passed!' : `Passed ${passedCases}/${totalCases} test cases`,
            status: status,
            testResults: testResults,
            submission_id: submissionId
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
 * Drain submit queue up to concurrency cap.
 */
function processSubmitQueue() {
    while (activeCodingSubmits < MAX_CONCURRENT_CODING_SUBMITS && submitQueue.length > 0) {
        const { req, res } = submitQueue.shift();
        activeCodingSubmits++;
        doSubmit(req, res).finally(() => {
            activeCodingSubmits = Math.max(0, activeCodingSubmits - 1);
            processSubmitQueue();
        });
    }
}

/**
 * Submit solution for evaluation with real execution.
 * Requests are queued when at cap so no student gets 503 under normal load (up to MAX_SUBMIT_QUEUE_SIZE).
 * POST /coding-problems/submit
 */
export async function submitSolution(req, res) {
    if (submitQueue.length >= MAX_SUBMIT_QUEUE_SIZE) {
        res.setHeader('Retry-After', '30');
        return res.status(503).json({
            success: false,
            message: 'Server is very busy. Please try again in a minute.',
            code: 'QUEUE_FULL'
        });
    }
    submitQueue.push({ req, res });
    processSubmitQueue();
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
 * Get code review by submission ID (for Code Review UI).
 * Students: only their own. Dept TPC: only reviews for their department's students.
 * POST /coding-problems/review/get-by-submission
 */
export async function getCodeReviewBySubmissionId(req, res) {
    try {
        const { submissionId } = req.body || req.params;
        const personId = String(req.user?.id || req.user?.person_id || req.user?.userId || '');
        const role = (req.user?.role || req.user?.person_role || '').toString().toLowerCase();

        if (!personId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        if (!submissionId) {
            return res.status(400).json({ success: false, message: 'submissionId is required' });
        }

        const db = getDB();
        const reviewCollection = db.collection(CODE_REVIEW_COLLECTION);

        let submissionObjectId;
        try {
            submissionObjectId = typeof submissionId === 'string' ? new ObjectId(submissionId) : submissionId;
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Invalid submissionId' });
        }

        let review;
        if (role === 'depttpc') {
            review = await reviewCollection.findOne({
                submission_id: submissionObjectId,
                deleted: { $ne: true }
            });
            if (!review) {
                return res.status(200).json({ success: true, review: null, message: 'Review not found.' });
            }
            let deptId = req.user?.department_id ?? null;
            if (!deptId) {
                const personRes = await fetchData('tblPersonMaster', { department_id: 1 }, { _id: personId }, { limit: 1 });
                if (personRes.success && personRes.data?.length) deptId = personRes.data[0].department_id ?? null;
            }
            const reviewDept = review.department_id?.toString?.() || review.department_id;
            const match = deptId && (reviewDept === deptId || reviewDept === (deptId.toString?.() || deptId));
            if (!match) {
                return res.status(403).json({ success: false, message: 'You can only view reviews for students in your department.' });
            }
        } else {
            review = await reviewCollection.findOne({
                submission_id: submissionObjectId,
                person_id: personId,
                deleted: { $ne: true }
            });
        }

        if (!review) {
            return res.status(200).json({
                success: true,
                review: null,
                message: 'Review not found or still generating. Check back in a moment.'
            });
        }

        res.status(200).json({
            success: true,
            review: {
                _id: review._id,
                submission_id: review.submission_id,
                problem_id: review.problem_id,
                problem_title: review.problem_title,
                problem_description: review.problem_description,
                submitted_code: review.submitted_code,
                language: review.language,
                ai_review: review.ai_review,
                week: review.week,
                day: review.day,
                is_capstone: review.is_capstone,
                created_at: review.created_at,
            }
        });
    } catch (error) {
        console.error('Error fetching code review by submission:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching code review',
            error: error.message
        });
    }
}

/**
 * Get latest code review for a problem for current user (for "View review" from problem list).
 * Scoped by person_id (and department_id/college_id in DB for multi-tenant).
 * POST /coding-problems/review/get-by-problem
 */
export async function getCodeReviewByProblemId(req, res) {
    try {
        const { problemId } = req.body || req.params;
        const personId = String(req.user?.id || req.user?.person_id || req.user?.userId || '');

        if (!personId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        if (!problemId) {
            return res.status(400).json({ success: false, message: 'problemId is required' });
        }

        const db = getDB();
        const reviewCollection = db.collection(CODE_REVIEW_COLLECTION);

        const review = await reviewCollection.findOne(
            {
                problem_id: problemId,
                person_id: personId,
                deleted: { $ne: true }
            },
            { sort: { created_at: -1 } }
        );

        if (!review) {
            return res.status(200).json({
                success: true,
                review: null,
                message: 'No review found for this problem.'
            });
        }

        res.status(200).json({
            success: true,
            review: {
                _id: review._id,
                submission_id: review.submission_id,
                problem_id: review.problem_id,
                problem_title: review.problem_title,
                problem_description: review.problem_description,
                submitted_code: review.submitted_code,
                language: review.language,
                ai_review: review.ai_review,
                week: review.week,
                day: review.day,
                is_capstone: review.is_capstone,
                created_at: review.created_at,
            }
        });
    } catch (error) {
        console.error('Error fetching code review by problem:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching code review',
            error: error.message
        });
    }
}

/**
 * List code reviews for current user, optionally by week and/or day.
 * POST /coding-problems/review/list
 * Body: { week?: number, day?: number }
 */
export async function listCodeReviews(req, res) {
    try {
        const personId = String(req.user?.id || req.user?.person_id || req.user?.userId || '');
        if (!personId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const { week, day } = req.body || {};
        const db = getDB();
        const reviewCollection = db.collection(CODE_REVIEW_COLLECTION);

        const filter = {
            person_id: personId,
            deleted: { $ne: true }
        };
        if (week != null && week !== '') {
            const w = parseInt(week);
            if (!isNaN(w)) filter.week = w;
        }
        if (day != null && day !== '') {
            const d = parseInt(day);
            if (!isNaN(d)) filter.day = d;
        }

        const reviews = await reviewCollection.find(filter)
            .sort({ week: 1, day: 1, created_at: -1 })
            .project({
                submission_id: 1,
                problem_id: 1,
                problem_title: 1,
                week: 1,
                day: 1,
                is_capstone: 1,
                created_at: 1,
                language: 1
            })
            .toArray();

        const list = reviews.map(r => ({
            _id: r._id,
            submission_id: r.submission_id ? String(r.submission_id) : r.submission_id,
            problem_id: r.problem_id,
            problem_title: r.problem_title,
            week: r.week,
            day: r.day,
            is_capstone: r.is_capstone || false,
            created_at: r.created_at,
            language: r.language
        }));

        res.status(200).json({
            success: true,
            reviews: list,
            count: list.length
        });
    } catch (error) {
        console.error('Error listing code reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing code reviews',
            error: error.message
        });
    }
}

/**
 * List AI code reviews for Dept TPC: only their department's students.
 * Returns reviews with student name, week, day, capstone for clear UI.
 * POST /tpc-dept/coding-reviews/list
 */
export async function listCodeReviewsForDeptTPC(req, res) {
    try {
        const userId = String(req.user?.id || req.user?.person_id || req.user?.userId || '');
        const role = (req.user?.role || req.user?.person_role || '').toString().toLowerCase();

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        if (role !== 'depttpc') {
            return res.status(403).json({ success: false, message: 'Dept TPC only' });
        }

        let departmentId = req.user?.department_id ?? null;
        if (!departmentId) {
            const personRes = await fetchData('tblPersonMaster', { department_id: 1, department: 1 }, { _id: userId }, { limit: 1 });
            if (personRes.success && personRes.data?.length) {
                departmentId = personRes.data[0].department_id ?? personRes.data[0].department ?? null;
            }
        }
        if (departmentId != null && typeof departmentId !== 'string') departmentId = departmentId.toString();

        const db = getDB();
        const reviewCollection = db.collection(CODE_REVIEW_COLLECTION);
        const personCollection = db.collection('tblPersonMaster');

        const filter = { deleted: { $ne: true } };
        if (departmentId) {
            filter.$or = [{ department_id: departmentId }];
            if (/^[0-9a-fA-F]{24}$/.test(departmentId)) {
                filter.$or.push({ department_id: new ObjectId(departmentId) });
            }
        } else {
            return res.status(200).json({ success: true, reviews: [], count: 0 });
        }

        const reviews = await reviewCollection.find(filter)
            .sort({ week: 1, day: 1, created_at: -1 })
            .project({
                submission_id: 1,
                problem_id: 1,
                problem_title: 1,
                week: 1,
                day: 1,
                is_capstone: 1,
                created_at: 1,
                language: 1,
                person_id: 1
            })
            .toArray();

        const personIds = [...new Set(reviews.map(r => r.person_id).filter(Boolean))];
        let nameMap = {};
        if (personIds.length) {
            const persons = await personCollection.find({ _id: { $in: personIds.map(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id) } })
                .project({ _id: 1, person_name: 1 })
                .toArray();
            persons.forEach(p => { nameMap[p._id.toString()] = p.person_name || 'Student'; });
        }

        const list = reviews.map(r => ({
            _id: r._id,
            submission_id: r.submission_id ? String(r.submission_id) : r.submission_id,
            problem_id: r.problem_id,
            problem_title: r.problem_title,
            week: r.week,
            day: r.day,
            is_capstone: r.is_capstone || false,
            created_at: r.created_at,
            language: r.language,
            student_name: nameMap[r.person_id?.toString?.() || r.person_id] || 'Student'
        }));

        res.status(200).json({ success: true, reviews: list, count: list.length });
    } catch (error) {
        console.error('Error listing code reviews for Dept TPC:', error);
        res.status(500).json({
            success: false,
            message: 'Error listing code reviews',
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

        // 1. Get all daily problems for this week (day-wise: day-1..day-5 only; exclude pre-week)
        // Support both string days ('day-1', ...) and numeric days (1..5); week as number or string for DB compatibility
        const problemsCollection = db.collection(COLLECTION_NAME);
        const dailyProblems = await problemsCollection.find({
            week: { $in: [week, String(week)] },
            day: { $in: ['day-1', 'day-2', 'day-3', 'day-4', 'day-5', 1, 2, 3, 4, 5] },
            is_capstone: false,
            deleted: { $ne: true }
        }).project({ question_id: 1, title: 1, day: 1, question_number: 1 }).toArray();

        const totalDailyProblems = dailyProblems.length;
        const dailyProblemIds = dailyProblems.map(p => p.question_id);

        // 2. Get user's submissions for these problems
        // Match student_id as string or ObjectId (production may store either)
        const submissionsCollection = db.collection('tblCodingSubmissions');
        const studentIdString = String(studentId);
        let studentIdObj = null;
        try {
            studentIdObj = new ObjectId(studentIdString);
        } catch (_) { /* not a valid ObjectId */ }

        const studentIdConditions = [
            { student_id: studentIdString },
            { student_id: studentIdString.trim() }
        ];
        if (studentIdObj) studentIdConditions.push({ student_id: studentIdObj });

        const submissions = await submissionsCollection.find({
            $and: [
                { problem_id: { $in: dailyProblemIds } },
                { status: 'passed' },
                { $or: studentIdConditions }
            ]
        }).project({ problem_id: 1 }).toArray();

        // Count unique completed problems
        const completedProblemIds = new Set(submissions.map(s => s.problem_id));
        const completedCount = completedProblemIds.size;

        // Helper: day order for sorting (supports 'day-1'..'day-5' and numeric 1..5)
        const dayOrder = (d) => {
            if (typeof d === 'number' && d >= 1 && d <= 5) return d;
            const m = String(d || '').match(/day-(\d+)/);
            return m ? parseInt(m[1], 10) : 0;
        };

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

        pendingProblems.sort((a, b) => dayOrder(a.day) - dayOrder(b.day) || (a.question_number || 0) - (b.question_number || 0));

        res.status(200).json({
            success: true,
            week: week,
            totalDailyProblems,
            requiredToUnlock,
            completedDailyProblems: completedCount,
            isEligible,
            completedIds: Array.from(completedProblemIds),
            pendingProblems
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
