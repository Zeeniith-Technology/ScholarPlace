/**
 * Automate Import to MongoDB Atlas
 * Reads local JSON files and uploads them to Atlas database
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Configuration
const LOCAL_JSON_DIR = './mongodb-backup/json-export';
const SUPERADMIN_FILE = './mongodb-backup/superadmin-only.json';
const DB_NAME = 'scholarplace';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function uploadToAtlas() {
    console.log('🚀 AUTOMATED MONGODB ATLAS IMPORT\n');
    console.log('This script will upload your local JSON exports to Atlas.');
    console.log('-------------------------------------------------------');

    // Get Connection String
    const connectionString = await askQuestion('🔑 Paste your Atlas Connection String: ');

    if (!connectionString.startsWith('mongodb')) {
        console.error('❌ Invalid connection string! Must start with mongodb:// or mongodb+srv://');
        process.exit(1);
    }

    const client = new MongoClient(connectionString);

    try {
        console.log('\n⏳ Connecting to Atlas...');
        await client.connect();
        console.log('✅ Connected successfully!');

        const db = client.db(DB_NAME);

        // 1. Import Standard Collections
        if (fs.existsSync(LOCAL_JSON_DIR)) {
            const files = fs.readdirSync(LOCAL_JSON_DIR).filter(f => f.endsWith('.json'));

            for (const file of files) {
                const collectionName = path.basename(file, '.json');
                const filePath = path.join(LOCAL_JSON_DIR, file);

                console.log(`\n📦 Import: ${collectionName}`);

                // Read and parse JSON
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const docs = JSON.parse(fileContent);

                if (docs.length > 0) {
                    // Check if collection exists and has data
                    const count = await db.collection(collectionName).countDocuments();
                    if (count > 0) {
                        console.log(`   ⚠️  Collection already has ${count} documents. Skipping to avoid duplicates.`);
                        continue;
                    }

                    // Remove _id to let Atlas generate new ones, OR keep them if you want consistency
                    // Keeping _id ensures relationships (like foreign keys) don't break
                    // However, standard ObjectIds from one DB usually work fine in another

                    const result = await db.collection(collectionName).insertMany(docs);
                    console.log(`   ✅ Inserted ${result.insertedCount} documents`);
                } else {
                    console.log(`   ⚠️  File is empty`);
                }
            }
        }

        // 2. Import Superadmin
        if (fs.existsSync(SUPERADMIN_FILE)) {
            console.log('\n👤 Import: Superadmin User (tblPersonMaster)');

            const fileContent = fs.readFileSync(SUPERADMIN_FILE, 'utf-8');
            const docs = JSON.parse(fileContent);

            if (docs.length > 0) {
                // Check if any admin exists
                const existingAdmin = await db.collection('tblPersonMaster').findOne({ person_role: 'superadmin' });

                if (existingAdmin) {
                    console.log('   ⚠️  Superadmin already exists. Skipping.');
                } else {
                    const result = await db.collection('tblPersonMaster').insertMany(docs);
                    console.log(`   ✅ Inserted ${result.insertedCount} superadmin user`);
                }
            }
        } else {
            console.log('\n⚠️  Superadmin file not found!');
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 MIGRATION COMPLETE!');
        console.log('Your data is now live on MongoDB Atlas.');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.message.includes('Authentication failed')) {
            console.log('👉 Hint: Check your username and password. URL-encode special characters!');
        }
        if (error.message.includes('MongooseServerSelectionError')) {
            console.log('👉 Hint: Check your IP Whitelist in Atlas Network Access');
        }
    } finally {
        await client.close();
        rl.close();
    }
}

uploadToAtlas();
