/**
 * Export All Production Collections to JSON
 * Alternative for users without mongodump installed
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'scholarplace';

const COLLECTIONS_TO_EXPORT = [
    'tblRoles',
    'tblSyllabus',
    'tblDeptTPC',
    'tblDepartments',
    'tblCollage',
    'tblCodingProblem',
    'tblQuestion'
];

async function exportCollections() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const backupDir = './mongodb-backup/json-export';

        // Create directory
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        console.log(`✅ Connected to ${DB_NAME}`);
        console.log(`📂 Exporting to: ${backupDir}\n`);

        for (const collectionName of COLLECTIONS_TO_EXPORT) {
            console.log(`⏳ Exporting ${collectionName}...`);

            const data = await db.collection(collectionName).find({}).toArray();

            if (data.length > 0) {
                const filePath = path.join(backupDir, `${collectionName}.json`);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`   ✅ Saved ${data.length} documents`);
            } else {
                console.log(`   ⚠️  Collection is empty (skipping)`);
            }
        }

        console.log('\n🎉 Export Complete!');
        console.log('Use MongoDB Compass to import these JSON files to your Atlas cluster.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

exportCollections();
