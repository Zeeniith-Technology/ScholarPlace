import { fetchData, executeData } from '../../methods.js';
import crmContactSchema from '../../schema/crm/crmContact.js';
import { ObjectId } from 'mongodb';

export default class CrmContactsController {
    async list(req, res, next) {
        try {
            const { college_id, page = 1, limit = 50 } = req.body || {};

            let filter = { deleted: false };
            if (college_id) {
                // Verify requesting user has access to this college
                const collegeCheck = await fetchData('tblCrmColleges', { _id: 1 }, { _id: new ObjectId(college_id), deleted: false }, { req });
                if (!collegeCheck.success || collegeCheck.data.length === 0) {
                    res.locals.responseData = { success: false, status: 403, message: 'Access denied to this college' };
                    return next();
                }
                filter.college_id = college_id;
            }

            const safeLimit = Math.min(parseInt(limit) || 50, 100);
            const skip = (parseInt(page) - 1) * safeLimit;

            const response = await fetchData('tblCrmContacts', {}, filter, { req, limit: safeLimit, skip });
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Contacts fetched successfully',
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
            const { college_id, name, designation, email, phone, whatsapp, is_primary, linkedin_url, notes } = req.body;
            if (!college_id || !name) throw new Error('College ID and name are required');

            if (is_primary) {
                await executeData('tblCrmContacts', { $set: { is_primary: false } }, 'u', null, { college_id, deleted: false }, { many: true, force: true });
            }

            const safeFields = { college_id, name, designation, email, phone, whatsapp, is_primary, linkedin_url, notes };
            Object.keys(safeFields).forEach(k => safeFields[k] === undefined && delete safeFields[k]);

            const response = await executeData('tblCrmContacts', safeFields, 'i', crmContactSchema);
            res.locals.responseData = { success: true, status: 201, message: 'Contact created', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async update(req, res, next) {
        try {
            const { id, name, designation, email, phone, whatsapp, is_primary, linkedin_url, notes } = req.body;
            if (!id) {
                res.locals.responseData = { success: false, status: 400, message: 'Contact ID is required' };
                return next();
            }

            // Fetch the contact to get its college_id for ownership verification
            const contactCheck = await fetchData('tblCrmContacts', { college_id: 1 }, { _id: new ObjectId(id), deleted: false });
            if (!contactCheck.success || contactCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'Contact not found' };
                return next();
            }
            const collegeId = contactCheck.data[0].college_id;

            // Verify the college is accessible to this user
            const collegeCheck = await fetchData('tblCrmColleges', { _id: 1 }, { _id: new ObjectId(collegeId), deleted: false }, { req });
            if (!collegeCheck.success || collegeCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                return next();
            }

            const safeFields = { name, designation, email, phone, whatsapp, linkedin_url, notes };
            Object.keys(safeFields).forEach(k => safeFields[k] === undefined && delete safeFields[k]);

            if (is_primary === true) {
                // Clear primary on siblings first, then mark this one primary
                await executeData('tblCrmContacts', { $set: { is_primary: false } }, 'u', null, { college_id: collegeId, deleted: false }, { many: true, force: true });
                safeFields.is_primary = true;
            } else if (is_primary === false) {
                safeFields.is_primary = false;
            }

            const response = await executeData('tblCrmContacts', safeFields, 'u', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'Contact updated', data: response.data };
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
                res.locals.responseData = { success: false, status: 400, message: 'Contact ID required' };
                return next();
            }

            const check = await fetchData('tblCrmContacts', { college_id: 1 }, { _id: new ObjectId(id) });
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

            await executeData('tblCrmContacts', {}, 'd', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'Contact deleted' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }
}
