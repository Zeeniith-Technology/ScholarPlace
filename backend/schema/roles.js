const roles = {
    role_name: { type: String, required: true },
    // Note: created_at and updated_at are automatically added by executeData
    created_at: { type: String },
    updated_at: { type: String }
}

export default roles;