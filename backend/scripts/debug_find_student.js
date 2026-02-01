
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function findStudent() {
    const uri = process.env.MONGO_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);

        console.log('Connected to DB');

        // 1. Find Prushti in PersonMaster
        const studentName = "Prushti"; // Approximate match
        const students = await db.collection('tblPersonMaster').find({
            person_name: { $regex: studentName, $options: 'i' }
        }).toArray();

        console.log(`Found ${students.length} students matching '${studentName}':`);
        students.forEach(s => {
            console.log(`- Name: ${s.person_name}, Email: ${s.person_email}, _id: ${s._id} (Type: ${typeof s._id})`);
        });

        if (students.length === 0) {
            console.log('No student found. Listing first 5 PersonMaster records to check names...');
            const sample = await db.collection('tblPersonMaster').find({}).limit(5).toArray();
            sample.forEach(s => console.log(`  ${s.person_name}`));
        } else {
            // 2. Check if this Student's ID exists in tblPracticeTest
            const studentId = students[0]._id;
            const studentIdStr = studentId.toString();

            console.log(`\nChecking tblPracticeTest for student_id: ${studentIdStr}`);

            const testsByStr = await db.collection('tblPracticeTest').find({ student_id: studentIdStr }).count();
            const testsByObj = await db.collection('tblPracticeTest').find({ student_id: studentId }).count();

            console.log(`Matches by String ID: ${testsByStr}`);
            console.log(`Matches by ObjectId: ${testsByObj}`);

            // 3. Check what IDs ARE in tblPracticeTest
            console.log('\nListing recent Practice Test IDs:');
            const recentTests = await db.collection('tblPracticeTest').find({}).sort({ completed_at: -1 }).limit(5).toArray();
            recentTests.forEach(t => {
                console.log(`- Test Date: ${t.completed_at}, Student ID: ${t.student_id} (Type: ${typeof t.student_id})`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

findStudent();
