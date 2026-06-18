/**
 * Middleware to enforce CRM Executive access rules.
 * SuperAdmin is allowed to do everything.
 * CRMExec can only operate on colleges assigned to them.
 * This is useful for routes where we need to ensure the action being taken
 * on a college (or its sub-resources like tasks/contacts) belongs to the exec.
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
             res.locals.responseData = {
                success: false,
                status: 403,
                message: 'Access denied. Must be a CRM Executive or Superadmin.'
            };
            return next();
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
            res.locals.responseData = {
                success: false,
                status: 404,
                message: 'College not found.'
            };
            return next();
        }

        const college = collegeResponse.data[0];
        
        // Convert to string for safe comparison
        const assignedTo = college.assigned_to?.toString() || String(college.assigned_to);
        const myId = id?.toString() || String(id);

        if (assignedTo !== myId) {
             res.locals.responseData = {
                success: false,
                status: 403,
                message: 'Access denied. This college is not assigned to you.'
            };
            return next();
        }

        next();
    } catch (error) {
        res.locals.responseData = {
            success: false,
            status: 500,
            message: 'Error verifying CRM access.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        };
        return next();
    }
};
