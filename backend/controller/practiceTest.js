import { executeData, fetchData, getDB } from '../methods.js';
import practiceTestSchema from '../schema/practiceTest.js';
import { ObjectId } from 'mongodb';
import aiService from '../services/aiService.js';
import { getCollegeAndDepartmentForStudent, getTenantFromUser, buildPersonMasterFilter, buildStudentIdFilter } from '../utils/tenantKeys.js';
import testAnalysisSchema from '../schema/testAnalysis.js';
import studentProgressController from './studentProgress.js';

// studentProgress.js default-exports a CLASS, and checkAndMarkWeekCompletion is
// an instance method — calling it on the class threw
// "studentProgressController.checkAndMarkWeekCompletion is not a function",
// silently swallowed by the catch below. Effect: passing a weekly test never
// auto-completed the week. router.js instantiates it the same way.
const studentProgressInstance = new studentProgressController();

/**
 * The most questions a student is ever served for one aptitude set.
 *
 * Mirrors `getAptitudePractice`, which does `slice(0, Math.min(50, sorted.length))`.
 * Grading must divide by what was ASKED, not by everything in the bank — several
 * sets hold more than 50 (week 3 day 4 has 53; weekly papers 51-53), and dividing
 * by the bank size silently caps a perfect paper below 100%.
 */
const SERVED_QUESTION_LIMIT = parseInt(process.env.SERVED_QUESTION_LIMIT, 10) || 50;

/** Remove markdown asterisks from AI text */
function stripAsterisks(s) {
    if (typeof s !== 'string') return s || '';
    return s.replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1').replace(/\*+/g, '').replace(/\*/g, '');
}

/**
 * Re-grade a submitted attempt on the server, against the answers in tblQuestion.
 *
 * Why this exists: the browser used to compute the score and POST it, and it was
 * stored verbatim — so any score could be submitted, and week completion (and
 * therefore certification) keyed off that number. Nothing about a score was
 * verifiable. This recomputes it from the student's actual selections.
 *
 * The denominator is taken from the question bank (how many questions that
 * week/day actually has), not from the client's list — otherwise a client could
 * submit only the questions it got right and still report 100%.
 *
 * Returns null when it cannot grade (no recognisable question ids), so the
 * caller can fall back rather than record a bogus 0.
 */
