
import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const USER_ID = '69848464a2a6236cb641'; // From previous logs
const WEEK = 1;

async function checkProgress() {
    try {
        await connectDB();
        const db = getDB();
        const collection = db.collection('tblStudentProgress');

        console.log(`Checking progress for User: ${USER_ID}, Week: ${WEEK}`);

        // Try querying by string and ObjectId to be sure
        const query = {
            student_id: USER_ID,
            week: WEEK
        };

        const docs = await collection.find(query).toArray();
        console.log(`Found ${docs.length} records.`);
        console.dir(docs, { depth: null });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkProgress();
