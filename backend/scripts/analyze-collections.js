/**
 * Analyze MongoDB Collections for Production Migration
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'scholarplace';

async function analyzeCollections() {
    const client = new MongoClient(MONGODB_URI);
    let output = [];

    try {
        await client.connect();
        output.push('✅ Connected to local MongoDB\n');
        output.push('📊 DATABASE: ' + DB_NAME + '\n');
        output.push('='.repeat(100) + '\n\n');

        const db = client.db(DB_NAME);
        const collections = await db.listCollections().toArray();

        const productionRequired = [];
        const testData = [];
        const unknown = [];

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            const count = await db.collection(collectionName).countDocuments();
            const sample = await db.collection(collectionName).findOne();

            const info = { name: collectionName, count: count };

            // Categorization logic
            if (
                collectionName === 'tblRoles' ||
                collectionName === 'tblCodingProblems' ||
                collectionName === 'tblQuestions' ||
                collectionName === 'tblSyllabus' ||
                collectionName === 'tblCollege' ||
                collectionName === 'tblDepartment' ||
                collectionName === 'tblTPC' ||
                collectionName === 'tblDeptTPC'
            ) {
                productionRequired.push(info);
            } else if (
                collectionName === 'tblStudentProgress' ||
                collectionName === 'tblCodingSubmissions' ||
                collectionName === 'tblTestState' ||
                collectionName === 'tblPracticeTest' ||
                collectionName === 'tblTestSubmission' ||
                collectionName === 'tblTestAnalysis'
            ) {
                testData.push(info);
            } else {
                unknown.push(info);
            }
        }

        // Production collections
        output.push('🟢 PRODUCTION-REQUIRED COLLECTIONS (MUST EXPORT):\n');
        output.push('='.repeat(100) + '\n');
        if (productionRequired.length === 0) {
            output.push('   ⚠️  No production collections found!\n');
        } else {
            productionRequired.forEach(col => {
                output.push(`   ✅ ${col.name.padEnd(40)} → ${col.count.toString().padStart(8)} documents\n`);
            });
            output.push(`\n   TOTAL: ${productionRequired.reduce((sum, c) => sum + c.count, 0)} documents\n`);
        }

        // Test data
        output.push('\n🔴 TEST DATA COLLECTIONS (DO NOT EXPORT - Student Test Data):\n');
        output.push('='.repeat(100) + '\n');
        if (testData.length === 0) {
            output.push('   ✅ No test data found\n');
        } else {
            testData.forEach(col => {
                output.push(`   ❌ ${col.name.padEnd(40)} → ${col.count.toString().padStart(8)} documents (SKIP)\n`);
            });
        }

        // Unknown
        if (unknown.length > 0) {
            output.push('\n⚪ UNKNOWN COLLECTIONS (REVIEW MANUALLY):\n');
            output.push('='.repeat(100) + '\n');
            unknown.forEach(col => {
                output.push(`   ⚠️  ${col.name.padEnd(40)} → ${col.count.toString().padStart(8)} documents\n`);
            });
        }

        // Export commands
        output.push('\n' + '='.repeat(100) + '\n');
        output.push('📤 MONGODB EXPORT COMMANDS:\n\n');

        if (productionRequired.length > 0) {
            output.push('# Method 1: Export production collections individually\n');
            productionRequired.forEach(col => {
                output.push(`mongodump --db ${DB_NAME} --collection ${col.name} --out ./mongodb-backup\n`);
            });

            output.push('\n# Method 2: Export entire DB, then delete test collections from backup folder\n');
            output.push(`mongodump --db ${DB_NAME} --out ./mongodb-backup\n`);
            output.push('# Then delete these folders from backup:\n');
            testData.forEach(col => {
                output.push(`#   - mongodb-backup/${DB_NAME}/${col.name}.bson\n`);
                output.push(`#   - mongodb-backup/${DB_NAME}/${col.name}.metadata.json\n`);
            });
        }

        // Summary
        output.push('\n' + '='.repeat(100) + '\n');
        output.push('📊 FINAL SUMMARY:\n\n');
        output.push(`   ✅ Collections to EXPORT:     ${productionRequired.length}\n`);
        output.push(`   ❌ Collections to SKIP:       ${testData.length}\n`);
        output.push(`   ⚠️  Collections to REVIEW:    ${unknown.length}\n`);
        output.push(`   📦 Total documents to export: ${productionRequired.reduce((sum, c) => sum + c.count, 0)}\n`);
        output.push('='.repeat(100) + '\n');

        // Write to file
        const outputText = output.join('');
        fs.writeFileSync('./collection-analysis-report.txt', outputText);

        console.log(outputText);
        console.log('\n✅ Report saved to: collection-analysis-report.txt');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

analyzeCollections().catch(console.error);
