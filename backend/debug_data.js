
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const uri = process.env.MONGO_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        console.log("Connected to DB:", process.env.DB_NAME);

        const userId = '697b1e1eaed8f1efab75981a'; // Prushti Shah
        const week = 1;

        console.log(`Checking data for User: ${userId}, Week: ${week}`);


        // 1. Check Student Progress
        const allProgress = await db.collection('tblStudentProgress').find({ student_id: userId }).toArray();
        console.log(`\n--- Total Student Progress Records: ${allProgress.length} ---`);
        if (allProgress.length > 0) {
            console.log("Sample Progress:", JSON.stringify(allProgress[0], null, 2));
            const weeks = allProgress.map(p => p.week);
            console.log("Weeks found in progress:", weeks);
        }

        // 3. Check Coding Problems Schema
        const distinctWeeks = await db.collection('tblCodingProblem').distinct('week');
        console.log(`\n--- tblCodingProblem Weeks ---`);
        console.log(distinctWeeks);

        const countNum = await db.collection('tblCodingProblem').countDocuments({ week: 1 });
        console.log(`Week 1 (Number) Count: ${countNum}`);

        // 4. Check Matches
        // ... (rest omitted for brevity, focusing on discovery)


    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.close();
    }
}

run();
