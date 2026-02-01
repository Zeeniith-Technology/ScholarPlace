
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function debugPracticeLookup() {
    const uri = process.env.MONGO_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);

        console.log('Connected to DB');

        // 1. Get recent practice tests
        const practiceTests = await db.collection('tblPracticeTest')
            .find({})
            .sort({ completed_at: -1 })
            .limit(5)
            .toArray();

        console.log(`Found ${practiceTests.length} practice tests.`);

        for (const test of practiceTests) {
            console.log('------------------------------------------------');
            console.log(`Test ID: ${test._id}`);
            console.log(`Stored student_id: ${test.student_id} (Type: ${typeof test.student_id})`);

            // 2. Try lookup in tblPersonMaster by String
            const studentAsString = await db.collection('tblPersonMaster').findOne({ _id: test.student_id });
            console.log(`Lookup by String _id: ${studentAsString ? 'FOUND' : 'NOT FOUND'}`);

            // 3. Try lookup in tblPersonMaster by ObjectId
            let studentAsObjectId = null;
            if (typeof test.student_id === 'string' && /^[0-9a-fA-F]{24}$/.test(test.student_id)) {
                studentAsObjectId = await db.collection('tblPersonMaster').findOne({ _id: new ObjectId(test.student_id) });
                console.log(`Lookup by ObjectId _id: ${studentAsObjectId ? 'FOUND' : 'NOT FOUND'}`);
            } else {
                console.log('Skipping ObjectId lookup (invalid format)');
            }

            // 4. Try lookup by person_id
            const studentByPersonId = await db.collection('tblPersonMaster').findOne({ person_id: test.student_id });
            console.log(`Lookup by person_id: ${studentByPersonId ? 'FOUND' : 'NOT FOUND'}`);

            if (studentAsString || studentAsObjectId || studentByPersonId) {
                const found = studentAsString || studentAsObjectId || studentByPersonId;
                console.log(`MATCH MATCHED: ${found.person_name} (${found.person_email})`);
            } else {
                console.log('*** NO MATCH FOUND ***');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

debugPracticeLookup();
