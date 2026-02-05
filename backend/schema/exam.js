/**
 * Exam Schema
 * Schema definition for exams
 */

const examSchema = {
    exam_name: {
        type: String,
        required: true
    },
    exam_type: {
        type: String,
        required: true,
        enum: ['weekly', 'mini', 'mock', 'capstone']
    },
    week: {
        type: Number,
        required: true
    },
    modules: {
        type: Array,
        default: []
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard', 'Very Hard']
    },
    questions: {
        type: Array,
        default: []
    },
    duration: {
        type: Number, // in minutes
        default: 60
    },
    scheduled_date: {
        type: Date
    },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'completed', 'locked'],
        default: 'scheduled'
    },
    created_at: {
        type: String,
        default: () => new Date().toISOString()
    },
    updated_at: {
        type: String,
        default: () => new Date().toISOString()
    },
    deleted: {
        type: Boolean,
        default: false
    }
};

export default examSchema;



