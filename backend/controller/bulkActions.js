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

            // Require DeptTPC role (middleware already checked; ensure we have a DeptTPC identity for consistency)
            const userRole = (req.user?.role || '').toString();
            if (userRole.toLowerCase() !== 'depttpc') {
                res.locals.responseData = { success: false, status: 403, message: 'Not authorized as DeptTPC', error: 'Not authorized as DeptTPC' };
                return next();
            }

            // Resolve DeptTPC: prefer PersonMaster (JWT/single source of truth), then legacy tblDeptTPC
            let department_id = req.user?.department_id || null;
            if (department_id == null) {
                const personRes = await fetchData(
                    'tblPersonMaster',
                    { department_id: 1, person_role: 1 },
                    { _id: userId, person_deleted: false }
                );
                if (personRes.success && personRes.data && personRes.data.length > 0) {
                    department_id = personRes.data[0].department_id || null;
                }
            }
            if (department_id == null) {
                const deptTPC = await fetchData('tblDeptTPC', {}, { person_id: userId });
                if (deptTPC.success && deptTPC.data && deptTPC.data.length > 0) {
                    department_id = deptTPC.data[0].department_id || null;
                }
            }
            // department_id may still be null for some legacy setups; bulk approval does not filter by department
            // Blocked retakes are stored in tblBlockedTestRetake (same as single approve / getBlockedStudents)
            let approved = 0;
            let failed = 0;
            const results = [];
            const { ObjectId } = await import('mongodb');

            for (const student_id of student_ids) {
                try {
                    const studentIdString = (student_id && typeof student_id === 'string') ? student_id : (student_id && typeof student_id.toString === 'function' ? student_id.toString() : String(student_id));

                    // Find all pending blocked records for this student in tblBlockedTestRetake
                    const blockedRes = await fetchData(
                        'tblBlockedTestRetake',
                        {},
                        { student_id: studentIdString, blocked: true, approved_by: null }
                    );

                    if (blockedRes.success && blockedRes.data && blockedRes.data.length > 0) {
                        let studentApproved = 0;
                        for (const record of blockedRes.data) {
                            const updateRes = await executeData(
                                'tblBlockedTestRetake',
                                {
                                    $set: {
                                        blocked: false,
                                        approved_by: (userId && typeof userId.toString === 'function' ? userId.toString() : userId),
                                        approved_at: new Date()
                                    }
                                },
                                'u',
                                null,
                                { _id: record._id instanceof ObjectId ? record._id : new ObjectId(record._id) }
                            );
                            if (updateRes.success) studentApproved++;
                        }
                        if (studentApproved > 0) {
                            approved += studentApproved;
                            results.push({ student_id: studentIdString, success: true, approved_count: studentApproved });
                        } else {
                            failed++;
                            results.push({ student_id: studentIdString, success: false, error: 'Update failed' });
                        }
                    } else {
                        failed++;
                        results.push({ student_id: studentIdString, success: false, error: 'No pending approvals' });
                    }
                } catch (error) {
                    failed++;
                    results.push({ student_id: String(student_id), success: false, error: error.message });
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
