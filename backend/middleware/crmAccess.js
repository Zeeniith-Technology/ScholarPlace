/**
 * Middleware to enforce CRM Executive access rules.
 * SuperAdmin is allowed to do everything.
 * CRMExec can only operate on colleges assigned to them.
 * This is useful for routes where we need to ensure the action being taken
 * on a college (or its sub-resources like tasks/contacts) belongs to the exec.
 *
 * IMPORTANT — this MUST send its own response and NOT call next() when it
 * denies. The terminal `responsedata` responder runs AFTER the controller, so
 * setting res.locals.responseData and calling next() hands control to the
 * controller, which overwrites the denial with its own result. That is the
 * same defect fixed in auth.js/requireRole on 2026-07-09; this middleware
 * still had it (verified live: its 403 was replaced by the controller's).
 *
 * No data was ever exposed by that, because `applyRoleBasedFilter` in
 * methods.js independently scopes CRMExec queries to `assigned_to = <user id>`
 * — the identical rule — so this is the second of two layers, not the only one.
 *
 * Note: the college id is read from `college_id`/`params.id`, while some CRM
 * controllers take it as `body.id` (e.g. crmColleges.update). On those routes
 * this check finds no id and passes through, leaving enforcement to the
 * tenant-scoping layer. Reading `body.id` here is deliberately NOT done: on
 * sub-resource routes (contacts/tasks/deals) `id` is that resource's id, not a
 * college id, and looking it up in tblCrmColleges would wrongly 404 them.
 */
import { fetchData } from '../methods.js';

export const requireCrmAccess = async (req, res, next) => {
    try {
        const { role, id } = req.user || {};
        const userRole = role?.toLowerCase();
        
        // Superadmin skips this check
        if (userRole === 'superadmin') {
            return next();
        }

        // If not CRMExec, they shouldn't even be here (handled by requireRole usually)
        if (userRole !== 'crmexec') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Must be a CRM Executive or Superadmin.',
                error: 'CRM_ACCESS_DENIED',
            });
        }

        // Determine college_id from request body or query or params
        const college_id = req.body.college_id || req.query.college_id || req.params.id;
        
        if (!college_id) {
            // For endpoints that don't pass a specific college_id, 
            // the `applyRoleBasedFilter` in `methods.js` will handle isolation during fetch.
            return next();
        }

        // Check if the college belongs to this exec
        const collegeResponse = await fetchData('tblCrmColleges', { assigned_to: 1 }, { _id: college_id });
        
        if (!collegeResponse.success || !collegeResponse.data || collegeResponse.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'College not found.',
                error: 'CRM_COLLEGE_NOT_FOUND',
            });
        }

        const college = collegeResponse.data[0];
        
        // Convert to string for safe comparison
        const assignedTo = college.assigned_to?.toString() || String(college.assigned_to);
        const myId = id?.toString() || String(id);

        if (assignedTo !== myId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This college is not assigned to you.',
                error: 'CRM_ACCESS_DENIED',
            });
        }

        next();
    } catch (error) {
        // Fail CLOSED: this is an access check, so an error here must not be
        // treated as permission granted.
        console.error('[crmAccess] access check failed:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error verifying CRM access.',
            error: process.env.NODE_ENV === 'development' ? error.message : 'CRM_ACCESS_CHECK_FAILED',
        });
    }
};
