/**
 * Concept Check Schema (Study Help – Quick checks)
 * Stores practice tests generated from clarify-and-learn sessions.
 * Stored in a separate table; name does not suggest AI.
 */

export default {
    student_id: {
        type: String,
        required: true
    },
    /** Reference to the concept session this check was generated from */
    source_session_id: {
        type: String,
        required: true
    },
    /** User-friendly title, e.g. "Quick check: Arrays" */
    title: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        required: false
    },
    /** [{ question, options: string[], correct_answer, explanation }] */
    questions: {
        type: Array,
        required: true,
        default: []
    },
    /** available | attempted | expired */
    status: {
        type: String,
        required: true,
        default: 'available',
        enum: ['available', 'attempted', 'expired']
    },
    created_at: {
        type: Date,
        required: false,
        default: Date.now
    }
};
