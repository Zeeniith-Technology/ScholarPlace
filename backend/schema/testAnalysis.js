/**
 * Test Analysis Schema
 * Stores AI-generated analysis and personalized guidance after each test (daily practice or weekly).
 * Tracks learning patterns and provides actionable feedback.
 */

export default {
    student_id: {
        type: String,
        required: true
    },
    /** test_type: 'practice' (daily) | 'weekly' */
    test_type: {
        type: String,
        required: true,
        enum: ['practice', 'weekly']
    },
    /** For practice: week and day. For weekly: week only */
    week: {
        type: Number,
        required: true
    },
    /** For practice tests only */
    day: {
        type: String,
        required: false
    },
    /** Reference to the test attempt (tblPracticeTest._id or exam attempt ID) */
    test_id: {
        type: String,
        required: true
    },
    /** Overall score from the test */
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    /** AI-detected learning patterns and techniques */
    learning_patterns: {
        type: Array,
        required: false,
        default: []
        // e.g., ['visual-learner', 'needs-repetition', 'strong-in-basics', 'struggles-with-advanced']
    },
    /** Strengths identified by AI */
    strengths: {
        type: Array,
        required: false,
        default: []
        // e.g., ['Arrays', 'Loops', 'Quick problem-solving']
    },
    /** Weak areas identified by AI */
    weak_areas: {
        type: Array,
        required: false,
        default: []
        // e.g., ['Functions', 'Recursion', 'Time complexity']
    },
    /** Personalized guidance message from AI */
    guidance: {
        type: String,
        required: true
    },
    /** Specific recommendations (actionable steps) */
    recommendations: {
        type: Array,
        required: false,
        default: []
        // e.g., ['Review Functions chapter', 'Practice recursion problems', 'Focus on time complexity']
    },
    /** Topics to revisit */
    topics_to_revisit: {
        type: Array,
        required: false,
        default: []
    },
    /** Performance trend: 'improving' | 'stable' | 'declining' | 'new' */
    performance_trend: {
        type: String,
        required: false,
        enum: ['improving', 'stable', 'declining', 'new']
    },
    /** Comparison with previous attempts (if available) */
    comparison: {
        type: Object,
        required: false
        // e.g., { previous_score: 65, improvement: 10, trend: 'improving' }
    },
    created_at: {
        type: Date,
        required: false,
        default: Date.now
    }
};
