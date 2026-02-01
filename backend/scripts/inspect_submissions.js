
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/scholarplace";

async function run() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('scholarplace');
        const submissions = db.collection('tblCodingSubmissions');

        console.log("Connected to DB. Fetching latest 10 submissions...");
        const latest = await submissions.find({}).sort({ submitted_at: -1 }).limit(10).toArray();

        console.log("--- Latest Submissions Data Structure ---");
        latest.forEach((sub, i) => {
            console.log(`[${i}] ID: ${sub._id}`);
            console.log(`    Student ID: ${sub.student_id} (Type: ${typeof sub.student_id})`);
            console.log(`    Problem ID: ${sub.problem_id} (Type: ${typeof sub.problem_id})`);
            console.log(`    Status: ${sub.status}`);
            console.log('-----------------------------------');
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

run();
