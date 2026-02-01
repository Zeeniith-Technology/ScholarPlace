
import { MongoClient } from 'mongodb';

async function checkProblems() {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/scholarplace";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('scholarplace');
        const collection = db.collection('tblCodingProblem');

        console.log("Checking for problems with week: 1");
        const week1Problems = await collection.find({ week: 1 }).toArray();
        console.log(`Found ${week1Problems.length} problems for week 1`);

        week1Problems.forEach(p => {
            console.log(`- ID: ${p._id}, QuestionID: '${p.question_id}', Title: ${p.title}, IsCapstone: ${p.is_capstone}`);
        });

        console.log("\nChecking specifically for question_id: 'Q001'");
        const q001 = await collection.findOne({ question_id: 'Q001' });
        if (q001) {
            console.log("Found Q001:");
            console.log("Problem Statement Type:", typeof q001.problem_statement);
            console.log("Problem Statement Value:", JSON.stringify(q001.problem_statement, null, 2));
        } else {
            console.log("Q001 NOT FOUND");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

checkProblems();
