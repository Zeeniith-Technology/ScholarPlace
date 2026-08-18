import { ObjectId } from 'mongodb';
import { fetchData, getDB } from '../../methods.js';

/**
 * Superadmin Monitoring — cross-college practice (aptitude) and coding visibility.
 *
 * Mirrors the DeptTPC practice/coding monitors but WITHOUT the tenant lock: the
 * superadmin can view any student's aptitude attempts and coding submissions,
 * with optional college / department / week filters. Uses the app's canonical
 * resolve-students-first pattern (filter PersonMaster → query records by
 * student_id) so college/department filtering matches the Students page exactly.
 */

/** Match an id stored as either string or ObjectId */
function idMatch(id) {
    const s = String(id);
    return /^[0-9a-fA-F]{24}$/.test(s) ? { $in: [s, new ObjectId(s)] } : s;
}

/**
 * Resolve the set of students matching the college/department/search filters,
 * plus lookup maps for enrichment. Returns { studentIds, byId, collegeNameById }.
 */
async function resolveStudents({ collegeId, departmentId, search }) {
    const filter = {
        person_role: { $regex: /^student$/i },
        person_deleted: { $ne: true },
    };
    if (collegeId) filter.person_collage_id = idMatch(collegeId);
    if (departmentId) {
        filter.$and = [{
            $or: [
                { department_id: idMatch(departmentId) },
                { department: String(departmentId) },
            ],
        }];
    }
    if (search && String(search).trim()) {
        const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = { $regex: escaped, $options: 'i' };
        filter.$and = [...(filter.$and || []), { $or: [{ person_name: rx }, { person_email: rx }, { enrollment_number: rx }] }];
    }

    const res = await fetchData('tblPersonMaster',
        { person_name: 1, person_email: 1, person_collage_id: 1, department: 1, enrollment_number: 1 },
        filter, { sort: { person_name: 1 } });
    const students = res.data || [];

    const collegesRes = await fetchData('tblCollage', { collage_name: 1 }, {});
    const collegeNameById = new Map((collegesRes.data || []).map(c => [String(c._id), c.collage_name]));

    const byId = new Map();
    for (const s of students) {
        byId.set(String(s._id), {
            name: s.person_name || 'Unknown',
            email: s.person_email || '',
            enrollment: s.enrollment_number || '',
            college: collegeNameById.get(String(s.person_collage_id)) || '—',
            department: (s.department || '').trim() || '—',
        });
    }
    return { studentIds: students.map(s => String(s._id)), byId };
}

class MonitoringController {

    /** POST /superadmin/monitoring/practice  { collegeId?, departmentId?, week?, search?, page?, limit? } */
    async practice(req, res, next) {
        try {
            const { collegeId, departmentId, week, search, page = 1, limit = 50 } = req.body || {};
            const { studentIds, byId } = await resolveStudents({ collegeId, departmentId, search });

            if (studentIds.length === 0) {
                res.locals.responseData = { success: true, status: 200, message: 'No students match', data: { attempts: [], total: 0, summary: { totalAttempts: 0, avgScore: 0 } } };
                return next();
            }

            const filter = { student_id: { $in: studentIds }, deleted: { $ne: true } };
            if (week && String(week) !== 'all') filter.week = parseInt(week);

            const db = getDB();
            const total = await db.collection('tblPracticeTest').countDocuments(filter);
            const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
            const safePage = Math.max(parseInt(page) || 1, 1);

            const rowsRes = await fetchData('tblPracticeTest',
                { student_id: 1, week: 1, day: 1, category: 1, attempt: 1, score: 1, total_questions: 1, correct_answers: 1, time_spent: 1, completed_at: 1, created_at: 1 },
                filter, { sort: { completed_at: -1, created_at: -1 }, limit: safeLimit, skip: (safePage - 1) * safeLimit });
            const rows = rowsRes.data || [];

            // Summary across the whole filtered set (not just the page)
            const allScoresRes = await fetchData('tblPracticeTest', { score: 1 }, filter, {});
            const allScores = (allScoresRes.data || []).map(r => r.score || 0);
            const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

            const attempts = rows.map(r => {
                const s = byId.get(String(r.student_id)) || {};
                return {
                    _id: String(r._id),
                    student_name: s.name || 'Unknown',
                    student_email: s.email || '',
                    college: s.college || '—',
                    department: s.department || '—',
                    week: r.week,
                    day: r.day,
                    category: r.category || '',
                    attempt: r.attempt || 1,
                    score: r.score ?? 0,
                    correct: r.correct_answers ?? 0,
                    total: r.total_questions ?? 0,
                    time_spent: r.time_spent ?? 0,
                    completed_at: r.completed_at || r.created_at || null,
                };
            });

            res.locals.responseData = { success: true, status: 200, message: 'Practice monitoring fetched', data: { attempts, total, summary: { totalAttempts: total, avgScore } } };
            next();
        } catch (error) {
            console.error('[Monitoring] practice error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch practice monitoring', error: error.message };
            next();
        }
    }

