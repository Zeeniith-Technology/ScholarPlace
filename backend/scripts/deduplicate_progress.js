
import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixDuplicates() {
    try {
        await connectDB();
        const db = getDB();
        const collection = db.collection('tblStudentProgress');

        console.log('Finding duplicates...');

        const pipeline = [
            {
                $group: {
                    _id: { student_id: "$student_id", week: "$week" },
                    count: { $sum: 1 },
                    docs: { $push: "$$ROOT" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ];

        const duplicates = await collection.aggregate(pipeline).toArray();
        console.log(`Found ${duplicates.length} sets of duplicates.`);

        for (const group of duplicates) {
            const { student_id, week } = group._id;
            console.log(`Processing User: ${student_id}, Week: ${week}`);

            const docs = group.docs;

            // Merge logic
            let merged = {
                ...docs[0]
            };

            // Prioritize 'completed' status
            const completedDoc = docs.find(d => d.status === 'completed');
            if (completedDoc) {
                merged.status = 'completed';
                merged.progress_percentage = 100;
                merged.completed_at = completedDoc.completed_at || new Date();
                // Ensure capstone_completed is true if status is completed (backward compat)
                merged.capstone_completed = true;
            }

            // Check capstone flag across all docs
            const capstoneDone = docs.some(d => d.capstone_completed === true);
            if (capstoneDone) merged.capstone_completed = true;

            // Merge arrays (coding_problems_completed)
            const allProblems = new Set();
            docs.forEach(d => {
                if (Array.isArray(d.coding_problems_completed)) {
                    d.coding_problems_completed.forEach(p => allProblems.add(p.toString()));
                }
            });
            merged.coding_problems_completed = Array.from(allProblems);

            // Keep the earliest created_at
            merged.created_at = docs.reduce((min, d) => (d.created_at < min ? d.created_at : min), docs[0].created_at);

            // Update timestamp
            merged.updated_at = new Date();

            // We will keep the first doc's _id as primary, or the completed one
            const primaryDoc = completedDoc || docs[0];
            const primaryId = primaryDoc._id;

            // Remove _id from merged data to avoid immutable field error during update
            delete merged._id;

            console.log(`-> Merging ${docs.length} records into one. Status: ${merged.status}, Capstone: ${merged.capstone_completed}`);

            // Update primary
            await collection.updateOne({ _id: primaryId }, { $set: merged });

            // Delete others
            const idsToDelete = docs.filter(d => d._id.toString() !== primaryId.toString()).map(d => d._id);
            if (idsToDelete.length > 0) {
                await collection.deleteMany({ _id: { $in: idsToDelete } });
                console.log(`-> Deleted ${idsToDelete.length} redundant records.`);
            }
        }

        console.log('Deduplication complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixDuplicates();
