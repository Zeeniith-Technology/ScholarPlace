/**
 * Question Controller
 * Handles all question-related endpoints (aptitude, coding, technical)
 */

import { executeData, fetchData, getDB } from '../methods.js';
import questionSchema from '../schema/tblQuestion.js';
import { ObjectId } from 'mongodb';

export default class questionController {

    /**
     * List questions with filtering
     * Route: POST /questions/list
     * Auth: Required (all authenticated users)
     */
    async listQuestions(req, res, next) {
        try {
            const { projection, filter, options } = req.body;
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];

            // Build filter - merge with request filter and exclude deleted questions
            let finalFilter = {
                ...(filter || {}),
                deleted: { $ne: true }
            };

            console.log('[Questions] listQuestions - userId:', userId);
            console.log('[Questions] Filter:', JSON.stringify(finalFilter, null, 2));

            const fetchOptions = {
                ...(options || {}),
                sort: options?.sort || { week: 1, day: 1, question_id: 1 }
            };

            const response = await fetchData(
                'tblQuestion',
                projection || {},
                finalFilter,
                fetchOptions
            );

            console.log('[Questions] Response data count:', response.data?.length || 0);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Questions fetched successfully',
                data: response.data || []
            };
            next();
        } catch (error) {
            console.error('[Questions] Error in listQuestions:', error);
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
     * Get single question by ID
     * Route: POST /questions/get
     * Auth: Required (all authenticated users)
     */
    async getQuestion(req, res, next) {
        try {
            const { questionId, _id } = req.body;

            if (!questionId && !_id) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Question ID or _id is required',
                    error: 'Missing required fields'
                };
                return next();
            }

            let filter = { deleted: { $ne: true } };

            if (_id) {
                // MongoDB ObjectId
                filter._id = typeof _id === 'string' ? new ObjectId(_id) : _id;
            } else {
                // Human-readable ID like "Q1251"
                filter.question_id = questionId;
            }

            const response = await fetchData(
                'tblQuestion',
                {},
                filter,
                {}
            );

            if (response.data && response.data.length > 0) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Question fetched successfully',
                    data: response.data[0]
                };
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Question not found',
                    error: 'Question does not exist'
                };
            }
            next();
        } catch (error) {
            console.error('[Questions] Error in getQuestion:', error);
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
     * Get random questions for practice
     * Route: POST /questions/random
     * Auth: Required (all authenticated users)
     */
    async getRandomQuestions(req, res, next) {
        try {
            const { category, difficulty, week, day, count } = req.body;
            const questionCount = count || 10;

            // Build filter
            let filter = { deleted: { $ne: true } };
            if (category) filter.category = category;
            if (difficulty) filter.difficulty = difficulty;
            if (week) filter.week = week;
            if (day) filter.day = day;

            const db = getDB();
            const collection = db.collection('tblQuestion');

            // Use MongoDB aggregation for random sampling
            const questions = await collection.aggregate([
                { $match: filter },
                { $sample: { size: questionCount } }
            ]).toArray();

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Random questions fetched successfully',
                data: questions
            };
            next();
        } catch (error) {
            console.error('[Questions] Error in getRandomQuestions:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch random questions',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get aptitude practice questions by week and day
     * Route: POST /questions/aptitude-practice
     * Auth: Required (students)
     */
    async getAptitudePractice(req, res, next) {
        try {
            const { week, day } = req.body;

            if (!week || !day) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Week and day are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            console.log(`[Questions] Fetching aptitude practice - Week ${week}, Day ${day}`);

            // Use fetchData method for consistency
            const filter = {
                category: 'aptitude',
                question_type: 'aptitude',
                week: parseInt(week),
                day: parseInt(day),
                status: 'active',
                deleted: { $ne: true }
            };

            const response = await fetchData(
                'tblQuestion',
                {}, // projection - get all fields
                filter,
                { sort: { question_id: 1 } }
            );

            if (response.data && response.data.length > 0) {
                // Define difficulty order
                const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3, 'expert': 4 };

                // Sort by difficulty level: easy -> medium -> hard -> expert
                const sorted = response.data.sort((a, b) => {
                    const diffA = (a.difficulty || 'medium').toLowerCase();
                    const diffB = (b.difficulty || 'medium').toLowerCase();
                    return (difficultyOrder[diffA] || 2) - (difficultyOrder[diffB] || 2);
                });

                // Limit to 50 questions
                const selected = sorted.slice(0, Math.min(50, sorted.length));

                console.log(`[Questions] Found ${selected.length} aptitude questions sorted by difficulty`);

                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Aptitude questions fetched successfully',
                    data: {
                        questions: selected,
                        total: selected.length,
                        week: parseInt(week),
                        day: parseInt(day)
                    }
                };
            } else {
                console.log(`[Questions] No aptitude questions found for Week ${week}, Day ${day}`);
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'No questions found for this week and day',
                    data: {
                        questions: [],
                        total: 0,
                        week: parseInt(week),
                        day: parseInt(day)
                    }
                };
            }
            next();
        } catch (error) {
            console.error('[Questions] Error in getAptitudePractice:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to fetch aptitude practice questions',
                error: error.message
            };
            next();
        }
    }

    /**
     * Insert new question (Superadmin only)
     * Route: POST /questions/insert
     * Auth: Required (Superadmin)
     */
    async insertQuestion(req, res, next) {
        try {
            const questionData = req.body;

            // Validate required fields
            if (!questionData.question_id || !questionData.question_text || !questionData.correct_answer) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Missing required fields',
                    error: 'question_id, question_text, and correct_answer are required'
                };
                return next();
            }

            // Check for duplicate question_id
            const existing = await fetchData(
                'tblQuestion',
                {},
                { question_id: questionData.question_id },
                {}
            );

            if (existing.data && existing.data.length > 0) {
                res.locals.responseData = {
                    success: false,
                    status: 409,
                    message: 'Question ID already exists',
                    error: 'Duplicate question_id'
                };
                return next();
            }

            // Insert question
            const response = await executeData(
                'tblQuestion',
                questionData,
                'i',
                questionSchema
            );

            if (response.success) {
                res.locals.responseData = {
                    success: true,
                    status: 201,
                    message: 'Question created successfully',
                    data: {
                        ...questionData,
                        _id: response.data?.insertedId || response.data?._id
                    }
                };
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to create question',
                    error: 'Database error'
                };
            }
            next();
        } catch (error) {
            console.error('[Questions] Error in insertQuestion:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to create question',
                error: error.message
            };
            next();
        }
    }

    /**
     * Update question (Superadmin only)
     * Route: POST /questions/update
     * Auth: Required (Superadmin)
     */
    async updateQuestion(req, res, next) {
        try {
            const { _id, ...updateFields } = req.body;

            if (!_id) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Question _id is required',
                    error: 'Missing required field'
                };
                return next();
            }

            // Add updated_at timestamp
            updateFields.updated_at = new Date();

            const response = await executeData(
                'tblQuestion',
                updateFields,
                'u',
                questionSchema,
                { _id: typeof _id === 'string' ? new ObjectId(_id) : _id }
            );

            if (response.success) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Question updated successfully',
                    data: { _id, ...updateFields }
                };
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to update question',
                    error: 'Database error'
                };
            }
            next();
        } catch (error) {
            console.error('[Questions] Error in updateQuestion:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to update question',
                error: error.message
            };
            next();
        }
    }

    /**
     * Soft delete question (Superadmin only)
     * Route: POST /questions/delete
     * Auth: Required (Superadmin)
     */
    async deleteQuestion(req, res, next) {
        try {
            const { _id } = req.body;

            if (!_id) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Question _id is required',
                    error: 'Missing required field'
                };
                return next();
            }

            const response = await executeData(
                'tblQuestion',
                { deleted: true, updated_at: new Date().toISOString() },
                'u',
                questionSchema,
                { _id: typeof _id === 'string' ? new ObjectId(_id) : _id }
            );

            if (response.success) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Question deleted successfully',
                    data: { _id, deleted: true }
                };
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to delete question',
                    error: 'Database error'
                };
            }
            next();
        } catch (error) {
            console.error('[Questions] Error in deleteQuestion:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to delete question',
                error: error.message
            };
            next();
        }
    }

    /**
     * Bulk insert questions (Superadmin only - for migration)
     * Route: POST /questions/bulk-insert
     * Auth: Required (Superadmin)
     */
    async bulkInsertQuestions(req, res, next) {
        try {
            const { questions } = req.body;

            if (!questions || !Array.isArray(questions) || questions.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Questions array is required',
                    error: 'Missing or invalid questions data'
                };
                return next();
            }

            const db = getDB();
            const collection = db.collection('tblQuestion');

            // Check for duplicates
            const questionIds = questions.map(q => q.question_id);
            const existing = await collection.find({
                question_id: { $in: questionIds }
            }).toArray();

            const existingIds = new Set(existing.map(q => q.question_id));
            const newQuestions = questions.filter(q => !existingIds.has(q.question_id));

            if (newQuestions.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 409,
                    message: 'All questions already exist',
                    error: 'Duplicate question_ids'
                };
                return next();
            }

            // Apply schema defaults
            const questionsWithDefaults = newQuestions.map(q => ({
                ...q,
                question_type: q.question_type || 'aptitude',
                status: q.status || 'active',
                version: q.version || 1,
                deleted: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            const result = await collection.insertMany(questionsWithDefaults);

            res.locals.responseData = {
                success: true,
                status: 201,
                message: 'Questions inserted successfully',
                data: {
                    inserted: result.insertedCount,
                    skipped: questions.length - newQuestions.length,
                    total: questions.length
                }
            };
            next();
        } catch (error) {
            console.error('[Questions] Error in bulkInsertQuestions:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to bulk insert questions',
                error: error.message
            };
            next();
        }
    }
}
