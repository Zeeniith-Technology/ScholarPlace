
const { MongoClient } = require('mongodb');
require('dotenv').config();
const fs = require('fs');

(async () => {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db(process.env.DB_NAME);

    const practiceTest = await db.collection('tblPracticeTest').findOne({});
    const personMaster = await db.collection('tblPersonMaster').findOne({});

    const output = {
        practiceTest,
        personMaster
    };

    fs.writeFileSync('debug_schema_dump.json', JSON.stringify(output, null, 2));
    console.log('Dumped to debug_schema_dump.json');

    await client.close();
})();
