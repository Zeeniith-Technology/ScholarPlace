/**
 * Master Migration Script
 * Orchestrates all migration scripts in the correct order
 * 
 * SAFETY: Runs verification first, then migrations with confirmations
 * Run: node backend/scripts/migrateAll.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';

const execAsync = promisify(exec);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function runScript(scriptName, description) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${description}`);
    console.log(`   Running: ${scriptName}`);
    console.log('='.repeat(60));
    
    try {
        const { stdout, stderr } = await execAsync(`node ${scriptName}`);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        return true;
    } catch (error) {
        console.error(`❌ Error running ${scriptName}:`, error.message);
        return false;
    }
}

async function migrateAll() {
    console.log('🚀 Database Migration Master Script');
    console.log('=====================================\n');
    
    console.log('This script will:');
    console.log('1. Verify collections (safe, read-only)');
    console.log('2. Consolidate student_progress → tblStudentProgress');
    console.log('3. Archive old TPC tables (tblTPC, tblDeptTPC)');
    console.log('4. Rename syllabus → tblSyllabus');
    console.log('5. Check and delete unused collections (tblITPC)\n');
    
    const answer = await question('Continue? (yes/no): ');
    if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Migration cancelled');
        rl.close();
        process.exit(0);
    }
    
    // Step 1: Verify
    console.log('\n📊 Step 1: Verifying Collections...');
    const verifySuccess = await runScript(
        'backend/scripts/verifyCollections.js',
        'Verification'
    );
    
    if (!verifySuccess) {
        console.log('\n❌ Verification failed - stopping migration');
        rl.close();
        process.exit(1);
    }
    
    const continueAnswer = await question('\n⚠️  Review the verification output above. Continue? (yes/no): ');
    if (continueAnswer.toLowerCase() !== 'yes') {
        console.log('❌ Migration cancelled');
        rl.close();
        process.exit(0);
    }
    
    // Step 2: Consolidate student_progress
    console.log('\n📊 Step 2: Consolidating student_progress...');
    await runScript(
        'backend/scripts/consolidateStudentProgress.js',
        'Consolidate Student Progress'
    );
    
    // Step 3: Archive old TPC tables
    console.log('\n📊 Step 3: Archiving Old TPC Tables...');
    await runScript(
        'backend/scripts/archiveOldTPCTables.js',
        'Archive Old TPC Tables'
    );
    
    // Step 4: Rename syllabus
    console.log('\n📊 Step 4: Renaming syllabus collection...');
    await runScript(
        'backend/scripts/renameSyllabusCollection.js',
        'Rename Syllabus Collection'
    );
    
    // Step 5: Check unused collections
    console.log('\n📊 Step 5: Checking Unused Collections...');
    await runScript(
        'backend/scripts/checkAndDeleteUnusedCollections.js',
        'Check Unused Collections'
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration Complete!');
    console.log('='.repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. Verify all migrations were successful');
    console.log('2. Update code references (if syllabus was renamed)');
    console.log('3. Test application functionality');
    console.log('4. After 3-6 months, delete archived collections');
    console.log('\n💡 To delete archived collections later:');
    console.log('   db.tblTPC_archive_*.drop()');
    console.log('   db.tblDeptTPC_archive_*.drop()');
    
    rl.close();
    process.exit(0);
}

migrateAll().catch(error => {
    console.error('❌ Migration error:', error);
    rl.close();
    process.exit(1);
});
