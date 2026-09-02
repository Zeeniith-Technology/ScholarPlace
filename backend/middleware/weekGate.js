import { getDB } from '../methods.js';

/**
 * Weekly-feedback gate.
 *
 * SCOPE — deliberately narrow: this enforces ONLY the weekly feedback
 * requirement. It does NOT enforce week completion / progression order; that
 * logic already exists in the app and is intentionally left untouched here, so
 * this middleware stays purely additive rather than duplicating (or fighting)
 * it. The feedback requirement was the one rule that existed only as UI
 * decoration in frontend/app/student/study/page.tsx (isWeekUnlocked) and was
 * never actually enforced anywhere — which is how a student reached week 6
 * with no feedback submitted for any prior week.
 *
 * Rule: week 1 is always open. Week N (N>1) requires that week N-1's feedback
 * has been submitted. Nothing else.
 *
 * Deliberately NOT checked: whether week N-1 has status 'completed'. Real
 * progress records are overwhelmingly 'in_progress'/'start' (reaching
 * 'completed' requires the capstone plus a weekly test >= 75%), so requiring it
 * here would block students from advancing even once they had submitted their
 * feedback.
 *
 * Grandfather clause: real students were already progressing past week 1
 * before this gate existed. If a student already has ANY tblStudentProgress
 * record for the week being requested, they keep access to it — so nobody
 * already ahead is retroactively locked out, and going back to an earlier week
 * is never blocked. The gate only applies to weeks not yet reached.
 *
 * Like auth.js and aiGate.js (NOT crmAccess.js, which has an unrelated bug —
 * it sets res.locals.responseData on failure but still calls next(), letting
 * the controller run anyway): this MUST send its own response and NOT call
 * next() on the locked path, since the terminal responder runs after the
 * controller and would let the request through regardless.
 */

/**
 * Optional cutoff for the grandfather clause, as an ISO date string
 * (e.g. WEEK_GATE_ACTIVATION_DATE=2026-09-05).
 *
 * Why this exists: simply opening a week's page causes side-effect endpoints
 * (bookmarks, eligibility checks) to create a tblStudentProgress row for that
 * week — a bare shell with status 'start' and no activity. Without a cutoff,
 * a student could open a locked week, have a shell written for it, and be
 * "already there" on reload. Those shells are byte-for-byte indistinguishable
 * from the rows real students already have for weeks they merely clicked into,
 * so only the creation time can separate them.
 *
 * Set this to the deployment time: rows created before it are treated as
 * pre-existing progress and grandfathered; rows created after it are not.
 * If unset, every row grandfathers (the lenient behaviour) — safe, but it
 * leaves the shell loophole open, so set it when deploying.
 */
/**
 * Local/dev escape hatch, mirroring the frontend's NEXT_PUBLIC_TEST_MODE.
 *
 * Without this the two sides disagree locally: TEST_MODE unlocks every week in
 * the UI, so a week shows "Start", but the API still answers 403 and the page
 * looks broken. Setting WEEK_GATE_DISABLED=true in backend/.env turns the gate
 * off so the whole programme can be walked end to end while testing.
 *
 * Explicit opt-in and fail-safe: anything other than the literal string "true"
 * — including the variable being absent, as in production — leaves the gate
 * enforcing. A startup warning is logged whenever it IS disabled, so it can
 * never be silently off somewhere it matters.
 */
const GATE_DISABLED = String(process.env.WEEK_GATE_DISABLED || '').trim().toLowerCase() === 'true';
if (GATE_DISABLED) {
    console.warn('[weekGate] ⚠  WEEK_GATE_DISABLED=true — the weekly-feedback requirement is NOT being enforced. Never set this in production.');
}

const ACTIVATION_DATE = (() => {
    const raw = process.env.WEEK_GATE_ACTIVATION_DATE;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
        console.warn(`[weekGate] WEEK_GATE_ACTIVATION_DATE is not a valid date: "${raw}" — ignoring it.`);
        return null;
    }
    return d;
})();

