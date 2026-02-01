
import { MongoClient } from 'mongodb';

async function fixCapstoneFlags() {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/scholarplace";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('scholarplace');
        const collection = db.collection('tblCodingProblem');

        // Identify potential capstone problems
        // Looking for position starting with Capstone OR including 'Capstone' in title
        const filter = {
            $or: [
                { position: { $regex: /^Capstone/i } },
                { question_id: { $regex: /_CP\d+/ } }
            ]
        };

        const candidates = await collection.find(filter).toArray();
        console.log(`Found ${candidates.length} candidate problems for Capstone designation.`);

        candidates.forEach(p => {
            console.log(`- ${p.question_id}: ${p.title} (Current is_capstone: ${p.is_capstone})`);
        });

        if (candidates.length > 0) {
            console.log("\nUpdating problems...");
            const result = await collection.updateMany(
                filter,
                { $set: { is_capstone: true } }
            );
            console.log(`Updated ${result.modifiedCount} documents. Match count: ${result.matchedCount}`);
        } else {
            console.log("No problems found to update.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

fixCapstoneFlags();
