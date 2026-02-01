
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function checkStudentCollection() {
    const uri = process.env.MONGO_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);

        console.log('Connected to DB');

        // Use the ID found in the previous step (or grab one dynamically)
        const practiceTest = await db.collection('tblPracticeTest').findOne({}, { sort: { completed_at: -1 } });
        if (!practiceTest) {
            console.log('No practice tests found.');
            return;
        }

        const studentId = practiceTest.student_id;
        console.log(`Checking student_id: ${studentId}`);

        // Check tblStudent
        const studentRecord = await db.collection('tblStudent').findOne({ _id: new ObjectId(studentId) });
        console.log(`Lookup in tblStudent (ObjectId): ${studentRecord ? 'FOUND' : 'NOT FOUND'}`);

        if (studentRecord) {
            console.log('Found in tblStudent:', studentRecord);
        } else {
            const studentRecordString = await db.collection('tblStudent').findOne({ _id: studentId });
            console.log(`Lookup in tblStudent (String): ${studentRecordString ? 'FOUND' : 'NOT FOUND'}`);
        }

        // Check for 'student_id' field in tblPersonMaster
        const personByStudentIdField = await db.collection('tblPersonMaster').findOne({ student_id: studentId });
        console.log(`Lookup in tblPersonMaster by field 'student_id': ${personByStudentIdField ? 'FOUND' : 'NOT FOUND'}`);

        if (personByStudentIdField) {
            console.log('Found in tblPersonMaster via student_id field:', personByStudentIdField.person_name);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkStudentCollection();
