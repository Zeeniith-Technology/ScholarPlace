import { fetchData, executeData } from '../../methods.js';
import crmActivitySchema from '../../schema/crm/crmActivity.js';
import { ObjectId } from 'mongodb';

export default class CrmActivitiesController {
    async list(req, res, next) {
        try {
            const { college_id, page = 1, limit = 20 } = req.body || {};

            const safeLimit = Math.min(parseInt(limit) || 20, 100);
            const skip = (parseInt(page) - 1) * safeLimit;

            let filter = { deleted: false };
            if (college_id) filter.college_id = college_id;

            const response = await fetchData(
                'tblCrmActivities', {}, filter,
                { req, sort: { activity_date: -1 }, limit: safeLimit, skip, count: true }
            );
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Activities fetched',
                data: response.data,
                total: response.count,
                page: parseInt(page),
                limit: safeLimit
            };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async create(req, res, next) {
        try {
            const { college_id, type, title, description, outcome, next_follow_up_date } = req.body;
            const { id: userId, name: userName } = req.user;

            if (!college_id || !type || !title) {
                res.locals.responseData = { success: false, status: 400, message: 'college_id, type, and title are required' };
                return next();
            }

            // Verify user has access to this college
            const collegeCheck = await fetchData('tblCrmColleges', { _id: 1 }, { _id: new ObjectId(college_id), deleted: false }, { req });
            if (!collegeCheck.success || collegeCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied to this college' };
                return next();
            }

            const data = {
                college_id,
                user_id: userId,
                user_name: userName,
                type,
                title,
                description,
                outcome,
                next_follow_up_date
            };

            const response = await executeData('tblCrmActivities', data, 'i', crmActivitySchema);

            // Update college last_activity_at (fire-and-forget — non-critical)
            executeData('tblCrmColleges', { last_activity_at: new Date().toISOString() }, 'u', null, { _id: new ObjectId(college_id) })
                .catch(err => console.error('[CRM Activities] last_activity_at update failed:', err));

            res.locals.responseData = { success: true, status: 201, message: 'Activity logged', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }
}
