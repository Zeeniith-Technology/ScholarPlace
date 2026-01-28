import { fetchData, executeData } from '../methods.js';

/**
 * Bulk Actions Controller
 * Handles bulk operations for TPC and DeptTPC
 */
class BulkActionsController {

    /**
     * Bulk Approve Test Retakes (DeptTPC only)
     * Route: POST /dept-tpc/bulk-approve-retakes
     */
    async bulkApproveRetakes(req, res, next) {
        try {
            const { student_ids } = req.body;
            const userId = req.userId || req.user?.id;

            if (!userId) {
                res.locals.responseData = { success: false, status: 401, message: 'Unauthorized' };
                return next();
            }

            if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
                res.locals.responseData = { success: false, status: 400, message: 'Student IDs array is required' };
                return next();
            }

            // Get DeptTPC info to verify department
            const deptTPC = await fetchData('tblDeptTPC', {}, { person_id: userId });
            if (!deptTPC.success || !deptTPC.data || deptTPC.data.length === 0) {
                res.locals.responseData = { success: false, status: 403, message: 'Not authorized as DeptTPC' };
                return next();
            }

            const department_id = deptTPC.data[0].department_id;
            let approved = 0;
            let failed = 0;
            const results = [];

            for (const student_id of student_ids) {
                try {
                    // Get student progress with blocked retake
                    const progressRes = await fetchData(
                        'tblStudentProgress',
                        {},
                        {
                            student_id: student_id,
                            'blocked_tests.requires_approval': true,
                            'blocked_tests.approved': false
                        }
                    );

                    if (progressRes.success && progressRes.data && progressRes.data.length > 0) {
                        const progress = progressRes.data[0];
                        const updated_blocked_tests = progress.blocked_tests.map(bt => {
                            if (bt.requires_approval && !bt.approved) {
                                return {
                                    ...bt,
                                    approved: true,
                                    approved_by: userId,
                                    approved_at: new Date()
                                };
                            }
                            return bt;
                        });

                        const updateRes = await executeData(
                            'tblStudentProgress',
                            { blocked_tests: updated_blocked_tests },
                            { student_id: student_id }
                        );

                        if (updateRes.success) {
                            approved++;
                            results.push({ student_id, success: true });
                        } else {
                            failed++;
                            results.push({ student_id, success: false, error: 'Update failed' });
                        }
                    } else {
                        failed++;
                        results.push({ student_id, success: false, error: 'No pending approvals' });
                    }
                } catch (error) {
                    failed++;
                    results.push({ student_id, success: false, error: error.message });
                }
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Bulk approval complete. ${approved} approved, ${failed} failed`,
                data: {
                    total: student_ids.length,
                    approved,
                    failed,
                    results
                }
            };
            next();
        } catch (error) {
            console.error('[BulkActions] Error in bulk approve:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error processing bulk approval',
                error: error.message
            };
            next();
        }
    }

    /**
     * Export All Students (TPC/DeptTPC)
     * Route: POST /tpc/export-students
     * Route: POST /dept-tpc/export-students
     */
    async exportStudents(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const { format = 'csv', department_id } = req.body;

            if (!userId) {
                res.locals.responseData = { success: false, status: 401, message: 'Unauthorized' };
                return next();
            }

            // Get user role
            const personRes = await fetchData('tblPersonMaster', {}, { _id: userId });
            if (!personRes.success || !personRes.data || personRes.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'User not found' };
                return next();
            }

            const role = personRes.data[0].person_role;
            let filter = {};

            // If DeptTPC, filter by department
            if (role === 'DeptTPC') {
                const deptTPC = await fetchData('tblDeptTPC', {}, { person_id: userId });
                if (deptTPC.success && deptTPC.data && deptTPC.data.length > 0) {
                    filter.person_department = deptTPC.data[0].department_id;
                }
            } else if (role === 'TPC') {
                // TPC can see all students in their college
                const tpc = await fetchData('tblTPC', {}, { person_id: userId });
                if (tpc.success && tpc.data && tpc.data.length > 0) {
                    filter.person_collage = tpc.data[0].college_id;
                }
            }

            // Additional filter by department if provided
            if (department_id) {
                filter.person_department = department_id;
            }

            // Fetch students
            filter.person_role = 'Student';
            const studentsRes = await fetchData('tblPersonMaster', {}, filter);

            if (!studentsRes.success || !studentsRes.data) {
                res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch students' };
                return next();
            }

            const students = studentsRes.data;

            // Fetch additional data (progress, departments)
            const studentsWithDetails = await Promise.all(students.map(async (student) => {
                const progressRes = await fetchData('tblStudentProgress', {}, { student_id: student._id.toString() });
                const deptRes = student.person_department
                    ? await fetchData('tblDepartment', {}, { _id: student.person_department })
                    : { success: false };

                return {
                    id: student._id,
                    name: student.person_name,
                    email: student.person_email,
                    roll_number: student.person_rollno || '',
                    department: deptRes.success && deptRes.data && deptRes.data.length > 0
                        ? deptRes.data[0].department_name
                        : 'N/A',
                    phone: student.person_phone || '',
                    total_progress: progressRes.success && progressRes.data && progressRes.data.length > 0
                        ? progressRes.data.length
                        : 0,
                    created_at: student.created_at || new Date()
                };
            }));

            res.locals.responseData = {
                success: true,
                status: 200,
                message: `Retrieved ${studentsWithDetails.length} students`,
                data: studentsWithDetails
            };
            next();
        } catch (error) {
            console.error('[BulkActions] Error exporting students:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Error exporting students',
                error: error.message
            };
            next();
        }
    }
}

export default BulkActionsController;
