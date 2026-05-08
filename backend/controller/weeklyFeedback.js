import { fetchData, executeData } from '../methods.js';
import weeklyFeedbackSchema from '../schema/weeklyFeedback.js';

/**
 * WeeklyFeedbackController
 *
 * Role hierarchy enforced per method:
 *   Student    → submitFeedback, getMyFeedback, checkSubmitted
 *   DeptTPC    → listFeedback (dept-scoped), getAnalytics (dept-scoped), getStudentFeedback
 *   TPC        → listFeedback (college-scoped), getAnalytics (college-scoped), getStudentFeedback
 *   Superadmin → listFeedback (all), getAnalytics (all), getStudentFeedback
 */
export default class WeeklyFeedbackController {

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Build MongoDB filter scoped to the requesting user's role.
     * Returns null if the user has no permission.
     */
    #buildScopeFilter(req, extraFilter = {}) {
        const role = (req.user?.role || '').toLowerCase();
        const collegeId = req.user?.college_id || req.user?.collegeId;
        const departmentId = req.user?.department_id;
        const department = req.user?.department;

        if (role === 'superadmin') {
            return { deleted: false, ...extraFilter };
        }

        if (role === 'tpc') {
            if (!collegeId) return null;
            return { deleted: false, college_id: collegeId.toString(), ...extraFilter };
        }

        if (role === 'depttpc') {
            if (!collegeId) return null;
            const filter = { deleted: false, college_id: collegeId.toString(), ...extraFilter };
            // Filter by department_id (preferred) or department name
            if (departmentId) {
                filter.department_id = departmentId.toString();
            } else if (department) {
                filter.department_name = department;
            } else {
                // No department context → return no data to avoid data leak
                filter.department_id = '__NO_DEPT__';
            }
            return filter;
        }

