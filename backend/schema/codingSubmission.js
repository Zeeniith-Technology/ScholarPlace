/**
 * Coding Submission Schema (tblCodingSubmissions)
 * Reference for student coding submissions.
 * college_id and department_id are for tenant filtering (tblCollage._id, tblDepartments._id).
 */
export default {
    student_id: { type: String, required: true },
    problem_id: { type: String, required: true },
    solution: { type: String, required: true },
    language: { type: String, required: true },
    status: { type: String, required: false }, // 'passed' | 'failed'
    score: { type: Number, required: false },
    test_results: { type: Array, required: false, default: [] },
    submitted_at: { type: Date, required: false, default: Date.now },
    /** tblCollage._id - for tenant filtering (optional for backward compat) */
    college_id: { type: String, required: false },
    /** tblDepartments._id - for tenant filtering (optional for backward compat) */
    department_id: { type: String, required: false },
};
