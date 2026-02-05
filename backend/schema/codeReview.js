/**
 * Code Review Schema (tblCodeReview)
 * Stores AI-generated code reviews for passed coding submissions.
 * Scoped by person_id, department_id, college_id for multi-tenant (N colleges, N departments, N students).
 */

const codeReviewSchema = {
    // Multi-tenant: avoid conflicts across colleges/departments/students
    person_id: { type: String, required: true },
    department_id: { type: String, required: false },
    college_id: { type: String, required: false },

    // Link to submission (one review per submission)
    submission_id: { type: 'ObjectId', required: true },

    // Problem context
    problem_id: { type: String, required: true },
    week: { type: Number, required: false },
    day: { type: Number, required: false },
    is_capstone: { type: Boolean, default: false },

    // Snapshot of problem (for display in Code Review UI)
    problem_title: { type: String, required: true },
    problem_description: { type: String, required: false },

    // Submitted code and language
    submitted_code: { type: String, required: true },
    language: { type: String, required: true },

    // AI review text (what could be done better, best way to write the code)
    ai_review: { type: String, required: true },

    created_at: { type: String, default: () => new Date().toISOString() },
    deleted: { type: Boolean, default: false },
};

export default codeReviewSchema;
