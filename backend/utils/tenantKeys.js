/**
 * Tenant Keys & Data-Fetch Helpers
 *
 * RULE: Use only tbl _id as keys. No new key names — avoids conflicts when
 * another developer works on the code.
 *
 * Keys:
 *   - College  = tblCollage._id  → stored as person_collage_id (PersonMaster), college_id (others)
 *   - Department = tblDepartments._id → stored as department_id
 *
 * RULE: Every data fetch that is tenant-scoped MUST confirm college (and
 * department where applicable) using these keys.
 *
 * --- HOW TO USE (what to do with this file) ---
 *
 * 1. In any controller that fetches tenant-scoped data (TPC, DeptTPC, or APIs
 *    that must restrict by college/department):
 *
 *    import { getTenantFromUser, buildPersonMasterFilter, buildStudentIdFilter, personBelongsToTenant } from '../utils/tenantKeys.js';
 *    import { fetchData } from '../methods.js';
 *
 * 2. Get tenant from the logged-in user (tbl _id only):
 *
 *    const user = req.user; // or from getUserInfo()
 *    const { collegeId, departmentId, departmentName } = getTenantFromUser(user);
 *
 * 3. When fetching students/persons from tblPersonMaster, always use a filter
 *    that confirms college (and department for DeptTPC):
 *
 *    const personFilter = buildPersonMasterFilter(collegeId, {
 *      departmentId,      // for DeptTPC; omit for TPC (college-wide)
 *      departmentName,   // fallback if departmentId not set
 *      role: 'student',  // optional
 *    });
 *    const res = await fetchData('tblPersonMaster', {}, personFilter);
 *    const students = res.data || [];
 *
 * 4. When fetching tblStudentProgress, tblPracticeTest, tblCodingSubmissions:
 *    first get allowed student IDs from step 3, then:
 *
 *    const allowedStudentIds = students.map(s => s._id || s.person_id);
 *    const { filter: studentIdFilter } = buildStudentIdFilter(allowedStudentIds);
 *    const progressRes = await fetchData('tblStudentProgress', {}, studentIdFilter);
 *
 * 5. When the client sends a student_id (e.g. "view this student"), verify
 *    the student belongs to your tenant before returning data:
 *
 *    const person = await fetchData('tblPersonMaster', {}, { _id: student_id });
 *    if (!personBelongsToTenant(person.data?.[0], collegeId, departmentId)) {
 *      return res.status(403).json({ success: false, message: 'Student not in your college/department' });
 *    }
 *
 * Use this file so every fetch has proper college + department confirmation
 * and all code uses the same tbl _id keys (no new keys).
 */

import { ObjectId } from 'mongodb';

function toStr(id) {
    if (id == null) return null;
    return typeof id === 'string' ? id : (id?.toString?.() ?? String(id));
}

// --- Key names (tbl _id storage) - do not introduce new keys ---
export const KEY_COLLEGE_PERSON = 'person_collage_id';   // tblPersonMaster: tblCollage._id
export const KEY_COLLEGE = 'college_id';                 // tblCodeReview, tblDeptTest, etc.: tblCollage._id
export const KEY_DEPARTMENT = 'department_id';           // tblPersonMaster, tblDepartments, etc.: tblDepartments._id

/**
 * Get tenant identifiers from user (from JWT/profile).
 * Uses existing fields only: person_collage_id (= tblCollage._id), department_id (= tblDepartments._id).
 *
 * @param {Object} user - req.user or profile from tblPersonMaster
 * @returns {{ collegeId: string|ObjectId|null, departmentId: string|ObjectId|null, departmentName: string|null }}
 */
export function getTenantFromUser(user) {
    if (!user) return { collegeId: null, departmentId: null, departmentName: null };
    const collegeId = user.person_collage_id ?? user.collage_id ?? user.college_id ?? null;
    const departmentId = user.department_id ?? null;
    const departmentName = (user.department != null && user.department !== '') ? user.department : null;
    return { collegeId, departmentId, departmentName };
}

/**
 * Normalize id for query (support both ObjectId and string in DB).
 * Returns { idString, idObject } for building $in filters.
 */
