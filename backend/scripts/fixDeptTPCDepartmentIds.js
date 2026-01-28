/**
 * Fix DeptTPC Department IDs
 * Updates all DeptTPC users in PersonMaster with correct department_id
 * Resolves department_id from college documents if missing
 * 
 * Run: node backend/scripts/fixDeptTPCDepartmentIds.js
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
dotenv.config();

async function fixDeptTPCDepartmentIds() {
    try {
        await connectDB();
        const db = getDB();
        const { ObjectId } = await import('mongodb');
        
        console.log('🔧 Fixing DeptTPC Department IDs...\n');
        
        // Find all DeptTPC users
        const deptTPCUsers = await db.collection('tblPersonMaster').find({
            person_role: 'DeptTPC',
            person_deleted: false
        }).toArray();
        
        console.log(`📊 Found ${deptTPCUsers.length} DeptTPC users\n`);
        
        let fixed = 0;
        let skipped = 0;
        let errors = 0;
        
        for (const user of deptTPCUsers) {
            try {
                console.log(`🔍 Processing: ${user.person_email}`);
                console.log(`   Current department_id: ${user.department_id || 'null'}`);
                console.log(`   Current department: ${user.department || 'null'}`);
                
                // If already has department_id, skip
                if (user.department_id) {
                    console.log('   ✅ Already has department_id - skipping\n');
                    skipped++;
                    continue;
                }
                
                // Need college_id to resolve department
                if (!user.person_collage_id) {
                    console.log('   ⚠️  No college_id - cannot resolve department\n');
                    errors++;
                    continue;
                }
                
                // Get college
                const collegeId = user.person_collage_id;
                const collegeIdObj = typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
                    ? new ObjectId(collegeId)
                    : collegeId;
                
                const college = await db.collection('tblCollage').findOne({
                    _id: collegeIdObj,
                    deleted: false
                });
                
                if (!college) {
                    console.log(`   ⚠️  College not found: ${collegeId}\n`);
                    errors++;
                    continue;
                }
                
                // Find matching department in college.departments[]
                let resolvedDeptId = null;
                let resolvedDeptName = null;
                
                if (college.departments && Array.isArray(college.departments)) {
                    const matchingDept = college.departments.find(dept => {
                        return dept.dept_tpc?.person_id?.toString() === user._id.toString();
                    });
                    
                    if (matchingDept) {
                        resolvedDeptId = matchingDept.department_id?.toString?.() || matchingDept.department_id;
                        resolvedDeptName = matchingDept.department_name || matchingDept.department_code;
                        console.log(`   ✅ Found in college.departments[]: ${resolvedDeptId}`);
                    }
                }
                
                // Fallback: Try collage_departments[] → tblDepartments
                if (!resolvedDeptId && user.department && college.collage_departments) {
                    const deptObjectIds = college.collage_departments.map(id => {
                        if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
                            return new ObjectId(id);
                        }
                        return id;
                    });
                    
                    const deptMatch = await db.collection('tblDepartments').findOne({
                        _id: { $in: deptObjectIds },
                        deleted: false,
                        $or: [
                            { department_name: user.department.trim() },
                            { department_code: user.department.trim() }
                        ]
                    });
                    
                    if (deptMatch) {
                        resolvedDeptId = deptMatch._id?.toString?.() || deptMatch._id;
                        resolvedDeptName = deptMatch.department_name || deptMatch.department_code;
                        console.log(`   ✅ Found via collage_departments[]: ${resolvedDeptId}`);
                    }
                }
                
                if (resolvedDeptId) {
                    // Update PersonMaster
                    await db.collection('tblPersonMaster').updateOne(
                        { _id: user._id },
                        {
                            $set: {
                                department_id: resolvedDeptId,
                                department: resolvedDeptName || user.department
                            }
                        }
                    );
                    
                    console.log(`   ✅ Updated PersonMaster with department_id: ${resolvedDeptId}\n`);
                    fixed++;
                } else {
                    console.log('   ⚠️  Could not resolve department_id\n');
                    errors++;
                }
            } catch (error) {
                console.error(`   ❌ Error processing ${user.person_email}:`, error.message);
                errors++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 Summary:');
        console.log(`   ✅ Fixed: ${fixed} users`);
        console.log(`   ⏭️  Skipped (already had department_id): ${skipped} users`);
        console.log(`   ❌ Errors: ${errors} users`);
        console.log('='.repeat(60));
        
        if (fixed > 0) {
            console.log('\n💡 Next Steps:');
            console.log('   1. Users should log out and log back in to get new JWT tokens');
            console.log('   2. New tokens will include department_id');
            console.log('   3. Students should now be visible');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixDeptTPCDepartmentIds();
