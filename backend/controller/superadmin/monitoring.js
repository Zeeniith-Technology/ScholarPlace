import { ObjectId } from 'mongodb';
import { fetchData, getDB } from '../../methods.js';
import { computeDaysCompletedByStudent } from '../tpc.js';

/**
 * Superadmin Monitoring — cross-college practice (aptitude) and coding visibility.
 *
 * Mirrors the DeptTPC practice/coding monitors but WITHOUT the tenant lock: the
 * superadmin can view any student's aptitude attempts and coding submissions,
 * with optional college / department / week filters. Uses the app's canonical
 * resolve-students-first pattern (filter PersonMaster → query records by
 * student_id) so college/department filtering matches the Students page exactly.
 */

// "Actively participating" (see `report()`) = logged in within the last N days
// AND touched the platform on at least M separate days within that window.
const ACTIVE_LOGIN_WINDOW_DAYS = 7;
const ACTIVE_MIN_DISTINCT_DAYS = 4;

/** Match an id stored as either string or ObjectId */
function idMatch(id) {
    const s = String(id);
    return /^[0-9a-fA-F]{24}$/.test(s) ? { $in: [s, new ObjectId(s)] } : s;
}

/** Normalize a stored day value ('day-1' | 1 | 'pre-week') to a display string. */
export function normDay(d) {
    if (d === null || d === undefined || d === '') return null;
    if (typeof d === 'number') return `day-${d}`;
    return String(d);
}

/**
 * Resolve { week, day } for a coding submission from its problem metadata, falling
 * back to parsing the problem_id (DQ_W1_day-1_*, W1_CP1, ...). tblCodingSubmissions
 * stores no week/day, so grouping relies on this.
 */
export function deriveWeekDay(problemId, meta) {
    if (meta && meta.week != null) {
        // Capstone docs (and some legacy ones) carry no `day` field — label those
        // "capstone" instead of a confusing raw placeholder.
        if (meta.is_capstone || meta.day == null) return { week: meta.week, day: 'capstone' };
        return { week: meta.week, day: normDay(meta.day) };
    }
    const pid = String(problemId || '');
    let m = /W(\d+)_(day-\d+|pre-week)/i.exec(pid);
    if (m) return { week: parseInt(m[1], 10), day: m[2].toLowerCase() };
    m = /W(\d+)_day_?(\d+)/i.exec(pid);
    if (m) return { week: parseInt(m[1], 10), day: `day-${m[2]}` };
    m = /^W(\d+)_CP/i.exec(pid);
    if (m) return { week: parseInt(m[1], 10), day: 'capstone' };
    return { week: null, day: null };
}

/** Sort key so days order pre-week < day-1..5 < capstone < unknown. */
function dayOrder(day) {
    if (day === 'pre-week') return -1;
    const m = /^day-(\d+)$/.exec(day || '');
    if (m) return parseInt(m[1], 10);
    if (day === 'capstone') return 90;
    return 99;
}

/** Human label for a normalized day string, e.g. 'day-2' -> 'Day 2'. */
export function dayLabel(day) {
    if (!day) return '';
    if (day === 'pre-week') return 'Pre-Week';
    if (day === 'capstone') return 'Capstone';
    const m = /^day-(\d+)$/.exec(day);
    return m ? `Day ${m[1]}` : day;
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
        { person_name: 1, person_email: 1, person_collage_id: 1, department: 1, enrollment_number: 1, last_login: 1, created_at: 1, person_status: 1 },
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
            lastLogin: s.last_login || null,
            registeredAt: s.created_at || null,
            status: s.person_status || 'active',
        });
    }
    return { studentIds: students.map(s => String(s._id)), byId };
}

class MonitoringController {

