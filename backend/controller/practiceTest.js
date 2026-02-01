import { executeData, fetchData, getDB } from '../methods.js';
import practiceTestSchema from '../schema/practiceTest.js';
import { ObjectId } from 'mongodb';
import aiService from '../services/aiService.js';
import testAnalysisSchema from '../schema/testAnalysis.js';

/** Remove markdown asterisks from AI text */
function stripAsterisks(s) {
    if (typeof s !== 'string') return s || '';
    return s.replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1').replace(/\*+/g, '').replace(/\*/g, '');
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

            // Check if a document already exists for this student, week, and day
            const existingTest = await fetchData(
                'tblPracticeTest',
                {},
                {
                    student_id: userId,
                    week: week,
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
                week: week,
                day: day,
                category: category || 'Aptitude', // Default to Aptitude if not provided
                attempt: attemptNumber,
                score: score,
                total_questions: totalQuestions || questionsAttempted?.length || 0,
                correct_answers: correctAnswers || 0,
                incorrect_answers: incorrectAnswers || 0,
                time_spent: timeSpent || 0, // in minutes
                questions_attempted: questionsAttempted || [],
                started_at: new Date(),
                completed_at: new Date(),
                status: 'completed',
                updated_at: new Date()
            };

            // If updating, preserve created_at from existing document
            if (isUpdate && existingTest.data[0].created_at) {
                testData.created_at = existingTest.data[0].created_at;
            } else {
                testData.created_at = new Date();
            }

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

                // Generate AI analysis
                let analysis = null;
                try {
                    // Fetch previous practice tests for trend analysis
                    const previousTests = await fetchData(
                        'tblPracticeTest',
                        { score: 1, completed_at: 1 },
                        {
                            student_id: userId.toString(),
                            week: week,
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

            console.log('[PracticeTest] listPracticeTests - userId:', userId, 'role:', userRole, {
                userIdSource: {
                    reqUserId: req.userId,
                    reqUser_id: req.user?.id,
                    reqUser_userId: req.user?.userId,
                    reqUser_person_id: req.user?.person_id,
                    header: req.headers['x-user-id']
                }
            });
            console.log('[PracticeTest] Request filter:', filter);

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

            // If student, only show their own tests (unless already specified in filter)
            // Check both 'Student' and 'student' for role
            if ((userRole === 'Student' || userRole === 'student') && userId) {
                // Convert userId to string for consistent matching
                const studentIdString = userId.toString();

                // Handle both ObjectId and string formats in database
                const { ObjectId } = await import('mongodb');
                const isObjectId = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId);

                // Only add student_id if not already in filter
                if (!finalFilter.student_id && !finalFilter.$or) {
                    // Try to match student_id as both string and ObjectId
                    finalFilter.$or = [
                        { student_id: studentIdString },
                        { student_id: isObjectId ? new ObjectId(userId) : userId }
                    ];
                    console.log('[PracticeTest] Added student_id filter with $or:', { studentIdString, isObjectId });
                } else if (!finalFilter.student_id) {
                    // If $or already exists, just add student_id as string (simpler)
                    finalFilter.student_id = studentIdString;
                    console.log('[PracticeTest] Added student_id filter (string):', studentIdString);
                } else {
                    console.log('[PracticeTest] student_id already in filter:', finalFilter.student_id);
                }
            }
            // Admin and Superadmin can view all or filter by student_id

            console.log('[PracticeTest] Final filter before fetchData:', JSON.stringify(finalFilter, null, 2));

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

            console.log('[PracticeTest] Response data count:', response.data?.length || 0);
            if (response.data && response.data.length > 0) {
                console.log('[PracticeTest] First record student_id:', response.data[0].student_id);
                console.log('[PracticeTest] Requested userId:', userId);
                console.log('[PracticeTest] Student ID match check:', {
                    requestedUserId: userId,
                    firstRecordStudentId: response.data[0].student_id,
                    match: response.data[0].student_id === userId || response.data[0].student_id === String(userId)
                });
                console.log('[PracticeTest] First record:', JSON.stringify(response.data[0], null, 2));
            } else {
                console.log('[PracticeTest] No data returned for userId:', userId);
                // Debug: Try a direct query to see what's in the database
                try {
                    const db = getDB();
                    if (db) {
                        const collection = db.collection('tblPracticeTest');
                        // Try query with just student_id as string
                        const simpleFilter = { student_id: String(userId) };
                        const directQuery = await collection.find(simpleFilter).limit(5).toArray();
                        console.log('[PracticeTest] Direct DB query (simple filter) result count:', directQuery.length);
                        if (directQuery.length > 0) {
                            console.log('[PracticeTest] Direct DB query first record student_id:', directQuery[0].student_id);
                            console.log('[PracticeTest] Direct DB query first record student_id type:', typeof directQuery[0].student_id);
                        } else {
                            // Try with ObjectId
                            if (typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)) {
                                const objectIdFilter = { student_id: new ObjectId(userId) };
                                const objectIdQuery = await collection.find(objectIdFilter).limit(5).toArray();
                                console.log('[PracticeTest] Direct DB query (ObjectId filter) result count:', objectIdQuery.length);
                            }
                            // Count all documents
                            const totalCount = await collection.countDocuments({});
                            console.log('[PracticeTest] Total documents in collection:', totalCount);
                        }
                    }
                } catch (dbError) {
                    console.error('[PracticeTest] Error in direct DB query:', dbError);
                }
            }

            console.log('[PracticeTest] Response before enrichment:', response.data?.length || 0);

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

                console.log('[PracticeTest] Enriched data sample:', enrichedData[0]);

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
