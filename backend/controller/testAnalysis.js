/**
 * Test Analysis Controller
 * Handles AI-powered test performance analysis and personalized guidance
 */

import { executeData, fetchData, getDB } from '../methods.js';
import aiService from '../services/aiService.js';
import testAnalysisSchema from '../schema/testAnalysis.js';
import { ObjectId } from 'mongodb';

/** Remove markdown asterisks from AI text */
function stripAsterisks(s) {
    if (typeof s !== 'string') return s || '';
    return s.replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1').replace(/\*+/g, '').replace(/\*/g, '');
}

export default class testAnalysisController {

    /**
     * Generate and save AI analysis for a practice test
     * Route: POST /test-analysis/practice
     */
    async analyzePracticeTest(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { test_id, week, day } = req.body || {};

            if (!userId || !test_id || !week || !day) {
                res.locals.responseData = { success: false, status: 400, message: 'test_id, week, and day are required' };
                return next();
            }

            // Fetch the practice test data
            const db = getDB();
            const tid = /^[0-9a-fA-F]{24}$/.test(test_id) ? new ObjectId(test_id) : test_id;
            const test = await db.collection('tblPracticeTest').findOne({ _id: tid, student_id: userId.toString() });

            if (!test) {
                res.locals.responseData = { success: false, status: 404, message: 'Practice test not found' };
                return next();
            }

            // Fetch previous practice tests for this student (same week/day for trend analysis)
            const previousTests = await fetchData(
                'tblPracticeTest',
                { score: 1, completed_at: 1 },
                { 
                    student_id: userId.toString(),
                    week: week,
                    day: day,
                    _id: { $ne: tid }
                },
                { sort: { completed_at: -1 }, limit: 5 }
            );

            // Generate AI analysis
            const analysis = await aiService.analyzeTestPerformance(
                {
                    score: test.score,
                    questions_attempted: test.questions_attempted || [],
                    week: test.week,
                    day: test.day,
                    time_spent: test.time_spent
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
                test_id: test_id,
                score: test.score,
                learning_patterns: analysis.learning_patterns || [],
                strengths: analysis.strengths || [],
                weak_areas: analysis.weak_areas || [],
                guidance: stripAsterisks(analysis.guidance || ''),
                recommendations: (analysis.recommendations || []).map(r => stripAsterisks(r)),
                topics_to_revisit: analysis.topics_to_revisit || [],
                performance_trend: analysis.performance_trend || 'new',
                comparison: analysis.comparison || null,
            };

            const result = await executeData('tblTestAnalysis', analysisDoc, 'i', testAnalysisSchema);
            const analysisId = result?.data?.insertedId?.toString?.() || result?.data?._id?.toString?.();

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Test analysis generated',
                data: {
                    analysis_id: analysisId,
                    ...analysisDoc
                }
            };
            next();
        } catch (e) {
            console.error('analyzePracticeTest error:', e);
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to generate analysis' };
            next();
        }
    }

    /**
     * Generate and save AI analysis for a weekly test
     * Route: POST /test-analysis/weekly
     */
    async analyzeWeeklyTest(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { test_id, week, questions_attempted, score, time_spent } = req.body || {};

            if (!userId || !test_id || !week || score === undefined) {
                res.locals.responseData = { success: false, status: 400, message: 'test_id, week, score, and questions_attempted are required' };
                return next();
            }

            // Fetch previous weekly tests for this student (same week for trend analysis)
            const previousTests = await fetchData(
                'tblTestAnalysis',
                { score: 1, created_at: 1 },
                { 
                    student_id: userId.toString(),
                    test_type: 'weekly',
                    week: week
                },
                { sort: { created_at: -1 }, limit: 3 }
            );

            // Generate AI analysis
            const analysis = await aiService.analyzeTestPerformance(
                {
                    score: score,
                    questions_attempted: questions_attempted || [],
                    week: week,
                    time_spent: time_spent || 0
                },
                previousTests.data || [],
                'weekly'
            );

            // Save analysis
            const analysisDoc = {
                student_id: userId.toString(),
                test_type: 'weekly',
                week: week,
                day: null,
                test_id: test_id,
                score: score,
                learning_patterns: analysis.learning_patterns || [],
                strengths: analysis.strengths || [],
                weak_areas: analysis.weak_areas || [],
                guidance: stripAsterisks(analysis.guidance || ''),
                recommendations: (analysis.recommendations || []).map(r => stripAsterisks(r)),
                topics_to_revisit: analysis.topics_to_revisit || [],
                performance_trend: analysis.performance_trend || 'new',
                comparison: analysis.comparison || null,
            };

            const result = await executeData('tblTestAnalysis', analysisDoc, 'i', testAnalysisSchema);
            const analysisId = result?.data?.insertedId?.toString?.() || result?.data?._id?.toString?.();

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Weekly test analysis generated',
                data: {
                    analysis_id: analysisId,
                    ...analysisDoc
                }
            };
            next();
        } catch (e) {
            console.error('analyzeWeeklyTest error:', e);
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to generate analysis' };
            next();
        }
    }

    /**
     * Get latest analysis for a test
     * Route: POST /test-analysis/get
     */
    async getAnalysis(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { test_id, test_type } = req.body || {};

            if (!userId || !test_id || !test_type) {
                res.locals.responseData = { success: false, status: 400, message: 'test_id and test_type are required' };
                return next();
            }

            const out = await fetchData(
                'tblTestAnalysis',
                {},
                { 
                    student_id: userId.toString(),
                    test_id: test_id,
                    test_type: test_type
                },
                { sort: { created_at: -1 }, limit: 1 }
            );

            const analysis = out?.data?.[0];
            if (!analysis) {
                res.locals.responseData = { success: false, status: 404, message: 'Analysis not found' };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                data: analysis
            };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to get analysis' };
            next();
        }
    }

    /**
     * Get all analyses for a student (for learning pattern tracking)
     * Route: POST /test-analysis/list
     */
    async listAnalyses(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { test_type, week } = req.body || {};

            if (!userId) {
                res.locals.responseData = { success: false, status: 401, message: 'Authentication required' };
                return next();
            }

            const filter = { student_id: userId.toString() };
            if (test_type) filter.test_type = test_type;
            if (week) filter.week = week;

            const out = await fetchData(
                'tblTestAnalysis',
                {},
                filter,
                { sort: { created_at: -1 }, limit: 50 }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                data: { analyses: out?.data || [] }
            };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to list analyses' };
            next();
        }
    }
}
