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
        // Percentage score
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
        type: Date,
        required: false,
        default: Date.now
    },
    updated_at: {
        type: Date,
        required: false,
        default: Date.now
    },
    deleted: {
        type: Boolean,
        required: false,
        default: false
    }
};
