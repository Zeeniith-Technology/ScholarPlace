/**
 * Impersonation ("View As") read allowlist.
 *
 * When a superadmin views a student's account, the minted token carries
 * `impersonated: true`. Such a token is READ-ONLY and student-scoped: it may only
 * reach the exact endpoints listed here. Everything else — every write, every
 * code execution (JDoodle cost), every AI call, and every admin route — is denied
 * at the auth layer. The list is fail-closed: a route that's missing simply won't
 * load in the impersonated view (safe degradation), never a security hole.
 *
 * Deliberately excluded even though they're "reads":
 *  - /coding-problems/run          (executes code → JDoodle credits)
 *  - /test-analysis/practice|weekly (triggers AI → Gemini cost)
 *  - the bare /coding-problems/:problemId catch-all (collides with submit/run)
 */

const EXACT_READS = new Set([
    '/profile/get',
    '/exam/list',
    // Questions (read)
    '/questions/list', '/questions/get', '/questions/random', '/questions/aptitude-practice',
    '/questions/coding', '/questions/coding/get',
    '/questions/week1', '/questions/week1/all', '/questions/week1/get',
    '/questions/week2', '/questions/week2/all',
    // Syllabus (read)
    '/syllabus/list', '/syllabus/week-content', '/syllabus/week1-content',
    '/syllabus/aptitude-week1-content', '/syllabus/aptitude-week2-content', '/syllabus/aptitude-week3-content',
    '/syllabus/aptitude-week4-content', '/syllabus/aptitude-week5-content', '/syllabus/aptitude-week6-content',
    // Progress (read)
    '/student-progress/list', '/student-progress/summary', '/student-progress/check-week-completion',
    '/student-progress/bookmarks/get', '/student-progress/check-weekly-test-eligibility',
    '/student-progress/check-blocked-retake',
    // Practice tests (read)
    '/practice-test/list', '/practice-test/get', '/practice-test/stats',
    // Coding (read only — NOT run/submit)
    '/coding-problems/submissions/all', '/coding-problems/all', '/coding-problems/tiered/problems',
    '/coding-problems/tiered/progress',
    '/coding-problems/review/get-by-submission', '/coding-problems/review/get-by-problem',
    '/coding-problems/review/list',
    // Test analysis (stored results only)
    '/test-analysis/get', '/test-analysis/list',
    // Dept test results (read)
    '/student/dept-test/results',
    // Misc student reads
    '/student/announcements/active',
    '/bug-report/my-reports', '/bug-report/view',
]);

// Parameterized read routes — each pattern is chosen so it can't overlap a write
// route (e.g. two-segment /:id/submissions can't match single-segment /submit).
const READ_PATTERNS = [
    /^\/coding-problems\/week\/[^/]+$/,
    /^\/coding-problems\/daily\/[^/]+\/[^/]+$/,
    /^\/coding-problems\/progress\/[^/]+$/,
    /^\/coding-problems\/[^/]+\/submissions$/,
];

/** True if an impersonated (read-only) token may access this path. */
export function isImpersonationReadAllowed(path) {
    if (!path) return false;
    // Normalize: drop trailing slash (except root)
    const p = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    if (EXACT_READS.has(p)) return true;
    return READ_PATTERNS.some(re => re.test(p));
}
