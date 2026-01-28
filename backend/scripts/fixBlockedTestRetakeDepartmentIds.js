/**
 * Backfill department_id on tblBlockedTestRetake from tblPersonMaster (student)
 * so DeptTPC can fetch blocked records for their department when student has no department_id.
 *
 * Run from project root: node backend/scripts/fixBlockedTestRetakeDepartmentIds.js
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
dotenv.config();

async function fixBlockedTestRetakeDepartmentIds() {
    try {
        await connectDB();
        const db = getDB();
        const { ObjectId } = await import('mongodb');

        console.log('🔧 Backfilling department_id on tblBlockedTestRetake...\n');

        const blocked = await db.collection('tblBlockedTestRetake').find({}).toArray();
        console.log(`📊 Found ${blocked.length} blocked test retake record(s)\n`);

        let updated = 0;
        let skipped = 0;
        let noStudent = 0;
        let noDept = 0;
        let errors = 0;

        for (const rec of blocked) {
            try {
                if (rec.department_id && /^[0-9a-fA-F]{24}$/.test(String(rec.department_id))) {
                    skipped++;
                    continue;
                }

                const sid = rec.student_id;
                if (!sid) {
                    noStudent++;
                    continue;
                }

                const sidObj = typeof sid === 'string' && /^[0-9a-fA-F]{24}$/.test(sid)
                    ? new ObjectId(sid)
                    : sid;

                const student = await db.collection('tblPersonMaster').findOne({
                    $or: [ { _id: sidObj }, { person_id: sidObj } ],
                    person_role: { $regex: /^student$/i },
                    person_deleted: { $ne: true }
                });

                if (!student) {
                    noStudent++;
                    continue;
                }

                let deptId = student.department_id ?? student.department;
                if (deptId && typeof deptId === 'object' && deptId.toString) deptId = deptId.toString();
                if (!deptId || !/^[0-9a-fA-F]{24}$/.test(String(deptId))) {
                    noDept++;
                    continue;
                }

                await db.collection('tblBlockedTestRetake').updateOne(
                    { _id: rec._id },
                    { $set: { department_id: deptId } }
                );
                console.log(`   ✅ ${rec._id}: student ${sid} -> department_id ${deptId}`);
                updated++;
            } catch (e) {
                console.error(`   ❌ ${rec._id}:`, e.message);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Summary:');
        console.log(`   ✅ Updated: ${updated}`);
        console.log(`   ⏭️  Skipped (already has department_id): ${skipped}`);
        console.log(`   ⚠️  Student not found: ${noStudent}`);
        console.log(`   ⚠️  Student has no department_id: ${noDept}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log('='.repeat(60));

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

fixBlockedTestRetakeDepartmentIds();
