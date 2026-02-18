/**
 * Dept Test Attempt Schema
 * Stores student attempts and results for Department TPC tests
 */

const deptTestAttemptSchema = {
    // Test Reference
    test_id: {
        type: String,
        required: true
        // References tblDeptTest._id
    },

    // Student Info
    student_id: {
        type: String,
        required: true
    },
    student_name: {
        type: String,
        required: true
    },
    student_email: {
        type: String,
        required: true
    },

    // Test Snapshot (preserve even if original test is deleted)
    test_title: {
        type: String,
        required: true
    },
    test_module: {
        type: String
        // DSA or Aptitude
    },
    test_topic: {
        type: String
    },
    test_difficulty: {
        type: String
    },

    // Timing
    started_at: {
        type: Date,
        default: () => new Date()
    },
    submitted_at: {
        type: Date
    },
    duration_taken_minutes: {
        type: Number
    },

    // Student Answers
    student_answers: {
        type: Array,
        default: []
        // Structure: [{ question_index: 0, selected_option: 1, is_correct: true, marks_awarded: 1 }]
    },

    // Score Summary
    total_questions: {
        type: Number,
        default: 0
    },
    correct_answers: {
        type: Number,
        default: 0
    },
    wrong_answers: {
        type: Number,
        default: 0
    },
    unanswered: {
        type: Number,
        default: 0
    },
    total_marks: {
        type: Number,
        default: 0
    },
    obtained_marks: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'abandoned'],
        default: 'in_progress'
    },

    // Metadata
    created_at: {
        type: String,
        default: () => new Date().toISOString()
    },
    updated_at: {
        type: String,
        default: () => new Date().toISOString()
    }
};

export default deptTestAttemptSchema;
