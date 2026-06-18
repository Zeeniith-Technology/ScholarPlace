import { fetchData, executeData } from '../../methods.js';
import crmDealSchema from '../../schema/crm/crmDeal.js';
import { ObjectId } from 'mongodb';

export default class CrmDealsController {
    async list(req, res, next) {
        try {
            const { college_id } = req.body;
            const filter = { deleted: false };
            if (college_id) filter.college_id = college_id;

            const response = await fetchData('tblCrmDeals', {}, filter, { req });
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Deals fetched',
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
            const { college_id, pricing_tier, student_count_estimate, price_per_student, total_value, semester_start, status, notes } = req.body;
            const { id: userId } = req.user;

            if (!college_id) {
                res.locals.responseData = { success: false, status: 400, message: 'College ID is required' };
                return next();
            }

            // Verify the college is accessible to this user
            const collegeCheck = await fetchData('tblCrmColleges', { _id: 1 }, { _id: new ObjectId(college_id), deleted: false }, { req });
            if (!collegeCheck.success || collegeCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied to this college' };
                return next();
            }

            const safeFields = { college_id, pricing_tier, student_count_estimate, price_per_student, total_value, semester_start, status, notes };
            Object.keys(safeFields).forEach(k => safeFields[k] === undefined && delete safeFields[k]);

            const data = { ...safeFields, created_by: userId };

            const response = await executeData('tblCrmDeals', data, 'i', crmDealSchema);
            res.locals.responseData = { success: true, status: 201, message: 'Deal created', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async update(req, res, next) {
        try {
            const { id, pricing_tier, student_count_estimate, price_per_student, total_value, semester_start, status, notes } = req.body;
            if (!id) throw new Error('Deal ID required');

            const ownerCheck = await fetchData('tblCrmDeals', { college_id: 1 }, { _id: new ObjectId(id) }, { req });
            if (!ownerCheck.success || ownerCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                return next();
            }

            const safeFields = { pricing_tier, student_count_estimate, price_per_student, total_value, semester_start, status, notes };
            Object.keys(safeFields).forEach(k => safeFields[k] === undefined && delete safeFields[k]);

            const response = await executeData('tblCrmDeals', safeFields, 'u', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'Deal updated', data: response.data };
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
                res.locals.responseData = { success: false, status: 400, message: 'Deal ID is required' };
                return next();
            }

            // Ownership check: verify deal belongs to a college accessible to this user
            const dealCheck = await fetchData('tblCrmDeals', { college_id: 1 }, { _id: new ObjectId(id), deleted: false });
            if (!dealCheck.success || dealCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'Deal not found' };
                return next();
            }
            const collegeId = dealCheck.data[0].college_id;
            const collegeCheck = await fetchData('tblCrmColleges', { _id: 1 }, { _id: new ObjectId(collegeId), deleted: false }, { req });
            if (!collegeCheck.success || collegeCheck.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'Access denied' };
                return next();
            }

            await executeData('tblCrmDeals', {}, 'd', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'Deal deleted' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }
}
