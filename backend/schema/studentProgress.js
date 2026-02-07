/**
 * Student Progress Schema
 * Tracks individual student progress on syllabus items
 * One-to-many: One syllabus item can have many student progress records
 */
export default {
    student_id: {
        type: String,
        required: true
    },
    /** tblCollage._id - for tenant filtering (optional for backward compat) */
    college_id: { type: String, required: false },
    /** tblDepartments._id - for tenant filtering (optional for backward compat) */
    department_id: { type: String, required: false },
    week: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['locked', 'start', 'in_progress', 'completed'],
        required: false,
        default: 'locked'
    },
    progress_percentage: {
        type: Number,
        required: false,
        default: 0,
        min: 0,
        max: 100
    },
    days_completed: {
        type: Array,
        required: false,
        default: []
        // Array of day IDs completed: ['pre-week', 'day-1', 'day-2', etc.]
    },
    time_spent: {
        type: Number,
        required: false,
        default: 0
        // Total time spent in minutes
    },
    last_accessed: {
        type: Date,
        required: false,
        default: Date.now
    },
    completed_at: {
        type: Date,
        required: false
    },
    practice_tests_completed: {
        type: Number,
        required: false,
        default: 0
    },
    practice_test_scores: {
        type: Array,
        required: false,
        default: []
        // Array of test scores: [{ day: 'day-1', score: 85, date: Date }]
    },
    coding_problems_completed: {
        type: Array,
        required: false,
        default: []
        // Array of completed coding problem IDs: ['pre-week-coding-001', 'day-1-coding-001', etc.]
    },
    assignments_completed: {
        type: Number,
        required: false,
        default: 0
    },
    assignments_total: {
        type: Number,
        required: false,
        default: 0
    },
    tests_completed: {
        type: Number,
        required: false,
        default: 0
    },
    tests_total: {
        type: Number,
        required: false,
        default: 0
    },
    bookmarks: {
        type: Array,
        required: false,
        default: []
        // Array of bookmarked sections: [{ day: 'day-1', section: 'section-name', timestamp: Date }]
    },
    notes: {
        type: Array,
        required: false,
        default: []
        // Array of notes: [{ day: 'day-1', note: 'text', timestamp: Date }]
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
    },
    capstone_completed: {
        type: Boolean,
        required: false,
        default: false
    }
};
