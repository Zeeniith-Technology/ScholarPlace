
import { MongoClient } from 'mongodb';

async function checkCapstones() {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/scholarplace";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('scholarplace');
        const collection = db.collection('tblCodingProblem');

        // Check counts
        const allCapstones = await collection.find({ is_capstone: true }).toArray();
        console.log(`Total problems with is_capstone: true = ${allCapstones.length}`);

        const week1Capstones = allCapstones.filter(p => p.week === 1 || p.week === '1');
        console.log(`Week 1 Capstones: ${week1Capstones.length}`);

        if (week1Capstones.length > 0) {
            console.log("Week 1 Capstone Example:", JSON.stringify(week1Capstones[0], null, 2));
        } else {
            // Check if W1_CP1 exists and what its props are
            const w1cp1 = await collection.findOne({ question_id: 'W1_CP1' });
            if (w1cp1) {
                console.log("Found W1_CP1 but is_capstone is:", w1cp1.is_capstone);
                console.log(JSON.stringify(w1cp1, null, 2));
            } else {
                console.log("W1_CP1 not found at all.");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

checkCapstones();
