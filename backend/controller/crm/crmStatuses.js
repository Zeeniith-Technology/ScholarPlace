import { fetchData, executeData } from '../../methods.js';
import crmStatusSchema from '../../schema/crm/crmStatus.js';
import { ObjectId } from 'mongodb';

export default class CrmStatusesController {
    async list(req, res, next) {
        try {
            const filter = { is_archived: false, deleted: false };
            const options = { sort: { order: 1 } };
            const response = await fetchData('tblCrmStatuses', {}, filter, options);
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Statuses fetched successfully',
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
            const { name, color, description, is_default } = req.body;
            const { id } = req.user;

            if (!name) throw new Error('Status name is required');

            // Find max order
            const allStatuses = await fetchData('tblCrmStatuses', { order: 1 }, { deleted: false }, { sort: { order: -1 }, limit: 1 });
            let nextOrder = 1;
            if (allStatuses.success && allStatuses.data.length > 0) {
                nextOrder = (allStatuses.data[0].order || 0) + 1;
            }

            const data = {
                name,
                color: color || '#e2e8f0',
                description: description || '',
                is_default: is_default || false,
                order: nextOrder,
                created_by: id
            };

            // Clear default first (before insert) to avoid race condition
            if (is_default) {
                await executeData('tblCrmStatuses', { $set: { is_default: false } }, 'u', null, {}, { many: true, force: true });
            }

            const response = await executeData('tblCrmStatuses', data, 'i', crmStatusSchema);

            res.locals.responseData = { success: true, status: 201, message: 'Status created', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async update(req, res, next) {
        try {
            const { id, name, color, description } = req.body;
            if (!id) throw new Error('Status ID is required');

            const updateData = {};
            if (name) updateData.name = name;
            if (color) updateData.color = color;
            if (description !== undefined) updateData.description = description;

            const response = await executeData('tblCrmStatuses', updateData, 'u', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'Status updated', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async reorder(req, res, next) {
        try {
            const { statusOrders } = req.body;
            if (!Array.isArray(statusOrders) || statusOrders.length === 0)
                throw new Error('statusOrders must be a non-empty array');

            // Validate all items before writing anything to avoid partial state
            for (const item of statusOrders) {
                if (!item.id || typeof item.order !== 'number')
                    throw new Error('Each item needs id (string) and order (number)');
            }

            await Promise.all(statusOrders.map(item =>
                executeData('tblCrmStatuses', { order: item.order }, 'u', null, { _id: new ObjectId(item.id) })
            ));
            res.locals.responseData = { success: true, status: 200, message: 'Statuses reordered' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async archive(req, res, next) {
        try {
            const { id } = req.body;
            if (!id) throw new Error('Status ID is required');

            // Check if any colleges are using this status
            const colleges = await fetchData('tblCrmColleges', { _id: 1 }, { pipeline_status_id: id, deleted: false }, { limit: 1 });
            if (colleges.success && colleges.data.length > 0) {
                res.locals.responseData = { success: false, status: 409, message: 'Cannot archive: colleges are currently in this pipeline stage. Move them first.' };
                return next();
            }

            const response = await executeData('tblCrmStatuses', { is_archived: true }, 'u', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'Status archived', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async setDefault(req, res, next) {
        try {
            const { id } = req.body;
            if (!id) throw new Error('Status ID is required');

            await executeData('tblCrmStatuses', { $set: { is_default: false } }, 'u', null, {}, { many: true, force: true });
            const response = await executeData('tblCrmStatuses', { is_default: true }, 'u', null, { _id: new ObjectId(id) });
            
            res.locals.responseData = { success: true, status: 200, message: 'Default status set', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }
}
