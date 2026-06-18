import { fetchData, executeData } from '../../methods.js';
import bcrypt from 'bcrypt';
import { validatePassword } from '../../utils/validators.js';
import { ObjectId } from 'mongodb';

export default class CrmTeamController {
    async list(req, res, next) {
        try {
            // Get all CRM Execs and Superadmins
            const response = await fetchData('tblPersonMaster', 
                { person_name: 1, person_email: 1, person_role: 1, person_status: 1, last_login: 1 }, 
                { person_role: { $in: ['CRMExec', 'Superadmin'] }, person_deleted: false }
            );
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Team fetched successfully',
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
            const { name, email, password } = req.body;
            
            if (!name || !email || !password) {
                throw new Error('Name, email, and password are required');
            }

            const pwdErrors = validatePassword(password);
            if (pwdErrors.length > 0) throw new Error('Password must contain ' + pwdErrors.join(', '));

            const normalizedEmail = email.toLowerCase().trim();

            // Check if exists
            const existing = await fetchData('tblPersonMaster', { _id: 1 }, { person_email: normalizedEmail, person_deleted: false });
            if (existing.success && existing.data.length > 0) {
                throw new Error('Email already exists');
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const userData = {
                person_name: name,
                person_email: normalizedEmail,
                person_password: hashedPassword,
                person_role: 'CRMExec',
                person_status: 'active',
                person_deleted: false
            };

            const response = await executeData('tblPersonMaster', userData, 'i');

            res.locals.responseData = { success: true, status: 201, message: 'Team member created', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async deactivate(req, res, next) {
        try {
            const { id } = req.body;
            if (!id) throw new Error('User ID is required');

            // Deactivate user
            await executeData('tblPersonMaster', { person_status: 'inactive' }, 'u', null, { _id: new ObjectId(id) });
            
            // Unassign all their colleges — match both string and ObjectId forms of assigned_to
            const { ObjectId: ObjId } = await import('mongodb');
            const idFilter = /^[0-9a-fA-F]{24}$/.test(id)
                ? { $or: [{ assigned_to: id }, { assigned_to: new ObjId(id) }] }
                : { assigned_to: id };
            await executeData('tblCrmColleges', { $set: { assigned_to: null, assigned_to_name: '' } }, 'u', null, idFilter, { many: true, force: true });

            res.locals.responseData = { success: true, status: 200, message: 'Team member deactivated and colleges unassigned' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }
}
