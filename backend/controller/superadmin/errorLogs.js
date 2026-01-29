
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

            const response = await fetchData(
                errorLogTable,
                projection || {},
                filter || {},
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
