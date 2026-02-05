/**
 * Student Learning Profile Schema
 * Tracks individual student learning patterns for AI personalization
 */

export default {
    student_id: {
        type: String,
        required: true,
        unique: true
    },
    // Coding patterns
    preferred_language: {
        type: String,
        required: false,
        enum: ['javascript', 'c', 'cpp', null],
        default: null
    },
    coding_style: {
        type: String,
        required: false,
        enum: ['verbose', 'concise', 'balanced'],
        default: 'balanced'
    },
    common_errors: {
        type: Array,
        required: false,
        default: []
        // Array of error patterns: ['syntax-error', 'logic-error', 'off-by-one', etc.]
    },
    // Answer patterns
    answer_speed: {
        type: String,
        required: false,
        enum: ['fast', 'medium', 'slow'],
        default: 'medium'
    },
    answer_accuracy_by_topic: {
        type: Object,
        required: false,
        default: {}
        // { 'data-types': 0.85, 'loops': 0.60, etc. }
    },
    // Learning behavior
    topics_struggling: {
        type: Array,
        required: false,
        default: []
        // Topics with <80% after 3 attempts
    },
    topics_mastered: {
        type: Array,
        required: false,
        default: []
        // Topics with >90% consistently
    },
    // AI interaction patterns
    hint_usage_pattern: {
        type: Object,
        required: false,
        default: {}
        // { 'day-1': 2, 'day-2': 3, etc. } - hints used per day
    },
    code_review_requests: {
        type: Number,
        required: false,
        default: 0
    },
    // Performance trends
    improvement_areas: {
        type: Array,
        required: false,
        default: []
    },
    strength_areas: {
        type: Array,
        required: false,
        default: []
    },
    // Last updated
    last_analyzed: {
        type: String,
        required: false,
        default: () => new Date().toISOString()
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
    }
};
