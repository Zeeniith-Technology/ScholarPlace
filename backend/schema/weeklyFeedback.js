/**
 * Weekly Feedback Schema
 * Stores per-student, per-week feedback submitted after capstone completion.
 * Scoped by college_id and department_id for multi-tenant role-based access.
 *
 * Hierarchy:
 *   Student  → submit + view own
 *   DeptTPC  → view all students in their department
 *   TPC      → view all students in their college
 *   Superadmin → view all (no scoping)
 */
export default {
    /** Student's PersonMaster _id (stringified ObjectId) */
    student_id: { type: String, required: true },

    /** Denormalized for fast display in TPC views */
    student_name: { type: String, required: false, default: '' },

    /** tblCollage._id — tenant key */
    college_id: { type: String, required: true },

    /** tblDepartments._id — for DeptTPC scoping */
    department_id: { type: String, required: false, default: null },

    /** Denormalized department name for display */
    department_name: { type: String, required: false, default: '' },

    /** Week number (1–8) */
    week_number: {
        type: Number,
        required: true,
        min: 1,
        max: 8
    },

    // ─── Q1: Confidence (1–5 star rating) ─────────────────────────────
    q1_confidence_score: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    // ─── Q2: Placement Readiness ───────────────────────────────────────
    q2_placement_readiness: {
        type: String,
        required: true,
        enum: ['a_lot_more_ready', 'somewhat_more_ready', 'about_the_same', 'more_confused']
    },

    // ─── Q3: Difficulty Level ──────────────────────────────────────────
    q3_difficulty_level: {
        type: String,
        required: true,
        enum: ['too_easy', 'just_right', 'a_little_hard', 'too_overwhelming']
    },

    // ─── Q4: Industry / Placement Relevance ───────────────────────────
    q4_industry_relevance: {
        type: String,
        required: true,
        enum: ['very_relevant', 'mostly_aligned', 'unsure', 'not_really']
    },

    // ─── Q5: Workload vs College Schedule ─────────────────────────────
    q5_workload_manageable: {
        type: String,
        required: true,
        enum: ['very_manageable', 'manageable_but_tight', 'clashed_with_college', 'couldnt_complete']
    },

    // ─── Q6: Felt Supported ───────────────────────────────────────────
    q6_felt_supported: {
        type: String,
        required: true,
        enum: ['yes_all_resources', 'mostly_yes', 'not_really', 'no_felt_lost']
    },

    // ─── Q7: NPS Score (1–10) ─────────────────────────────────────────
    q7_nps_score: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },

    // ─── Q8: Open Text (optional) ─────────────────────────────────────
    q8_loved: { type: String, required: false, default: '' },
    q8_improve: { type: String, required: false, default: '' },

    // ─── Metadata ────────────────────────────────────────────────────
    submitted_at: {
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
    },
    deleted: { type: Boolean, required: false, default: false }
};
