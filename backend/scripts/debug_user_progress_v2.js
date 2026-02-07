
import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ObjectId } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const USER_ID = '69848464a2a6236cb641';

async function checkProgress() {
    try {
        await connectDB();
        const db = getDB();
        const collection = db.collection('tblStudentProgress');

        console.log(`Searching for ANY records for User: ${USER_ID}`);

        // Try multiple query variations to catch type mismatches
        const queries = [
            { student_id: USER_ID },
            // { student_id: new ObjectId(USER_ID) }, // 20 chars is not valid ObjectId
            { studentId: USER_ID },
            { userId: USER_ID }
        ];

        let foundDocs = [];

        for (const q of queries) {
            try {
                const docs = await collection.find(q).toArray();
                if (docs.length > 0) {
                    console.log(`Found ${docs.length} records with query:`, JSON.stringify(q));
                    foundDocs = [...foundDocs, ...docs];
                }
            } catch (e) {
                // Ignore invalid ObjectId errors
            }
        }

        if (foundDocs.length === 0) {
            console.log('No records found for this user in tblStudentProgress.');
            // Check if user exists in tblPersonMaster to confirm ID
            const personCollection = db.collection('tblPersonMaster');
            const person = await personCollection.findOne({ _id: new ObjectId(USER_ID) });
            console.log('User exists in PersonMaster:', !!person);
        } else {
            console.log('--- Record Details ---');
            foundDocs.forEach(d => {
                console.log(`Week: ${d.week} (Type: ${typeof d.week})`);
                console.log(`Status: ${d.status}`);
                console.log(`Capstone Completed: ${d.capstone_completed}`);
                console.log(`Coding Problems: ${JSON.stringify(d.coding_problems_completed)}`);
                console.log('---');
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkProgress();
