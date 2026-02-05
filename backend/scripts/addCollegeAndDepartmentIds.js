/**
 * Migration: Add college_id and department_id to student-related collections
 *
 * - Fetches one college _id and one department _id from DB (you have one of each).
 * - For each document in tblStudentProgress, tblPracticeTest, tblCodingSubmissions, tblTestAnalysis:
 *   sets college_id and department_id from the student's tblPersonMaster (person_collage_id, department_id).
 * - If student not found in PersonMaster, uses the one college and one department as default.
 *
 * Run from backend directory: node scripts/addCollegeAndDepartmentIds.js
 * Safe to run multiple times (only sets where missing; does not block current flow).
 * You need at least one college in tblCollage and optionally one department in tblDepartments (or in college.departments / collage_departments).
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const COLLECTIONS = [
    'tblStudentProgress',
    'tblPracticeTest',
    'tblCodingSubmissions',
    'tblTestAnalysis',
];

function toStr(id) {
    if (id == null) return null;
    return typeof id === 'string' ? id : (id?.toString?.() ?? String(id));
}

async function run() {
    let client = null;
    try {
        console.log('Connecting to MongoDB...');
        client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        console.log('Connected to', process.env.DB_NAME, '\n');

        // 1. Get one college _id from tblCollage
        const collages = await db.collection('tblCollage').find({ deleted: { $ne: true } }).limit(1).toArray();
        const defaultCollegeId = collages.length > 0 ? (collages[0]._id?.toString?.() ?? collages[0]._id) : null;
        if (!defaultCollegeId) {
            console.log('No college found in tblCollage. Create one first, then re-run.');
            return;
        }
        console.log('Using college _id:', defaultCollegeId);

        // 2. Get one department _id (from tblDepartments or from college's departments)
        let defaultDepartmentId = null;
        const depts = await db.collection('tblDepartments').find({ deleted: { $ne: true } }).limit(1).toArray();
        if (depts.length > 0) {
            defaultDepartmentId = depts[0]._id?.toString?.() ?? depts[0]._id;
        }
        if (!defaultDepartmentId && collages[0].collage_departments?.length > 0) {
            const firstDeptId = collages[0].collage_departments[0];
            defaultDepartmentId = toStr(firstDeptId);
        }
        if (!defaultDepartmentId && collages[0].departments?.length > 0 && collages[0].departments[0].department_id) {
            defaultDepartmentId = toStr(collages[0].departments[0].department_id);
        }
        console.log('Using department _id:', defaultDepartmentId ?? '(none)');

        // 3. Build student_id -> { college_id, department_id } from tblPersonMaster
        const persons = await db.collection('tblPersonMaster').find({ person_deleted: { $ne: true } }).project({ _id: 1, person_collage_id: 1, department_id: 1 }).toArray();
        const studentToTenant = {};
        persons.forEach((p) => {
            const sid = toStr(p._id);
            if (!sid) return;
            studentToTenant[sid] = {
                college_id: toStr(p.person_collage_id) || defaultCollegeId,
                department_id: toStr(p.department_id) || defaultDepartmentId,
            };
        });
        console.log('Loaded', Object.keys(studentToTenant).length, 'students from tblPersonMaster\n');

        const defaultTenant = { college_id: defaultCollegeId, department_id: defaultDepartmentId };

        for (const collName of COLLECTIONS) {
            const coll = db.collection(collName);
            const cursor = coll.find({});
            let updated = 0;
            let skipped = 0;
            while (await cursor.hasNext()) {
                const doc = await cursor.next();
                if (!doc) continue;
                const sid = toStr(doc.student_id);
                const tenant = sid ? (studentToTenant[sid] || defaultTenant) : defaultTenant;
                const setCol = tenant.college_id != null && doc.college_id === undefined;
                const setDept = tenant.department_id != null && doc.department_id === undefined;
                if (!setCol && !setDept) {
                    skipped++;
                    continue;
                }
                const update = {};
                if (setCol) update.college_id = tenant.college_id;
                if (setDept) update.department_id = tenant.department_id;
                await coll.updateOne({ _id: doc._id }, { $set: update });
                updated++;
            }
            console.log(collName, '- updated:', updated, ', skipped:', skipped);
        }

        console.log('\nDone. college_id and department_id added where missing.');
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    } finally {
        if (client) await client.close();
    }
}

run();
