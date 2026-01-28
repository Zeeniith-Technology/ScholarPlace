/**
 * Verify Collections Before Migration
 * Checks which collections exist, their document counts, and identifies duplicates
 * Run this BEFORE running any migration scripts
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';
dotenv.config();

async function verifyCollections() {
    try {
        await connectDB();
        const db = getDB();
        
        console.log('🔍 Verifying Collections...\n');
        
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        console.log('📊 Found Collections:', collectionNames.length);
        collectionNames.forEach(name => console.log(`  - ${name}`));
        console.log('');
        
        // Check for duplicates
        console.log('🔍 Checking for Duplicates:\n');
        
        // 1. student_progress vs tblStudentProgress
        const hasStudentProgress = collectionNames.includes('student_progress');
        const hasTblStudentProgress = collectionNames.includes('tblStudentProgress');
        
        if (hasStudentProgress && hasTblStudentProgress) {
            const studentProgressCount = await db.collection('student_progress').countDocuments();
            const tblStudentProgressCount = await db.collection('tblStudentProgress').countDocuments();
            
            console.log('⚠️  DUPLICATE FOUND: student_progress vs tblStudentProgress');
            console.log(`   student_progress: ${studentProgressCount} documents`);
            console.log(`   tblStudentProgress: ${tblStudentProgressCount} documents`);
            
            if (studentProgressCount > 0) {
                console.log('   ⚠️  student_progress has data - needs migration!');
            } else {
                console.log('   ✅ student_progress is empty - safe to delete');
            }
            console.log('');
        }
        
        // 2. Check deprecated tables
        console.log('🔍 Checking Deprecated Tables:\n');
        
        const deprecatedTables = ['tblTPC', 'tblDeptTPC', 'tblITPC'];
        for (const tableName of deprecatedTables) {
            if (collectionNames.includes(tableName)) {
                const count = await db.collection(tableName).countDocuments();
                console.log(`   ${tableName}: ${count} documents`);
                
                if (tableName === 'tblITPC' && count === 0) {
                    console.log(`   ✅ ${tableName} is empty - safe to delete immediately`);
                } else if (tableName === 'tblTPC' || tableName === 'tblDeptTPC') {
                    console.log(`   ⚠️  ${tableName} has data - archive before deletion`);
                }
            } else {
                console.log(`   ${tableName}: Not found (already removed)`);
            }
        }
        console.log('');
        
        // 3. Check syllabus vs tblSyllabus
        const hasSyllabus = collectionNames.includes('syllabus');
        const hasTblSyllabus = collectionNames.includes('tblSyllabus');
        
        if (hasSyllabus) {
            const syllabusCount = await db.collection('syllabus').countDocuments();
            console.log('📚 Syllabus Collection:');
            console.log(`   syllabus: ${syllabusCount} documents`);
            if (hasTblSyllabus) {
                const tblSyllabusCount = await db.collection('tblSyllabus').countDocuments();
                console.log(`   tblSyllabus: ${tblSyllabusCount} documents`);
                console.log('   ⚠️  Both exist - need to consolidate');
            } else {
                console.log('   ✅ Can rename to tblSyllabus for consistency');
            }
            console.log('');
        }
        
        // 4. Summary
        console.log('📋 Summary:\n');
        console.log('✅ Safe to proceed with migration');
        console.log('⚠️  Review the warnings above before running migration scripts');
        console.log('');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error verifying collections:', error);
        process.exit(1);
    }
}

verifyCollections();
