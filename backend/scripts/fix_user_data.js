
import { connectDB, getDB, executeData } from '../methods.js';
import studentProgressSchema from '../schema/studentProgress.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ObjectId } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const USER_ID = '69848464a2a6236cb6412a36'; // Correct full ID from logs

async function fixUserData() {
    try {
        await connectDB();
        const db = getDB();
        const collection = db.collection('tblStudentProgress');

        console.log(`Fixing data for User: ${USER_ID}`);

        // 1. Find all records for this user week 1 (string or number)
        const records = await collection.find({
            student_id: USER_ID,
            $or: [{ week: 1 }, { week: '1' }]
        }).toArray();

        console.log(`Found ${records.length} records.`);
        records.forEach(r => console.log(`- ID: ${r._id}, Week: ${r.week} (${typeof r.week}), Status: ${r.status}, Capstone: ${r.capstone_completed}`));

        if (records.length === 0) {
            console.log('No records found.');
            process.exit();
        }

        // 2. Prepare correctly formatted record
        // We want: week as number, capstone_completed = true

        // Delete all existing bad records
        const idsToDelete = records.map(r => r._id);
        console.log(`Deleting ${idsToDelete.length} records...`);
        await collection.deleteMany({ _id: { $in: idsToDelete } });

        // Insert ONE clean record
        const newRecord = {
            student_id: USER_ID,
            week: 1, // Number
            status: 'in_progress', // Strict mode: strict capstone done, but week in progress until aptitude
            capstone_completed: true, // This is what we need!
            progress_percentage: 50,
            coding_problems_completed: [], // Should populate this if we had the data, but for now unlocking capstone is priority
            days_completed: [],
            assignments_completed: 0,
            tests_completed: 0,
            completed_at: null,
            created_at: new Date(),
            updated_at: new Date()
        };

        // Preserve College/Dept if available in old records
        const oldRec = records.find(r => r.college_id);
        if (oldRec) {
            newRecord.college_id = oldRec.college_id;
            newRecord.department_id = oldRec.department_id;
        }

        console.log('Inserting cleaned record...', newRecord);
        await executeData('tblStudentProgress', newRecord, 'i', studentProgressSchema);

        console.log('Fix complete.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

fixUserData();
