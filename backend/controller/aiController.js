/**
 * AI Controller
 * Handles all AI-related endpoints
 */

import { executeData, fetchData } from '../methods.js';
import aiService from '../services/aiService.js';
import aiInteractionSchema from '../schema/aiInteraction.js';
import studentLearningProfileSchema from '../schema/studentLearningProfile.js';

export default class aiController {
    /**
     * Code Review
     * POST /ai/code-review
     */
    async reviewCode(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const { code, language, problem_id, problem_description, week, day } = req.body;

            if (!code || !language) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Code and language are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Validate userId exists
            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Authentication required',
                    error: 'User ID not found'
                };
                return next();
            }

            // Get problem context if problem_id provided
            let problemContext = problem_description || 'General code review';
            if (problem_id) {
                // Try to fetch problem details
                // You can enhance this later
            }

            // Get AI review
            const review = await aiService.reviewCode(code, language, problemContext);

            // Save interaction
            await executeData(
                'tblAIInteraction',
                {
                    student_id: userId,
                    interaction_type: 'code-review',
                    week: week || null,
                    day: day || null,
                    problem_id: problem_id || null,
                    input_data: { code, language, problem_id },
                    ai_response: review,
                    was_out_of_scope: false,
                    ai_provider: process.env.AI_PROVIDER || 'gemini'
                },
                'i', // Insert
                aiInteractionSchema
            );

            // Update learning profile
            await this.updateLearningProfile(userId, 'code-review', { language });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Code reviewed successfully',
                data: {
                    review: review,
                    language: language
                }
            };
            next();
        } catch (error) {
            console.error('Code Review Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to review code',
                error: error.message
            };
            next();
        }
    }

    /**
     * Get AI Tutor Hint
     * POST /ai/hint
     */
    async getHint(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const { problem_id, problem_description, code, language, week, day } = req.body;

            // Validate required fields
            if (!problem_id || !problem_description) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Problem ID and description are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Validate userId exists
            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Authentication required',
                    error: 'User ID not found'
                };
                return next();
            }

            // Check how many hints already used for this problem
            const existingHints = await fetchData(
                'tblAIInteraction',
                {},
                {
                    student_id: userId,
                    interaction_type: 'hint',
                    problem_id: problem_id
                },
                { sort: { created_at: -1 } }
            );

            const hintsUsed = existingHints.data?.length || 0;
            const previousHints = existingHints.data?.slice(0, 3).map(h => h.ai_response) || [];

            if (hintsUsed >= 3) {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Maximum 3 hints allowed per problem',
                    error: 'Hint limit reached',
                    data: {
                        hint: "You've used all 3 hints. Try to solve it step by step. Review the problem requirements and your code logic.",
                        isFinal: true,
                        hintsUsed: 3
                    }
                };
                return next();
            }

            const hintNumber = hintsUsed + 1;

            // Get hint from AI
            const hintResult = await aiService.getHint(
                problem_description,
                code || '',
                language || 'javascript',
                hintNumber,
                previousHints
            );

            // Save interaction
            await executeData(
                'tblAIInteraction',
                {
                    student_id: userId,
                    interaction_type: 'hint',
                    week: week || null,
                    day: day || null,
                    problem_id: problem_id,
                    hint_number: hintNumber,
                    input_data: { problem_description, code, language },
                    ai_response: hintResult.hint,
                    was_out_of_scope: false,
                    ai_provider: process.env.AI_PROVIDER || 'gemini'
                },
                'i',
                aiInteractionSchema
            );

            // Update learning profile
            await this.updateLearningProfile(userId, 'hint', { day: day, problem_id });

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Hint ${hintNumber} provided`,
                data: {
                    hint: hintResult.hint,
                    hintNumber: hintNumber,
                    hintsRemaining: 3 - hintNumber,
                    isFinal: hintResult.isFinal
                }
            };
            next();
        } catch (error) {
            console.error('Get Hint Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to get hint',
                error: error.message
            };
            next();
        }
    }

    /**
     * Generate Personalized Learning Path
     * POST /ai/learning-path
     */
    async generateLearningPath(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const { week } = req.body;

            // Fetch student performance data
            const progressResult = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: userId, week: week || 1 },
                {}
            );

            const practiceTestResult = await fetchData(
                'tblPracticeTest',
                {},
                { student_id: userId, week: week || 1 },
                {}
            );

            // Get learning profile
            const profileResult = await fetchData(
                'tblStudentLearningProfile',
                {},
                { student_id: userId },
                {}
            );

            const studentPerformance = {
                progress: progressResult.data?.[0] || {},
                practiceTests: practiceTestResult.data || [],
                learningProfile: profileResult.data?.[0] || {}
            };

            // Generate learning path
            const learningPath = await aiService.generateLearningPath(studentPerformance);

            // Save interaction
            await executeData(
                'tblAIInteraction',
                {
                    student_id: userId,
                    interaction_type: 'learning-path',
                    week: week || 1,
                    input_data: studentPerformance,
                    ai_response: JSON.stringify(learningPath),
                    parsed_response: learningPath,
                    was_out_of_scope: false,
                    ai_provider: process.env.AI_PROVIDER || 'gemini'
                },
                'i',
                aiInteractionSchema
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Learning path generated successfully',
                data: learningPath
            };
            next();
        } catch (error) {
            console.error('Generate Learning Path Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to generate learning path',
                error: error.message
            };
            next();
        }
    }

    /**
     * Generate Questions
     * POST /ai/generate-questions
     */
    async generateQuestions(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const { topic, difficulty, count } = req.body;

            if (!topic || !difficulty) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Topic and difficulty are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Generate questions
            const questions = await aiService.generateQuestions(
                topic,
                difficulty,
                count || 5
            );

            // Save interaction
            await executeData(
                'tblAIInteraction',
                {
                    student_id: userId,
                    interaction_type: 'question-generation',
                    input_data: { topic, difficulty, count },
                    ai_response: JSON.stringify(questions),
                    parsed_response: { questions },
                    was_out_of_scope: false,
                    ai_provider: process.env.AI_PROVIDER || 'gemini'
                },
                'i',
                aiInteractionSchema
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Questions generated successfully',
                data: {
                    questions: questions,
                    topic: topic,
                    difficulty: difficulty
                }
            };
            next();
        } catch (error) {
            console.error('Generate Questions Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: error.message || 'Failed to generate questions',
                error: error.message
            };
            next();
        }
    }

    /**
     * Analyze Performance
     * POST /ai/analyze-performance
     */
    async analyzePerformance(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const { week } = req.body;

            // Fetch comprehensive student data
            const progressResult = await fetchData(
                'tblStudentProgress',
                {},
                { student_id: userId, week: week || 1 },
                {}
            );

            const practiceTestResult = await fetchData(
                'tblPracticeTest',
                {},
                { student_id: userId, week: week || 1 },
                {}
            );

            const profileResult = await fetchData(
                'tblStudentLearningProfile',
                {},
                { student_id: userId },
                {}
            );

            const studentData = {
                progress: progressResult.data?.[0] || {},
                practiceTests: practiceTestResult.data || [],
                learningProfile: profileResult.data?.[0] || {}
            };

            // Analyze performance
            const analysis = await aiService.analyzePerformance(studentData);

            // Save interaction
            await executeData(
                'tblAIInteraction',
                {
                    student_id: userId,
                    interaction_type: 'performance-analysis',
                    week: week || 1,
                    input_data: studentData,
                    ai_response: JSON.stringify(analysis),
                    parsed_response: analysis,
                    was_out_of_scope: false,
                    ai_provider: process.env.AI_PROVIDER || 'gemini'
                },
                'i',
                aiInteractionSchema
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Performance analyzed successfully',
                data: analysis
            };
            next();
        } catch (error) {
            console.error('Analyze Performance Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to analyze performance',
                error: error.message
            };
            next();
        }
    }

    /**
     * Answer Student Question
     * POST /ai/answer-question
     */
    async answerQuestion(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.userId || req.user?.person_id || req.headers['x-user-id'];
            const { question, week, day } = req.body;

            if (!question) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Question is required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Get answer from AI
            const answerResult = await aiService.answerQuestion(question, {
                currentDay: day,
                week: week
            });

            // Save interaction
            await executeData(
                'tblAIInteraction',
                {
                    student_id: userId,
                    interaction_type: 'question-answer',
                    week: week || null,
                    day: day || null,
                    input_data: { question },
                    ai_response: answerResult.answer,
                    was_out_of_scope: answerResult.outOfScope || false,
                    ai_provider: process.env.AI_PROVIDER || 'gemini'
                },
                'i',
                aiInteractionSchema
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: answerResult.outOfScope 
                    ? 'Question is outside project scope'
                    : 'Question answered successfully',
                data: {
                    answer: answerResult.answer,
                    outOfScope: answerResult.outOfScope
                }
            };
            next();
        } catch (error) {
            console.error('Answer Question Error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to answer question',
                error: error.message
            };
            next();
        }
    }

    /**
     * Update Learning Profile (internal method)
     */
    async updateLearningProfile(userId, interactionType, data) {
        try {
            // Skip if userId is not provided
            if (!userId) {
                console.warn('[updateLearningProfile] Skipping - userId is missing');
                return;
            }

            // Get or create profile
            const existing = await fetchData(
                'tblStudentLearningProfile',
                {},
                { student_id: userId },
                {}
            );

            const profile = existing.data?.[0] || {
                student_id: userId,
                code_review_requests: 0,
                hint_usage_pattern: {}
            };

            // Update based on interaction type
            if (interactionType === 'code-review') {
                profile.code_review_requests = (profile.code_review_requests || 0) + 1;
                if (data.language) {
                    profile.preferred_language = data.language;
                }
            } else if (interactionType === 'hint') {
                const day = data.day || 'unknown';
                profile.hint_usage_pattern = profile.hint_usage_pattern || {};
                profile.hint_usage_pattern[day] = (profile.hint_usage_pattern[day] || 0) + 1;
            }

            profile.updated_at = new Date();

            // Upsert profile
            await executeData(
                'tblStudentLearningProfile',
                profile,
                'u', // Upsert
                studentLearningProfileSchema,
                { student_id: userId }
            );
        } catch (error) {
            console.error('Update Learning Profile Error:', error);
            // Don't throw - this is non-critical
        }
    }
}
