import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function fixDuplicates() {
    const uri = process.env.MONGO_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        const collection = db.collection('tblStudentProgress');

        const studentId = '697b1e1eaed8f1efab75981a';
        const week = 1;

        console.log(`Checking duplicates for Student ${studentId}, Week ${week}...`);

        // Find ALL records for this student/week (using $or to catch both ID types)
        const records = await collection.find({
            week: week,
            $or: [
                { student_id: studentId },
                { student_id: new ObjectId(studentId) }
            ]
        }).sort({ updated_at: -1 }).toArray();

        console.log(`Found ${records.length} records.`);

        if (records.length > 1) {
            console.log('⚠️ DUPLICATES FOUND!');

            // Merge strategy:
            // 1. Take the most recently updated record as base (already sorted[0])
            // 2. Merge unique 'days_completed' from all others into it
            // 3. Delete others

            const masterDoc = records[0];
            const allDays = new Set(masterDoc.days_completed || []);
            const docsToDelete = [];

            for (let i = 1; i < records.length; i++) {
                const doc = records[i];
                if (doc.days_completed) {
                    doc.days_completed.forEach(d => allDays.add(d));
                }
                docsToDelete.push(doc._id);
                console.log(`- Will merge and delete duplicate: ${doc._id} (updated: ${doc.updated_at})`);
            }

            const mergedDays = Array.from(allDays);
            console.log('Merged Days Completed:', mergedDays);

            // Update Master
            await collection.updateOne(
                { _id: masterDoc._id },
                {
                    $set: {
                        days_completed: mergedDays,
                        updated_at: new Date()
                    }
                }
            );
            console.log(`✅ Updated Master Doc ${masterDoc._id}`);

            // Delete Duplicates
            if (docsToDelete.length > 0) {
                await collection.deleteMany({ _id: { $in: docsToDelete } });
                console.log(`🗑️ Deleted ${docsToDelete.length} duplicates.`);
            }

        } else {
            console.log('No duplicates found. The issue implies the update didn\'t stick or is being read from cache?');
            if (records.length === 1) {
                console.log('Current Record Days:', records[0].days_completed);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

fixDuplicates();
