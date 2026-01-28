/**
 * Question Schema
 * Schema definition for questions (aptitude, coding, technical, etc.)
 */

const questionSchema = {
    question_id: {
        type: String,
        required: true
        // Human-readable ID like "Q1251"
    },
    question_type: {
        type: String,
        required: true,
        enum: ['aptitude', 'coding', 'technical', 'behavioral'],
        default: 'aptitude'
    },
    category: {
        type: String,
        required: true
        // For aptitude questions: "aptitude"
        // For coding: "DSA", "algorithms", etc.
    },
    topic: {
        type: String,
        required: true
        // e.g., "Profit/Loss", "Simple Interest", "Arrays"
    },
    subtopic: {
        type: String,
        required: false
        // Optional subtopic for granular categorization
    },
    question_text: {
        type: String,
        required: true
        // The actual question
    },
    options: {
        type: Array,
        required: true,
        default: []
        // Array of objects: [{ key: 'A', text: '...', is_correct: false }]
    },
    correct_answer: {
        type: String,
        required: true
        // Letter key: 'A', 'B', 'C', or 'D'
    },
    explanation: {
        type: String,
        required: false
        // Detailed explanation of the answer
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['Easy', 'Medium', 'Hard', 'Expert'],
        default: 'Medium'
    },
    week: {
        type: Number,
        required: true
        // Week assignment (1-6)
    },
    day: {
        type: Number,
        required: true
        // Day assignment (1-5)
    },
    tags: {
        type: Array,
        required: false,
        default: []
        // Flexible tagging: ['percentage', 'real-world', 'formula-based']
    },
    version: {
        type: Number,
        required: false,
        default: 1
        // For question updates/revisions
    },
    status: {
        type: String,
        required: false,
        enum: ['active', 'archived', 'draft'],
        default: 'active'
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

export default questionSchema;