async function gradeAttempt({ questionsAttempted, week, day }) {
    const attempted = Array.isArray(questionsAttempted) ? questionsAttempted : [];
    const ids = [...new Set(attempted.map(a => a?.question_id).filter(Boolean))];
    if (!ids.length) return null;

    // question_id is NOT unique across tblQuestion: `Q101`..`Q150` exist both as
    // week 1 day 3 aptitude MCQs and as week 4 coding problems. Looking them up by
    // id alone and keying a Map by that id silently keeps whichever document came
    // back last — the coding problem, whose correct_answer is the literal string
    // "Refer to Test Cases" and which has no options — so every answer compared
    // against it was marked wrong and the student scored 0. Scope the lookup to
    // the week/day being graded, exactly as the denominator query does.
    const dayNumForLookup = Number(String(day).replace(/^day-/i, ''));
    const scoped = day === 'weekly-test'
        ? { question_id: { $in: ids }, week: Number(week), tags: 'weekly-aptitude-test' }
        : Number.isFinite(dayNumForLookup)
            ? { question_id: { $in: ids }, week: Number(week), day: dayNumForLookup, category: 'aptitude' }
            : { question_id: { $in: ids } };

    let qRes = await fetchData(
        'tblQuestion',
        { question_id: 1, correct_answer: 1, options: 1, explanation: 1 },
        scoped
    );
    // If the scoped query finds nothing (older records, or a week/day mismatch),
    // fall back to the broad lookup rather than grading everyone zero.
    if (!qRes?.data?.length && scoped.week !== undefined) {
        qRes = await fetchData(
            'tblQuestion',
            { question_id: 1, correct_answer: 1, options: 1, explanation: 1 },
            { question_id: { $in: ids } }
        );
    }

    // Belt and braces: if an id still appears twice, keep the one that actually
    // looks like an MCQ rather than letting document order decide.
    const byId = new Map();
    for (const q of (qRes.data || [])) {
        const existing = byId.get(q.question_id);
        const isMcq = Array.isArray(q.options) && q.options.length > 0;
        if (!existing || (isMcq && !(Array.isArray(existing.options) && existing.options.length > 0))) {
            byId.set(q.question_id, q);
        }
    }
    if (!byId.size) return null; // ids didn't match the bank — don't fabricate a score

    let correct = 0;
    const regraded = attempted.map(a => {
        const q = byId.get(a?.question_id);
        if (!q) return { ...a, graded: false };

        const correctKey = q.correct_answer;
        const correctText = (q.options || []).find(o => o.key === correctKey)?.text;
        // Clients send the option text; newer ones may send the key. Accept either,
        // but compare against the bank — never against anything the client asserted.
        const selected = a?.selected_option_key ?? a?.selected_answer;
        const isCorrect = selected != null && selected !== '' &&
            (String(selected) === String(correctKey) ||
                (correctText != null && String(selected) === String(correctText)));
        if (isCorrect) correct++;
        return {
            ...a,
            is_correct: isCorrect,
            correct_answer: correctKey,
            correct_answer_text: correctText ?? '',
            explanation: q.explanation || '',
            graded: true,
        };
    });

    // Authoritative denominator: the real size of that week/day's question set.
    //
    // The student pages post `day` as the STRING 'day-3', not the number 3, so
    // Number(day) is NaN and { day: NaN } matches no document. That silently
    // dropped the denominator back to the client's own list length — the exact
    // hole this is meant to close. Parse the numeric part instead, and only
    // query when we actually have a day number.
    let total = 0;
    try {
        const db = getDB();
        const dayNum = Number(String(day).replace(/^day-/i, ''));
        const bankFilter = day === 'weekly-test'
            ? { week: Number(week), tags: 'weekly-aptitude-test', status: 'active', deleted: { $ne: true } }
            : Number.isFinite(dayNum)
                ? { week: Number(week), day: dayNum, category: 'aptitude', status: 'active', deleted: { $ne: true } }
                : null;
        if (bankFilter) total = await db.collection('tblQuestion').countDocuments(bankFilter);
    } catch (_) { /* fall through to the attempted count */ }

    // The bank is not the paper. `getAptitudePractice` serves at most
    // SERVED_QUESTION_LIMIT questions (`slice(0, Math.min(50, …))`), and several
    // sets hold more than that — week 3 day 4 has 53, and the weekly papers for
    // weeks 1 and 3-6 hold 51-53. Dividing by the bank size would mark a student
    // who answered all 50 served questions correctly as 50/53 = 94%, and could
    // push someone just over the 75% weekly-test threshold to just under it.
    // Cap the denominator at what a student can actually be asked.
    if (total > SERVED_QUESTION_LIMIT) total = SERVED_QUESTION_LIMIT;

    if (!total) total = attempted.length;
    // Never let the denominator shrink below what was actually answered.
    if (attempted.length > total) total = attempted.length;

    return {
        score: total > 0 ? Math.round((correct / total) * 100) : 0,
        correct,
        incorrect: Math.max(0, total - correct),
        total,
        questions: regraded,
    };
}

export default class practiceTestController {

