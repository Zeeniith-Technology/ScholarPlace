/**
 * Test TPC/DeptTPC Student Access
 * Diagnoses why TPC/DeptTPC users can't see students
 * 
 * Run: node backend/scripts/testTPCDeptTPCStudentAccess.js <userEmail>
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
dotenv.config();

async function testStudentAccess(userEmail) {
    try {
        await connectDB();
        const db = getDB();
        
        console.log('🔍 Testing TPC/DeptTPC Student Access...\n');
        console.log(`📧 User Email: ${userEmail}\n`);
        
        // Step 1: Find user in PersonMaster
        const user = await db.collection('tblPersonMaster').findOne({
            person_email: userEmail.toLowerCase().trim(),
            person_deleted: false
        });
        
        if (!user) {
            console.log('❌ User not found in tblPersonMaster');
            console.log('   User must exist in PersonMaster to view students');
            process.exit(1);
        }
        
        console.log('✅ User found in PersonMaster:');
        console.log(`   _id: ${user._id}`);
        console.log(`   role: ${user.person_role}`);
        console.log(`   college_id: ${user.person_collage_id}`);
        console.log(`   department: ${user.department || 'null'}`);
        console.log(`   department_id: ${user.department_id || 'null'}\n`);
        
        // Step 2: Check college
        if (!user.person_collage_id) {
            console.log('❌ User has no person_collage_id');
            console.log('   User must be associated with a college');
            process.exit(1);
        }
        
        const collegeId = user.person_collage_id;
        const college = await db.collection('tblCollage').findOne({
            _id: typeof collegeId === 'string' ? new (await import('mongodb')).ObjectId(collegeId) : collegeId,
            deleted: false
        });
        
        if (!college) {
            console.log(`❌ College not found: ${collegeId}`);
            console.log('   College must exist and be active');
            process.exit(1);
        }
        
        console.log('✅ College found:');
        console.log(`   _id: ${college._id}`);
        console.log(`   name: ${college.collage_name}`);
        console.log(`   status: ${college.collage_status}`);
        console.log(`   subscription: ${college.collage_subscription_status}\n`);
        
        // Step 3: Check students in college
        const { ObjectId } = await import('mongodb');
        const collegeIdFilter = typeof collegeId === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeId)
            ? new ObjectId(collegeId)
            : collegeId;
        
        const allStudents = await db.collection('tblPersonMaster').find({
            person_role: { $regex: /^student$/i },
            person_deleted: false,
            person_collage_id: {
                $in: [collegeIdFilter, collegeId.toString()]
            }
        }).toArray();
        
        console.log(`📊 Students in college: ${allStudents.length}`);
        
        if (allStudents.length === 0) {
            console.log('⚠️  No students found in this college');
            console.log('   This might be why you see 0 students');
            process.exit(0);
        }
        
        // Step 4: For DeptTPC, check department filtering
        if (user.person_role === 'DeptTPC') {
            console.log('\n🔍 Testing DeptTPC Department Filtering...\n');
            
            if (!user.department_id && !user.department) {
                console.log('❌ DeptTPC has no department_id or department');
                console.log('   DeptTPC must have a department to filter students');
                
                // Try to resolve department_id
                console.log('\n💡 Attempting to resolve department_id...');
                
                if (college.departments && Array.isArray(college.departments)) {
                    const matchingDept = college.departments.find(dept => {
                        return dept.dept_tpc?.person_id?.toString() === user._id.toString();
                    });
                    
                    if (matchingDept) {
                        console.log(`   Found in college.departments[]: ${matchingDept.department_id}`);
                        console.log(`   Department name: ${matchingDept.department_name}`);
                        
                        // Update PersonMaster with department_id
                        await db.collection('tblPersonMaster').updateOne(
                            { _id: user._id },
                            { 
                                $set: { 
                                    department_id: matchingDept.department_id?.toString?.() || matchingDept.department_id,
                                    department: matchingDept.department_name || matchingDept.department_code
                                }
                            }
                        );
                        console.log('   ✅ Updated PersonMaster with department_id');
                    }
                }
            }
            
            const deptId = user.department_id || null;
            const deptName = user.department || null;
            
            console.log(`\n📊 Filtering students by department:`);
            console.log(`   department_id: ${deptId || 'null'}`);
            console.log(`   department: ${deptName || 'null'}`);
            
            if (!deptId && !deptName) {
                console.log('\n❌ Cannot filter students - no department info');
                process.exit(1);
            }
            
            // Build filter
            const deptFilter = {
                person_role: { $regex: /^student$/i },
                person_deleted: false,
                person_collage_id: {
                    $in: [collegeIdFilter, collegeId.toString()]
                },
                $or: []
            };
            
            if (deptId) {
                const deptIdObj = typeof deptId === 'string' && /^[0-9a-fA-F]{24}$/.test(deptId)
                    ? new ObjectId(deptId)
                    : deptId;
                deptFilter.$or.push(
                    { department_id: deptIdObj },
                    { department_id: deptId }
                );
            }
            
            if (deptName) {
                deptFilter.$or.push(
                    { department: deptName.trim() },
                    { department: { $regex: new RegExp(`^${deptName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                );
            }
            
            if (deptFilter.$or.length === 0) {
                deptFilter.$or.push({ department_id: '__NO_DEPT__' });
            }
            
            const deptStudents = await db.collection('tblPersonMaster').find(deptFilter).toArray();
            
            console.log(`\n✅ Students in department: ${deptStudents.length}`);
            
            if (deptStudents.length > 0) {
                console.log('\n📋 Sample students:');
                deptStudents.slice(0, 3).forEach((s, i) => {
                    console.log(`   ${i + 1}. ${s.person_name} (${s.person_email})`);
                    console.log(`      department: ${s.department || 'null'}`);
                    console.log(`      department_id: ${s.department_id || 'null'}`);
                });
            } else {
                console.log('\n⚠️  No students found with department filter');
                console.log('   Checking student department values...');
                
                const studentDepts = allStudents.map(s => ({
                    name: s.person_name,
                    dept: s.department,
                    deptId: s.department_id
                }));
                
                console.log('\n   Student departments:');
                studentDepts.forEach(s => {
                    console.log(`   - ${s.name}: dept="${s.dept || 'null'}", dept_id="${s.deptId || 'null'}"`);
                });
            }
        } else if (user.person_role === 'TPC') {
            console.log('\n✅ TPC can see all students in college');
            console.log(`   Total students: ${allStudents.length}`);
            
            if (allStudents.length > 0) {
                console.log('\n📋 Sample students:');
                allStudents.slice(0, 3).forEach((s, i) => {
                    console.log(`   ${i + 1}. ${s.person_name} (${s.person_email})`);
                });
            }
        }
        
        // Step 5: Check JWT token would have
        console.log('\n🔑 JWT Token would contain:');
        console.log(`   id: ${user._id}`);
        console.log(`   role: ${user.person_role}`);
        console.log(`   college_id: ${user.person_collage_id}`);
        console.log(`   department: ${user.department || 'null'}`);
        console.log(`   department_id: ${user.department_id || 'null'}`);
        
        console.log('\n💡 If department_id is null, user needs to:');
        console.log('   1. Log out');
        console.log('   2. Log back in (to get new JWT with resolved department_id)');
        console.log('   3. Or run this script to auto-update PersonMaster');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

const userEmail = process.argv[2];
if (!userEmail) {
    console.log('Usage: node backend/scripts/testTPCDeptTPCStudentAccess.js <userEmail>');
    process.exit(1);
}

testStudentAccess(userEmail);
