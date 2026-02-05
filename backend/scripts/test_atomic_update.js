
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

// Mock executeData simplified logic
async function testAtomicUpdate() {
    const uri = process.env.MONGO_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        const collection = db.collection('tblStudentProgress');

        const studentId = '697b1e1eaed8f1efab75981a';
        const week = 1;
        const dayToAdd = 'day-2';

        console.log(`Testing Atomic Update for Student ${studentId}, Week ${week}...`);

        // 1. Verify existence
        const existing = await collection.findOne({ student_id: studentId, week: week });
        if (!existing) {
            console.log('Record not found! Creating dummy...');
            await collection.insertOne({
                student_id: studentId,
                week: week,
                days_completed: ['day-1'],
                status: 'start'
            });
        } else {
            console.log('Initial Days:', existing.days_completed);
        }

        // 2. Perform Atomic Update (Simulating Controller)
        const updatePayload = {
            $addToSet: { days_completed: dayToAdd },
            $set: {
                last_accessed: new Date(),
                updated_at: new Date().toISOString(),
                status: 'in_progress' // dummy
            }
        };

        const filter = {
            week: week,
            $or: [{ student_id: studentId }, { student_id: new ObjectId(studentId) }]
        };

        console.log('Updating with filter:', JSON.stringify(filter));
        console.log('Payload:', JSON.stringify(updatePayload));

        const result = await collection.updateOne(filter, updatePayload);
        console.log('Update Result:', result);

        // 3. Verify Result
        const updated = await collection.findOne({ student_id: studentId, week: week });
        console.log('Updated Days:', updated.days_completed);

        if (updated.days_completed.includes(dayToAdd)) {
            console.log('SUCCESS: Atomic update worked!');
        } else {
            console.log('FAILURE: Atomic update did not add the day.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

testAtomicUpdate();
