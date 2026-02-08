import { fetchData, executeData, getDB } from '../methods.js';
import bugReportSchema from '../schema/bugReport.js';
import { uploadBase64ToCloudinary, deleteBulkFromCloudinary } from '../utils/cloudinaryUpload.js';

class BugReportController {
    /**
     * Submit a new bug report
     * POST /bug-report/submit
     * Access: Student, Department TPC
     */
    async submitBugReport(req, res, next) {
        try {
            const { page_url, page_name, bug_description, how_to_reproduce, media_files } = req.body;
            const userId = res.locals.person_id || req.userId || req.user?.id;
            const userRole = res.locals.role || req.user?.role;
            const userName = res.locals.name || req.user?.name || req.user?.fullName;
            const userEmail = res.locals.email || req.user?.email;

            // Validate required fields
            if (!userId || !userRole || !userName || !userEmail) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Authentication required with complete user information'
                };
                return next();
            }

            if (!page_url || !page_name || !bug_description) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Missing required fields: page_url, page_name, bug_description'
                };
                return next();
            }

            // Validate bug description length
            if (bug_description.length < 10) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Bug description must be at least 10 characters'
                };
                return next();
            }

            // Validate role (case-insensitive check for DeptTPC or Student)
            const role = userRole ? userRole.toLowerCase() : '';
            const isStudent = role === 'student';
            const isDeptTPC = role === 'depttpc' || role === 'department tpc';

            if (!isStudent && !isDeptTPC) {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Only Students and Department TPCs can submit bug reports'
                };
                return next();
            }

            // Upload media files to Cloudinary if provided
            let uploadedMedia = [];
            if (media_files && Array.isArray(media_files) && media_files.length > 0) {
                // Validate file count (max 5 files)
                if (media_files.length > 5) {
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: 'Maximum 5 media files allowed per bug report'
                    };
                    return next();
                }

                try {
                    const uploadPromises = media_files.map(file =>
                        uploadBase64ToCloudinary(file.data, 'scholarplace_bug', file.type || 'auto')
                    );
                    uploadedMedia = await Promise.all(uploadPromises);
                } catch (uploadError) {
                    console.error('[Bug Report] Media upload failed:', uploadError);

                    // Check if it's a size validation error
                    const errorMessage = uploadError.message || 'Failed to upload media files';

                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: errorMessage.includes('exceeds maximum')
                            ? errorMessage
                            : 'Failed to upload media files. Please ensure images are under 10MB and videos are under 50MB.'
                    };
                    return next();
                }
            }

            // Get college info if available (for students)
            let collegeId = res.locals.college_id || req.user?.college_id;
            let collegeName = res.locals.college_name || req.user?.college_name;

            // Prepare bug report data
            const bugReportData = {
                reporter_id: userId.toString(),
                reporter_name: userName,
                reporter_email: userEmail,
                reporter_role: userRole,
                college_id: collegeId || null,
                college_name: collegeName || null,
                page_url: page_url,
                page_name: page_name,
                bug_description: bug_description,
                how_to_reproduce: how_to_reproduce || null,
                media_files: uploadedMedia,
                status: 'new',
                priority: 'medium',
                created_at: new Date(),
                updated_at: new Date()
            };

            // Save to database
            const result = await executeData(
                'tblBugReport',
                bugReportData,
                'i', // Insert
                bugReportSchema,
                {}
            );

            if (result.success) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Bug report submitted successfully. We will review it soon.',
                    data: {
                        report_id: result.data._id || result.data.insertedId,
                        status: 'new'
                    }
                };
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to submit bug report'
                };
            }

            return next();
        } catch (error) {
            console.error('[Bug Report Submit Error]:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Internal server error while submitting bug report'
            };
            return next();
        }
    }

    /**
     * Get my bug reports (user's own reports only)
     * POST /bug-report/my-reports
     * Access: Student, Department TPC
     */
    async getMyReports(req, res, next) {
        try {
            const { page = 1, limit = 20, status } = req.body;
            const userId = res.locals.person_id || req.userId || req.user?.id;

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Authentication required'
                };
                return next();
            }

            // Build filter
            const filter = { reporter_id: userId.toString() };
            if (status) {
                filter.status = status;
            }

            // Pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const result = await fetchData(
                'tblBugReport',
                {},
                filter,
                {
                    sort: { created_at: -1 },
                    limit: parseInt(limit),
                    skip: skip
                }
            );

            // Get total count for pagination
            const db = getDB();
            const collection = db.collection('tblBugReport');
            const totalCount = await collection.countDocuments(filter);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Bug reports fetched successfully',
                data: {
                    reports: (result.data || []).map(report => ({
                        ...report,
                        reported_by: {
                            id: report.reporter_id,
                            name: report.reporter_name,
                            email: report.reporter_email,
                            role: report.reporter_role
                        }
                    })),
                    pagination: {
                        current_page: parseInt(page),
                        total_pages: Math.ceil(totalCount / parseInt(limit)),
                        total_count: totalCount,
                        limit: parseInt(limit)
                    }
                }
            };

            return next();
        } catch (error) {
            console.error('[Get My Reports Error]:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Internal server error while fetching bug reports'
            };
            return next();
        }
    }

    /**
     * View a single bug report
     * POST /bug-report/view
     * Access: Student/TPC (own reports only), Superadmin (all)
     */
    async viewReport(req, res, next) {
        try {
            const { report_id } = req.body;
            const userId = res.locals.person_id || req.userId || req.user?.id;
            const userRole = res.locals.role || req.user?.role;

            if (!userId) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Authentication required'
                };
                return next();
            }

            if (!report_id) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'report_id is required'
                };
                return next();
            }

            // Import ObjectId
            const { ObjectId } = await import('mongodb');
            let mongoId;
            try {
                mongoId = new ObjectId(report_id);
            } catch (err) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Invalid report_id format'
                };
                return next();
            }

            // Fetch the report
            const result = await fetchData(
                'tblBugReport',
                {},
                { _id: mongoId },
                {}
            );

            if (!result.data || result.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Bug report not found'
                };
                return next();
            }

            const report = result.data[0];

            // Check access: Non-superadmins can only view their own reports
            const role = userRole ? userRole.toLowerCase() : '';
            const isSuperadmin = role === 'superadmin';

            if (!isSuperadmin && report.reporter_id !== userId.toString()) {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'You can only view your own bug reports'
                };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Bug report fetched successfully',
                data: {
                    ...report,
                    reported_by: {
                        id: report.reporter_id,
                        name: report.reporter_name,
                        email: report.reporter_email,
                        role: report.reporter_role
                    }
                }
            };

            return next();
        } catch (error) {
            console.error('[View Report Error]:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Internal server error while fetching bug report'
            };
            return next();
        }
    }

    /**
     * Get all bug reports (Superadmin only)
     * POST /bug-report/all
     * Access: Superadmin only
     */
    async getAllReports(req, res, next) {
        try {
            const {
                status,
                priority,
                reporter_role,
                date_from,
                date_to,
                page = 1,
                limit = 20
            } = req.body;

            // Build filter
            const filter = {};
            if (status) filter.status = status;
            if (priority) filter.priority = priority;
            if (reporter_role) filter.reporter_role = reporter_role;

            // Date range filter
            if (date_from || date_to) {
                filter.created_at = {};
                if (date_from) filter.created_at.$gte = new Date(date_from);
                if (date_to) filter.created_at.$lte = new Date(date_to);
            }

            // Pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const result = await fetchData(
                'tblBugReport',
                {},
                filter,
                {
                    sort: { created_at: -1 },
                    limit: parseInt(limit),
                    skip: skip
                }
            );

            // Get total count for pagination
            const db = getDB();
            const collection = db.collection('tblBugReport');
            const totalCount = await collection.countDocuments(filter);

            // Get counts by status for dashboard stats
            const statusCounts = await collection.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]).toArray();

            const stats = {
                total: totalCount,
                new: statusCounts.find(s => s._id === 'new')?.count || 0,
                in_progress: statusCounts.find(s => s._id === 'in_progress')?.count || 0,
                hold: statusCounts.find(s => s._id === 'hold')?.count || 0,
                solved: statusCounts.find(s => s._id === 'solved')?.count || 0,
                not_a_bug: statusCounts.find(s => s._id === 'not_a_bug')?.count || 0
            };

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Bug reports fetched successfully',
                data: {
                    reports: (result.data || []).map(report => ({
                        ...report,
                        reported_by: {
                            id: report.reporter_id,
                            name: report.reporter_name,
                            email: report.reporter_email,
                            role: report.reporter_role
                        }
                    })),
                    stats: stats,
                    pagination: {
                        current_page: parseInt(page),
                        total_pages: Math.ceil(totalCount / parseInt(limit)),
                        total_count: totalCount,
                        limit: parseInt(limit)
                    }
                }
            };

            return next();
        } catch (error) {
            console.error('[Get All Reports Error]:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Internal server error while fetching bug reports'
            };
            return next();
        }
    }

    /**
     * Update bug report status (Superadmin only)
     * POST /bug-report/update-status
     * Access: Superadmin only
     */
    async updateStatus(req, res, next) {
        try {
            const { report_id, status, admin_notes, not_a_bug_reason, priority } = req.body;
            const adminId = res.locals.person_id || req.userId || req.user?.id;
            const adminName = res.locals.name || req.user?.name || req.user?.fullName;

            if (!report_id || !status) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'report_id and status are required'
                };
                return next();
            }

            // Validate status
            const validStatuses = ['new', 'in_progress', 'hold', 'solved', 'not_a_bug'];
            if (!validStatuses.includes(status)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                };
                return next();
            }

            // Validate priority if provided
            if (priority) {
                const validPriorities = ['low', 'medium', 'high', 'critical'];
                if (!validPriorities.includes(priority)) {
                    res.locals.responseData = {
                        success: false,
                        status: 400,
                        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
                    };
                    return next();
                }
            }

            // If status is 'not_a_bug', require reason
            if (status === 'not_a_bug' && !not_a_bug_reason) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'not_a_bug_reason is required when marking as "not_a_bug"'
                };
                return next();
            }

            // Import ObjectId
            const { ObjectId } = await import('mongodb');
            let mongoId;
            try {
                mongoId = new ObjectId(report_id);
            } catch (err) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Invalid report_id format'
                };
                return next();
            }

            // Prepare update data
            const updateData = {
                status: status,
                updated_at: new Date()
            };

            if (admin_notes) updateData.admin_notes = admin_notes;
            if (not_a_bug_reason) updateData.not_a_bug_reason = not_a_bug_reason;
            if (priority) updateData.priority = priority;
            if (adminId) {
                updateData.assigned_to = adminId.toString();
                updateData.assigned_to_name = adminName;
            }
            if (status === 'solved') {
                updateData.resolved_at = new Date();
            }

            // Update the bug report
            const result = await executeData(
                'tblBugReport',
                updateData,
                'u', // Update
                bugReportSchema,
                { _id: mongoId }
            );

            if (result.success) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Bug report status updated successfully',
                    data: { report_id, status }
                };
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to update bug report status'
                };
            }

            return next();
        } catch (error) {
            console.error('[Update Status Error]:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Internal server error while updating bug report'
            };
            return next();
        }
    }

    /**
     * Delete a bug report (Superadmin only)
     * POST /bug-report/delete
     * Access: Superadmin only
     */
    async deleteReport(req, res, next) {
        try {
            const { report_id } = req.body;

            if (!report_id) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'report_id is required'
                };
                return next();
            }

            // Import ObjectId
            const { ObjectId } = await import('mongodb');
            let mongoId;
            try {
                mongoId = new ObjectId(report_id);
            } catch (err) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Invalid report_id format'
                };
                return next();
            }

            // Get report first to delete media files
            const report = await fetchData(
                'tblBugReport',
                {},
                { _id: mongoId },
                {}
            );

            if (report.data && report.data.length > 0 && report.data[0].media_files && report.data[0].media_files.length > 0) {
                // Delete media files from Cloudinary
                try {
                    await deleteBulkFromCloudinary(report.data[0].media_files);
                } catch (cloudinaryError) {
                    console.error('[Cloudinary Delete Error]:', cloudinaryError);
                    // Continue with deletion even if Cloudinary fails
                }
            }

            // Delete from database
            const db = getDB();
            const collection = db.collection('tblBugReport');
            const result = await collection.deleteOne({ _id: mongoId });

            if (result.deletedCount > 0) {
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Bug report deleted successfully'
                };
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'Bug report not found'
                };
            }

            return next();
        } catch (error) {
            console.error('[Delete Report Error]:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Internal server error while deleting bug report'
            };
            return next();
        }
    }
}

export default new BugReportController();
