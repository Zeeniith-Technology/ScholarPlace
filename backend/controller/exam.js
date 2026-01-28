import { executeData, fetchData } from '../methods.js';
import examSchema from '../schema/exam.js';

export default class examcontroller {

    async listexam(req, res, next) {
        try {
            const { projection, filter, options } = req.body;
            
            // Automatically apply role-based filtering - pass req so fetchData can check headers or req.user
            const fetchOptions = {
                ...(options || {}),
                ...(req ? { req: req } : {}) // Pass req for automatic role-based filtering from headers or JWT
            };
            
            const response = await fetchData(
                'tblExams',
                projection || {},
                filter || {},
                fetchOptions
            );
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Data fetched successfully',
                data: response.data
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
    
    async insertexam(req, res, next) {
        try {
            const data = req.body;
            // Using schema for better readability and automatic defaults/validation
            const response = await executeData('exams', data, 'i', examSchema);
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Exam inserted successfully',
                data: response.data
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Insert failed',
                error: error.message
            };
            next();
        }
    }

    async updateexam(req, res, next) {
        try {
            const { filter, data, options } = req.body;
            
            if (!filter || !data) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Filter and data are required',
                    error: 'Missing required fields'
                };
                return next();
            }

            const response = await executeData('exams', data, 'u', examSchema, filter, options || {});
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Exam updated successfully',
                data: response.data
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Update failed',
                error: error.message
            };
            next();
        }
    }

    async deleteexam(req, res, next) {
        try {
            const { filter, hardDelete, options } = req.body;
            
            if (!filter) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Filter is required',
                    error: 'Missing filter'
                };
                return next();
            }

            const deleteOptions = {
                hardDelete: hardDelete || false,
                ...(options || {})
            };

            const response = await executeData('exams', null, 'd', filter, deleteOptions);
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Exam deleted successfully',
                data: response.data || { deletedCount: response.deletedCount }
            };
            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Delete failed',
                error: error.message
            };
            next();
        }
    }

    
}

