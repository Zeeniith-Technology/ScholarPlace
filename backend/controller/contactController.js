import { executeData, fetchData } from '../methods.js';
import contactSchema from '../schema/contact.js';

class ContactController {
    /**
     * Submit a new contact inquiry
     * POST /contact/submit
     * Access: Public
     */
    async submitContact(req, res, next) {
        try {
            const { name, email, subject, message } = req.body;

            // Validate required fields
            if (!name || !email || !subject || !message) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'All fields are required'
                };
                return next();
            }

            // Create new contact submission
            const result = await executeData(
                'contact',
                {
                    name,
                    email,
                    subject,
                    message,
                    status: 'new'
                },
                'i',
                contactSchema
            );

            if (!result.success) {
                throw new Error('Failed to submit inquiry');
            }

            let responseData = result.data;
            if (responseData && responseData.insertedId) {
                responseData = { ...responseData, insertedId: responseData.insertedId.toString() };
            }

            res.locals.responseData = {
                success: true,
                status: 201,
                message: 'Inquiry submitted successfully',
                data: responseData
            };
            return next();
        } catch (err) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: err.message || 'Internal Server Error'
            };
            return next();
        }
    }

    /**
     * Get all contact inquiries (Superadmin only)
     * POST /contact/all
     * Access: Superadmin
     */
    async getAllContacts(req, res, next) {
        try {
            const { page = 1, limit = 20, status } = req.body;
            const skip = (page - 1) * limit;

            const filter = {};
            if (status && status !== 'all') {
                filter.status = status;
            }

            // Fetch inquiries
            const result = await fetchData(
                'contact',
                filter,
                filter,
                { skip, limit, sort: { created_at: -1 } }
            );

            // Get total count for pagination
            // Note: fetchData wrapper might not return total count directly in standard way, 
            // but we'll use what we get. If needed we can adjust.
            // For now assuming result.data is the array.

            // To get count we might need another call or if fetchData supports it.
            // Let's assume basic fetching first.

            // Convert _id to string for frontend compatibility
            const inquiries = (result.data || []).map(contact => ({
                ...contact,
                _id: contact._id.toString()
            }));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Inquiries fetched successfully',
                data: {
                    inquiries: inquiries,
                }
            };
            return next();
        } catch (err) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: err.message || 'Internal Server Error'
            };
            return next();
        }
    }

    /**
     * Update inquiry status
     * POST /contact/update-status
     * Access: Superadmin
     */
    async updateStatus(req, res, next) {
        try {
            const { id, status } = req.body;

            if (!id || !status) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'ID and status are required'
                };
                return next();
            }

            const result = await executeData(
                'contact',
                {
                    status
                },
                { _id: id }
            );

            if (!result.success) {
                throw new Error('Failed to update status');
            }

            if (result.data && result.data._id) {
                result.data._id = result.data._id.toString();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Status updated successfully',
                data: result.data
            };
            return next();

        } catch (err) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: err.message || 'Internal Server Error'
            };
            return next();
        }
    }

    /**
     * Delete an inquiry
     * POST /contact/delete
     * Access: Superadmin
     */
    async deleteContact(req, res, next) {
        try {
            const { id } = req.body;

            if (!id) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'ID is required'
                };
                return next();
            }

            const result = await executeData(
                'contact',
                null,
                'd',
                null,
                { _id: id },
                { hardDelete: true }
            );

            if (!result.success) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Inquiry not found or could not be deleted'
                };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Inquiry deleted successfully'
            };
            return next();

        } catch (err) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: err.message || 'Internal Server Error'
            };
            return next();
        }
    }
}

export default new ContactController();
