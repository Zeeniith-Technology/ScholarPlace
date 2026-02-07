
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function cleanupWeekTypes() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(process.env.DB_NAME || 'scholarplace');
        const collection = db.collection('tblStudentProgress');

        // 1. Find all records where 'week' is a string
        const stringWeekRecords = await collection.find({
            week: { $type: "string" }
        }).toArray();

        console.log(`Found ${stringWeekRecords.length} records with String-type week.`);

        for (const record of stringWeekRecords) {
            const originalWeek = record.week;
            const weekNum = parseInt(originalWeek, 10);
            const studentId = record.student_id;

            if (isNaN(weekNum)) {
                console.warn(`Skipping record ${record._id}: Cannot parse week "${originalWeek}" to number.`);
                continue;
            }

            console.log(`Processing User: ${studentId}, Week: "${originalWeek}" -> ${weekNum}`);

            // Handle student_id matching (String vs ObjectId)
            let studentIdFilter = { student_id: studentId };
            try {
                const sIdStr = studentId.toString();
                if (/^[0-9a-fA-F]{24}$/.test(sIdStr)) {
                    studentIdFilter = {
                        $or: [
                            { student_id: sIdStr },
                            { student_id: new ObjectId(sIdStr) }
                        ]
                    };
                }
            } catch (e) {
                // Ignore conversion errors, stick to original ID
            }

            // 2. Check if a proper Number-week record already exists
            const existingNumberRecord = await collection.findOne({
                ...studentIdFilter,
                week: weekNum,
                _id: { $ne: record._id } // Don't match self
            });


            if (existingNumberRecord) {
                console.log(`-> Found duplicate Number record (${existingNumberRecord._id}). Merging...`);

                // MERGE STRATEGY:
                // - Status: 'completed' wins
                // - Capstone: true wins
                // - Arrays: Combine unique items

                const updates = {};
                if (record.status === 'completed' && existingNumberRecord.status !== 'completed') {
                    updates.status = 'completed';
                    updates.progress_percentage = 100;
                    updates.completed_at = record.completed_at || new Date();
                }

                if (record.capstone_completed && !existingNumberRecord.capstone_completed) {
                    updates.capstone_completed = true;
                }

                // Merge arrays (simple concat + unique)
                // Coding Problems
                const existingProblems = new Set((existingNumberRecord.coding_problems_completed || []).map(String));
                (record.coding_problems_completed || []).forEach(p => existingProblems.add(String(p)));
                const mergedProblems = Array.from(existingProblems);
                if (mergedProblems.length > (existingNumberRecord.coding_problems_completed || []).length) {
                    updates.coding_problems_completed = mergedProblems;
                }

                // Practice Tests (Just take the one with more progress or specific logic? 
                // Let's assume Number record is "main" but if String has more tests, update count)
                if ((record.practice_tests_completed || 0) > (existingNumberRecord.practice_tests_completed || 0)) {
                    updates.practice_tests_completed = record.practice_tests_completed;
                }

                // Apply updates to Number record
                if (Object.keys(updates).length > 0) {
                    updates.updated_at = new Date();
                    await collection.updateOne({ _id: existingNumberRecord._id }, { $set: updates });
                    console.log('   -> Updated Number record with merged data.');
                } else {
                    console.log('   -> No new data to merge.');
                }

                // DELETE the String record
                await collection.deleteOne({ _id: record._id });
                console.log('   -> Deleted duplicate String record.');

            } else {
                // No duplicate exists. Just convert this record's week to Number.
                console.log('-> No duplicate found. Converting "week" to Number in-place.');
                await collection.updateOne(
                    { _id: record._id },
                    { $set: { week: weekNum } }
                );
            }
        }

        console.log('\n---------------------------------------------------');
        console.log('Cleanup Complete.');
        console.log('All "String" weeks have been converted to "Number" or merged.');
        console.log('---------------------------------------------------');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

cleanupWeekTypes();