        return null; // Unknown role
    }

    /**
     * Aggregate analytics from a list of feedback documents.
     * Returns per-week and overall aggregates.
     */
    #computeAnalytics(feedbackList) {
        const weekMap = {};

        for (const fb of feedbackList) {
            const w = fb.week_number;
            if (!weekMap[w]) {
                weekMap[w] = {
                    week_number: w,
                    total_responses: 0,
                    avg_confidence: 0,
                    avg_nps: 0,
                    placement_readiness: {},
                    difficulty_distribution: {},
                    industry_relevance: {},
                    workload_manageable: {},
                    felt_supported: {},
                    testimonials: []           // non-empty q8_loved texts
                };
            }

            const wk = weekMap[w];
            wk.total_responses += 1;
            wk.avg_confidence += fb.q1_confidence_score || 0;
            wk.avg_nps += fb.q7_nps_score || 0;

            // Enum frequency counts
            const inc = (obj, key) => { obj[key] = (obj[key] || 0) + 1; };
            inc(wk.placement_readiness,    fb.q2_placement_readiness);
            inc(wk.difficulty_distribution, fb.q3_difficulty_level);
            inc(wk.industry_relevance,     fb.q4_industry_relevance);
            inc(wk.workload_manageable,    fb.q5_workload_manageable);
            inc(wk.felt_supported,         fb.q6_felt_supported);

            if (fb.q8_loved && fb.q8_loved.trim()) {
                wk.testimonials.push({
                    student_name: fb.student_name || 'Anonymous',
                    text: fb.q8_loved.trim(),
                    week: w
                });
            }
        }

        // Convert running sums to averages
        const weeks = Object.values(weekMap).map(wk => ({
            ...wk,
            avg_confidence: wk.total_responses
                ? Math.round((wk.avg_confidence / wk.total_responses) * 10) / 10
                : 0,
            avg_nps: wk.total_responses
                ? Math.round((wk.avg_nps / wk.total_responses) * 10) / 10
                : 0,
            // NPS: promoters (9-10) - detractors (1-6) / total * 100
            // We can't compute this per-week without raw scores, so pass avg_nps
        })).sort((a, b) => a.week_number - b.week_number);

        // Overall summary across all weeks
        const totalResponses = feedbackList.length;
        const overallConfidence = totalResponses
            ? Math.round((feedbackList.reduce((s, f) => s + (f.q1_confidence_score || 0), 0) / totalResponses) * 10) / 10
            : 0;
        const overallNps = totalResponses
            ? Math.round((feedbackList.reduce((s, f) => s + (f.q7_nps_score || 0), 0) / totalResponses) * 10) / 10
            : 0;

        return {
            total_responses: totalResponses,
            overall_avg_confidence: overallConfidence,
            overall_avg_nps: overallNps,
            weeks
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STUDENT ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Submit weekly feedback (Student only).
     * One submission per student per week — enforced here.
     * Route: POST /student/feedback/submit
     */
    async submitFeedback(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const collegeId = req.user?.college_id || req.user?.collegeId;
            const departmentId = req.user?.department_id || null;
            const departmentName = req.user?.department || '';

            const {
                week_number,
                q1_confidence_score,
                q2_placement_readiness,
                q3_difficulty_level,
                q4_industry_relevance,
                q5_workload_manageable,
                q6_felt_supported,
                q7_nps_score,
                q8_loved,
                q8_improve
            } = req.body || {};

            // ── Validation ──────────────────────────────────────
            if (!userId || !collegeId) {
                res.locals.responseData = { success: false, status: 401, message: 'Authentication required', error: 'Missing user context' };
                return next();
            }

            const weekNum = parseInt(week_number, 10);
            if (!weekNum || weekNum < 1 || weekNum > 8) {
                res.locals.responseData = { success: false, status: 400, message: 'week_number must be between 1 and 8', error: 'Invalid week_number' };
                return next();
            }

            const requiredFields = { q1_confidence_score, q2_placement_readiness, q3_difficulty_level, q4_industry_relevance, q5_workload_manageable, q6_felt_supported, q7_nps_score };
            for (const [field, val] of Object.entries(requiredFields)) {
                if (val === undefined || val === null || val === '') {
                    res.locals.responseData = { success: false, status: 400, message: `${field} is required`, error: `Missing field: ${field}` };
                    return next();
                }
            }

            if (q1_confidence_score < 1 || q1_confidence_score > 5) {
                res.locals.responseData = { success: false, status: 400, message: 'q1_confidence_score must be 1–5', error: 'Out of range' };
                return next();
            }
            if (q7_nps_score < 1 || q7_nps_score > 10) {
                res.locals.responseData = { success: false, status: 400, message: 'q7_nps_score must be 1–10', error: 'Out of range' };
                return next();
            }

            // ── Idempotency: One submission per student per week ──
            const existingResponse = await fetchData(
                'tblWeeklyFeedback',
                { _id: 1 },
                { student_id: userId.toString(), week_number: weekNum, deleted: false }
            );
            if (existingResponse.success && existingResponse.data && existingResponse.data.length > 0) {
                res.locals.responseData = { success: false, status: 409, message: 'Feedback for this week has already been submitted', error: 'Duplicate feedback' };
                return next();
            }

            // ── Fetch student name for denormalization ────────────
            let studentName = '';
            const personResp = await fetchData(
                'tblPersonMaster',
                { person_name: 1 },
                { _id: userId.toString(), person_deleted: false }
            );
            if (personResp.success && personResp.data && personResp.data.length > 0) {
                studentName = personResp.data[0].person_name || '';
            }

            // ── Build document ────────────────────────────────────
            const feedbackDoc = {
                student_id: userId.toString(),
                student_name: studentName,
                college_id: collegeId.toString(),
                department_id: departmentId ? departmentId.toString() : null,
                department_name: departmentName,
                week_number: weekNum,
                q1_confidence_score: Number(q1_confidence_score),
                q2_placement_readiness,
                q3_difficulty_level,
                q4_industry_relevance,
                q5_workload_manageable,
                q6_felt_supported,
                q7_nps_score: Number(q7_nps_score),
                q8_loved: (q8_loved || '').trim(),
                q8_improve: (q8_improve || '').trim(),
                submitted_at: new Date().toISOString()
            };

            const result = await executeData('tblWeeklyFeedback', feedbackDoc, 'i', weeklyFeedbackSchema);

            if (!result.success) {
                res.locals.responseData = { success: false, status: 500, message: 'Failed to save feedback', error: 'Database error' };
                return next();
            }

            res.locals.responseData = { success: true, status: 201, message: 'Feedback submitted successfully', data: { week_number: weekNum } };
            next();
        } catch (error) {
            console.error('[WeeklyFeedback] submitFeedback error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Internal server error', error: error.message };
            next();
        }
    }

    /**
     * Check if student has already submitted feedback for a given week.
     * Route: POST /student/feedback/check-submitted
     */
    async checkSubmitted(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const { week_number } = req.body || {};
            const weekNum = parseInt(week_number, 10);

            if (!userId || !weekNum) {
                res.locals.responseData = { success: false, status: 400, message: 'user and week_number are required', error: 'Missing parameters' };
                return next();
            }

            const existing = await fetchData(
                'tblWeeklyFeedback',
                { _id: 1, submitted_at: 1 },
                { student_id: userId.toString(), week_number: weekNum, deleted: false }
            );

            const submitted = existing.success && existing.data && existing.data.length > 0;
            res.locals.responseData = {
                success: true,
                status: 200,
                message: submitted ? 'Already submitted' : 'Not submitted',
                data: { submitted, week_number: weekNum }
            };
            next();
        } catch (error) {
            console.error('[WeeklyFeedback] checkSubmitted error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Internal server error', error: error.message };
            next();
        }
    }

    /**
     * Check multiple weeks at once to reduce API calls.
     * Route: POST /student/feedback/check-submitted-bulk
     */
    async checkSubmittedBulk(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const { week_numbers } = req.body || {}; // Expect array of numbers

            if (!userId || !Array.isArray(week_numbers)) {
                res.locals.responseData = { success: false, status: 400, message: 'user and week_numbers array are required', error: 'Missing parameters' };
                return next();
            }

            const existing = await fetchData(
                'tblWeeklyFeedback',
                { week_number: 1 },
                { student_id: userId.toString(), week_number: { $in: week_numbers }, deleted: false }
            );

            let submittedWeeks = [];
            if (existing.success && existing.data) {
                submittedWeeks = existing.data.map(d => d.week_number);
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Bulk check successful',
                data: { submitted_weeks: submittedWeeks }
            };
            next();
        } catch (error) {
            console.error('[WeeklyFeedback] checkSubmittedBulk error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Internal server error', error: error.message };
            next();
        }
    }

    /**
     * Get student's own feedback history (all weeks).
     * Route: POST /student/feedback/my-history
     */
    async getMyFeedback(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            if (!userId) {
                res.locals.responseData = { success: false, status: 401, message: 'Authentication required', error: 'Missing user context' };
                return next();
            }

            const result = await fetchData(
                'tblWeeklyFeedback',
                {},
                { student_id: userId.toString(), deleted: false },
                { sort: { week_number: 1 } }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Feedback history fetched',
                data: result.success ? result.data : []
            };
            next();
        } catch (error) {
            console.error('[WeeklyFeedback] getMyFeedback error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Internal server error', error: error.message };
            next();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TPC / DEPT-TPC / SUPERADMIN ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * List all feedback scoped to requester's role.
     * Supports optional filters: week_number, student_id, department_id.
     * Route:
     *   POST /tpc-dept/feedback/list   (DeptTPC)
     *   POST /tpc-college/feedback/list (TPC)
     *   POST /superadmin/feedback/list  (Superadmin)
     */
    async listFeedback(req, res, next) {
        try {
            const { week_number, student_id, department_id } = req.body || {};

            const extraFilter = {};
            if (week_number) extraFilter.week_number = parseInt(week_number, 10);
            if (student_id) extraFilter.student_id = student_id.toString();
            if (department_id) extraFilter.department_id = department_id.toString();

            const scopeFilter = this.#buildScopeFilter(req, extraFilter);
            if (!scopeFilter) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied', error: 'No college/department context for your role' };
                return next();
            }

            const result = await fetchData(
                'tblWeeklyFeedback',
                {},
                scopeFilter,
                { sort: { week_number: 1, submitted_at: -1 } }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Feedback list fetched',
                data: result.success ? result.data : []
            };
            next();
        } catch (error) {
            console.error('[WeeklyFeedback] listFeedback error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Internal server error', error: error.message };
            next();
        }
    }

    /**
     * Get aggregated analytics scoped by role.
     * Returns per-week averages, distribution charts, and testimonials.
     * Route:
     *   POST /tpc-dept/feedback/analytics
     *   POST /tpc-college/feedback/analytics
     *   POST /superadmin/feedback/analytics
     */
    async getAnalytics(req, res, next) {
        try {
            const { department_id } = req.body || {};
            const extraFilter = {};
            if (department_id) extraFilter.department_id = department_id.toString();

            const scopeFilter = this.#buildScopeFilter(req, extraFilter);
            if (!scopeFilter) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied', error: 'No college/department context for your role' };
                return next();
            }

            const result = await fetchData('tblWeeklyFeedback', {}, scopeFilter, { sort: { week_number: 1 } });
            const feedbackList = result.success ? result.data : [];
            const analytics = this.#computeAnalytics(feedbackList);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Feedback analytics computed',
                data: analytics
            };
            next();
        } catch (error) {
            console.error('[WeeklyFeedback] getAnalytics error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Internal server error', error: error.message };
            next();
        }
    }

    /**
     * Get one specific student's full feedback history.
     * DeptTPC can only access students in their department.
     * TPC can access all students in their college.
     * Superadmin can access anyone.
     * Route:
     *   POST /tpc-dept/feedback/student
     *   POST /tpc-college/feedback/student
     *   POST /superadmin/feedback/student
     */
    async getStudentFeedback(req, res, next) {
        try {
            const { student_id } = req.body || {};
            if (!student_id) {
                res.locals.responseData = { success: false, status: 400, message: 'student_id is required', error: 'Missing parameter' };
                return next();
            }

            const scopeFilter = this.#buildScopeFilter(req, { student_id: student_id.toString() });
            if (!scopeFilter) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied', error: 'No college/department context for your role' };
                return next();
            }

            const result = await fetchData(
                'tblWeeklyFeedback',
                {},
                scopeFilter,
                { sort: { week_number: 1 } }
            );

            const feedbackList = result.success ? result.data : [];
            const analytics = this.#computeAnalytics(feedbackList);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Student feedback fetched',
                data: {
                    student_id,
                    feedbacks: feedbackList,
                    analytics
                }
            };
            next();
        } catch (error) {
            console.error('[WeeklyFeedback] getStudentFeedback error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Internal server error', error: error.message };
            next();
        }
    }
}
