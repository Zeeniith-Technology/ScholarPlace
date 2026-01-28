/**
 * Check and Delete Unused Collections
 * Identifies and optionally deletes unused collections (like tblITPC)
 * 
 * SAFETY: Dry-run by default, use --delete flag to actually delete
 * Run: node backend/scripts/checkAndDeleteUnusedCollections.js [--delete]
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkAndDeleteUnusedCollections() {
    try {
        await connectDB();
        const db = getDB();
        
        const shouldDelete = process.argv.includes('--delete');
        
        console.log('🔍 Checking for Unused Collections...\n');
        
        if (!shouldDelete) {
            console.log('ℹ️  DRY RUN MODE (use --delete flag to actually delete)\n');
        }
        
        // Collections that are known to be unused
        const potentiallyUnused = [
            { name: 'tblITPC', reason: 'Not found in codebase references' }
        ];
        
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        for (const collection of potentiallyUnused) {
            if (!collectionNames.includes(collection.name)) {
                console.log(`✅ ${collection.name} does not exist - already removed`);
                continue;
            }
            
            const count = await db.collection(collection.name).countDocuments();
            console.log(`📊 ${collection.name}:`);
            console.log(`   Documents: ${count}`);
            console.log(`   Reason: ${collection.reason}`);
            
            if (count === 0) {
                console.log(`   ✅ Empty - safe to delete`);
                
                if (shouldDelete) {
                    console.log(`   🗑️  Deleting ${collection.name}...`);
                    await db.collection(collection.name).drop();
                    console.log(`   ✅ Deleted ${collection.name}`);
                } else {
                    console.log(`   💡 Run with --delete flag to delete`);
                }
            } else {
                console.log(`   ⚠️  Has ${count} documents - investigate before deleting`);
                console.log(`   💡 Sample document:`);
                const sample = await db.collection(collection.name).findOne({});
                console.log(`      ${JSON.stringify(sample, null, 2).substring(0, 200)}...`);
            }
            console.log('');
        }
        
        if (!shouldDelete) {
            console.log('💡 To actually delete empty collections, run:');
            console.log('   node backend/scripts/checkAndDeleteUnusedCollections.js --delete');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking collections:', error);
        process.exit(1);
    }
}

checkAndDeleteUnusedCollections();
