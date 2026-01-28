// Schema reference for tblCollage collection
// Note: This is for reference only. executeData automatically adds created_at and updated_at timestamps.
const collage = {
    // collage_id: { type: 'ObjectId' }, // Optional: if you want a custom ObjectId field
    collage_name: { type: String, required: true }, // Auto-converted to UPPERCASE in controller
    collage_address: { type: String, required: true },
    collage_city: { type: String, required: true },
    collage_state: { type: String, required: true },
    collage_country: { type: String, required: true },
    collage_pincode: { type: String, required: true },
    collage_contact_number: { type: String, required: true },
    collage_email: { type: String, required: true },
    collage_website: { type: String, required: true },
    collage_logo: { type: String, required: true },
    collage_status: { type: Number, default: 1 }, // 1 = active, 0 = inactive
    collage_subscription_status: { type: String, default: 'active' }, // 'active' or 'inactive'
    collage_type: { type: String, required: true }, // e.g., "Engineering", "Medical", etc.
    deleted: { type: Boolean, default: false }, // For soft delete
    
    // TPC Users Array - College-level TPCs
    // Structure: [{ person_id (reference to tblPersonMaster._id), created_at, updated_at }]
    // All user data (name, email, contact, status) is in tblPersonMaster
    tpc_users: { 
        type: Array, 
        default: [] 
    },
    
    // Departments Array - Each department with its DeptTPC
    // Structure: [{ 
    //   department_id, 
    //   department_name, 
    //   department_code,
    //   dept_tpc: { person_id (reference to tblPersonMaster._id), created_at, updated_at }
    // }]
    // All user data (name, email, contact, status) is in tblPersonMaster
    departments: { 
        type: Array, 
        default: [] 
    },
    
    // Legacy field - kept for backward compatibility during migration
    // Will be removed after migration
    collage_departments: { type: Array, default: [] }, // Array of department IDs (references to tblDepartments)
    
    // Legacy TPC fields - kept for backward compatibility
    // Will be removed after migration
    collage_tpc_person: { type: String }, // TPC Person Name (for display) - DEPRECATED
    collage_tpc_email: { type: String }, // TPC Email for login - DEPRECATED
    collage_tpc_password: { type: String }, // TPC Password (will be hashed when creating user) - DEPRECATED
    collage_tpc_contact: { type: String }, // TPC Contact Number - DEPRECATED
    
    // created_at: Auto-added by executeData
    // updated_at: Auto-added by executeData
};

export default collage;