    /**
     * Save detailed practice test data
     * Route: POST /practice-test/save
     * Stores complete test data including all questions and answers
     */
    async savePracticeTest(req, res, next) {
        try {
            const { week, day, score, totalQuestions, correctAnswers, incorrectAnswers, timeSpent, questionsAttempted, category } = req.body;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            if (!userId || !week || !day || score === undefined) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Student ID, week, day, and score are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            const weekNum = parseInt(week, 10);
            const weekFilter = Number.isNaN(weekNum) ? week : { $in: [weekNum, String(weekNum)] };
            const weekStored = Number.isNaN(weekNum) ? week : weekNum;

            // ── Authoritative server-side grading ──────────────────────────────
            // The score used to be computed in the browser and stored verbatim, so
            // any value could be POSTed — and week completion (>=75% weekly test),
            // which gates certification, keyed off it. We now re-grade from the
            // student's actual selections against the answers in tblQuestion and
            // store OUR number, ignoring whatever the client claimed.
            const graded = await gradeAttempt({ questionsAttempted, week: weekStored, day });

            // Check if a document already exists for this student, week, and day
            const existingTest = await fetchData(
                'tblPracticeTest',
                {},
                {
                    student_id: userId,
                    week: weekFilter,
                    day: day
                },
                {
                    sort: { attempt: -1 },
                    limit: 1
                }
            );

            let attemptNumber = 1;
            let isUpdate = false;
            let existingDocumentId = null;

            if (existingTest.data && existingTest.data.length > 0) {
                // Document exists, update it instead of creating a new one
                isUpdate = true;
                existingDocumentId = existingTest.data[0]._id;
                attemptNumber = (existingTest.data[0].attempt || 0) + 1;
            }

            // CRITICAL: Convert userId to string for consistent storage (schema may require String)
            const studentIdString = userId.toString();

            // Prepare test data with all schema fields
            const testData = {
                student_id: studentIdString, // ALWAYS string format
                week: weekStored,
                day: day,
                category: category || 'Aptitude', // Default to Aptitude if not provided
                attempt: attemptNumber,
                // Server-graded values win. The client's numbers are only used when
                // grading was not possible (unrecognised question ids), and that case
                // is recorded via graded_by so reports can tell them apart.
                score: graded ? graded.score : score,
                total_questions: graded ? graded.total : (totalQuestions || questionsAttempted?.length || 0),
                correct_answers: graded ? graded.correct : (correctAnswers || 0),
                incorrect_answers: graded ? graded.incorrect : (incorrectAnswers || 0),
                graded_by: graded ? 'server' : 'client',
                client_reported_score: score,
                time_spent: timeSpent || 0, // in minutes
                questions_attempted: graded ? graded.questions : (questionsAttempted || []),
                started_at: new Date(),
                completed_at: new Date(),
                status: 'completed',
                updated_at: new Date().toISOString()
            };

            // If updating, preserve created_at from existing document
            if (isUpdate && existingTest.data[0].created_at) {
                testData.created_at = existingTest.data[0].created_at;
            } else {
                testData.created_at = new Date();
            }
            const tenant = await getCollegeAndDepartmentForStudent(userId, req, fetchData);
            if (tenant.college_id) testData.college_id = tenant.college_id;
            if (tenant.department_id) testData.department_id = tenant.department_id;

            let response;
            if (isUpdate) {
                // Update existing document - convert _id to ObjectId if it's a string
                let filterId = existingDocumentId;
                if (typeof existingDocumentId === 'string' && /^[0-9a-fA-F]{24}$/.test(existingDocumentId)) {
                    filterId = new ObjectId(existingDocumentId);
                }

                response = await executeData(
                    'tblPracticeTest',
                    testData,
                    'u',
                    practiceTestSchema,
                    { _id: filterId }
                );
            } else {
                // Insert new practice test record
                response = await executeData(
                    'tblPracticeTest',
                    testData,
                    'i',
                    practiceTestSchema
                );
            }

            if (response.success) {
                const testId = (isUpdate ? existingDocumentId : (response.data?.insertedId || response.data?._id))?.toString?.();

                // Check if this is a passing weekly aptitude test and if it completes the week.
                // Gate strictly on the STORED (server-graded) score — the previous
                // `|| score >= 75` fallback let the client's own claimed score unlock
                // week completion, and therefore certification.
                if (day === 'weekly-test' && testData.score >= 75) {
                    try {
                        console.log(`[PracticeTest] Weekly test passed for Week ${week}. Checking week completion...`);
                        await studentProgressInstance.checkAndMarkWeekCompletion(userId, week, req);
                    } catch (err) {
                        console.error('[PracticeTest] Error auto-completing week:', err);
                    }
                }

                // Generate AI analysis
                let analysis = null;
                try {
                    // Fetch previous practice tests for trend analysis
                    const previousTests = await fetchData(
                        'tblPracticeTest',
                        { score: 1, completed_at: 1 },
                        {
                            student_id: userId.toString(),
                            week: weekFilter,
                            day: day,
                            _id: { $ne: testId }
                        },
                        { sort: { completed_at: -1 }, limit: 5 }
                    );

                    // Generate AI analysis
                    const aiAnalysis = await aiService.analyzeTestPerformance(
                        {
                            score: testData.score,
                            questions_attempted: testData.questions_attempted || [],
                            week: testData.week,
                            day: testData.day,
                            time_spent: testData.time_spent
                        },
                        previousTests.data || [],
                        'practice'
                    );

                    // Save analysis
                    const analysisDoc = {
                        student_id: userId.toString(),
                        test_type: 'practice',
                        week: week,
                        day: day,
                        test_id: testId,
                        score: testData.score,
                        learning_patterns: aiAnalysis.learning_patterns || [],
                        strengths: aiAnalysis.strengths || [],
                        weak_areas: aiAnalysis.weak_areas || [],
                        guidance: stripAsterisks(aiAnalysis.guidance || ''),
                        recommendations: (aiAnalysis.recommendations || []).map(r => stripAsterisks(r)),
                        topics_to_revisit: aiAnalysis.topics_to_revisit || [],
                        performance_trend: aiAnalysis.performance_trend || 'new',
                        comparison: aiAnalysis.comparison || null,
                    };
                    if (tenant.college_id) analysisDoc.college_id = tenant.college_id;
                    if (tenant.department_id) analysisDoc.department_id = tenant.department_id;

                    const analysisResult = await executeData('tblTestAnalysis', analysisDoc, 'i', testAnalysisSchema);
                    analysis = {
                        ...analysisDoc,
                        _id: analysisResult?.data?.insertedId?.toString?.() || analysisResult?.data?._id?.toString?.()
                    };
                } catch (analysisError) {
                    console.error('AI analysis generation error:', analysisError);
                    // Continue without analysis - don't fail the test save
                }

                // Emit real-time update via Socket.io
                const io = req.app.get('io');
                if (io) {
                    io.to(`user:${userId}`).emit('progress-updated', {
                        week,
                        day,
                        action: 'practice-test-completed',
                        progressData: testData,
                        timestamp: new Date()
                    });
                }

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: isUpdate
                        ? 'Practice test data updated successfully'
                        : 'Practice test data saved successfully',
                    data: {
                        ...testData,
                        _id: testId,
                        analysis: analysis // Include AI analysis in response
                    }
                };
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: isUpdate
                        ? 'Failed to update practice test data'
                        : 'Failed to save practice test data',
                    error: 'Database error'
                };
            }
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to save practice test',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get practice test history for a student
     * Route: POST /practice-test/list
     * Returns all practice test attempts for a student
     */
    async listPracticeTests(req, res, next) {
        try {
            // If auth middleware already determined the request is unauthorized,
            // don't continue into controller logic (prevents crashes / data leaks).
            if (!req.user && res.locals?.responseData?.status === 401) {
                return next();
            }

            const { projection, filter, options } = req.body;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const userRole = req.user?.role || req.headers['x-user-role'];


            // Safety: auth is required for this route. If we still don't have a userId, return 401.
            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Authentication required',
                    error: 'No user id found'
                };
                return next();
            }

