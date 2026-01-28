import { executeData } from '../methods.js';
import rolesSchema from '../schema/roles.js';

const tablename = "tblRoles";

export default class defaultdata {
    async insertroles(req, res, next) {
        try {
            const data = [
                { role_name: "Superadmin" },
                { role_name: "DeptTPC" },
                { role_name: "TPC" },
                { role_name: "Student" },
            ];
            // Note: executeData automatically adds created_at and updated_at timestamps
            const responseData = await executeData(tablename, data, 'i', rolesSchema);
            if(responseData.success){
                // Return cleaner response
                const insertedIds = responseData.data?.insertedIds 
                    ? Object.values(responseData.data.insertedIds) 
                    : [];
                
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: "Roles inserted successfully",
                    data: {
                        insertedCount: responseData.insertedCount || responseData.data?.insertedCount || 0,
                        insertedIds: insertedIds,
                        roles: data.map((role, index) => ({
                            role_name: role.role_name,
                            id: insertedIds[index] || null
                        }))
                    }
                };
                next();
            }else{
                res.locals.responseData={
                    success:false,
                    status:500,
                    message:"Roles insertion failed",
                    error:responseData.error
                }
                next();
            }
        } catch (error) {
            res.locals.responseData={
                success:false,
                status:500,
                message:"Roles insertion failed",
                error:error.message
            }
            next();
        }
    }
}