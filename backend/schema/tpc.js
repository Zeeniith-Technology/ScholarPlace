/**
 * College TPC Schema
 * Schema for tblTPC collection
 * One TPC per college
 */
const tpc = {
    tpc_id: { type: String, required: true, unique: true }, // Unique TPC ID/Email
    tpc_name: { type: String, required: true }, // TPC Full Name
    tpc_email: { type: String, required: true, unique: true }, // Email for login
    tpc_password: { type: String, required: true }, // Hashed password
    tpc_contact: { type: String }, // Contact Number
    collage_id: { type: String, required: true }, // Reference to tblCollage._id
    collage_name: { type: String }, // College name (for quick reference)
    tpc_status: { type: String, default: 'active' }, // active, inactive
    tpc_deleted: { type: Boolean, default: false }, // For soft delete
    last_login: { type: String }, // Last login timestamp
    // created_at: Auto-added by executeData
    // updated_at: Auto-added by executeData
};

export default tpc;
