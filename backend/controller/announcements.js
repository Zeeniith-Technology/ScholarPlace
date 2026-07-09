import { ObjectId } from 'mongodb';
import { fetchData, executeData } from '../methods.js';
import { getTenantFromUser } from '../utils/tenantKeys.js';

/**
 * Announcements
 * Superadmin broadcasts a notice; students see it as a dismissible banner.
 * An announcement can target ALL colleges (target_college_id = null) or a single
 * college. Optional starts_at/ends_at give a scheduling window.
 *
 * Superadmin routes are behind requireRole('Superadmin'); the student-facing
 * feed is behind requireRole('Student') and scoped server-side by the caller's
 * own college (never trusts a client-supplied college id).
 */

const SEVERITIES = ['info', 'success', 'warning', 'critical'];

/** Match an _id whether stored as ObjectId or string */
function idFilter(id) {
    const s = String(id);
    if (/^[0-9a-fA-F]{24}$/.test(s)) return { $in: [s, new ObjectId(s)] };
    return s;
}

class AnnouncementController {

    /** POST /superadmin/announcements/create */
    async create(req, res, next) {
        try {
            const { title, message, severity, target_college_id, starts_at, ends_at, active } = req.body || {};

            if (!title || !String(title).trim() || !message || !String(message).trim()) {
                res.locals.responseData = {
                    success: false, status: 400,
                    message: 'title and message are required', error: 'Invalid parameters'
                };
                return next();
            }

            const doc = {
                title: String(title).trim(),
                message: String(message).trim(),
                severity: SEVERITIES.includes(severity) ? severity : 'info',
                // null = broadcast to every college
                target_college_id: target_college_id ? String(target_college_id) : null,
                starts_at: starts_at || null,
                ends_at: ends_at || null,
                active: active !== false,
                deleted: false,
                created_by: req.user?.id || null,
                created_by_email: req.user?.email || null,
            };

            const result = await executeData('tblAnnouncement', doc, 'i');
            // executeData wraps the driver result: { success, data: insertOneResult }
            const insertedId = result?.data?.insertedId;
            res.locals.responseData = {
                success: true, status: 201,
                message: 'Announcement created',
                data: { _id: insertedId ? String(insertedId) : null, ...doc }
            };
            next();
        } catch (error) {
            console.error('[Announcements] create error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to create announcement', error: error.message };
            next();
        }
    }

    /** POST /superadmin/announcements/list — all announcements (newest first) */
    async list(req, res, next) {
        try {
            const response = await fetchData(
                'tblAnnouncement',
                {},
                { deleted: { $ne: true } },
                { sort: { created_at: -1 } }
            );
            res.locals.responseData = {
                success: true, status: 200,
                message: 'Announcements fetched',
                data: response.data || []
            };
            next();
        } catch (error) {
            console.error('[Announcements] list error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch announcements', error: error.message };
            next();
        }
    }

    /** POST /superadmin/announcements/update — edit or toggle active */
    async update(req, res, next) {
        try {
            const { _id, ...fields } = req.body || {};
            if (!_id) {
                res.locals.responseData = { success: false, status: 400, message: '_id is required', error: 'Invalid parameters' };
                return next();
            }

            // Only allow a known set of fields to be updated
            const allowed = {};
            if (fields.title !== undefined) allowed.title = String(fields.title).trim();
            if (fields.message !== undefined) allowed.message = String(fields.message).trim();
            if (fields.severity !== undefined) allowed.severity = SEVERITIES.includes(fields.severity) ? fields.severity : 'info';
            if (fields.target_college_id !== undefined) allowed.target_college_id = fields.target_college_id ? String(fields.target_college_id) : null;
            if (fields.starts_at !== undefined) allowed.starts_at = fields.starts_at || null;
            if (fields.ends_at !== undefined) allowed.ends_at = fields.ends_at || null;
            if (fields.active !== undefined) allowed.active = !!fields.active;

            if (Object.keys(allowed).length === 0) {
                res.locals.responseData = { success: false, status: 400, message: 'No updatable fields provided', error: 'Invalid parameters' };
                return next();
            }

            await executeData('tblAnnouncement', allowed, 'u', null, { _id: idFilter(_id) });
            res.locals.responseData = { success: true, status: 200, message: 'Announcement updated', data: { _id: String(_id), ...allowed } };
            next();
        } catch (error) {
            console.error('[Announcements] update error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to update announcement', error: error.message };
            next();
        }
    }

    /** POST /superadmin/announcements/delete — soft delete */
    async remove(req, res, next) {
        try {
            const { _id } = req.body || {};
            if (!_id) {
                res.locals.responseData = { success: false, status: 400, message: '_id is required', error: 'Invalid parameters' };
                return next();
            }
            await executeData('tblAnnouncement', { deleted: true, active: false }, 'u', null, { _id: idFilter(_id) });
            res.locals.responseData = { success: true, status: 200, message: 'Announcement deleted', data: { _id: String(_id) } };
            next();
        } catch (error) {
            console.error('[Announcements] remove error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to delete announcement', error: error.message };
            next();
        }
    }

    /**
     * POST /student/announcements/active
     * Active, in-window announcements targeted to the caller's own college or to all.
     * College is derived from the authenticated user — never from the request body.
     */
    async activeForStudent(req, res, next) {
        try {
            const { collegeId } = getTenantFromUser(req.user);
            const now = new Date().toISOString();

            const filter = {
                active: true,
                deleted: { $ne: true },
                // target_college_id null = all colleges; otherwise must match this student's college
                $or: [
                    { target_college_id: null },
                    ...(collegeId ? [{ target_college_id: String(collegeId) }] : [])
                ],
                // starts_at not in the future (or unset)
                $and: [
                    { $or: [{ starts_at: null }, { starts_at: { $lte: now } }] },
                    { $or: [{ ends_at: null }, { ends_at: { $gte: now } }] }
                ]
            };

            const response = await fetchData(
                'tblAnnouncement',
                { title: 1, message: 1, severity: 1, created_at: 1 },
                filter,
                { sort: { created_at: -1 } }
            );
            res.locals.responseData = {
                success: true, status: 200,
                message: 'Active announcements fetched',
                data: (response.data || []).map(a => ({ ...a, _id: String(a._id) }))
            };
            next();
        } catch (error) {
            console.error('[Announcements] activeForStudent error:', error);
            // Fail soft — a banner outage should never break the student app
            res.locals.responseData = { success: true, status: 200, message: 'No announcements', data: [] };
            next();
        }
    }
}

export default new AnnouncementController();
