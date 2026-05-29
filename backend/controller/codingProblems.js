/**
 * Coding Problems Controller
 * Handles API requests for coding/programming problems
 */

import { getDB, fetchData } from '../methods.js';
import { ObjectId } from 'mongodb';
import aiService from '../services/aiService.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const COLLECTION_NAME = 'tblCodingProblem';
const CODE_REVIEW_COLLECTION = 'tblCodeReview';

const isProgressAuditEnabled = () =>
    process.env.PROGRESS_AUDIT_LOG === 'true' || process.env.PROGRESS_UPSERT_AUDIT === 'true';

const normalizeAuditId = (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === 'string') return value;
    try {
        return value.toString();
    } catch (_) {
        return value;
    }
};

async function logProgressAudit(req, db, details = {}) {
    if (!isProgressAuditEnabled()) return;
    const userId = details.userId
        ?? req?.userId
        ?? req?.user?.id
        ?? req?.user?.userId
        ?? req?.user?.person_id
        ?? req?.headers?.['x-user-id'];

    const entry = {
        timestamp: new Date().toISOString(),
        action: details.action || 'progress-update',
        route: req?.originalUrl || req?.path || 'internal',
        method: req?.method,
        user_id: normalizeAuditId(userId),
        student_id: normalizeAuditId(details.student_id || details.studentId),
        week: details.week,
        before: details.before,
        after: details.after,
        meta: details.meta,
        ip: req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress,
        user_agent: req?.headers?.['user-agent']
    };

    console.warn('[ProgressAudit]', entry);

    if (process.env.PROGRESS_AUDIT_DB === 'true' && db) {
        try {
            await db.collection('tblProgressAudit').insertOne(entry);
        } catch (err) {
            console.warn('[ProgressAudit] Failed to persist audit log:', err.message);
        }
    }
}

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
    console.log(`[CodeReview] 🔄 Starting review for submission ${submissionId}, problem ${problemId}`);
    try {
        const problemDesc = problem?.problem_statement?.description
            || problem?.problem_statement
            || (typeof problem?.problem_statement === 'string' ? problem.problem_statement : '')
            || (problem?.title ? `Problem: ${problem.title}` : 'Coding problem');
        const problemContext = `${problem?.title || 'Problem'}\n\n${problemDesc}`;

        console.log(`[CodeReview] 📞 Calling AI service for ${language} code review...`);
        const aiReview = await aiService.reviewCode(solution, language, problemContext);
        console.log(`[CodeReview] ✅ AI review generated, length: ${aiReview?.length || 0} chars`);

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
        console.log(`[CodeReview] 💾 Saving review to database...`);
        const result = await reviewCollection.insertOne(reviewDoc);
        console.log(`[CodeReview] ✅ Review saved! ID: ${result.insertedId}`);
    } catch (err) {
        console.error(`[CodeReview] ❌ FAILED for submission ${submissionId}:`, err.message);
        console.error(`[CodeReview] Stack:`, err.stack);
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

        // Capstone: match is_capstone as true, 1, or 'true' for DB compatibility
        const problems = await collection.find({
            week: { $in: [week, String(week)] },
            is_capstone: { $in: [true, 1, 'true'] },
            deleted: { $ne: true },
            status: { $ne: 'archived' }
        }).sort({ question_id: 1 }).toArray();

        // Check for submissions (match student_id as string or ObjectId for production)
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

        // Enhance problems with status (support question_id or problem_id for submission lookup)
        const problemIdField = (p) => p.question_id ?? p.problem_id;
        const problemsWithStatus = await Promise.all(problems.map(async (problem) => {
            const pid = problemIdField(problem);
            const passedSubmission = pid ? await submissionsCollection.findOne({
                problem_id: pid,
                status: 'passed',
                $or: studentIdConditions
            }) : null;

            // DEBUG: Log submission check for specific problem
            // console.log(`[debug status] Check ${pid} for user ${studentIdString}:`, passedSubmission ? 'FOUND' : 'NOT FOUND');

            return {
                ...problem,
                status: passedSubmission ? 'passed' : 'pending'
            };
        }));

        // Logging reduced for production

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

        if (isNaN(day) || day < 0 || day > 5) {
            return res.status(400).json({
                success: false,
                message: 'Invalid day number. Must be between 0 and 5.'
            });
        }

        const db = getDB();
        const collection = db.collection(COLLECTION_NAME);

        // Match week/day as number or string (DB may store week: 1 or "1", day: 5 or "day-5")
        const dayValues = day === 0 ? [0, "0", "pre-week"] : [day, String(day), `day-${day}`];
        const problems = await collection.find({
            week: { $in: [week, String(week)] },
            day: { $in: dayValues },
            is_capstone: { $ne: true }, // daily: false or field missing
            deleted: { $ne: true },
            status: { $ne: 'archived' }
        }).sort({ question_id: 1 }).toArray();

        // Check for submissions (match student_id as string or ObjectId)
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

        const problemsWithStatus = await Promise.all(problems.map(async (problem) => {
            const passedSubmission = await submissionsCollection.findOne({
                problem_id: problem.question_id,
                status: 'passed',
                $or: studentIdConditions
            });
            return {
                ...problem,
                status: passedSubmission ? 'passed' : 'pending'
            };
        }));

        // console.log(`[getDailyCodingProblems] Week ${week}, Day ${day}: Found ${problems.length} daily problems`);

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
// Helper to execute code using JDoodle API (Replacing Piston)
async function executeWithJDoodle(language, code, stdin) {
    try {
        // Map language to correct JDoodle language and version
        const languageMap = {
            'python': { language: 'python3', versionIndex: '4' },  // Python 3.10
            'javascript': { language: 'nodejs', versionIndex: '4' }, // Node.js 18
            'c': { language: 'c', versionIndex: '5' },              // GCC 11.1.0
            'cpp': { language: 'cpp17', versionIndex: '1' },        // C++17
            'c++': { language: 'cpp17', versionIndex: '1' },        // Alias for c++
            'java': { language: 'java', versionIndex: '4' }         // JDK 17
        };

        const config = languageMap[language.toLowerCase()];
        if (!config) {
            console.error(`[JDoodle] Unsupported language: ${language}`);
            return { run: { code: 1, stderr: `Unsupported language: ${language}`, stdout: "" } };
        }

        const response = await axios.post('https://api.jdoodle.com/v1/execute', {
            clientId: process.env.JDOODLE_CLIENT_ID,
            clientSecret: process.env.JDOODLE_CLIENT_SECRET,
            script: code,
            language: config.language,
            versionIndex: config.versionIndex,
            stdin: stdin
        });

        const { output, statusCode, memory, cpuTime } = response.data;

        // Adapt JDoodle response to match Piston structure expected by doSubmit
        // Piston: { run: { stdout, stderr, code } }
        return {
            run: {
                stdout: output,
                stderr: statusCode !== 200 ? (output || "Execution Error") : "",
                code: statusCode === 200 ? 0 : 1
            },
            compile: { code: 0, stderr: "" } // Mock compile success as JDoodle handles it
        };
    } catch (error) {
        console.error("JDoodle API Error:", error.message);
        return { run: { code: 1, stderr: error.message || "Execution API failed", stdout: "" } };
    }
}

/* Legacy Piston Function Removed
// Helper to execute code using Piston API
async function executeWithPiston(language, code, stdin) {
    try {
        // Map language to correct Piston language and version (MUST match codeExecution.js)
        const languageMap = {
            'python': { language: 'python', version: '3.10.0' },
            'javascript': { language: 'javascript', version: '18.15.0' },
            'c': { language: 'c', version: '10.2.0' },
            'cpp': { language: 'c++', version: '10.2.0' },
            'c++': { language: 'c++', version: '10.2.0' },
            'java': { language: 'java', version: '15.0.2' }
        };

        const pistonConfig = languageMap[language.toLowerCase()] || { language: language, version: '*' };

        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: pistonConfig.language,
                version: pistonConfig.version,
                files: [{ content: code }],
                stdin: stdin,
                compile_timeout: 10000,
                run_timeout: 3000,
                memory_limit: 128 * 1024 * 1024
            })
        });
        const result = await response.json();
        console.log(`[Piston] Executed ${pistonConfig.language}@${pistonConfig.version}, exit code: ${result.run?.code}, stderr: ${result.run?.stderr?.substring(0, 50) || 'none'}`);
        return result;
    } catch (error) {
        console.error("Piston API Error:", error);
        return { run: { error: "Execution API failed" } };
    }
}
*/

// ... (keep validation logic) ...

/**
 * Process one submit job (called by queue worker). Sends response to client.
 */
async function doSubmit(req, res) {
    try {
        const { problemId, solution: solutionBody, code, language } = req.body;
        const solution = solutionBody || code; // Support both "solution" and "code" (capstone UI)
        const studentId = req.user.id;

        // Submission logging reduced

        if (!problemId || !solution) {
            res.status(400).json({
                success: false,
                message: 'Problem ID and solution/code are required'
            });
            return;
        }

        // Input Validation (Security Fix)
        if (solution.length > 50000) { // Max 50KB code
            res.status(400).json({
                success: false,
                message: 'Solution code is too large (max 50KB)'
            });
            return;
        }

        const allowedLanguages = ['cpp', 'c', 'javascript', 'python', 'java'];
        if (language && !allowedLanguages.includes(language.toLowerCase())) {
            res.status(400).json({
                success: false,
                message: 'Invalid language specified'
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

        // Run all test cases in parallel
        const executionPromises = testCases.map(async (testCase) => {
            const input = testCase.input || '';
            const expectedOutput = (testCase.expected_output || testCase.output || '').trim();

            // Sanitize input
            let sanitizedInput = input;
            if (typeof sanitizedInput === 'string' && sanitizedInput.includes('=')) {
                // ... same sanitization logic ...
                const assignments = sanitizedInput.split(',').map(s => s.trim());
                const values = [];
                for (const assignment of assignments) {
                    if (assignment.includes('=')) {
                        const parts = assignment.split('=');
                        const value = parts.slice(1).join('=').trim();
                        if (value) values.push(value);
                    } else {
                        if (values.length > 0) {
                            values[values.length - 1] += ', ' + assignment;
                        }
                    }
                }
                if (values.length > 0) {
                    sanitizedInput = values.join(' ');
                }
            }

            const executionResult = await executeWithJDoodle(pistonLang, solution, sanitizedInput);

            // Check for compilation error
            let actualOutput = '';
            let stderr = '';

            if (executionResult.compile && executionResult.compile.code !== 0) {
                stderr = executionResult.compile.stderr || executionResult.compile.stdout || 'Compilation error';
                actualOutput = `Compilation Error:\n${stderr}`;
            } else {
                actualOutput = (executionResult.run?.stdout || '').trim();
                stderr = executionResult.run?.stderr || '';

                if (executionResult.run?.code !== 0 && !stderr) {
                    stderr = executionResult.run?.output || `Runtime Error (Exit code: ${executionResult.run?.code})`;
                }

                if (!actualOutput && stderr) {
                    actualOutput = `Error:\n${stderr}`;
                }
            }

            const isCorrect = actualOutput === expectedOutput;

            return {
                input: testCase.input,
                expectedOutput: expectedOutput,
                actualOutput: actualOutput,
                passed: isCorrect,
                status: isCorrect ? 'Passed' : 'Failed'
            };
        });

        const results = await Promise.all(executionPromises);

        results.forEach(result => {
            if (result.passed) passedCases++;
            testResults.push(result);
        });


        // 3. Save submission
        // Debug logging removed for production

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

        console.log(`[Submission] ✅ Saved submission ${submissionId} with status: ${status}, score: ${submission.score}%`);

        // When all test cases pass, trigger AI code review (async, do not block response)
        if (status === 'passed') {
            console.log(`[Submission] 🎯 Triggering code review for passed submission...`);
            const personId = req.user?.id || req.user?.person_id || studentId;
            const departmentId = req.user?.department_id ?? null;
            const collegeId = req.user?.college_id ?? req.user?.collegeId ?? null;

            // Add small delay for Capstone to avoid rate limit (2 submissions at once)
            const isCapstone = problem?.is_capstone === true || problem?.is_capstone === 1;
            const delayMs = isCapstone ? Math.random() * 2000 : 0; // 0-2 second random delay for Capstone

            setTimeout(() => {
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
                }).catch((err) => {
                    console.error('[CodeReview] ❌ FAILED to trigger review for submission:', submissionId);
                    console.error('[CodeReview] Problem:', problemId, problem?.title);
                    console.error('[CodeReview] Error:', err.message);
                    console.error('[CodeReview] Stack:', err.stack);
                });
            }, delayMs);


            // Note: Capstone completion is tracked via student progress updates
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
    const userId = req.user?.id || req.user?.userId;

    // Rate Limiting (Submit Solution)
    if (userId) {
        const { checkRateLimit } = await import('../utils/rateLimiter.js');
        const limit = checkRateLimit(userId, 'submit');
        if (!limit.allowed) {
            return res.status(429).json({
                success: false,
                message: `Rate limit exceeded. Please wait ${limit.waitTime}s before submitting again.`,
                code: 'RATE_LIMIT_EXCEEDED'
            });
        }
    }
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

            // Sanitize input: strip variable names but preserve all values
            let sanitizedInput = input;
            if (typeof sanitizedInput === 'string' && sanitizedInput.includes('=')) {
                const assignments = sanitizedInput.split(',').map(s => s.trim());
                const values = [];

                for (const assignment of assignments) {
                    if (assignment.includes('=')) {
                        const parts = assignment.split('=');
                        const value = parts.slice(1).join('=').trim();
                        if (value) values.push(value);
                    } else {
                        if (values.length > 0) {
                            values[values.length - 1] += ', ' + assignment;
                        }
                    }
                }

                if (values.length > 0) {
                    sanitizedInput = values.join(' ');
                }
            }

            const executionResult = await executeWithJDoodle(pistonLang, solution, sanitizedInput);

            // Check for compilation error (Piston v2 puts it in 'compile' object)
            let actualOutput = '';
            let stderr = '';

            if (executionResult.compile && executionResult.compile.code !== 0) {
                // Compilation failed
                stderr = executionResult.compile.stderr || executionResult.compile.stdout || 'Compilation error';
                actualOutput = `Compilation Error:\n${stderr}`;
            } else {
                // Compilation success (or interpreted language), check run output
                actualOutput = (executionResult.run?.stdout || '').trim();
                stderr = executionResult.run?.stderr || '';

                // If run failed with error but no logic error
                if (executionResult.run?.code !== 0 && !stderr) {
                    stderr = executionResult.run?.output || `Runtime Error (Exit code: ${executionResult.run?.code})`;
                }

                // Fallback: If no stdout but we have stderr, show stderr as output (common for JS/Python runtime errors)
                if (!actualOutput && stderr) {
                    actualOutput = `Error:\n${stderr}`;
                }
            }

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
        // FIXED: Daily problems have is_daily: 1, not is_capstone: false. Query by is_daily with fallback.
        const problemsCollection = db.collection(COLLECTION_NAME);
        const dailyProblems = await problemsCollection.find({
            week: { $in: [week, String(week)] },
            day: { $in: ['day-1', 'day-2', 'day-3', 'day-4', 'day-5', 1, 2, 3, 4, 5] },
            deleted: { $ne: true },
            status: { $ne: 'archived' },
            $or: [
                { is_daily: 1 },  // Primary: explicitly marked as daily (production schema)
                { is_daily: true },  // Fallback: boolean true variant
                { $and: [{ is_capstone: { $ne: true } }, { is_daily: { $exists: false } }] }  // Legacy: old schema without is_daily field
            ]
        }).project({ question_id: 1, problem_id: 1, title: 1, day: 1, question_number: 1 }).toArray();

        const totalDailyProblems = dailyProblems.length;
        // Support both question_id and problem_id (production may use either)
        const dailyProblemIds = dailyProblems.map(p => p.question_id ?? p.problem_id).filter(Boolean);

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

        // Identify pending problems (use question_id ?? problem_id for id consistency)
        const problemId = (p) => p.question_id ?? p.problem_id;
        const pendingProblems = dailyProblems
            .filter(p => !completedProblemIds.has(problemId(p)))
            .map(p => ({
                question_id: problemId(p),
                title: p.title,
                day: p.day,
                question_number: p.question_number
            }));

        // Dynamic: require 6 problems per day to unlock capstone
        const dailyGoals = {}; // Group by day to check if each day met the goal of 6
        dailyProblems.forEach(p => {
            const dayKey = p.day;
            if (!dailyGoals[dayKey]) dailyGoals[dayKey] = { total: 0, completed: 0 };
            dailyGoals[dayKey].total++;
            if (completedProblemIds.has(problemId(p))) {
                dailyGoals[dayKey].completed++;
            }
        });

        const DAILY_GOAL = 6;
        let eligibleDays = 0;
        let totalDays = Object.keys(dailyGoals).length;
        let totalRequired = 0;

        Object.values(dailyGoals).forEach(dayGoal => {
            const requiredForDay = Math.min(DAILY_GOAL, dayGoal.total);
            totalRequired += requiredForDay;
            if (dayGoal.completed >= requiredForDay) {
                eligibleDays++;
            }
        });

        const requiredToUnlock = totalRequired;
        const isEligible = eligibleDays >= totalDays && totalDays > 0;

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

/**
 * Get all coding submissions for a student (dashboard/analytics)
 * GET /coding-problems/submissions/all
 */
export async function getAllStudentSubmissions(req, res) {
    try {
        const studentId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers?.['x-user-id'];

        if (!studentId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const db = getDB();
        const submissionsCollection = db.collection('tblCodingSubmissions');

        // Match student_id as string or ObjectId
        const studentIdString = String(studentId);
        let studentIdObj = null;
        try { studentIdObj = new ObjectId(studentIdString); } catch (_) { /* not ObjectId */ }

        const studentIdConditions = [
            { student_id: studentIdString },
            { student_id: studentIdString.trim() }
        ];
        if (studentIdObj) studentIdConditions.push({ student_id: studentIdObj });

        // Get only passed submissions
        const submissions = await submissionsCollection.find({
            $or: studentIdConditions,
            status: 'passed'
        }).sort({ submitted_at: -1 }).toArray();

        // Enrich with problem details (day, week, type)
        // We need to fetch problem details to know if it's Daily or Capstone
        const problemIds = [...new Set(submissions.map(s => s.problem_id))];
        const problemsCollection = db.collection(COLLECTION_NAME);

        const problems = await problemsCollection.find({
            question_id: { $in: problemIds }
        }).project({ question_id: 1, title: 1, week: 1, day: 1, is_capstone: 1 }).toArray();

        const problemMap = new Map();
        problems.forEach(p => problemMap.set(p.question_id, p));

        const enrichedSubmissions = submissions.map(sub => {
            const problem = problemMap.get(sub.problem_id);
            // Determine category: Capstone or Daily
            const isCapstone = problem?.is_capstone === true || problem?.is_capstone === 'true' || problem?.is_capstone === 1;

            return {
                ...sub,
                problem_title: problem?.title || 'Unknown Problem',
                week: problem?.week,
                day: problem?.day,
                is_capstone: isCapstone,
                category: isCapstone ? 'DSA Capstone' : 'DSA Daily',
                score: 100 // Always 100 for passed coding problems
            };
        });

        res.status(200).json({
            success: true,
            count: enrichedSubmissions.length,
            submissions: enrichedSubmissions
        });

    } catch (error) {
        console.error('Error fetching all student submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching submissions',
            error: error.message
        });
    }
}

/**
 * Get tiered daily problems (Easy / Medium / Hard) for a given week+day.
 * Returns 12 problems grouped by difficulty with student completion status.
 * POST /questions/coding-tiered
 * Body: { week: number, day: string }
 */
export async function getDailyTieredProblems(req, res) {
    try {
        const { week, day } = req.body;
        const studentId = req.user?.id;

        if (!week || !day) {
            return res.status(400).json({ success: false, message: 'week and day are required' });
        }

        const weekNum = parseInt(week, 10);
        const db = getDB();
        const col = db.collection(COLLECTION_NAME);

        // Fetch all tiered problems for this week+day
        const dayValues = [day, String(day)];
        const problems = await col.find({
            week: { $in: [weekNum, String(weekNum)] },
            day: { $in: dayValues },
            is_daily_tiered: true,
            deleted: { $ne: true },
            status: { $ne: 'archived' }
        }).sort({ difficulty: 1, question_number: 1 }).toArray();

        if (problems.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No tiered problems generated yet for this day. Run the generation script.',
                data: { easy: [], medium: [], hard: [], total: 0, daily_goal: 6, solved_today: 0 }
            });
        }

        // Get student's passed submissions for these problem IDs
        const problemIds = problems.map(p => p.question_id);
        const submissionsCol = db.collection('tblCodingSubmissions');
        const studentIdStr = String(studentId);
        let studentIdObj = null;
        try { studentIdObj = new ObjectId(studentIdStr); } catch (_) {}

        const idConditions = [{ student_id: studentIdStr }];
        if (studentIdObj) idConditions.push({ student_id: studentIdObj });

        const passedSubs = await submissionsCol.find({
            $or: idConditions,
            problem_id: { $in: problemIds },
            status: 'passed'
        }).project({ problem_id: 1 }).toArray();

        const passedSet = new Set(passedSubs.map(s => s.problem_id));

        // Attach status to each problem
        const enriched = problems.map(p => ({
            problem_id: p.question_id,
            title: p.title,
            difficulty: p.difficulty,      // 'EASY' | 'MEDIUM' | 'HARD'
            topic: p.topic,
            problem_statement: p.problem_statement,
            input_format: p.input_format,
            output_format: p.output_format,
            constraints: p.constraints,
            test_cases: p.test_cases,
            hints: p.hints,
            concepts_tested: p.concepts_tested,
            estimated_time_minutes: p.estimated_time_minutes,
            expected_complexity: p.expected_complexity,
            function_signature: p.function_signature,
            status: passedSet.has(p.question_id) ? 'passed' : 'pending'
        }));

        // Group by difficulty
        const easy   = enriched.filter(p => p.difficulty === 'EASY');
        const medium = enriched.filter(p => p.difficulty === 'MEDIUM');
        const hard   = enriched.filter(p => p.difficulty === 'HARD');

        const solvedToday = enriched.filter(p => p.status === 'passed').length;
        const DAILY_GOAL  = 6;

        return res.status(200).json({
            success: true,
            data: {
                week: weekNum,
                day,
                easy,
                medium,
                hard,
                total: enriched.length,
                daily_goal: DAILY_GOAL,
                solved_today: solvedToday,
                goal_achieved: solvedToday >= DAILY_GOAL
            }
        });

    } catch (err) {
        console.error('[getDailyTieredProblems]', err);
        res.status(500).json({ success: false, message: 'Failed to fetch tiered problems', error: err.message });
    }
}

/**
 * Get student's daily tiered coding progress summary (for dashboard / roadmap).
 * POST /questions/coding-tiered-progress
 * Body: { week: number, day: string }
 */
export async function getDailyTieredProgress(req, res) {
    try {
        const { week, day } = req.body;
        const studentId = req.user?.id;

        if (!week || !day) {
            return res.status(400).json({ success: false, message: 'week and day are required' });
        }

        const weekNum = parseInt(week, 10);
        const db = getDB();
        const col = db.collection(COLLECTION_NAME);

        const dayValues = [day, String(day)];
        const problemIds = (await col.find({
            week: { $in: [weekNum, String(weekNum)] },
            day: { $in: dayValues },
            is_daily_tiered: true,
            deleted: { $ne: true }
        }).project({ question_id: 1, difficulty: 1 }).toArray()).map(p => ({ id: p.question_id, difficulty: p.difficulty }));

        if (problemIds.length === 0) {
            return res.status(200).json({ success: true, data: { solved: 0, total: 0, daily_goal: 6, goal_achieved: false } });
        }

        const submissionsCol = db.collection('tblCodingSubmissions');
        const studentIdStr   = String(studentId);
        let studentIdObj = null;
        try { studentIdObj = new ObjectId(studentIdStr); } catch (_) {}

        const idConditions = [{ student_id: studentIdStr }];
        if (studentIdObj) idConditions.push({ student_id: studentIdObj });

        const passedCount = await submissionsCol.countDocuments({
            $or: idConditions,
            problem_id: { $in: problemIds.map(p => p.id) },
            status: 'passed'
        });

        const DAILY_GOAL = 6;
        return res.status(200).json({
            success: true,
            data: {
                week: weekNum,
                day,
                solved: passedCount,
                total: problemIds.length,
                daily_goal: DAILY_GOAL,
                goal_achieved: passedCount >= DAILY_GOAL
            }
        });

    } catch (err) {
        console.error('[getDailyTieredProgress]', err);
        res.status(500).json({ success: false, message: 'Failed to fetch tiered progress', error: err.message });
    }
}

