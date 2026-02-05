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

            // Get user role + tenant (single source of truth: tblPersonMaster)
            const personRes = await fetchData(
                'tblPersonMaster',
                { person_role: 1, person_collage_id: 1, department_id: 1, department: 1, person_deleted: 1 },
                { _id: userId, person_deleted: false }
            );
            if (!personRes.success || !personRes.data || personRes.data.length === 0) {
                res.locals.responseData = { success: false, status: 404, message: 'User not found' };
                return next();
            }

            const me = personRes.data[0];
            const role = (me.person_role || '').toString();
            const myCollegeId = me.person_collage_id?.toString?.() || me.person_collage_id || null;
            const myDeptId = me.department_id?.toString?.() || me.department_id || null;

            // Build tenant-safe student filter (use existing keys only)
            const studentFilter = {
                person_deleted: false,
                person_role: { $regex: /^student$/i },
                ...(myCollegeId ? { person_collage_id: myCollegeId } : {}),
            };
            // DeptTPC: restrict to their department by default
            if (role.toLowerCase() === 'depttpc' && myDeptId) {
                studentFilter.department_id = myDeptId;
            }
            // Optional extra department filter from request (TPC may filter by dept)
            if (department_id) {
                studentFilter.department_id = department_id;
            }

            const studentsRes = await fetchData(
                'tblPersonMaster',
                { _id: 1, person_name: 1, person_email: 1, person_rollno: 1, enrollment_number: 1, department_id: 1, person_collage_id: 1, contact_number: 1, created_at: 1, createdAt: 1 },
                studentFilter
            );

            if (!studentsRes.success || !studentsRes.data) {
                res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch students' };
                return next();
            }

            const students = studentsRes.data;

            // Fetch additional data (progress, departments)
            const studentsWithDetails = await Promise.all(students.map(async (student) => {
                const sid = student._id?.toString?.() || student._id;
                const sCollege = student.person_collage_id?.toString?.() || student.person_collage_id || myCollegeId;
                const sDept = student.department_id?.toString?.() || student.department_id || null;

                // Tenant confirmation on progress (new fields)
                const progressRes = await fetchData(
                    'tblStudentProgress',
                    {},
                    {
                        student_id: sid,
                        ...(sCollege ? { college_id: sCollege } : {}),
                        ...(sDept ? { department_id: sDept } : {}),
                    }
                );

                const deptRes = sDept
                    ? await fetchData('tblDepartments', { department_name: 1, department_code: 1 }, { _id: sDept, deleted: false })
                    : { success: false };

                return {
                    id: student._id,
                    name: student.person_name,
                    email: student.person_email,
                    roll_number: student.person_rollno || '',
                    department: deptRes.success && deptRes.data && deptRes.data.length > 0
                        ? (deptRes.data[0].department_name || deptRes.data[0].department_code)
                        : 'N/A',
                    phone: student.contact_number || '',
                    total_progress: progressRes.success && progressRes.data && progressRes.data.length > 0
                        ? progressRes.data.length
                        : 0,
                    created_at: (() => {
                        const t = student.created_at || student.createdAt;
                        return t ? (t instanceof Date ? t.toISOString() : t) : new Date().toISOString();
                    })()
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