    /** POST /superadmin/monitoring/practice  { collegeId?, departmentId?, week?, search? } — per-student aptitude stats */
    async practice(req, res, next) {
        try {
            const { collegeId, departmentId, week, search } = req.body || {};
            const { studentIds, byId } = await resolveStudents({ collegeId, departmentId, search });

            if (studentIds.length === 0) {
                res.locals.responseData = { success: true, status: 200, message: 'No students match', data: { students: [], summary: { totalStudents: 0, totalTests: 0, avgScore: 0 } } };
                return next();
            }

            const filter = { student_id: { $in: studentIds }, deleted: { $ne: true } };
            if (week && String(week) !== 'all') filter.week = parseInt(week);

            const rowsRes = await fetchData('tblPracticeTest',
                { student_id: 1, score: 1, completed_at: 1, created_at: 1 }, filter, {});
            const rows = rowsRes.data || [];

            // Aggregate per student
            const stats = new Map();
            for (const sid of studentIds) stats.set(sid, { scores: [], tests: 0, lastActive: null });
            for (const r of rows) {
                const st = stats.get(String(r.student_id));
                if (!st) continue;
                st.scores.push(r.score || 0);
                st.tests++;
                const d = r.completed_at || r.created_at;
                if (d && (!st.lastActive || new Date(d) > new Date(st.lastActive))) st.lastActive = d;
            }

            const students = studentIds.map(sid => {
                const info = byId.get(sid) || {};
                const st = stats.get(sid);
                const avg = st.scores.length ? Math.round(st.scores.reduce((a, b) => a + b, 0) / st.scores.length) : 0;
                return {
                    studentId: sid,
                    student_name: info.name || 'Unknown',
                    student_email: info.email || '',
                    college: info.college || '—',
                    department: info.department || '—',
                    tests: st.tests,
                    avgScore: avg,
                    bestScore: st.scores.length ? Math.max(...st.scores) : 0,
                    lastActive: st.lastActive,
                };
            }).filter(s => s.tests > 0).sort((a, b) => b.tests - a.tests || b.avgScore - a.avgScore);

            const avgScore = students.length ? Math.round(students.reduce((a, s) => a + s.avgScore, 0) / students.length) : 0;
            res.locals.responseData = {
                success: true, status: 200, message: 'Practice monitoring fetched',
                data: { students, summary: { totalStudents: students.length, totalTests: students.reduce((a, s) => a + s.tests, 0), avgScore } }
            };
            next();
        } catch (error) {
            console.error('[Monitoring] practice error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch practice monitoring', error: error.message };
            next();
        }
    }

