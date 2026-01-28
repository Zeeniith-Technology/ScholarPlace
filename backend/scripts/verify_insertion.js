
import { connectDB, getDB } from '../methods.js';

async function run() {
    try {
        await connectDB();
        const db = getDB();

        const q150 = await db.collection('tblQuestion').findOne({ question_id: 'Q150' });
        if (q150) {
            console.log('Found Q150 Full Document:');
            console.log(JSON.stringify(q150, null, 2));
        } else {
            console.error('Q150 NOT FOUND');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
