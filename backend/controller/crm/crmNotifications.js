import { fetchData, executeData } from '../../methods.js';
import { ObjectId } from 'mongodb';

export default class CrmNotificationsController {
    async list(req, res, next) {
        try {
            const { id: userId } = req.user;
            const response = await fetchData('tblCrmNotifications', {}, { user_id: userId, deleted: false }, { sort: { created_at: -1 } });
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Notifications fetched',
                data: response.data
            };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async markRead(req, res, next) {
        try {
            const { id } = req.body;
            const { id: userId } = req.user;

            if (!id) {
                res.locals.responseData = { success: false, status: 400, message: 'Notification ID is required' };
                return next();
            }

            // Ownership check — only the recipient can mark their own notification read
            const check = await fetchData('tblCrmNotifications', { user_id: 1 }, { _id: new ObjectId(id), deleted: false });
            if (!check.success || check.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'Notification not found' };
                return next();
            }
            if (check.data[0].user_id?.toString() !== userId?.toString()) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                return next();
            }

            await executeData('tblCrmNotifications', { is_read: true }, 'u', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'Marked as read' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async markAllRead(req, res, next) {
        try {
            const { id: userId } = req.user;
            // user_id filter ensures users can only mark their own notifications
            await executeData('tblCrmNotifications', { $set: { is_read: true } }, 'u', null, { user_id: userId }, { many: true, force: true });
            res.locals.responseData = { success: true, status: 200, message: 'All marked as read' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }
}
