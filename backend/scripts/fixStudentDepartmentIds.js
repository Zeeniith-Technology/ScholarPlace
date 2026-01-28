/**
 * Fix Student Department IDs
 * Normalizes student department data:
 * - If department field contains ObjectId string, move it to department_id
 * - Set department to department name from tblDepartments
 * 
 * Run: node backend/scripts/fixStudentDepartmentIds.js
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
dotenv.config();

async function fixStudentDepartmentIds() {
    try {
        await connectDB();
        const db = getDB();
        const { ObjectId } = await import('mongodb');
        
        console.log('🔧 Fixing Student Department IDs...\n');
        
        // Find all students
        const students = await db.collection('tblPersonMaster').find({
            person_role: { $regex: /^student$/i },
            person_deleted: false
        }).toArray();
        
        console.log(`📊 Found ${students.length} students\n`);
        
        let fixed = 0;
        let skipped = 0;
        let errors = 0;
        
        for (const student of students) {
            try {
                const studentDept = student.department;
                const studentDeptId = student.department_id;
                
                // Skip if already has correct department_id
                if (studentDeptId && typeof studentDeptId === 'string' && /^[0-9a-fA-F]{24}$/.test(studentDeptId)) {
                    skipped++;
                    continue;
                }
                
                // Check if department field contains ObjectId string
                if (studentDept && typeof studentDept === 'string' && /^[0-9a-fA-F]{24}$/.test(studentDept)) {
                    console.log(`🔍 Student: ${student.person_name || student.person_email}`);
                    console.log(`   department field contains ObjectId: ${studentDept}`);
                    
                    // This is actually a department_id stored in the wrong field
                    const deptId = studentDept;
                    
                    // Get department name from tblDepartments
                    const deptIdObj = new ObjectId(deptId);
                    const dept = await db.collection('tblDepartments').findOne({
                        _id: deptIdObj,
                        deleted: false
                    });
                    
                    if (dept) {
                        const updateData = {
                            department_id: deptId,
                            department: dept.department_name || dept.department_code || null
                        };
                        
                        await db.collection('tblPersonMaster').updateOne(
                            { _id: student._id },
                            { $set: updateData }
                        );
                        
                        console.log(`   ✅ Fixed: department_id=${deptId}, department="${updateData.department}"\n`);
                        fixed++;
                    } else {
                        console.log(`   ⚠️  Department not found in tblDepartments\n`);
                        errors++;
                    }
                } else {
                    skipped++;
                }
            } catch (error) {
                console.error(`   ❌ Error processing student ${student._id}:`, error.message);
                errors++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 Summary:');
        console.log(`   ✅ Fixed: ${fixed} students`);
        console.log(`   ⏭️  Skipped: ${skipped} students`);
        console.log(`   ❌ Errors: ${errors} students`);
        console.log('='.repeat(60));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixStudentDepartmentIds();