function toIdPair(id) {
    if (id == null) return { idString: null, idObject: null };
    const idString = typeof id === 'string' ? id : (id?.toString?.() ?? String(id));
    const isObjectId = typeof idString === 'string' && /^[0-9a-fA-F]{24}$/.test(idString);
    const idObject = isObjectId ? new ObjectId(idString) : null;
    return { idString, idObject };
}

/**
 * Build filter for tblPersonMaster with college confirmation (required).
 * Use this for every fetch of persons/students so data is always scoped by college (and optionally department).
 *
 * Keys used: person_collage_id (= tblCollage._id), department_id (= tblDepartments._id). No new keys.
 *
 * @param {string|ObjectId} collegeId - tblCollage._id (required)
 * @param {Object} options
 * @param {string|ObjectId} [options.departmentId] - tblDepartments._id (for DeptTPC)
 * @param {string} [options.departmentName] - department name/code (fallback if no departmentId)
 * @param {string} [options.role] - e.g. 'student', 'DeptTPC'
 * @param {boolean} [options.includeInactive] - if false, person_status: 'active' and person_deleted: false
 * @returns {Object} MongoDB filter for tblPersonMaster
 */
export function buildPersonMasterFilter(collegeId, options = {}) {
    const { departmentId, departmentName, role, includeInactive = false } = options;
    const col = toIdPair(collegeId);
    if (!col.idString && !col.idObject) {
        return { _id: null }; // no college = no data
    }

    const filter = {
        person_deleted: false,
        person_role: role ? { $regex: new RegExp(`^${role}$`, 'i') } : undefined,
    };

    // College confirmation: person_collage_id = tblCollage._id (required)
    filter[KEY_COLLEGE_PERSON] =
        col.idObject != null ? { $in: [col.idObject, col.idString].filter(Boolean) } : col.idString;

    if (!includeInactive) {
        filter.person_status = 'active';
    }

    // Department confirmation (optional): department_id = tblDepartments._id
    if (departmentId != null && departmentId !== '') {
        const dept = toIdPair(departmentId);
        const deptConditions = [];
        if (dept.idObject) deptConditions.push({ [KEY_DEPARTMENT]: dept.idObject }, { [KEY_DEPARTMENT]: dept.idString });
        else if (dept.idString) deptConditions.push({ [KEY_DEPARTMENT]: dept.idString });
        if (departmentName) {
            const trimmed = String(departmentName).trim();
            if (trimmed) {
                deptConditions.push({ department: trimmed });
                try {
                    deptConditions.push({ department: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
                } catch (_) {}
            }
        }
        if (deptConditions.length) filter.$or = deptConditions;
    } else if (departmentName) {
        const trimmed = String(departmentName).trim();
        if (trimmed) {
            filter.$or = [
                { department: trimmed },
                { [KEY_DEPARTMENT]: trimmed },
            ];
            try {
                filter.$or.push({ department: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
            } catch (_) {}
        }
    }

    // Remove undefined
    Object.keys(filter).forEach(k => { if (filter[k] === undefined) delete filter[k]; });
    return filter;
}

/**
 * Build filter for collections that have college_id / department_id on the document
 * (e.g. tblCodeReview, tblDeptTest). Use tbl _id only.
 *
 * @param {string|ObjectId} collegeId - tblCollage._id
 * @param {string|ObjectId} [departmentId] - tblDepartments._id
 * @returns {Object} MongoDB filter
 */
export function buildTenantFilter(collegeId, departmentId = null) {
    const col = toIdPair(collegeId);
    const filter = {};
    if (col.idString || col.idObject) {
        filter[KEY_COLLEGE] = col.idObject != null ? { $in: [col.idObject, col.idString] } : col.idString;
    }
    if (departmentId != null && departmentId !== '') {
        const dept = toIdPair(departmentId);
        if (dept.idObject) filter[KEY_DEPARTMENT] = { $in: [dept.idObject, dept.idString] };
        else if (dept.idString) filter[KEY_DEPARTMENT] = dept.idString;
    }
    return filter;
}

/**
 * Build student_id filter for tblStudentProgress, tblPracticeTest, tblCodingSubmissions.
 * Use ONLY after you have resolved allowed student IDs from tblPersonMaster with
 * buildPersonMasterFilter(collegeId, { departmentId, ... }) so every fetch confirms college (and department).
 *
 * @param {Array<string|ObjectId>} allowedStudentIds - IDs from PersonMaster filtered by college/department
 * @returns {{ filter: Object, idStrings: string[], idObjects: ObjectId[] }} for $or student_id filter
 */
export function buildStudentIdFilter(allowedStudentIds) {
    const seen = new Set();
    const idStrings = [];
    const idObjects = [];
    (allowedStudentIds || []).forEach(id => {
        if (id == null) return;
        const s = typeof id === 'string' ? id : (id?.toString?.() ?? String(id));
        if (seen.has(s)) return;
        seen.add(s);
        idStrings.push(s);
        if (/^[0-9a-fA-F]{24}$/.test(s)) idObjects.push(new ObjectId(s));
    });
    const conditions = [];
    if (idStrings.length) conditions.push({ student_id: { $in: idStrings } });
    if (idObjects.length) conditions.push({ student_id: { $in: idObjects } });
    const filter = conditions.length ? { $or: conditions } : { student_id: '__NONE__' };
    return { filter, idStrings, idObjects };
}

/**
 * Get college_id and department_id for a student (for writing to student-related collections).
 * Use req.user when the caller is the student; otherwise fetch from tblPersonMaster by studentId.
 *
 * @param {string|ObjectId} studentId - student _id
 * @param {Object} req - request (req.user may have college_id, department_id)
 * @param {Function} fetchData - fetchData from methods.js (optional; used if req.user not available or different user)
 * @returns {Promise<{ college_id: string|null, department_id: string|null }>}
 */
export async function getCollegeAndDepartmentForStudent(studentId, req, fetchData = null) {
    const sid = toStr(studentId);
    const user = req?.user;
    const reqUserId = user?.id ?? user?.userId ?? user?.person_id;
    const reqUserIdStr = reqUserId != null ? toStr(reqUserId) : null;
    if (reqUserIdStr && sid && reqUserIdStr === sid && (user?.college_id ?? user?.person_collage_id)) {
        return {
            college_id: toStr(user.college_id ?? user.person_collage_id) || null,
            department_id: toStr(user.department_id) || null,
        };
    }
    if (fetchData && sid) {
        try {
            const filter = /^[0-9a-fA-F]{24}$/.test(String(sid))
                ? { $or: [{ _id: sid }, { _id: new ObjectId(sid) }] }
                : { _id: sid };
            const res = await fetchData('tblPersonMaster', { person_collage_id: 1, department_id: 1 }, filter);
            const person = res?.data?.[0];
            if (person) {
                return {
                    college_id: toStr(person.person_collage_id) || null,
                    department_id: toStr(person.department_id) || null,
                };
            }
        } catch (_) {}
    }
    return { college_id: null, department_id: null };
}

/**
 * Verify that a given person/student belongs to the tenant (college and optionally department).
 * Use before returning data when request supplies a student_id or person_id.
 *
 * @param {Object} person - Document from tblPersonMaster
 * @param {string|ObjectId} collegeId - tblCollage._id
 * @param {string|ObjectId} [departmentId] - tblDepartments._id (optional)
 * @returns {boolean}
 */
export function personBelongsToTenant(person, collegeId, departmentId = null) {
    if (!person) return false;
    const col = toIdPair(collegeId);
    const personCol = person.person_collage_id ?? person.collage_id;
    const personColStr = personCol?.toString?.() ?? String(personCol ?? '');
    const matchCollege = col.idString && (personColStr === col.idString || (col.idObject && personColStr === col.idObject.toString()));
    if (!matchCollege) return false;
    if (departmentId == null || departmentId === '') return true;
    const dept = toIdPair(departmentId);
    const personDept = person.department_id ?? person.department;
    const personDeptStr = personDept?.toString?.() ?? String(personDept ?? '');
    return dept.idString && (personDeptStr === dept.idString || (dept.idObject && personDeptStr === dept.idObject.toString()));
}
