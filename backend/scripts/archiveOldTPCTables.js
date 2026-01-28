/**
 * Archive Old TPC Tables
 * Archives tblTPC and tblDeptTPC to _archive collections
 * 
 * SAFETY: Only archives, does not delete (manual deletion after verification)
 * Run: node backend/scripts/archiveOldTPCTables.js
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
dotenv.config();

async function archiveOldTPCTables() {
    try {
        await connectDB();
        const db = getDB();
        
        console.log('📦 Archiving Old TPC Tables...\n');
        
        const tablesToArchive = [
            { name: 'tblTPC', reason: 'All TPC users migrated to tblPersonMaster' },
            { name: 'tblDeptTPC', reason: 'All DeptTPC users migrated to tblPersonMaster' }
        ];
        
        for (const table of tablesToArchive) {
            const collections = await db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);
            
            if (!collectionNames.includes(table.name)) {
                console.log(`✅ ${table.name} does not exist - already removed`);
                continue;
            }
            
            const count = await db.collection(table.name).countDocuments();
            console.log(`📊 ${table.name}:`);
            console.log(`   Documents: ${count}`);
            console.log(`   Reason: ${table.reason}`);
            
            if (count === 0) {
                console.log(`   ✅ Empty - safe to delete immediately`);
                console.log(`   🗑️  Dropping ${table.name}...`);
                await db.collection(table.name).drop();
                console.log(`   ✅ Deleted ${table.name}\n`);
                continue;
            }
            
            // Create archive
            const archiveName = `${table.name}_archive_${new Date().toISOString().split('T')[0]}`;
            console.log(`   💾 Creating archive: ${archiveName}...`);
            
            await db.collection(table.name).aggregate([
                { $out: archiveName }
            ]).toArray();
            
            const archiveCount = await db.collection(archiveName).countDocuments();
            console.log(`   ✅ Archived ${archiveCount} documents to ${archiveName}`);
            console.log(`   ⚠️  ${table.name} still exists - delete manually after verification\n`);
        }
        
        console.log('📋 Summary:');
        console.log('✅ Archiving complete');
        console.log('⚠️  Review archived collections before deleting originals');
        console.log('⏳ Wait 3-6 months before deleting archived collections');
        console.log('\n💡 To delete originals after verification:');
        console.log('   db.tblTPC.drop()');
        console.log('   db.tblDeptTPC.drop()');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error archiving tables:', error);
        process.exit(1);
    }
}

archiveOldTPCTables();
