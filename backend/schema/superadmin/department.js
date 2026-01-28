// Schema reference for tblDepartments collection
// Note: This is for reference only. executeData automatically adds created_at and updated_at timestamps.
const department = {
    department_name: { type: String, required: true },
    department_code: { type: String, required: true }, // e.g., "CSE", "ECE", "ME"
    department_description: { type: String },
    department_status: { type: Number, default: 1 }, // 1 = active, 0 = inactive
    department_tpc_name: { type: String }, // TPC Full Name
    department_tpc_id: { type: String }, // TPC ID/Email for department TPC login
    department_tpc_password: { type: String }, // TPC Password (will be hashed when creating user)
    department_tpc_contact: { type: String }, // TPC Contact Number
    department_college_id: { type: String }, // Reference to college (for creating TPC user)
    // created_at: Auto-added by executeData
    // updated_at: Auto-added by executeData
    deleted: { type: Boolean, default: false }, // For soft delete
};

export default department;
