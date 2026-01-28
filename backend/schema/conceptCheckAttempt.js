/**
 * Concept Check Attempt Schema
 * Stores student attempts on concept checks (Quick checks).
 */

export default {
    student_id: {
        type: String,
        required: true
    },
    concept_check_id: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
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
    /** [{ question_index, selected_answer, correct_answer, is_correct }] */
    answers: {
        type: Array,
        required: true,
        default: []
    },
    time_spent: {
        type: Number,
        required: false,
        default: 0
    },
    completed_at: {
        type: Date,
        required: false,
        default: Date.now
    }
};
