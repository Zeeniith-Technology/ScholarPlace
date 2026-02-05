/**
 * Dept Test Schema
 * Schema definition for tests scheduled by Department TPC
 */

const deptTestSchema = {
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },

    // Creator Info
    created_by: {
        type: String,
        required: true
        // DeptTPC User ID
    },
    department: {
        type: String,
        required: true
    },
    department_id: {
        type: String,
        required: true
    },
    college_id: {
        type: String,
        required: true
    },

    // Test Config
    test_type: {
        type: String,
        enum: ['practice', 'assessment'],
        default: 'practice'
    },
    topic: {
        type: String,
        required: false
        // e.g. "Arrays", "Java Basics"
    },
    question_count: {
        type: Number,
        default: 10
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard', 'Mixed'],
        default: 'Medium'
    },
    duration_minutes: {
        type: Number,
        default: 60
    },

    // Content (Optional: specific questions)
    content_source: {
        type: String,
        enum: ['auto', 'manual'],
        default: 'auto'
    },
    manual_questions: {
        type: Array,
        default: []
        // Object structure: { text, options: [], correct_option, marks }
    },
    question_ids: {
        type: Array,
        default: []
        // If empty and source is auto, questions are auto-generated from 'topic'
    },

    // Assignment / Target
    assignment_type: {
        type: String,
        enum: ['student', 'batch', 'department'],
        required: true
    },
    assigned_to: {
        type: Array,
        default: []
        // If 'student': Array of student_ids
        // If 'batch': Array of semester numbers (e.g. [1, 2])
        // If 'department': Empty (implies all students in creator's dept)
    },

    // Schedule
    scheduled_start: {
        type: Date,
        required: true
    },
    scheduled_end: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled', 'draft'],
        default: 'active'
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

export default deptTestSchema;
