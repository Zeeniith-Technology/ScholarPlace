/**
 * Rename syllabus → tblSyllabus
 * Renames collection for naming consistency
 * 
 * SAFETY: Creates backup before rename
 * Run: node backend/scripts/renameSyllabusCollection.js
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
dotenv.config();

async function renameSyllabusCollection() {
    try {
        await connectDB();
        const db = getDB();
        
        console.log('🔄 Renaming syllabus → tblSyllabus...\n');
        
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        if (!collectionNames.includes('syllabus')) {
            console.log('✅ syllabus collection does not exist - nothing to rename');
            process.exit(0);
        }
        
        if (collectionNames.includes('tblSyllabus')) {
            console.log('⚠️  tblSyllabus already exists!');
            const syllabusCount = await db.collection('syllabus').countDocuments();
            const tblSyllabusCount = await db.collection('tblSyllabus').countDocuments();
            
            console.log(`   syllabus: ${syllabusCount} documents`);
            console.log(`   tblSyllabus: ${tblSyllabusCount} documents`);
            console.log('\n⚠️  Both collections exist - need to consolidate first');
            console.log('   Run consolidation script or manually merge data');
            process.exit(1);
        }
        
        const count = await db.collection('syllabus').countDocuments();
        console.log(`📊 Current state: syllabus has ${count} documents\n`);
        
        if (count === 0) {
            console.log('✅ syllabus is empty - safe to delete');
            await db.collection('syllabus').drop();
            console.log('✅ Deleted empty syllabus collection');
            process.exit(0);
        }
        
        // Create backup
        console.log('💾 Creating backup...');
        const backupName = `syllabus_backup_${Date.now()}`;
        await db.collection('syllabus').aggregate([
            { $out: backupName }
        ]).toArray();
        console.log(`✅ Backup created: ${backupName}\n`);
        
        // Rename collection
        console.log('🔄 Renaming collection...');
        await db.collection('syllabus').rename('tblSyllabus');
        
        // Verify
        const newCount = await db.collection('tblSyllabus').countDocuments();
        console.log(`✅ Renamed successfully!`);
        console.log(`   tblSyllabus now has ${newCount} documents`);
        
        if (newCount === count) {
            console.log('✅ Verification passed - all documents migrated');
            console.log(`\n💾 Backup available at: ${backupName}`);
            console.log('   (You can delete it after verifying)');
            console.log('\n⚠️  IMPORTANT: Update code references:');
            console.log('   - backend/controller/*.js');
            console.log('   - backend/schema/syllabus.js');
            console.log('   - Any other files referencing "syllabus"');
        } else {
            console.log('⚠️  Document count mismatch - review backup');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error renaming collection:', error);
        process.exit(1);
    }
}

renameSyllabusCollection();