/**
 * The program is 8 weeks. Week numbers beyond this are not real weeks, so the
 * gate has no opinion on them and must not answer "submit week N-1's feedback"
 * for a week that does not exist — that would surface a nonsense prompt to the
 * student. Such requests are passed straight through to the controller, which
 * rejects them with its own range validation (e.g. 400 "week_number must be
 * between 1 and 8").
 */
const MAX_GATED_WEEK = 8;

function getStudentId(req) {
    return String(req.user?.id || req.user?.userId || req.user?.person_id || '');
}

async function isWeekUnlockedForStudent(studentId, weekNum) {
    if (!weekNum || weekNum <= 1) return true;

    const db = getDB();

    // Grandfather / backtracking: any week the student had already reached stays open.
    const grandfatherQuery = {
        student_id: studentId,
        week: { $in: [weekNum, String(weekNum)] },
    };
    if (ACTIVATION_DATE) {
        // Only rows that pre-date the gate count. A missing created_at means the
        // row predates the field being written, so treat it as pre-existing too.
        grandfatherQuery.$or = [
            { created_at: { $lt: ACTIVATION_DATE } },
            { created_at: { $exists: false } },
        ];
    }
    const alreadyHasThisWeek = await db.collection('tblStudentProgress').findOne(grandfatherQuery);
    if (alreadyHasThisWeek) return true;

    // The only rule enforced here: the previous week's feedback must be in.
    const prevFeedback = await db.collection('tblWeeklyFeedback').findOne({
        student_id: studentId,
        week_number: weekNum - 1,
        deleted: false,
    });
    return !!prevFeedback;
}

/**
 * Resolver for routes that only receive a problemId (e.g. /coding-problems/submit,
 * /coding-problems/run) — looks up the problem's week from tblCodingProblem.
 */
export async function resolveWeekFromProblemId(req) {
    const problemId = req.body?.problemId;
    if (!problemId) return null;
    const db = getDB();
    const problem = await db.collection('tblCodingProblem').findOne(
        { question_id: problemId },
        { projection: { week: 1 } }
    );
    return problem?.week ?? null;
}

/**
 * @param {number | ((req) => number|string|Promise<number|string>)} getWeek
 *   Either a fixed week number (for routes with no week param, e.g. a
 *   per-week aptitude content route) or a function that resolves the week
 *   being requested from req (body/params, or an async DB lookup).
 */
export function requireWeekUnlocked(getWeek) {
    return async (req, res, next) => {
        try {
            if (GATE_DISABLED) return next(); // local testing only — see the note above

            // This is a student rule. Staff (TPC / DeptTPC / Superadmin / CRM) have
            // no weekly feedback to submit, and several of these routes are shared
            // with them ("all authenticated users"), so gating them would answer a
            // nonsensical "submit your Week N feedback" to an admin. A superadmin
            // impersonating a student carries a Student-role token, so View As still
            // sees exactly what the student sees.
            const role = String(req.user?.role || '').toLowerCase();
            if (role && role !== 'student') return next();

            const studentId = getStudentId(req);
            if (!studentId) return next(); // auth already handles missing identity

            const weekRaw = typeof getWeek === 'function' ? await getWeek(req) : getWeek;
            const weekNum = parseInt(weekRaw, 10);
            if (!weekNum || Number.isNaN(weekNum)) return next(); // no week context to gate
            if (weekNum > MAX_GATED_WEEK) return next(); // not a real week — let the controller reject it

            const unlocked = await isWeekUnlockedForStudent(studentId, weekNum);
            if (!unlocked) {
                return res.status(403).json({
                    success: false,
                    message: `Please submit your Week ${weekNum - 1} feedback to continue to Week ${weekNum}.`,
                    error: 'FEEDBACK_REQUIRED',
                    // Structured so the UI can open the right feedback form directly
                    // instead of parsing the message text.
                    required_week: weekNum - 1,
                    requested_week: weekNum,
                });
            }
            return next();
        } catch (e) {
            // Fail OPEN on infra errors (DB hiccup), same policy as aiGate.js —
            // this is a sequencing rule for an internal ed-tech platform, not a
            // security boundary; a transient failure should not lock a real
            // student out of legitimate content.
            console.warn('[weekGate] check failed, allowing request:', e.message);
            return next();
        }
    };
}
