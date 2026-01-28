import { executeData, fetchData } from '../../methods.js';
import departmentSchema from '../../schema/superadmin/department.js';
import tpcManagementController from '../tpcManagement.js';

const tablename = "tblDepartments";
const tpcManagement = new tpcManagementController();

export default class departmentController {

    async listdepartments(req, res, next) {
        try {
            const { projection, filter, options, collegeId } = req.body;
            
            // If collegeId is provided (for public signup), fetch departments for that college
            if (collegeId) {
                const { ObjectId } = await import('mongodb');
                const collegeIdFilter = typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
                    ? new ObjectId(collegeId)
                    : collegeId;

                // Get college info to check collage_departments array
                const collegeResponse = await fetchData(
                    'tblCollage',
                    { collage_departments: 1, collage_name: 1 },
                    { _id: collegeIdFilter, deleted: false, collage_status: 1, collage_subscription_status: 'active' }
                );
                
                const college = collegeResponse.success && collegeResponse.data && collegeResponse.data.length > 0 
                    ? collegeResponse.data[0] 
                    : null;
                
                if (!college) {
                    res.locals.responseData = {
                        success: false,
                        status: 404,
                        message: 'College not found or inactive',
                        error: 'Invalid college ID'
                    };
                    return next();
                }

                const collegeDepartmentIds = college.collage_departments || [];
                
                // Build department filter
                let departmentFilter = {
                    department_status: 1,
                    deleted: false
                };
                
                // If college has collage_departments array, use it
                if (collegeDepartmentIds.length > 0) {
                    const departmentObjectIds = collegeDepartmentIds.map(id => {
                        if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
                            return new ObjectId(id);
                        }
                        return id;
                    });
                    departmentFilter._id = { $in: departmentObjectIds };
                } else {
                    // Fallback: check collage_id or department_college_id
                    departmentFilter.$or = [
                        { collage_id: collegeIdFilter },
                        { department_college_id: collegeIdFilter }
                    ];
                }
                
                const response = await fetchData(
                    tablename,
                    { _id: 1, department_id: 1, department_name: 1, department_code: 1, department_status: 1 },
                    departmentFilter,
                    { sort: { department_name: 1 } }
                );
                
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'Departments fetched successfully',
                    data: response.data || []
                };
                return next();
            }
            
            // Otherwise, use the original filter-based approach (for authenticated Superadmin)
            const fetchOptions = {
                ...(options || {}),
                ...(req ? { req: req } : {})
            };
            
            const response = await fetchData(
                tablename,
                projection || {},
                filter || {},
                fetchOptions
            );
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Departments fetched successfully',
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
    
    async insertdepartment(req, res, next) {
        try {
            const { create_tpc_account, department_tpc_name, department_tpc_id, department_tpc_password, department_tpc_contact, department_college_id, ...departmentData } = req.body;
            
            // Insert department
            const response = await executeData(tablename, departmentData, 'i', departmentSchema);
            
            if (!response.success) {
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Department insertion failed',
                    error: response.error || 'Failed to create department'
                };
                return next();
            }

            const departmentId = response.data?.insertedId || response.data?._id;
            let deptTpcId = null;

            // Create Department TPC account if requested
            if (create_tpc_account && department_tpc_name && department_tpc_id && department_tpc_password && department_college_id) {
                try {
                    // Create DeptTPC account using TPC Management Controller
                    const deptTpcResult = await tpcManagement.createDeptTpcInternal({
                        dept_tpc_name: department_tpc_name,
                        dept_tpc_email: department_tpc_id,
                        dept_tpc_password: department_tpc_password,
                        dept_tpc_contact: department_tpc_contact,
                        department_id: departmentId.toString(),
                        collage_id: department_college_id
                    });

                    if (deptTpcResult.success) {
                        deptTpcId = deptTpcResult.data?.dept_tpc_id;
                    } else {
                        // Log error but don't fail department creation
                        console.error('Failed to create DeptTPC account:', deptTpcResult.error);
                    }
                } catch (tpcError) {
                    // Log error but don't fail department creation
                    console.error('Error creating DeptTPC account:', tpcError.message);
                }
            }
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: create_tpc_account && deptTpcId 
                    ? 'Department and DeptTPC account created successfully' 
                    : 'Department created successfully',
                data: {
                    department: response.data,
                    dept_tpc_id: deptTpcId
                }
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

    async updatedepartment(req, res, next) {
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

            const response = await executeData(tablename, data, 'u', departmentSchema, filter, options || {});
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Department updated successfully',
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

    async deletedepartment(req, res, next) {
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

            const response = await executeData(tablename, null, 'd', departmentSchema, filter, deleteOptions);
            
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Department deleted successfully',
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
