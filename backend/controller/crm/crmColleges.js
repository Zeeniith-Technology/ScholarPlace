import { fetchData, executeData, getDB } from '../../methods.js';
import crmCollegeSchema from '../../schema/crm/crmCollege.js';
import { ObjectId } from 'mongodb';

export default class CrmCollegesController {
    async list(req, res, next) {
        try {
            const { status_id, state, priority, assigned_to, page = 1, per_page = 50 } = req.body || {};
            
            let filter = { deleted: false };
            
            if (status_id) filter.pipeline_status_id = status_id;
            if (state) filter.state = state;
            if (priority) filter.priority = priority;
            
            if (assigned_to) {
                if (assigned_to === 'unassigned') filter.assigned_to = null;
                else filter.assigned_to = assigned_to;
            }

            const safeLimit = Math.min(parseInt(per_page) || 50, 100);
            const skip = (parseInt(page) - 1) * safeLimit;

            const response = await fetchData('tblCrmColleges', {}, filter, { req, limit: safeLimit, skip, count: true });

            // Enrich with next follow-up date from most recent pending activity
            let enrichedData = response.data || [];
            if (enrichedData.length > 0) {
                const collegeIds = enrichedData.map(c => c._id?.toString()).filter(Boolean);
                const db = getDB();
                const followUps = await db.collection('tblCrmActivities').aggregate([
                    { $match: { college_id: { $in: collegeIds }, next_follow_up_date: { $ne: null }, deleted: { $ne: true } } },
                    { $sort: { next_follow_up_date: 1 } },
                    { $group: { _id: '$college_id', next_follow_up_date: { $first: '$next_follow_up_date' } } }
                ]).toArray();
                const followUpMap = Object.fromEntries(followUps.map(f => [f._id, f.next_follow_up_date]));
                enrichedData = enrichedData.map(c => ({
                    ...c,
                    next_follow_up_date: followUpMap[c._id?.toString()] || null
                }));
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Colleges fetched successfully',
                data: enrichedData,
                total: response.count,
                page: parseInt(page),
                per_page: safeLimit
            };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async get(req, res, next) {
        try {
            const { id } = req.body;
            if (!id) throw new Error('College ID required');

            // Apply role filter to ensure execs can't fetch other's colleges
            const response = await fetchData('tblCrmColleges', {}, { _id: new ObjectId(id), deleted: false }, { req });
            
            if (!response.success || response.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'College not found or access denied' };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'College fetched',
                data: response.data[0]
            };
        } catch (error) {
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch college', error: error.message };
        }
        next();
    }

    async create(req, res, next) {
        try {
            const { name, city, state, type, pincode, website, student_strength_approx, source, priority, tags, notes, contact_name, contact_phone, pipeline_status_id, follow_up_date } = req.body;
            const { id: userId, name: userName } = req.user;

            if (!name) throw new Error('College name is required');

            let defaultStatusId = pipeline_status_id;
            if (!defaultStatusId) {
                const defaultStatus = await fetchData('tblCrmStatuses', { _id: 1 }, { is_default: true, deleted: false });
                if (defaultStatus.success && defaultStatus.data.length > 0) {
                    defaultStatusId = defaultStatus.data[0]._id.toString();
                } else {
                    const firstStatus = await fetchData('tblCrmStatuses', { _id: 1 }, { deleted: false }, { sort: { order: 1 }, limit: 1 });
                    if (firstStatus.success && firstStatus.data.length > 0) {
                        defaultStatusId = firstStatus.data[0]._id.toString();
                    }
                }
            }

            const now = new Date().toISOString();
            const collegeData = {
                name, city, state, type, pincode, website, student_strength_approx, source, priority, tags, notes,
                pipeline_status_id: defaultStatusId,
                assigned_to: userId,
                assigned_to_name: userName,
                assigned_at: now,
                created_by: userId,
                created_at: now,
            };
            Object.keys(collegeData).forEach(k => collegeData[k] === undefined && delete collegeData[k]);

            const response = await executeData('tblCrmColleges', collegeData, 'i', crmCollegeSchema);
            const collegeId = response.data.insertedId.toString();

            // Create initial contact if provided
            if (contact_name || contact_phone) {
                await executeData('tblCrmContacts', {
                    college_id: collegeId,
                    name: contact_name || 'Primary Contact',
                    phone: contact_phone || '',
                    is_primary: true
                }, 'i');
            }

            // Log initial follow-up activity if a date was provided
            if (follow_up_date) {
                await executeData('tblCrmActivities', {
                    college_id: collegeId,
                    user_id: userId,
                    user_name: userName,
                    type: 'note',
                    title: 'Initial follow-up scheduled',
                    description: 'Follow-up date set at time of adding college.',
                    next_follow_up_date: new Date(follow_up_date).toISOString(),
                    activity_date: now,
                }, 'i');
            }

            res.locals.responseData = { success: true, status: 201, message: 'College created', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async update(req, res, next) {
        try {
            const { id, name, city, state, type, pincode, website, student_strength_approx, source, priority, tags, notes } = req.body;
            if (!id) {
                res.locals.responseData = { success: false, status: 400, message: 'College ID is required' };
                return next();
            }

            const check = await fetchData('tblCrmColleges', { _id: 1 }, { _id: new ObjectId(id), deleted: false }, { req });
            if (!check.success || check.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'College not found or access denied' };
                return next();
            }

            const safeFields = { name, city, state, type, pincode, website, student_strength_approx, source, priority, tags, notes };
            Object.keys(safeFields).forEach(k => safeFields[k] === undefined && delete safeFields[k]);

            if (Object.keys(safeFields).length === 0) {
                res.locals.responseData = { success: false, status: 400, message: 'No valid fields provided to update' };
                return next();
            }

            const response = await executeData('tblCrmColleges', safeFields, 'u', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'College updated', data: response.data };
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
                res.locals.responseData = { success: false, status: 400, message: 'College ID is required' };
                return next();
            }

            const check = await fetchData('tblCrmColleges', { _id: 1 }, { _id: new ObjectId(id), deleted: false }, { req });
            if (!check.success || check.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'College not found or access denied' };
                return next();
            }

            await executeData('tblCrmColleges', {}, 'd', null, { _id: new ObjectId(id) });
            res.locals.responseData = { success: true, status: 200, message: 'College deleted' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async moveStage(req, res, next) {
        try {
            const { college_id, to_status_id, note } = req.body;
            const { id: userId, name: userName } = req.user;

            if (!college_id || !to_status_id) throw new Error('Missing required fields');

            // Access check
            const check = await fetchData('tblCrmColleges', { pipeline_status_id: 1 }, { _id: new ObjectId(college_id), deleted: false }, { req });
            if (!check.success || check.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'College not found or access denied' };
                return next();
            }

            const from_status_id = check.data[0].pipeline_status_id;

            // Update status
            await executeData('tblCrmColleges', { pipeline_status_id: to_status_id, last_activity_at: new Date().toISOString() }, 'u', null, { _id: new ObjectId(college_id) });

            // Log activity
            await executeData('tblCrmActivities', {
                college_id,
                user_id: userId,
                user_name: userName,
                type: 'status_change',
                title: 'Changed Pipeline Stage',
                description: note || 'Moved college to a new stage',
                meta: { from_status_id, to_status_id }
            }, 'i');

            res.locals.responseData = { success: true, status: 200, message: 'Stage moved successfully' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async assign(req, res, next) {
        try {
            const { college_id, to_user_id, to_user_name, reason } = req.body;
            const { id: superAdminId, name: superAdminName } = req.user;

            if (!college_id || !to_user_id) throw new Error('college_id and to_user_id are required');

            const exec = await fetchData('tblPersonMaster', { person_name: 1 }, { _id: new ObjectId(to_user_id), person_role: 'CRMExec', person_deleted: false });
            if (!exec.success || exec.data.length === 0) throw new Error('Target exec not found');
            const verifiedName = exec.data[0].person_name;

            await executeData('tblCrmColleges', {
                assigned_to: to_user_id,
                assigned_to_name: verifiedName,
                assigned_at: new Date().toISOString(),
                assigned_by_name: superAdminName
            }, 'u', null, { _id: new ObjectId(college_id) });

            await executeData('tblCrmActivities', {
                college_id,
                user_id: superAdminId,
                user_name: superAdminName,
                type: 'assigned',
                title: `Assigned to ${verifiedName}`,
                description: reason || 'Assigned by SuperAdmin'
            }, 'i');

            // Create notification
            await executeData('tblCrmNotifications', {
                user_id: to_user_id,
                type: 'assigned',
                title: 'New College Assigned',
                message: `You have been assigned a new college.`,
                related_college_id: college_id
            }, 'i');

            res.locals.responseData = { success: true, status: 200, message: 'College assigned' };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async search(req, res, next) {
        try {
            const { query } = req.body;
            
            if (!query || typeof query !== 'string' || query.trim().length < 2) {
                res.locals.responseData = { success: false, status: 400, message: 'Search query must be at least 2 characters' };
                return next();
            }

            const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            let filter = {
                deleted: false,
                $or: [
                    { name: { $regex: safeQuery, $options: 'i' } },
                    { city: { $regex: safeQuery, $options: 'i' } }
                ]
            };

            const response = await fetchData('tblCrmColleges', { name: 1, city: 1, assigned_to_name: 1, pipeline_status_id: 1 }, filter, { req, limit: 10 });
            
            res.locals.responseData = { success: true, status: 200, message: 'Search successful', data: response.data };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }
}
