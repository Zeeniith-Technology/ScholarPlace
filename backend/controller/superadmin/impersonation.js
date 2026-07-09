import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { fetchData, executeData } from '../../methods.js';

/**
 * Student Impersonation ("View As") — superadmin only.
 *
 * Mints a short-lived, READ-ONLY token that carries a student's identity plus an
 * `impersonated` flag. The auth middleware recognises that flag and restricts the
 * token to a read allowlist (see utils/impersonation.js), so an impersonated
 * session can never write data, spend on AI/JDoodle, or reach an admin route.
 *
 * Every start is written to tblImpersonationLog for accountability.
 */

const IMPERSONATION_TTL_MIN = 30;

function studentIdFilter(studentId) {
    const s = String(studentId);
    if (/^[0-9a-fA-F]{24}$/.test(s)) return { $in: [s, new ObjectId(s)] };
    return s;
}

class ImpersonationController {

    /** POST /superadmin/impersonate/start  { studentId } */
    async start(req, res, next) {
        try {
            const { studentId } = req.body || {};
            if (!studentId) {
                res.locals.responseData = { success: false, status: 400, message: 'studentId is required', error: 'Invalid parameters' };
                return next();
            }

            const result = await fetchData(
                'tblPersonMaster',
                { person_name: 1, person_email: 1, person_role: 1, person_collage_id: 1, department: 1, department_id: 1, college_name: 1 },
                { _id: studentIdFilter(studentId), person_role: 'Student', person_deleted: { $ne: true } }
            );
            const student = result.success && result.data && result.data[0];
            if (!student) {
                res.locals.responseData = { success: false, status: 404, message: 'Student not found', error: 'No active student matches this id' };
                return next();
            }

            const secret = process.env.JWT_SECRET || 'your-secret-key';
            const token = jwt.sign(
                {
                    id: String(student._id),
                    userId: String(student._id),
                    person_id: String(student._id),
                    email: student.person_email,
                    role: 'Student',
                    college_id: student.person_collage_id,
                    college_name: student.college_name || null,
                    department: student.department || null,
                    department_id: student.department_id || null,
                    // Impersonation markers — auth middleware enforces read-only on these
                    impersonated: true,
                    impersonator_id: req.user?.id || null,
                    impersonator_email: req.user?.email || null,
                },
                secret,
                { expiresIn: `${IMPERSONATION_TTL_MIN}m` }
            );

            // Audit trail (best-effort — never block the start on a log failure)
            executeData('tblImpersonationLog', {
                impersonator_id: req.user?.id || null,
                impersonator_email: req.user?.email || null,
                student_id: String(student._id),
                student_email: student.person_email,
                student_name: student.person_name,
                started_at: new Date().toISOString(),
                ip_address: req.ip || req.connection?.remoteAddress || '',
            }, 'i').catch(e => console.error('[Impersonation] audit log failed:', e.message));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Viewing as ${student.person_name}`,
                data: {
                    token,
                    expiresInMinutes: IMPERSONATION_TTL_MIN,
                    student: { id: String(student._id), name: student.person_name, email: student.person_email },
                }
            };
            next();
        } catch (error) {
            console.error('[Impersonation] start error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to start impersonation', error: error.message };
            next();
        }
    }

    /** POST /superadmin/impersonate/logs — recent impersonation history */
    async logs(req, res, next) {
        try {
            const response = await fetchData(
                'tblImpersonationLog',
                {},
                {},
                { sort: { started_at: -1 }, limit: 100 }
            );
            res.locals.responseData = {
                success: true, status: 200,
                message: 'Impersonation logs fetched',
                data: (response.data || []).map(l => ({ ...l, _id: String(l._id) }))
            };
            next();
        } catch (error) {
            console.error('[Impersonation] logs error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch impersonation logs', error: error.message };
            next();
        }
    }
}

export default new ImpersonationController();
