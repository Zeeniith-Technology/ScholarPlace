
import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function listProgress() {
    try {
        await connectDB();
        const db = getDB();
        const collection = db.collection('tblStudentProgress');

        console.log('Listing latest 5 records from tblStudentProgress:');

        const docs = await collection.find({}).sort({ created_at: -1 }).limit(5).toArray();

        docs.forEach(d => {
            console.log('---');
            console.log(`ID: ${d._id}`);
            console.log(`Student ID: ${d.student_id} (Type: ${typeof d.student_id})`);
            console.log(`Week: ${d.week} (Type: ${typeof d.week})`);
            console.log(`Status: ${d.status}`);
            console.log(`Capstone Completed: ${d.capstone_completed}`);
            console.log(`Created: ${d.created_at}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

listProgress();