    /** POST /superadmin/monitoring/practice-student  { studentId } — a student's attempts (for week/day grouping) */
    async practiceStudent(req, res, next) {
        try {
            const { studentId } = req.body || {};
            if (!studentId) {
                res.locals.responseData = { success: false, status: 400, message: 'studentId is required', error: 'Invalid parameters' };
                return next();
            }
            const rowsRes = await fetchData('tblPracticeTest',
                { week: 1, day: 1, score: 1, attempt: 1, correct_answers: 1, total_questions: 1, completed_at: 1, created_at: 1 },
                { student_id: idMatch(studentId), deleted: { $ne: true } }, { sort: { completed_at: -1, created_at: -1 } });
            const rows = rowsRes.data || [];
            const nameRes = await fetchData('tblPersonMaster', { person_name: 1, person_email: 1 }, { _id: idMatch(studentId) });
            const person = nameRes.data && nameRes.data[0];
            res.locals.responseData = {
                success: true, status: 200, message: 'Student attempts fetched',
                data: {
                    student_name: person?.person_name || 'Unknown',
                    student_email: person?.person_email || '',
                    attempts: rows.map(r => ({
                        _id: String(r._id),
                        week: r.week,
                        day: normDay(r.day),
                        score: r.score ?? 0,
                        attempt: r.attempt || 1,
                        correct: r.correct_answers ?? 0,
                        total: r.total_questions ?? 0,
                        completed_at: r.completed_at || r.created_at || null,
                    })),
                }
            };
            next();
        } catch (error) {
            console.error('[Monitoring] practiceStudent error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch student attempts', error: error.message };
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

            // Enrich with problem title + week/day (submissions store none). Look in the
            // current coding bank (tblCodingProblem) first, then the legacy coding docs
            // in tblQuestion; anything still unresolved is derived from the problem_id.
            const problemIds = [...new Set(subs.map(s => s.problem_id).filter(Boolean))];
            const [cpRes, tqRes] = problemIds.length
                ? await Promise.all([
                    fetchData('tblCodingProblem', { question_id: 1, title: 1, week: 1, day: 1, is_capstone: 1 }, { question_id: { $in: problemIds } }),
                    fetchData('tblQuestion', { question_id: 1, subtopic: 1, topic: 1, week: 1, day: 1 }, { question_id: { $in: problemIds }, question_type: 'coding' }),
                ])
                : [{ data: [] }, { data: [] }];
            const metaById = new Map();
            (cpRes.data || []).forEach(p => metaById.set(p.question_id, { title: p.title, week: p.week, day: p.day, is_capstone: p.is_capstone }));
            (tqRes.data || []).forEach(p => { if (!metaById.has(p.question_id)) metaById.set(p.question_id, { title: p.subtopic || p.topic, week: p.week, day: p.day }); });

            const nameRes = await fetchData('tblPersonMaster', { person_name: 1, person_email: 1 }, { _id: idMatch(studentId) });
            const person = nameRes.data && nameRes.data[0];

            res.locals.responseData = {
                success: true, status: 200, message: 'Coding detail fetched',
                data: {
                    student_name: person?.person_name || 'Unknown',
                    student_email: person?.person_email || '',
                    submissions: subs.map(s => {
                        const meta = metaById.get(s.problem_id);
                        const { week, day } = deriveWeekDay(s.problem_id, meta);
                        return {
                            problem_id: s.problem_id,
                            problem_title: (meta && meta.title) || s.problem_id,
                            week, day,
                            status: s.status || 'pending',
                            language: s.language || '',
                            score: s.score ?? null,
                            submitted_at: s.submitted_at || null,
                        };
                    }),
                }
            };
            next();
        } catch (error) {
            console.error('[Monitoring] codingDetail error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch coding detail', error: error.message };
            next();
        }
    }

