/**
 * Update Specific DeptTPC Department ID
 * Updates a DeptTPC user with the correct department_id
 * 
 * Run: node backend/scripts/updateDeptTPCDepartmentId.js <email> <department_id>
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
dotenv.config();

async function updateDeptTPCDepartmentId(email, departmentId) {
    try {
        await connectDB();
        const db = getDB();
        
        console.log('🔧 Updating DeptTPC Department ID...\n');
        console.log(`📧 Email: ${email}`);
        console.log(`🆔 Department ID: ${departmentId}\n`);
        
        const user = await db.collection('tblPersonMaster').findOne({
            person_email: email.toLowerCase().trim(),
            person_role: 'DeptTPC',
            person_deleted: false
        });
        
        if (!user) {
            console.log('❌ DeptTPC user not found');
            process.exit(1);
        }
        
        console.log(`✅ Found user: ${user.person_name}`);
        console.log(`   Current department_id: ${user.department_id || 'null'}\n`);
        
        // Get department name from tblDepartments
        const { ObjectId } = await import('mongodb');
        const deptIdObj = typeof departmentId === 'string' && /^[0-9a-fA-F]{24}$/.test(departmentId)
            ? new ObjectId(departmentId)
            : departmentId;
        
        const dept = await db.collection('tblDepartments').findOne({
            _id: deptIdObj,
            deleted: false
        });
        
        if (!dept) {
            console.log('❌ Department not found in tblDepartments');
            process.exit(1);
        }
        
        const deptName = dept.department_name || dept.department_code;
        console.log(`✅ Department found: ${deptName}\n`);
        
        // Update PersonMaster
        await db.collection('tblPersonMaster').updateOne(
            { _id: user._id },
            {
                $set: {
                    department_id: departmentId,
                    department: deptName
                }
            }
        );
        
        console.log('✅ Updated PersonMaster:');
        console.log(`   department_id: ${departmentId}`);
        console.log(`   department: ${deptName}\n`);
        
        console.log('💡 Next Steps:');
        console.log('   1. User must log out and log back in');
        console.log('   2. New JWT token will include department_id');
        console.log('   3. Students should now be visible');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

const email = process.argv[2];
const departmentId = process.argv[3];

if (!email || !departmentId) {
    console.log('Usage: node backend/scripts/updateDeptTPCDepartmentId.js <email> <department_id>');
    console.log('Example: node backend/scripts/updateDeptTPCDepartmentId.js himanshu@yopmail.com 696d3755454035c71ee42378');
    process.exit(1);
}

updateDeptTPCDepartmentId(email, departmentId);
