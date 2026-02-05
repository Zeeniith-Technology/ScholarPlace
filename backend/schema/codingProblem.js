/**
 * Coding Problem Schema
 * Schema definition for coding/programming problems
 */

const codingProblemSchema = {
    question_id: {
        type: String,
        required: true,
        unique: true
        // e.g., "W1_CP1", "W2_CP2"
    },
    week: {
        type: Number,
        required: true,
        min: 1,
        max: 6
        // Week assignment (1-6)
    },
    test_id: {
        type: String,
        required: true
        // e.g., "WT001" for Week 1
    },
    position: {
        type: String,
        required: true
        // e.g., "Capstone_1", "Capstone_2"
    },
    question_number: {
        type: Number,
        required: true
        // Sequential number within test (e.g., 51, 52)
    },
    title: {
        type: String,
        required: true
        // Problem title (e.g., "Generate Number Pyramid in Array")
    },
    problem_statement: {
        type: String,
        required: true
        // Full problem description
    },
    function_signature: {
        type: String,
        required: true
        // e.g., "vector<vector<int>> generatePyramid(int n)"
    },
    input_format: {
        type: String,
        required: true
        // Description of input format
    },
    output_format: {
        type: String,
        required: true
        // Description of expected output
    },
    constraints: {
        type: Array,
        required: true,
        default: []
        // Array of constraint strings
    },
    test_cases: {
        type: Array,
        required: true,
        default: []
        // Array of test case objects: { input, output, explanation }
    },
    expected_complexity: {
        type: Object,
        required: true
        // { time: "O(n)", space: "O(1)", reasoning: "..." }
    },
    hints: {
        type: Array,
        required: false,
        default: []
        // Array of hint strings
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['EASY', 'MEDIUM', 'HARD'],
        default: 'MEDIUM'
    },
    estimated_time_minutes: {
        type: Number,
        required: true,
        min: 5,
        max: 60
        // Expected solving time in minutes
    },
    concepts_tested: {
        type: Array,
        required: true,
        default: []
        // Array of concept strings
    },
    requires_coding: {
        type: Boolean,
        required: true,
        default: true
        // Always true for coding problems
    },
    is_based_on_bank: {
        type: Boolean,
        required: false,
        default: false
    },
    status: {
        type: String,
        required: false,
        enum: ['active', 'archived', 'draft'],
        default: 'active'
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

export default codingProblemSchema;
