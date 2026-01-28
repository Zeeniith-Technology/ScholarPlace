/**
 * Syllabus Schema
 * Defines the structure for course syllabus data
 */
export default {
    week: {
        type: Number,
        required: true,
        default: 1
    },
    title: {
        type: String,
        required: false,
        default: ''
    },
    modules: {
        type: Array,
        required: false,
        default: []
    },
    topics: {
        type: Array,
        required: false,
        default: []
    },
    assignments: {
        type: Number,
        required: false,
        default: 0
    },
    tests: {
        type: Number,
        required: false,
        default: 0
    },
    duration: {
        type: String,
        required: false,
        default: ''
    },
    // Note: status is now tracked per-student in student_progress collection
    // This schema is the template/master syllabus, not individual student progress
    description: {
        type: String,
        required: false,
        default: ''
    },
    learning_objectives: {
        type: Array,
        required: false,
        default: []
    },
    resources: {
        type: Array,
        required: false,
        default: []
    },
    created_at: {
        type: String,
        required: false
    },
    updated_at: {
        type: String,
        required: false
    }
};