            // Build filter - merge with request filter
            let finalFilter = { ...(filter || {}) };

            // Tenant scoping by role (SECURITY: without this, TPC/DeptTPC would see
            // every college's practice tests — cross-college data leak).
            const normalizedRole = (userRole || '').toString().toLowerCase();

            // If student, only show their own tests (unless already specified in filter)
            if (normalizedRole === 'student' && userId) {
                // Convert userId to string for consistent matching
                const studentIdString = userId.toString();

                // Handle both ObjectId and string formats in database
                const { ObjectId } = await import('mongodb');
                const isObjectId = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId);

                // Only add student_id if not already in filter
                if (!finalFilter.student_id && !finalFilter.$or) {
                    finalFilter.$or = [
                        { student_id: studentIdString },
                        { student_id: isObjectId ? new ObjectId(userId) : userId }
                    ];
                } else if (!finalFilter.student_id) {
                    finalFilter.student_id = studentIdString;
                }
            } else if (normalizedRole === 'tpc' || normalizedRole === 'depttpc') {
                // TPC: all students in their college. DeptTPC: their department only.
                // Scope via PersonMaster student IDs (per tenantKeys.js pattern) so legacy
                // practice-test records without college_id/department_id are still scoped
                // correctly by who the student is.
                const { collegeId, departmentId, departmentName } = getTenantFromUser(req.user);

                if (!collegeId) {
                    // No college on the token → return nothing rather than everything
                    res.locals.responseData = {
                        success: true,
                        status: 200,
                        message: 'Practice tests fetched successfully',
                        data: []
                    };
                    return next();
                }

                const personFilter = buildPersonMasterFilter(collegeId, {
                    ...(normalizedRole === 'depttpc' ? { departmentId, departmentName } : {}),
                    role: 'student',
                    includeInactive: true, // include inactive students' history in monitoring
                });
                const studentsRes = await fetchData('tblPersonMaster', { _id: 1 }, personFilter);
                const allowedIds = (studentsRes.data || []).map(s => s._id);

                if (allowedIds.length === 0) {
                    res.locals.responseData = {
                        success: true,
                        status: 200,
                        message: 'Practice tests fetched successfully',
                        data: []
                    };
                    return next();
                }

                const { filter: studentIdFilter } = buildStudentIdFilter(allowedIds);
                // AND the tenant scope with any client filter so it can only narrow, never widen
                finalFilter = Object.keys(finalFilter).length > 0
                    ? { $and: [finalFilter, studentIdFilter] }
                    : studentIdFilter;
            }
            // Admin and Superadmin can view all or filter by student_id


            // Don't pass req to avoid role-based filtering that might interfere with our manual filter
            // We're handling the student filter manually above
            const fetchOptions = {
                ...(options || {})
            };

            const response = await fetchData(
                'tblPracticeTest',
                projection || {},
                finalFilter,
                fetchOptions
            );


            // Enrich practice test data with student information
            if (response.success && response.data && response.data.length > 0) {
                // Enrich practice test data with student information using optimized batch lookup
                const studentIds = response.data.map(t => t.student_id).filter(id => id);
                const uniqueIds = [...new Set(studentIds)];

                // Prepare IDs for lookup - handle both String and ObjectId formats
                const { ObjectId } = await import('mongodb');
                const objectIds = uniqueIds
                    .filter(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id))
                    .map(id => new ObjectId(id));

                // Fetch all potential student matches in one query
                const studentRes = await fetchData(
                    'tblPersonMaster',
                    { person_name: 1, person_email: 1, person_rollno: 1, person_id: 1 },
                    {
                        $or: [
                            { _id: { $in: objectIds } },             // Match by ObjectId
                            { _id: { $in: uniqueIds } },            // Match by String _id
                            { person_id: { $in: uniqueIds } }       // Match by person_id
                        ]
                    }
                );

                // Create a lookup map for fast access
                const studentMap = new Map();
                if (studentRes.success && studentRes.data) {
                    studentRes.data.forEach(s => {
                        // Map by _id (String)
                        studentMap.set(s._id.toString(), s);
                        // Map by person_id (String)
                        if (s.person_id) studentMap.set(s.person_id.toString(), s);
                    });
                }

                const enrichedData = response.data.map(test => {
                    // Try to find student in map
                    let student = null;
                    if (test.student_id) {
                        student = studentMap.get(test.student_id.toString());
                    }

                    if (!student) {
                        console.log('[PracticeTest] Student still not found for ID:', test.student_id);
                    }

                    return {
                        ...test,
                        student_name: student?.person_name || 'Unknown',
                        student_email: student?.person_email || '',
                        student_rollno: student?.person_rollno || ''
                    };
                });

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Practice tests fetched successfully',
                    data: enrichedData
                };
            } else {
                res.locals.responseData = {
                    success: response.success !== false,
                    status: response.success !== false ? 200 : 500,
                    message: response.message || 'Practice tests fetched',
                    data: response.data || []
                };
            }
            next();
        } catch (error) {
            console.error('[PracticeTest] Error in listPracticeTests:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Fetch failed',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get practice test details by ID
     * Route: POST /practice-test/get
     * Returns detailed test data including all questions and answers
     */
    async getPracticeTest(req, res, next) {
        try {
            const { testId } = req.body;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const userRole = req.user?.role || req.headers['x-user-role'];

            if (!testId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Test ID is required',
                    error: 'Missing test ID'
                };
                return next();
            }

            const response = await fetchData(
                'tblPracticeTest',
                {},
                { _id: testId },
                {}
            );

            if (response.data && response.data.length > 0) {
                const test = response.data[0];

                // Security: Students can only view their own tests
                if (userRole === 'Student' && test.student_id !== userId) {
                    res.locals.responseData = {
                        success: false,
                        status: 403,
                        message: 'Access denied',
                        error: 'You can only view your own practice tests'
                    };
                    return next();
                }

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Practice test data fetched successfully',
                    data: test
                };
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Practice test not found',
                    error: 'Test ID does not exist'
                };
            }
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Fetch failed',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get practice test statistics for a student
     * Route: POST /practice-test/stats
     * Returns aggregated statistics for practice tests
     */
    async getPracticeTestStats(req, res, next) {
        try {
            const { week, day } = req.body;
            const userId = req.user?.id || req.headers['x-user-id'];

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Student ID is required',
                    error: 'Missing student ID'
                };
                return next();
            }

            let filter = { student_id: userId };
            if (week) filter.week = week;
            if (day) filter.day = day;

            const response = await fetchData(
                'tblPracticeTest',
                {},
                filter,
                { sort: { created_at: -1 } }
            );

            if (response.data && response.data.length > 0) {
                const tests = response.data;
                const totalTests = tests.length;
                const totalQuestions = tests.reduce((sum, test) => sum + (test.total_questions || 0), 0);
                const totalCorrect = tests.reduce((sum, test) => sum + (test.correct_answers || 0), 0);
                const totalIncorrect = tests.reduce((sum, test) => sum + (test.incorrect_answers || 0), 0);
                const averageScore = tests.reduce((sum, test) => sum + (test.score || 0), 0) / totalTests;
                const totalTimeSpent = tests.reduce((sum, test) => sum + (test.time_spent || 0), 0);

                // Group by day
                const byDay = {};
                tests.forEach(test => {
                    if (!byDay[test.day]) {
                        byDay[test.day] = {
                            day: test.day,
                            attempts: 0,
                            bestScore: 0,
                            latestScore: 0,
                            totalTime: 0
                        };
                    }
                    byDay[test.day].attempts++;
                    byDay[test.day].bestScore = Math.max(byDay[test.day].bestScore, test.score);
                    byDay[test.day].latestScore = test.score; // Latest is first in sorted list
                    byDay[test.day].totalTime += test.time_spent || 0;
                });

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Practice test statistics fetched successfully',
                    data: {
                        totalTests,
                        totalQuestions,
                        totalCorrect,
                        totalIncorrect,
                        averageScore: Math.round(averageScore * 100) / 100,
                        totalTimeSpent,
                        byDay: Object.values(byDay),
                        recentTests: tests.slice(0, 10) // Last 10 tests
                    }
                };
            } else {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'No practice tests found',
                    data: {
                        totalTests: 0,
                        totalQuestions: 0,
                        totalCorrect: 0,
                        totalIncorrect: 0,
                        averageScore: 0,
                        totalTimeSpent: 0,
                        byDay: [],
                        recentTests: []
                    }
                };
            }
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch statistics',
                error: error.message
            };
            next();
        }
    }
}
