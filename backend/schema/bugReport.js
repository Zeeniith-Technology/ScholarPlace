/**
 * Bug Report Schema
 * Collection: tblBugReport
 * Purpose: Track bug reports from Students and Department TPCs
 */

const bugReportSchema = {
    // Reporter Information (auto-populated from JWT)
    reporter_id: {
        type: 'string',
        required: true,
        description: 'User ID from JWT token'
    },
    reporter_name: {
        type: 'string',
        required: true,
        description: 'Full name of reporter'
    },
    reporter_email: {
        type: 'string',
        required: true,
        description: 'Email of reporter'
    },
    reporter_role: {
        type: 'string',
        required: true,
        enum: ['Student', 'Department TPC'],
        description: 'Role of the person reporting'
    },

    // College Information
    college_id: {
        type: 'string',
        required: false,
        description: 'College ID if applicable'
    },
    college_name: {
        type: 'string',
        required: false,
        description: 'College name'
    },

    // Bug Details
    page_url: {
        type: 'string',
        required: true,
        description: 'URL or page path where bug occurred'
    },
    page_name: {
        type: 'string',
        required: true,
        description: 'Friendly name of the page'
    },
    bug_description: {
        type: 'string',
        required: true,
        description: 'Detailed description of the bug'
    },
    how_to_reproduce: {
        type: 'string',
        required: false,
        description: 'Steps to reproduce the bug (optional)'
    },

    // Media Attachments (Cloudinary URLs)
    media_files: {
        type: 'array',
        required: false,
        default: () => [],
        description: 'Array of uploaded media files (images/videos)'
    },

    // Status Management
    status: {
        type: 'string',
        required: true,
        enum: ['new', 'in_progress', 'hold', 'solved', 'not_a_bug'],
        default: 'new',
        description: 'Current status of the bug report'
    },
    priority: {
        type: 'string',
        required: true,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
        description: 'Priority level'
    },

    // Superadmin Response
    admin_notes: {
        type: 'string',
        required: false,
        description: 'Notes from admin handling the bug'
    },
    not_a_bug_reason: {
        type: 'string',
        required: false,
        description: 'Reason when marked as not_a_bug (required for not_a_bug status)'
    },
    assigned_to: {
        type: 'string',
        required: false,
        description: 'Admin ID who is handling this bug'
    },
    assigned_to_name: {
        type: 'string',
        required: false,
        description: 'Admin name who is handling this bug'
    },

    // Timestamps
    created_at: {
        type: 'date',
        required: true,
        default: () => new Date(),
        description: 'When the bug was reported'
    },
    updated_at: {
        type: 'date',
        required: true,
        default: () => new Date(),
        description: 'Last update timestamp'
    },
    resolved_at: {
        type: 'date',
        required: false,
        description: 'When the bug was marked as solved'
    }
};

export default bugReportSchema;
