/**
 * Practice Test Schema
 * Stores detailed practice test data including all questions and answers for each attempt
 * One-to-many: One student can have many practice test records
 */
export default {
    student_id: {
        type: String,
        required: true
        // Reference to tblPersonMaster
    },
    /** tblCollage._id - for tenant filtering (optional for backward compat) */
    college_id: { type: String, required: false },
    /** tblDepartments._id - for tenant filtering (optional for backward compat) */
    department_id: { type: String, required: false },
    week: {
        type: Number,
        required: true
    },
    day: {
        type: String,
        required: true
        // e.g., 'pre-week', 'day-1', 'day-2', etc.
    },
    category: {
        type: String,
        required: false,
        default: 'Aptitude'
    },
    attempt: {
        type: Number,
        required: true,
        default: 1
        // Attempt number for this day
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
        // Percentage score — computed on the SERVER from the student's selections
        // against tblQuestion. Never trust a score sent by the client.
    },
    graded_by: {
        type: String,
        default: 'server',
        enum: ['server', 'client']
        // 'client' means the server could not re-grade the attempt (unrecognised
        // question ids) and fell back to the submitted number — such rows are not
        // verified results and should be treated as such in reporting.
    },
    client_reported_score: {
        type: Number
        // What the browser claimed, kept for comparison/audit against `score`.
    },
    total_questions: {
        type: Number,
        required: true
    },
    correct_answers: {
        type: Number,
        required: true,
        default: 0
    },
    incorrect_answers: {
        type: Number,
        required: true,
        default: 0
    },
    time_spent: {
        type: Number,
        required: false,
        default: 0
        // Time spent in minutes
    },
    questions_attempted: {
        type: Array,
        required: true,
        default: []
        // Array of question attempts:
        // [{
        //   question_id: string,
        //   question: string,
        //   selected_answer: string,
        //   correct_answer: string,
        //   is_correct: boolean,
        //   time_spent: number (seconds),
        //   question_type: string,
        //   explanation: string
        // }]
    },
    started_at: {
        type: Date,
        required: false,
        default: Date.now
    },
    completed_at: {
        type: Date,
        required: false
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'abandoned'],
        required: false,
        default: 'completed'
    },
    created_at: {
        type: String,
        required: false,
        default: () => new Date().toISOString()
    },
    updated_at: {
        type: String,
        required: false,
        default: () => new Date().toISOString()
    },
    deleted: {
        type: Boolean,
        required: false,
        default: false
    }
};
