/**
 * Migration Script: Coding Problems
 * Imports coding problems from JSON file into tblCodingProblem collection
 * 
 * Usage:
 *   node backend/scripts/migrate-coding-problems.js --dry-run   (validation only)
 *   node backend/scripts/migrate-coding-problems.js --execute   (actual migration)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the JSON file
const JSON_FILE = path.join(__dirname, '../data/questions/capstone_coding_problems.json');
const COLLECTION_NAME = 'tblCodingProblem';

/**
 * Load and parse JSON file
 */
function loadProblemsFromJSON() {
    console.log(`\n📖 Reading file: ${JSON_FILE}`);

    if (!fs.existsSync(JSON_FILE)) {
        throw new Error(`File not found: ${JSON_FILE}`);
    }

    const content = fs.readFileSync(JSON_FILE, 'utf-8');
    const problems = JSON.parse(content);

    console.log(`✅ Loaded ${problems.length} coding problems from JSON\n`);
    return problems;
}

/**
 * Validate problem structure
 */
function validateProblem(problem, index) {
    const required = [
        'question_id', 'week', 'title', 'problem_statement',
        'function_signature', 'test_cases', 'constraints',
        'expected_complexity', 'difficulty'
    ];

    const missing = required.filter(field => !problem[field]);

    if (missing.length > 0) {
        console.error(`❌ Problem ${index + 1} (${problem.question_id || 'unknown'}) missing fields: ${missing.join(', ')}`);
        return false;
    }

    // Validate test cases
    if (!Array.isArray(problem.test_cases) || problem.test_cases.length === 0) {
        console.error(`❌ Problem ${problem.question_id} has no test cases`);
        return false;
    }

    // Validate week range
    if (problem.week < 1 || problem.week > 6) {
        console.error(`❌ Problem ${problem.question_id} has invalid week: ${problem.week}`);
        return false;
    }

    return true;
}

/**
 * Main migration function
 */
async function migrateCodingProblems(dryRun = true) {
    console.log('\n🚀 Coding Problems Migration Script\n');
    console.log(`Mode: ${dryRun ? '🧪 DRY RUN (validation only)' : '⚡ EXECUTE (actual migration)'}\n`);
    console.log('='.repeat(60));

    try {
        // Load problems from JSON
        const problems = loadProblemsFromJSON();

        // Validate all problems
        console.log('\n📋 Validating problems...\n');
        let validCount = 0;
        let invalidCount = 0;

        for (let i = 0; i < problems.length; i++) {
            if (validateProblem(problems[i], i)) {
                validCount++;
                console.log(`✓ Problem ${i + 1}: ${problems[i].question_id} - ${problems[i].title}`);
            } else {
                invalidCount++;
            }
        }

        console.log(`\n📊 Validation Results:`);
        console.log(`   Valid: ${validCount}`);
        console.log(`   Invalid: ${invalidCount}`);

        if (invalidCount > 0) {
            throw new Error('Validation failed. Please fix errors before proceeding.');
        }

        if (dryRun) {
            console.log('\n✅ DRY RUN COMPLETE - No data was inserted');
            console.log('   Run with --execute flag to perform actual migration\n');
            return {
                success: true,
                dryRun: true,
                validated: validCount
            };
        }

        // Connect to database
        console.log('\n🔌 Connecting to MongoDB...');
        await connectDB();
        const db = getDB();
        const collection = db.collection(COLLECTION_NAME);

        console.log(`✅ Connected to collection: ${COLLECTION_NAME}\n`);

        // Check for existing problems
        const existingCount = await collection.countDocuments();
        console.log(`📊 Existing problems in database: ${existingCount}`);

        // Insert problems
        console.log('\n📥 Inserting coding problems...\n');
        let insertedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const problem of problems) {
            try {
                // Check if problem already exists
                const existing = await collection.findOne({ question_id: problem.question_id });

                if (existing) {
                    console.log(`⏭️  Skipped (already exists): ${problem.question_id}`);
                    skippedCount++;
                    continue;
                }

                // Add timestamps
                problem.created_at = new Date();
                problem.updated_at = new Date();
                problem.deleted = false;
                problem.status = 'active';

                // Insert into database
                await collection.insertOne(problem);
                console.log(`✅ Inserted: ${problem.question_id} - ${problem.title}`);
                insertedCount++;

            } catch (error) {
                console.error(`❌ Error inserting ${problem.question_id}:`, error.message);
                errorCount++;
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('\n📊 Migration Summary:');
        console.log(`   Total problems: ${problems.length}`);
        console.log(`   ✅ Inserted: ${insertedCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📦 Total in DB: ${await collection.countDocuments()}\n`);

        // Week distribution
        console.log('📅 Problems by Week:');
        for (let week = 1; week <= 6; week++) {
            const count = await collection.countDocuments({ week });
            console.log(`   Week ${week}: ${count} problems`);
        }

        console.log('\n✅ MIGRATION COMPLETE\n');

        return {
            success: true,
            inserted: insertedCount,
            skipped: skippedCount,
            errors: errorCount,
            total: await collection.countDocuments()
        };

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error.stack);
        return {
            success: false,
            error: error.message
        };
    } finally {
        process.exit(0);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

// Run migration
migrateCodingProblems(dryRun);
