import { executeData, fetchData } from '../methods.js';

export default class testStateController {
    /**
     * Get test state for a student
     * Route: POST /test-state/get
     */
    async getTestState(req, res, next) {
        try {
            const { testId } = req.body || {};
            const userId = req.user?.id || req.headers['x-user-id'];
            
            if (!userId || !testId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Test ID and user ID are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            const response = await fetchData(
                'tblTestState',
                {},
                { student_id: userId, test_id: testId },
                { sort: { updated_at: -1 }, limit: 1 }
            );

            if (response.success && response.data && response.data.length > 0) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Test state fetched successfully',
                    data: response.data[0]
                };
            } else {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'No test state found',
                    data: null
                };
            }
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error fetching test state',
                error: error.message
            };
            next();
        }
    }

    /**
     * Update test state (for tracking active tests, multiple tabs, etc.)
     * Route: POST /test-state/:testId
     */
    async updateTestState(req, res, next) {
        try {
            const { testId, isActive, timestamp, tabCount } = req.body || {};
            const userId = req.user?.id || req.headers['x-user-id'];
            
            if (!userId || !testId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Test ID and user ID are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            // Check if test state exists
            const existing = await fetchData(
                'tblTestState',
                {},
                { student_id: userId, test_id: testId },
                { limit: 1 }
            );

            const testStateData = {
                student_id: userId,
                test_id: testId,
                is_active: isActive !== undefined ? isActive : true,
                timestamp: timestamp || Date.now(),
                tab_count: tabCount || 1,
                updated_at: new Date().toISOString()
            };

            let response;
            if (existing.data && existing.data.length > 0) {
                // Update existing
                response = await executeData(
                    'tblTestState',
                    testStateData,
                    'u',
                    null,
                    { student_id: userId, test_id: testId }
                );
            } else {
                // Create new
                testStateData.created_at = new Date();
                response = await executeData(
                    'tblTestState',
                    testStateData,
                    'i',
                    null
                );
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Test state updated successfully',
                data: testStateData
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error updating test state',
                error: error.message
            };
            next();
        }
    }

    /**
     * Clear test state (when test ends)
     * Route: POST /test-state/clear
     */
    async clearTestState(req, res, next) {
        try {
            const { testId } = req.body || {};
            const userId = req.user?.id || req.headers['x-user-id'];
            
            if (!userId || !testId) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Test ID and user ID are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            await executeData(
                'tblTestState',
                {},
                'd',
                null,
                { student_id: userId, test_id: testId }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Test state cleared successfully'
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error clearing test state',
                error: error.message
            };
            next();
        }
    }
}
