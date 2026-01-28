/**
 * Department TPC Schema
 * Schema for tblDeptTPC collection
 * One DeptTPC per department
 */
const deptTpc = {
    dept_tpc_id: { type: String, required: true, unique: true }, // Unique DeptTPC ID/Email
    dept_tpc_name: { type: String, required: true }, // DeptTPC Full Name
    dept_tpc_email: { type: String, required: true, unique: true }, // Email for login
    dept_tpc_password: { type: String, required: true }, // Hashed password
    dept_tpc_contact: { type: String }, // Contact Number
    department_id: { type: String, required: true }, // Reference to tblDepartments._id
    department_name: { type: String }, // Department name (for quick reference)
    department_code: { type: String }, // Department code (e.g., "CSE", "ECE")
    collage_id: { type: String, required: true }, // Reference to tblCollage._id
    collage_name: { type: String }, // College name (for quick reference)
    dept_tpc_status: { type: String, default: 'active' }, // active, inactive
    dept_tpc_deleted: { type: Boolean, default: false }, // For soft delete
    last_login: { type: String }, // Last login timestamp
    // created_at: Auto-added by executeData
    // updated_at: Auto-added by executeData
};

export default deptTpc;
