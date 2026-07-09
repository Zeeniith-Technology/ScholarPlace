
import { fetchData } from '../../methods.js';

const errorLogTable = "tblerrorlog";

export default class errorLogController {

    /**
     * List Error Logs
     * POST /superadmin/error-logs/list
     */
    async listErrorLogs(req, res, next) {
        try {
            const { projection, filter, options } = req.body;

            // timestamp is stored as a BSON Date; JSON filters arrive as ISO strings.
            // Coerce $gte/$lte back to Date so range comparisons actually match.
            const safeFilter = { ...(filter || {}) };
            if (safeFilter.timestamp && typeof safeFilter.timestamp === 'object') {
                const ts = { ...safeFilter.timestamp };
                for (const op of ['$gte', '$lte', '$gt', '$lt']) {
                    if (typeof ts[op] === 'string') {
                        const d = new Date(ts[op]);
                        if (!isNaN(d.getTime())) ts[op] = d;
                    }
                }
                safeFilter.timestamp = ts;
            }

            const response = await fetchData(
                errorLogTable,
                projection || {},
                safeFilter,
                {
                    ...(options || {}),
                    sort: options?.sort || { timestamp: -1 } // Default sort by newest
                }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Error logs fetched successfully',
                data: response.data,
                count: response.count
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Fetch failed',
                error: error.message
            };
            next();
        }
    }
}
