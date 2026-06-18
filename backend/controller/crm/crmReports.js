import { fetchData, getDB } from '../../methods.js';

export default class CrmReportsController {
    async pipeline(req, res, next) {
        try {
            const db = getDB();

            // Use $group aggregation instead of fetching all colleges into memory (M-01)
            const [statusesResp, countDocs] = await Promise.all([
                fetchData('tblCrmStatuses', {}, { deleted: false, is_archived: false }, { sort: { order: 1 } }),
                db.collection('tblCrmColleges').aggregate([
                    { $match: { deleted: false } },
                    { $group: { _id: '$pipeline_status_id', count: { $sum: 1 } } }
                ]).toArray()
            ]);

            const countMap = Object.fromEntries(countDocs.map(c => [c._id, c.count]));

            const pipeline = statusesResp.success ? statusesResp.data.map(s => ({
                id: s._id,
                name: s.name,
                color: s.color,
                count: countMap[s._id.toString()] || 0
            })) : [];

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Pipeline report generated',
                data: pipeline
            };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }

    async teamStats(req, res, next) {
        try {
            const db = getDB();

            const [execsResp, collegeCounts, activityCounts] = await Promise.all([
                fetchData('tblPersonMaster',
                    { person_name: 1, person_email: 1, person_status: 1 },
                    { person_role: 'CRMExec', person_deleted: false }
                ),
                db.collection('tblCrmColleges').aggregate([
                    { $match: { deleted: false, assigned_to: { $ne: null } } },
                    { $group: { _id: '$assigned_to', count: { $sum: 1 } } }
                ]).toArray(),
                db.collection('tblCrmActivities').aggregate([
                    { $match: { created_at: { $gte: new Date(new Date().setDate(1)).toISOString() } } },
                    { $group: { _id: '$user_id', count: { $sum: 1 } } }
                ]).toArray()
            ]);

            const collegeMap = Object.fromEntries(collegeCounts.map(c => [c._id?.toString(), c.count]));
            const activityMap = Object.fromEntries(activityCounts.map(a => [a._id?.toString(), a.count]));

            const execs = (execsResp.data || []).map(e => ({
                id: e._id,
                name: e.person_name,
                email: e.person_email,
                status: e.person_status,
                colleges_assigned: collegeMap[e._id?.toString()] || 0,
                activities_this_month: activityMap[e._id?.toString()] || 0
            }));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Team stats fetched',
                data: {
                    total_execs: execs.length,
                    active_execs: execs.filter(e => e.status === 'active').length,
                    execs
                }
            };
        } catch (error) {
            console.error('[CRM Controller]', error);
            res.locals.responseData = { success: false, status: 500, message: 'An unexpected error occurred', error: process.env.NODE_ENV === 'development' ? error.message : undefined };
        }
        next();
    }
}
