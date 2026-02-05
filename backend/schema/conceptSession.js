/**
 * Concept Session Schema (Study Help – Clarify & Learn)
 * Tracks Q&A conversations so we can continue teaching and later generate practice.
 * Name avoids "AI" to keep UI neutral.
 */

export default {
    student_id: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        required: false
    },
    week: {
        type: Number,
        required: false
    },
    day: {
        type: String,
        required: false
    },
    /** Full thread: [{ role: 'student'|'assistant', content: string, created_at: Date }] */
    conversation: {
        type: Array,
        required: true,
        default: []
    },
    /** active | practice_generated | closed */
    status: {
        type: String,
        required: true,
        default: 'active',
        enum: ['active', 'practice_generated', 'closed']
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
