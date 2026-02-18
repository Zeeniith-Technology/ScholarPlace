/**
 * Certificate Schema
 * Issued when a student completes all 8 weeks (week 8 status === 'completed')
 */
export default {
    student_id: { type: String, required: true },
    student_name: { type: String, required: false },
    student_email: { type: String, required: false },
    college_id: { type: String, required: false },
    department_id: { type: String, required: false },
    cloudinary_url: { type: String, required: true },
    cloudinary_public_id: { type: String, required: false },
    issued_at: { type: Date, required: false, default: Date.now },
    created_at: { type: String, required: false, default: () => new Date().toISOString() },
    deleted: { type: Boolean, required: false, default: false }
};
