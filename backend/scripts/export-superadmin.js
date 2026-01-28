/**
 * Export Only Superadmin User from tblPersonMaster
 * This exports only the superadmin credentials needed for production
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'scholarplace';

async function exportSuperadmin() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to local MongoDB\n');

        const db = client.db(DB_NAME);

        // Find superadmin user(s) - try both cases
        let superadmins = await db.collection('tblPersonMaster').find({
            person_role: 'superadmin'  // lowercase based on screenshot
        }).toArray();

        // Fallback to capitalized if not found
        if (superadmins.length === 0) {
            superadmins = await db.collection('tblPersonMaster').find({
                person_role: 'Superadmin'
            }).toArray();
        }

        console.log('🔍 Found Superadmin users:', superadmins.length);

        if (superadmins.length === 0) {
            console.log('⚠️  No superadmin users found!');
            // Try searching by email known from screenshot just in case
            const byEmail = await db.collection('tblPersonMaster').findOne({
                person_email: { $regex: /dharmik/i }
            });

            if (byEmail) {
                console.log(`   Found user by email but role is: '${byEmail.person_role}'`);
            }
        } else {
            console.log('\n📋 Superadmin Details:');
            superadmins.forEach((user, idx) => {
                // Use correct fields from screenshot: person_email, person_name
                console.log(`   ${idx + 1}. Email: ${user.person_email || user.email || 'N/A'}`);
                console.log(`      Role: ${user.person_role}`);
                console.log(`      Name: ${user.person_name || user.first_name || ''}`);
                console.log(`      ID: ${user._id}`);
            });

            // Export to JSON file
            const outputPath = './mongodb-backup/superadmin-only.json';

            if (!fs.existsSync('./mongodb-backup')) {
                fs.mkdirSync('./mongodb-backup', { recursive: true });
            }

            fs.writeFileSync(outputPath, JSON.stringify(superadmins, null, 2));

            console.log(`\n✅ Exported ${superadmins.length} superadmin user(s) to: ${outputPath}`);
            console.log('\n📤 To import to Atlas:');
            console.log(`   mongoimport --uri="mongodb+srv://USER:PASS@cluster.mongodb.net/scholarplace" --collection=tblPersonMaster --file="${outputPath}" --jsonArray`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

exportSuperadmin().catch(console.error);