    /** POST /superadmin/monitoring/practice-detail  { attemptId } — question-by-question answers */
    async practiceDetail(req, res, next) {
        try {
            const { attemptId } = req.body || {};
            if (!attemptId) {
                res.locals.responseData = { success: false, status: 400, message: 'attemptId is required', error: 'Invalid parameters' };
                return next();
            }
            const res1 = await fetchData('tblPracticeTest', {}, { _id: idMatch(attemptId) });
            const doc = res1.success && res1.data && res1.data[0];
            if (!doc) {
                res.locals.responseData = { success: false, status: 404, message: 'Attempt not found', error: 'No such practice attempt' };
                return next();
            }
            const nameRes = await fetchData('tblPersonMaster', { person_name: 1, person_email: 1 }, { _id: idMatch(doc.student_id) });
            const person = nameRes.data && nameRes.data[0];
            res.locals.responseData = {
                success: true, status: 200, message: 'Attempt detail fetched',
                data: {
                    student_name: person?.person_name || 'Unknown',
                    student_email: person?.person_email || '',
                    week: doc.week, day: doc.day, score: doc.score, correct: doc.correct_answers, total: doc.total_questions,
                    questions: (doc.questions_attempted || []).map(q => ({
                        question_id: q.question_id,
                        question: q.question || '',
                        selected_answer: q.selected_answer ?? '',
                        correct_answer: q.correct_answer ?? '',
                        is_correct: !!q.is_correct,
                        question_type: q.question_type || '',
                        time_spent: q.time_spent ?? 0,
                    })),
                }
            };
            next();
        } catch (error) {
            console.error('[Monitoring] practiceDetail error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch attempt detail', error: error.message };
            next();
        }
    }

    /** POST /superadmin/monitoring/coding  { collegeId?, departmentId?, search? } — per-student coding stats */
    async coding(req, res, next) {
        try {
            const { collegeId, departmentId, search } = req.body || {};
            const { studentIds, byId } = await resolveStudents({ collegeId, departmentId, search });
            if (studentIds.length === 0) {
                res.locals.responseData = { success: true, status: 200, message: 'No students match', data: { students: [], summary: { totalStudents: 0, totalSolved: 0 } } };
                return next();
            }

            const subsRes = await fetchData('tblCodingSubmissions',
                { student_id: 1, problem_id: 1, status: 1, submitted_at: 1 },
                { student_id: { $in: studentIds } }, {});
            const subs = subsRes.data || [];

            // Aggregate per student
            const stats = new Map();
            for (const sid of studentIds) stats.set(sid, { attempts: 0, solved: new Set(), lastActive: null });
            for (const s of subs) {
                const st = stats.get(String(s.student_id));
                if (!st) continue;
                st.attempts++;
                if (s.status === 'passed') st.solved.add(s.problem_id);
                if (!st.lastActive || new Date(s.submitted_at) > new Date(st.lastActive)) st.lastActive = s.submitted_at;
            }

            // Only include students who have at least one submission (keeps the list meaningful)
            const students = studentIds
                .map(sid => {
                    const info = byId.get(sid) || {};
                    const st = stats.get(sid);
                    return {
                        studentId: sid,
                        student_name: info.name || 'Unknown',
                        student_email: info.email || '',
                        college: info.college || '—',
                        department: info.department || '—',
                        solved: st.solved.size,
                        attempts: st.attempts,
                        lastActive: st.lastActive,
                    };
                })
                .filter(s => s.attempts > 0)
                .sort((a, b) => b.solved - a.solved || b.attempts - a.attempts);

            res.locals.responseData = {
                success: true, status: 200, message: 'Coding monitoring fetched',
                data: { students, summary: { totalStudents: students.length, totalSolved: students.reduce((a, s) => a + s.solved, 0) } }
            };
            next();
        } catch (error) {
            console.error('[Monitoring] coding error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch coding monitoring', error: error.message };
            next();
        }
    }

    /** POST /superadmin/monitoring/coding-detail  { studentId } — a student's submissions */
    async codingDetail(req, res, next) {
        try {
            const { studentId } = req.body || {};
            if (!studentId) {
                res.locals.responseData = { success: false, status: 400, message: 'studentId is required', error: 'Invalid parameters' };
                return next();
            }
            const subsRes = await fetchData('tblCodingSubmissions',
                { student_id: 1, problem_id: 1, status: 1, language: 1, score: 1, submitted_at: 1 },
                { student_id: idMatch(studentId) }, { sort: { submitted_at: -1 } });
            const subs = subsRes.data || [];

            // Enrich with problem titles
            const problemIds = [...new Set(subs.map(s => s.problem_id).filter(Boolean))];
            const probRes = problemIds.length
                ? await fetchData('tblCodingProblem', { question_id: 1, title: 1 }, { question_id: { $in: problemIds } })
                : { data: [] };
            const titleById = new Map((probRes.data || []).map(p => [p.question_id, p.title]));

            const nameRes = await fetchData('tblPersonMaster', { person_name: 1, person_email: 1 }, { _id: idMatch(studentId) });
            const person = nameRes.data && nameRes.data[0];

            res.locals.responseData = {
                success: true, status: 200, message: 'Coding detail fetched',
                data: {
                    student_name: person?.person_name || 'Unknown',
                    student_email: person?.person_email || '',
                    submissions: subs.map(s => ({
                        problem_id: s.problem_id,
                        problem_title: titleById.get(s.problem_id) || s.problem_id,
                        status: s.status || 'pending',
                        language: s.language || '',
                        score: s.score ?? null,
                        submitted_at: s.submitted_at || null,
                    })),
                }
            };
            next();
        } catch (error) {
            console.error('[Monitoring] codingDetail error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch coding detail', error: error.message };
            next();
        }
    }
}

export default new MonitoringController();
