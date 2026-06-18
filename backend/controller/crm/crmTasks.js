import { fetchData, executeData } from '../../methods.js';
import crmTaskSchema from '../../schema/crm/crmTask.js';
import { ObjectId } from 'mongodb';

export default class CrmTasksController {
    async list(req, res, next) {
        try {
            const { filter_type } = req.body; // today, upcoming, overdue, completed
            
            let filter = { deleted: false };
            const todayStr = new Date().toISOString().split('T')[0];
            
            if (filter_type === 'completed') {
                filter.is_completed = true;
            } else if (filter_type === 'today') {
                filter.is_completed = false;
                filter.due_date = { $regex: `^${todayStr}` };
            } else if (filter_type === 'overdue') {
                filter.is_completed = false;
                filter.due_date = { $lt: todayStr + 'T00:00:00.000Z' };
            } else if (filter_type === 'upcoming') {
                filter.is_completed = false;
                filter.due_date = { $gt: todayStr + 'T23:59:59.999Z' };
            }

            const response = await fetchData('tblCrmTasks', {}, filter, { req, sort: { due_date: 1 } });
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Tasks fetched',
                data: response.data
            };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async create(req, res, next) {
        try {
            const { college_id, title, description, due_date, priority } = req.body;
            const { id: userId, name: userName } = req.user;

            if (!college_id || !title) {
                res.locals.responseData = { success: false, status: 400, message: 'college_id and title are required' };
                return next();
            }

            // Verify user has access to this college
            const collegeCheck = await fetchData('tblCrmColleges', { _id: 1 }, { _id: new ObjectId(college_id), deleted: false }, { req });
            if (!collegeCheck.success || collegeCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied to this college' };
                return next();
            }

            const safeFields = { college_id, title, description, due_date, priority };
            Object.keys(safeFields).forEach(k => safeFields[k] === undefined && delete safeFields[k]);

            const data = {
                ...safeFields,
                assigned_to: userId,
                assigned_to_name: userName,
                created_by: userId
            };

            const response = await executeData('tblCrmTasks', data, 'i', crmTaskSchema);
            res.locals.responseData = { success: true, status: 201, message: 'Task created', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async update(req, res, next) {
        try {
            const { id, title, description, due_date, priority } = req.body;
            if (!id) throw new Error('Task ID required');

            const check = await fetchData('tblCrmTasks', { college_id: 1 }, { _id: new ObjectId(id) });
            if (!check.success || check.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'Not found' };
                return next();
            }
            const collegeId = check.data[0].college_id;
            const collegeCheck = await fetchData('tblCrmColleges', { assigned_to: 1 }, { _id: new ObjectId(collegeId) }, { req });
            if (!collegeCheck.success || collegeCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                return next();
            }

            const safeFields = { title, description, due_date, priority };
            Object.keys(safeFields).forEach(k => safeFields[k] === undefined && delete safeFields[k]);

            const response = await executeData('tblCrmTasks', safeFields, 'u', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'Task updated', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async markComplete(req, res, next) {
        try {
            const { id, is_completed } = req.body;
            if (!id) throw new Error('Task ID required');

            const check = await fetchData('tblCrmTasks', { college_id: 1 }, { _id: new ObjectId(id) });
            if (!check.success || check.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'Not found' };
                return next();
            }
            const collegeId = check.data[0].college_id;
            const collegeCheck = await fetchData('tblCrmColleges', { assigned_to: 1 }, { _id: new ObjectId(collegeId) }, { req });
            if (!collegeCheck.success || collegeCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                return next();
            }

            const updateData = {
                is_completed,
                completed_at: is_completed ? new Date().toISOString() : null
            };

            await executeData('tblCrmTasks', updateData, 'u', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'Task status updated' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async delete(req, res, next) {
        try {
            const { id } = req.body;
            if (!id) {
                res.locals.responseData = { success: false, status: 400, message: 'Task ID required' };
                return next();
            }

            const check = await fetchData('tblCrmTasks', { college_id: 1 }, { _id: new ObjectId(id) });
            if (!check.success || check.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'Not found' };
                return next();
            }
            const collegeId = check.data[0].college_id;
            const collegeCheck = await fetchData('tblCrmColleges', { assigned_to: 1 }, { _id: new ObjectId(collegeId) }, { req });
            if (!collegeCheck.success || collegeCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                return next();
            }

            await executeData('tblCrmTasks', {}, 'd', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'Task deleted' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }
}
