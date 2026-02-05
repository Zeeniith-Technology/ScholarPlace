/**
 * PersonMaster Schema
 * Schema definition for person/user master data
 * 
 * Note: With MongoDB native driver, schemas are defined here for reference
 * but validation happens at application level or via MongoDB schema validation
 * 
 * To use ObjectId in code:
 * import { ObjectId } from 'mongodb';
 * const personId = new ObjectId();
 */

const personMaster = {
    // personId as MongoDB ObjectId
    // In code: import { ObjectId } from 'mongodb'; then use new ObjectId()
    personId: { type: 'ObjectId', required: false }, // MongoDB ObjectId type
    
    // Core fields (matching controller expectations)
    person_email: { type: String, required: true, unique: true },
    person_name: { type: String, required: true },
    person_role: { type: String, required: true }, // student, dept-tpc, tpc, superadmin
    person_password: { type: String, required: true },
    person_status: { type: String, default: 'active' }, // active, inactive
    person_deleted: { type: Boolean, default: false },
    
    // Additional fields
    contact_number: { type: String },
    /**
     * College reference (CRITICAL for multi-tenancy)
     * Stores tblCollage._id (as stringified ObjectId in most flows; sometimes ObjectId in legacy data)
     *
     * - Written on signup (Signup.js)
     * - Embedded into JWT as `college_id` on login (login.js)
     * - Used across controllers to scope TPC/DeptTPC/student data to the correct college
     */
    person_collage_id: { type: String },
    // Department display value (historically stored as name/code). Keep as String.
    department: { type: String },
    // Department reference id (preferred for joins/filters); stored as stringified ObjectId.
    department_id: { type: String },
    semester: { type: Number },
    enrollment_number: { type: String },
    college_name: { type: String },
    last_login: { type: String },
    
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
}

export default personMaster;