    /**
     * POST /superadmin/reports/generate
     * { collegeId?, departmentId?, dateFrom?, dateTo?, search? }
     * Cross-college performance report: a summary rollup (overall + per-college) plus
     * a per-student detail table covering BOTH aptitude (tblPracticeTest) and coding
     * (tblCodingSubmissions). Optional date range bounds test/submission timestamps.
     */
    async report(req, res, next) {
        try {
            const { collegeId, departmentId, dateFrom, dateTo, search } = req.body || {};
            const { studentIds, byId } = await resolveStudents({ collegeId, departmentId, search });

            const emptyOverall = { totalStudents: 0, activeStudents: 0, avgAptitude: 0, aptitudeTests: 0, aptitudePassed: 0, aptitudeFailed: 0, aptitudeTimeSpentMinutes: 0, codingSolved: 0, codingAttempts: 0, codingFailed: 0, daysCompleted: 0, bugReportsSubmitted: 0 };
            if (studentIds.length === 0) {
                res.locals.responseData = { success: true, status: 200, message: 'No students match', data: { generatedAt: new Date().toISOString(), summary: { overall: emptyOverall, byCollege: [], byDepartment: [], weeklyTrend: [] }, students: [] } };
                return next();
            }

            // Aptitude practice tests (optionally date-bounded on completed_at)
            const ptFilter = { student_id: { $in: studentIds }, deleted: { $ne: true } };
            if (dateFrom || dateTo) {
                ptFilter.completed_at = {};
                if (dateFrom) ptFilter.completed_at.$gte = new Date(dateFrom);
                if (dateTo) ptFilter.completed_at.$lte = new Date(dateTo + 'T23:59:59.999Z');
            }
            const ptRes = await fetchData('tblPracticeTest', { student_id: 1, week: 1, day: 1, score: 1, time_spent: 1, completed_at: 1 }, ptFilter, {});
            const practiceTests = ptRes.data || [];

            // Coding submissions (optionally date-bounded on submitted_at)
            const subFilter = { student_id: { $in: studentIds } };
            if (dateFrom || dateTo) {
                subFilter.submitted_at = {};
                if (dateFrom) subFilter.submitted_at.$gte = new Date(dateFrom);
                if (dateTo) subFilter.submitted_at.$lte = new Date(dateTo + 'T23:59:59.999Z');
            }
            const subRes = await fetchData('tblCodingSubmissions', { student_id: 1, problem_id: 1, status: 1, submitted_at: 1 }, subFilter, {});
            const submissions = subRes.data || [];

            // Absolute last-activity signal: always the student's true most recent event,
            // ignoring the report's date filter (last login/activity are profile facts, not
            // metrics of the filtered period). Fetched unfiltered on purpose.
            const [allPtRes, allSubRes] = await Promise.all([
                fetchData('tblPracticeTest', { student_id: 1, week: 1, day: 1, score: 1, completed_at: 1, created_at: 1 }, { student_id: { $in: studentIds }, deleted: { $ne: true } }, {}),
                fetchData('tblCodingSubmissions', { student_id: 1, problem_id: 1, status: 1, submitted_at: 1 }, { student_id: { $in: studentIds } }, {}),
            ]);
            const lastEventBySid = new Map(); // sid -> { at, type: 'coding'|'aptitude', ...raw }
            const considerEvent = (sid, at, payload) => {
                if (!at) return;
                const cur = lastEventBySid.get(sid);
                if (!cur || new Date(at) > new Date(cur.at)) lastEventBySid.set(sid, { at, ...payload });
            };
            for (const t of allPtRes.data || []) {
                considerEvent(String(t.student_id), t.completed_at || t.created_at, { type: 'aptitude', week: t.week, day: normDay(t.day), score: t.score });
            }
            for (const s of allSubRes.data || []) {
                considerEvent(String(s.student_id), s.submitted_at, { type: 'coding', problemId: s.problem_id, status: s.status });
            }

            // "Actively participating" = logged in within the last ACTIVE_LOGIN_WINDOW_DAYS
            // AND touched the platform (any coding submission or aptitude attempt — result
            // doesn't matter, just consistency) on at least ACTIVE_MIN_DISTINCT_DAYS separate
            // calendar days within that same window. Recency + frequency, not quality of
            // result — deliberately easier to meet than "did you solve/pass something".
            const now = Date.now();
            const windowCutoff = now - ACTIVE_LOGIN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
            const activityDatesBySid = new Map(); // sid -> Set<'YYYY-MM-DD'>
            const markActivityDate = (sid, at) => {
                if (!at) return;
                const t = new Date(at).getTime();
                if (isNaN(t) || t < windowCutoff || t > now) return;
                if (!activityDatesBySid.has(sid)) activityDatesBySid.set(sid, new Set());
                activityDatesBySid.get(sid).add(new Date(at).toISOString().slice(0, 10));
            };
            for (const t of allPtRes.data || []) markActivityDate(String(t.student_id), t.completed_at || t.created_at);
            for (const s of allSubRes.data || []) markActivityDate(String(s.student_id), s.submitted_at);

            // Resolve titles/week-day only for the (small) set of "winning" coding submissions
            const winningProblemIds = [...new Set([...lastEventBySid.values()].filter(e => e.type === 'coding').map(e => e.problemId).filter(Boolean))];
            const [cpTitleRes, tqTitleRes] = winningProblemIds.length
                ? await Promise.all([
                    fetchData('tblCodingProblem', { question_id: 1, title: 1, week: 1, day: 1, is_capstone: 1 }, { question_id: { $in: winningProblemIds } }),
                    fetchData('tblQuestion', { question_id: 1, subtopic: 1, topic: 1, week: 1, day: 1 }, { question_id: { $in: winningProblemIds }, question_type: 'coding' }),
                ])
                : [{ data: [] }, { data: [] }];
            const codingMetaById = new Map();
            (cpTitleRes.data || []).forEach(p => codingMetaById.set(p.question_id, { title: p.title, week: p.week, day: p.day, is_capstone: p.is_capstone }));
            (tqTitleRes.data || []).forEach(p => { if (!codingMetaById.has(p.question_id)) codingMetaById.set(p.question_id, { title: p.subtopic || p.topic, week: p.week, day: p.day }); });

            const lastActivityBySid = new Map();
            for (const [sid, e] of lastEventBySid.entries()) {
                if (e.type === 'aptitude') {
                    lastActivityBySid.set(sid, { at: e.at, type: 'aptitude', label: `Aptitude test — Week ${e.week ?? '?'} ${dayLabel(e.day)} (${e.score ?? 0}%)` });
                } else {
                    const meta = codingMetaById.get(e.problemId);
                    const { week, day } = deriveWeekDay(e.problemId, meta);
                    const title = (meta && meta.title) || e.problemId;
                    const verb = e.status === 'passed' ? 'Solved' : 'Attempted';
                    lastActivityBySid.set(sid, { at: e.at, type: 'coding', label: `${verb}: ${title} (W${week ?? '?'} ${dayLabel(day)})` });
                }
            }

            // Resolve week for EVERY coding submission (not just the "winning" ones used
            // for last-activity above) so weeksCompleted can include coding-only weeks —
            // reuses the same weekByProblemId/parseWeekFromId the Weekly Trend section
            // further down also needs, computed once here and shared by both.
            const subProblemIds = [...new Set(submissions.map(s => s.problem_id).filter(Boolean))];
            const [trendCpRes, trendTqRes] = subProblemIds.length
                ? await Promise.all([
                    fetchData('tblCodingProblem', { question_id: 1, week: 1 }, { question_id: { $in: subProblemIds } }),
                    fetchData('tblQuestion', { question_id: 1, week: 1 }, { question_id: { $in: subProblemIds }, question_type: 'coding' }),
                ])
                : [{ data: [] }, { data: [] }];
            const weekByProblemId = new Map();
            (trendCpRes.data || []).forEach(p => weekByProblemId.set(p.question_id, p.week));
            (trendTqRes.data || []).forEach(p => { if (!weekByProblemId.has(p.question_id)) weekByProblemId.set(p.question_id, p.week); });
            const parseWeekFromId = (pid) => { const m = /^W(\d+)_/i.exec(String(pid || '')); return m ? parseInt(m[1], 10) : null; };

            // Real days-completed count — same rule as the student-facing green ticks
            // (>=6 daily coding problems solved OR a day's aptitude test >=70%).
            const daysCompletedByStudent = await computeDaysCompletedByStudent(studentIds);

            // Bug reports submitted per student (Students + DeptTPC can both file these,
            // but this report is student-scoped so filtering by reporter_id is enough).
            const bugRes = await fetchData('tblBugReport', { reporter_id: 1 }, { reporter_id: { $in: studentIds } }, {});
            const bugCountBySid = new Map();
            (bugRes.data || []).forEach(b => { const sid = String(b.reporter_id); bugCountBySid.set(sid, (bugCountBySid.get(sid) || 0) + 1); });

            // Aptitude pass/fail bar matches the app's established day-completion
            // threshold (>=70%) so it's consistent with every other pass/fail signal
            // already shown elsewhere (green ticks, weekly-test eligibility).
            const APTITUDE_PASS_SCORE = 70;

            // Per-student aggregation
            const agg = new Map();
            for (const sid of studentIds) agg.set(sid, { aptScores: [], aptTimeSpentSec: 0, aptPassed: 0, aptFailed: 0, codingAttempts: 0, codingSolved: new Set(), codingFailed: 0, weeksTouched: new Set() });
            for (const t of practiceTests) {
                const a = agg.get(String(t.student_id));
                if (!a) continue;
                a.aptScores.push(t.score || 0);
                a.aptTimeSpentSec += (t.time_spent || 0);
                if ((t.score || 0) >= APTITUDE_PASS_SCORE) a.aptPassed++; else a.aptFailed++;
                if (t.week != null) a.weeksTouched.add(t.week);
            }
            for (const s of submissions) {
                const a = agg.get(String(s.student_id));
                if (!a) continue;
                a.codingAttempts++;
                if (s.status === 'passed') a.codingSolved.add(s.problem_id);
                else a.codingFailed++;
                const w = weekByProblemId.get(s.problem_id) ?? parseWeekFromId(s.problem_id);
                if (w != null) a.weeksTouched.add(w);
            }

            const students = studentIds.map(sid => {
                const info = byId.get(sid) || {};
                const a = agg.get(sid);
                const aptTests = a.aptScores.length;
                const avgAptitude = aptTests ? Math.round(a.aptScores.reduce((x, y) => x + y, 0) / aptTests) : 0;
                const activeDaysRecent = (activityDatesBySid.get(sid) || new Set()).size;
                const daysSinceLogin = info.lastLogin ? Math.floor((now - new Date(info.lastLogin).getTime()) / 86400000) : null;
                const active = daysSinceLogin !== null && daysSinceLogin <= ACTIVE_LOGIN_WINDOW_DAYS && activeDaysRecent >= ACTIVE_MIN_DISTINCT_DAYS;
                return {
                    studentId: sid,
                    student_name: info.name || 'Unknown',
                    student_email: info.email || '',
                    enrollment: info.enrollment || '',
                    college: info.college || '—',
                    department: info.department || '—',
                    status: info.status || 'active',
                    registeredAt: info.registeredAt || null,
                    avgAptitude,
                    aptitudeTests: aptTests,
                    aptitudePassed: a.aptPassed,
                    aptitudeFailed: a.aptFailed,
                    aptitudeTimeSpentMinutes: Math.round(a.aptTimeSpentSec / 60),
                    activeDaysRecent,
                    codingSolved: a.codingSolved.size,
                    codingAttempts: a.codingAttempts,
                    codingFailed: a.codingFailed,
                    daysCompleted: daysCompletedByStudent.get(sid) || 0,
                    weeksCompleted: a.weeksTouched.size,
                    bugReportsSubmitted: bugCountBySid.get(sid) || 0,
                    active,
                    lastLogin: info.lastLogin || null,
                    lastActivity: lastActivityBySid.get(sid) || null,
                };
            }).sort((x, y) => (y.codingSolved + y.aptitudeTests) - (x.codingSolved + x.aptitudeTests) || x.student_name.localeCompare(y.student_name));

            const aptStudents = students.filter(s => s.aptitudeTests > 0);
            const overall = {
                totalStudents: students.length,
                activeStudents: students.filter(s => s.active).length,
                avgAptitude: aptStudents.length ? Math.round(aptStudents.reduce((a, s) => a + s.avgAptitude, 0) / aptStudents.length) : 0,
                aptitudeTests: students.reduce((a, s) => a + s.aptitudeTests, 0),
                aptitudePassed: students.reduce((a, s) => a + s.aptitudePassed, 0),
                aptitudeFailed: students.reduce((a, s) => a + s.aptitudeFailed, 0),
                aptitudeTimeSpentMinutes: students.reduce((a, s) => a + s.aptitudeTimeSpentMinutes, 0),
                codingSolved: students.reduce((a, s) => a + s.codingSolved, 0),
                codingAttempts: students.reduce((a, s) => a + s.codingAttempts, 0),
                codingFailed: students.reduce((a, s) => a + s.codingFailed, 0),
                daysCompleted: students.reduce((a, s) => a + s.daysCompleted, 0),
                bugReportsSubmitted: students.reduce((a, s) => a + s.bugReportsSubmitted, 0),
            };

            // Per-college rollup
            const collegeMap = new Map();
            for (const s of students) {
                if (!collegeMap.has(s.college)) collegeMap.set(s.college, { college: s.college, students: 0, active: 0, aptSum: 0, aptStudents: 0, codingSolved: 0 });
                const c = collegeMap.get(s.college);
                c.students++;
                if (s.active) c.active++;
                if (s.aptitudeTests > 0) { c.aptSum += s.avgAptitude; c.aptStudents++; }
                c.codingSolved += s.codingSolved;
            }
            const byCollege = [...collegeMap.values()].map(c => ({
                college: c.college, students: c.students, active: c.active,
                avgAptitude: c.aptStudents ? Math.round(c.aptSum / c.aptStudents) : 0,
                codingSolved: c.codingSolved,
            })).sort((a, b) => b.students - a.students);

            // Per-department rollup — keyed by college+department so same-named
            // departments in different colleges don't get merged together.
            const deptMap = new Map();
            for (const s of students) {
                const key = `${s.college}||${s.department}`;
                if (!deptMap.has(key)) deptMap.set(key, { college: s.college, department: s.department, students: 0, active: 0, aptSum: 0, aptStudents: 0, codingSolved: 0 });
                const d = deptMap.get(key);
                d.students++;
                if (s.active) d.active++;
                if (s.aptitudeTests > 0) { d.aptSum += s.avgAptitude; d.aptStudents++; }
                d.codingSolved += s.codingSolved;
            }
            const byDepartment = [...deptMap.values()].map(d => ({
                college: d.college, department: d.department, students: d.students, active: d.active,
                avgAptitude: d.aptStudents ? Math.round(d.aptSum / d.aptStudents) : 0,
                codingSolved: d.codingSolved,
            })).sort((a, b) => b.students - a.students);

            // Weekly completion trend — reuses weekByProblemId/parseWeekFromId, already
            // resolved above (shared with the per-student weeksCompleted computation).
            const weekMap = new Map();
            const weekBucket = (wk) => {
                if (!weekMap.has(wk)) weekMap.set(wk, { aptScores: [], aptStudents: new Set(), codingSolvedSet: new Set(), codingAttempts: 0, codingStudents: new Set() });
                return weekMap.get(wk);
            };
            for (const t of practiceTests) {
                if (t.week == null) continue;
                const b = weekBucket(t.week);
                b.aptScores.push(t.score || 0);
                b.aptStudents.add(String(t.student_id));
            }
            for (const s of submissions) {
                const wk = weekByProblemId.get(s.problem_id) ?? parseWeekFromId(s.problem_id);
                if (wk == null) continue;
                const b = weekBucket(wk);
                b.codingAttempts++;
                if (s.status === 'passed') b.codingSolvedSet.add(`${s.student_id}:${s.problem_id}`);
                b.codingStudents.add(String(s.student_id));
            }
            // Weekly trend is a volume/pace view (distinct students who touched that
            // week at all), not the stricter recency-based "active" flag used above.
            const weeklyTrend = [...weekMap.keys()].sort((a, b) => a - b).map(wk => {
                const b = weekMap.get(wk);
                return {
                    week: wk,
                    avgAptitude: b.aptScores.length ? Math.round(b.aptScores.reduce((x, y) => x + y, 0) / b.aptScores.length) : 0,
                    aptitudeTests: b.aptScores.length,
                    codingSolved: b.codingSolvedSet.size,
                    codingAttempts: b.codingAttempts,
                    activeStudents: new Set([...b.aptStudents, ...b.codingStudents]).size,
                };
            });

            res.locals.responseData = { success: true, status: 200, message: 'Report generated', data: { generatedAt: new Date().toISOString(), summary: { overall, byCollege, byDepartment, weeklyTrend }, students } };
            next();
        } catch (error) {
            console.error('[Monitoring] report error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to generate report', error: error.message };
            next();
        }
    }
}

export default new MonitoringController();
