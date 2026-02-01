
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function checkUserAndSchema() {
    const uri = process.env.MONGO_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);

        console.log('Connected to DB');

        const practiceTest = await db.collection('tblPracticeTest').findOne({}, { sort: { completed_at: -1 } });
        if (!practiceTest) {
            console.log('No practice tests found.');
            return;
        }

        const missingId = practiceTest.student_id;
        console.log(`Checking ID: ${missingId}`);

        // 1. Check tblUsers (if exists)
        const userRecord = await db.collection('tblUsers').findOne({ _id: new ObjectId(missingId) });
        console.log(`Lookup in tblUsers (ObjectId): ${userRecord ? 'FOUND' : 'NOT FOUND'}`);
        if (userRecord) {
            console.log(`Found User: ${userRecord.email} (Role: ${userRecord.role})`);
        }

        // 2. Dump one tblPersonMaster record to see fields
        const personSample = await db.collection('tblPersonMaster').findOne({});
        console.log('Sample tblPersonMaster record:', JSON.stringify(personSample, null, 2));

        // 3. Check if tblPersonMaster has a field that matches this ID
        // Try 'userId', 'user_id', 'accountId', etc.
        const personByUserId = await db.collection('tblPersonMaster').findOne({ userId: missingId });
        console.log(`Lookup in tblPersonMaster by 'userId': ${personByUserId ? 'FOUND' : 'NOT FOUND'}`);

        const personByUser_Id = await db.collection('tblPersonMaster').findOne({ user_id: missingId });
        console.log(`Lookup in tblPersonMaster by 'user_id': ${personByUser_Id ? 'FOUND' : 'NOT FOUND'}`);

        const personByObjUserId = await db.collection('tblPersonMaster').findOne({ userId: new ObjectId(missingId) });
        console.log(`Lookup in tblPersonMaster by 'userId' (ObjectId): ${personByObjUserId ? 'FOUND' : 'NOT FOUND'}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkUserAndSchema();
