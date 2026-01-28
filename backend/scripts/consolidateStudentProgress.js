/**
 * Consolidate student_progress → tblStudentProgress
 * Migrates data from lowercase collection to uppercase (standardized naming)
 * 
 * SAFETY: Creates backup before migration
 * Run: node backend/scripts/consolidateStudentProgress.js
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
dotenv.config();

async function consolidateStudentProgress() {
    try {
        await connectDB();
        const db = getDB();
        
        console.log('🔄 Consolidating student_progress → tblStudentProgress...\n');
        
        // Check if student_progress exists
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        if (!collectionNames.includes('student_progress')) {
            console.log('✅ student_progress collection does not exist - nothing to migrate');
            process.exit(0);
        }
        
        const studentProgressCount = await db.collection('student_progress').countDocuments();
        const tblStudentProgressCount = await db.collection('tblStudentProgress').countDocuments();
        
        console.log(`📊 Current state:`);
        console.log(`   student_progress: ${studentProgressCount} documents`);
        console.log(`   tblStudentProgress: ${tblStudentProgressCount} documents\n`);
        
        if (studentProgressCount === 0) {
            console.log('✅ student_progress is empty - safe to delete');
            await db.collection('student_progress').drop();
            console.log('✅ Deleted empty student_progress collection');
            process.exit(0);
        }
        
        // Create backup
        console.log('💾 Creating backup...');
        const backupName = `student_progress_backup_${Date.now()}`;
        await db.collection('student_progress').aggregate([
            { $out: backupName }
        ]).toArray();
        console.log(`✅ Backup created: ${backupName}\n`);
        
        // Migrate data
        console.log('🔄 Migrating data...');
        let migrated = 0;
        let skipped = 0;
        let errors = 0;
        
        const cursor = db.collection('student_progress').find({});
        
        for await (const doc of cursor) {
            try {
                // Check if document already exists in tblStudentProgress
                const exists = await db.collection('tblStudentProgress').findOne({
                    _id: doc._id
                });
                
                if (exists) {
                    console.log(`   ⚠️  Skipping duplicate _id: ${doc._id}`);
                    skipped++;
                } else {
                    await db.collection('tblStudentProgress').insertOne(doc);
                    migrated++;
                    if (migrated % 100 === 0) {
                        console.log(`   ✅ Migrated ${migrated} documents...`);
                    }
                }
            } catch (error) {
                console.error(`   ❌ Error migrating document ${doc._id}:`, error.message);
                errors++;
            }
        }
        
        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Migrated: ${migrated} documents`);
        console.log(`   ⚠️  Skipped (duplicates): ${skipped} documents`);
        console.log(`   ❌ Errors: ${errors} documents`);
        
        if (errors === 0) {
            // Verify migration
            const finalCount = await db.collection('tblStudentProgress').countDocuments();
            console.log(`\n✅ Verification: tblStudentProgress now has ${finalCount} documents`);
            
            if (finalCount >= studentProgressCount) {
                console.log('✅ Migration successful!');
                console.log(`\n🗑️  Dropping student_progress collection...`);
                await db.collection('student_progress').drop();
                console.log('✅ Deleted student_progress collection');
                console.log(`\n💾 Backup available at: ${backupName}`);
                console.log('   (You can delete it after verifying migration)');
            } else {
                console.log('⚠️  Document count mismatch - review before deleting backup');
            }
        } else {
            console.log('\n⚠️  Migration had errors - review before deleting backup');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error consolidating collections:', error);
        process.exit(1);
    }
}

consolidateStudentProgress();
