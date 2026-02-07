
import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupIndexes() {
    try {
        await connectDB();
        const db = getDB();
        const collection = db.collection('tblStudentProgress');

        console.log('Setting up unique indexes to prevent duplicates...');

        // 1. Create Unique Index on student_id + week
        // This physically prevents two records for the same student/week from existing
        // conflicting records will look like: E11000 duplicate key error
        try {
            await collection.createIndex(
                { student_id: 1, week: 1 },
                { unique: true, name: "unique_student_week" }
            );
            console.log('✅ Unique index created: student_id + week');
        } catch (error) {
            if (error.code === 11000) {
                console.log('⚠️  Index creation failed due to existing duplicates. Please run the deduplication script first.');
            } else {
                console.error('❌ Error creating index:', error);
            }
        }

        console.log('Production DB setup complete.');
        process.exit(0);
    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}

setupIndexes();
