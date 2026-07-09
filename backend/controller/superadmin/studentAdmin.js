import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { fetchData, executeData } from '../../methods.js';

/**
 * Superadmin Student Administration
 * Account-level controls that only the platform owner should have:
 *  - activate / suspend a student account (suspension blocks login,
 *    since login matches person_status: 'active')
 *  - force-reset a student's password
 *  - move a student to another college/department (validated pairing)
 *
 * All routes are mounted behind requireRole('Superadmin').
 */

/** Match a PersonMaster _id whether stored as ObjectId or string */
function personIdFilter(studentId) {
    if (typeof studentId === 'string' && /^[0-9a-fA-F]{24}$/.test(studentId)) {
        return { $in: [studentId, new ObjectId(studentId)] };
    }
    return studentId;
}

async function findStudent(studentId) {
    const result = await fetchData(
        'tblPersonMaster',
        { person_name: 1, person_email: 1, person_role: 1, person_status: 1, person_collage_id: 1, department_id: 1, department: 1 },
        { _id: personIdFilter(studentId), person_role: 'Student', person_deleted: { $ne: true } }
    );
    return result.success && result.data && result.data.length > 0 ? result.data[0] : null;
}

class StudentAdminController {

    /** POST /superadmin/students/update-status  { studentId, status: 'active' | 'suspended' } */
    async updateStudentStatus(req, res, next) {
        try {
            const { studentId, status } = req.body;
            const allowed = ['active', 'suspended'];

            if (!studentId || !allowed.includes(status)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: `studentId and status (${allowed.join(' | ')}) are required`,
                    error: 'Invalid parameters'
                };
                return next();
            }

            const student = await findStudent(studentId);
            if (!student) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Student not found',
                    error: 'No active student record matches this id'
                };
                return next();
            }

            await executeData(
                'tblPersonMaster',
                { person_status: status, updated_at: new Date().toISOString() },
                'u',
                null,
                { _id: student._id }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: status === 'active' ? 'Student account activated' : 'Student account suspended',
                data: { studentId: String(student._id), person_status: status }
            };
            next();
        } catch (error) {
            console.error('[StudentAdmin] updateStudentStatus error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to update student status',
                error: error.message
            };
            next();
        }
    }

    /** POST /superadmin/students/reset-password  { studentId, newPassword } */
    async resetStudentPassword(req, res, next) {
        try {
            const { studentId, newPassword } = req.body;

            if (!studentId || typeof newPassword !== 'string' || newPassword.length < 8) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'studentId and a newPassword of at least 8 characters are required',
                    error: 'Invalid parameters'
                };
                return next();
            }

            const student = await findStudent(studentId);
            if (!student) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Student not found',
                    error: 'No active student record matches this id'
                };
                return next();
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await executeData(
                'tblPersonMaster',
                { person_password: hashedPassword, updated_at: new Date().toISOString() },
                'u',
                null,
                { _id: student._id }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Password reset for ${student.person_email}`,
                data: { studentId: String(student._id) }
            };
            next();
        } catch (error) {
            console.error('[StudentAdmin] resetStudentPassword error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to reset password',
                error: error.message
            };
            next();
        }
    }

    /** POST /superadmin/students/move  { studentId, collegeId, departmentId } */
    async moveStudent(req, res, next) {
        try {
            const { studentId, collegeId, departmentId } = req.body;

            if (!studentId || !collegeId || !departmentId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'studentId, collegeId and departmentId are required',
                    error: 'Invalid parameters'
                };
                return next();
            }

            const student = await findStudent(studentId);
            if (!student) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Student not found',
                    error: 'No active student record matches this id'
                };
                return next();
            }

            // Validate target college
            const collegeFilter = /^[0-9a-fA-F]{24}$/.test(String(collegeId))
                ? { _id: new ObjectId(String(collegeId)) }
                : { _id: collegeId };
            const collegeRes = await fetchData(
                'tblCollage',
                { collage_name: 1, collage_departments: 1, departments: 1 },
                { ...collegeFilter, deleted: { $ne: true } }
            );
            const college = collegeRes.success && collegeRes.data && collegeRes.data[0];
            if (!college) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Target college not found',
                    error: 'Invalid collegeId'
                };
                return next();
            }

            // Validate target department
            const deptFilter = /^[0-9a-fA-F]{24}$/.test(String(departmentId))
                ? { _id: new ObjectId(String(departmentId)) }
                : { $or: [{ department_id: departmentId }, { _id: departmentId }] };
            const deptRes = await fetchData(
                'tblDepartments',
                { department_name: 1, department_code: 1, collage_id: 1, department_college_id: 1 },
                { ...deptFilter, deleted: { $ne: true } }
            );
            const dept = deptRes.success && deptRes.data && deptRes.data[0];
            if (!dept) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Target department not found',
                    error: 'Invalid departmentId'
                };
                return next();
            }

            // The department must actually belong to the target college
            // (same three checks the signup flow uses: legacy id array,
            // embedded departments array, or the dept's own college pointer)
            const deptIdStr = String(dept._id);
            const collegeIdStr = String(college._id);
            const inLegacyArray = (college.collage_departments || [])
                .some(id => String(id) === deptIdStr);
            const inEmbeddedArray = (college.departments || [])
                .some(d => String(d.department_id) === deptIdStr);
            const deptPointsToCollege =
                String(dept.collage_id || dept.department_college_id || '') === collegeIdStr;

            if (!inLegacyArray && !inEmbeddedArray && !deptPointsToCollege) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: `Department "${dept.department_name}" does not belong to ${college.collage_name}`,
                    error: 'Department not assigned to target college'
                };
                return next();
            }

            const departmentName = dept.department_name || dept.department_code || null;
            await executeData(
                'tblPersonMaster',
                {
                    person_collage_id: collegeIdStr,
                    college_name: college.collage_name,
                    department_id: deptIdStr,
                    department: departmentName,
                    updated_at: new Date().toISOString()
                },
                'u',
                null,
                { _id: student._id }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `${student.person_name} moved to ${college.collage_name} / ${departmentName}`,
                data: {
                    studentId: String(student._id),
                    person_collage_id: collegeIdStr,
                    college_name: college.collage_name,
                    department_id: deptIdStr,
                    department: departmentName
                }
            };
            next();
        } catch (error) {
            console.error('[StudentAdmin] moveStudent error:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to move student',
                error: error.message
            };
            next();
        }
    }
}

export default new StudentAdminController();
