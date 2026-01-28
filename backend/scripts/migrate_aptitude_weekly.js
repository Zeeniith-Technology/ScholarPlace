/**
 * Migration Script: Weekly Aptitude Test Questions
 * Parses generated JSON files and populates tblQuestion collection
 * 
 * Usage:
 *   node backend/scripts/migrate_aptitude_weekly.js --dry-run   (validation only)
 *   node backend/scripts/migrate_aptitude_weekly.js --execute   (actual migration)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the consolidated JSON file
const JSON_FILE = path.join(__dirname, '../data/weekly_tests/tests_WT001_to_WT006.json');

/**
 * Parse JSON file and extract questions
 */
function parseJsonFile(filePath) {
    console.log(`\n📖 Reading file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (!data.tests || !Array.isArray(data.tests)) {
        throw new Error('Invalid JSON format: "tests" array missing');
    }

    const questions = [];
    const errors = [];

    let totalProcessed = 0;

    for (const test of data.tests) {
        if (!test.questions || !Array.isArray(test.questions)) continue;

        for (const q of test.questions) {
            totalProcessed++;
            try {
                const parsedQ = transformQuestion(q, test.week, test.test_id);
                if (parsedQ) {
                    questions.push(parsedQ);
                }
            } catch (error) {
                errors.push({
                    id: q.q_id || 'unknown',
                    error: error.message
                });
            }
        }
    }

    console.log(`📊 Found ${data.tests.length} tests and ${totalProcessed} total questions\n`);

    return { questions, errors };
}

/**
 * Transform raw question object to Schema format
 */
function transformQuestion(q, week, testId) {
    const data = {};

    // Basic Fields
    data.question_id = q.q_id;
    data.question_text = q.question;
    data.difficulty = capitalize(q.difficulty); // Ensure Title Case
    data.topic = q.topic;
    data.explanation = q.explanation;
    data.week = week;
    data.day = 7; // Designate Day 7 for Weekly Tests

    // Fixed Fields for Aptitude
    data.question_type = 'aptitude';
    data.category = 'aptitude';
    data.status = 'active';
    data.version = 1;
    data.deleted = false;
    data.tags = ['weekly-aptitude-test', `week-${week}`, testId];
    data.created_at = new Date();
    data.updated_at = new Date();

    // Transform Options
    // Input: ["Option A", "Option B", ...]
    // Output: [{key: "A", text: "Option A", is_correct: false}, ...]
    if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
        throw new Error('Missing options');
    }

    data.options = q.options.map((optText, index) => {
        const key = String.fromCharCode(65 + index); // 0->A, 1->B, 2->C...
        return {
            key: key,
            text: optText,
            is_correct: false // Set later
        };
    });

    // Handle Correct Answer
    // Input: "Option Text" OR "A" (ambiguous, usually full text in our generation)
    // We need to find which option matches the answer string

    let correctKey = null;

    // 1. Try exact text match
    const matchByText = data.options.find(opt => opt.text.trim() === q.answer.trim());
    if (matchByText) {
        correctKey = matchByText.key;
    }
    // 2. Try partial match/key match if generated loosely (fallback)
    else {
        // Sometimes answer might be "A" or "Option A"
        const matchByKey = data.options.find(opt => opt.key === q.answer.trim());
        if (matchByKey) {
            correctKey = matchByKey.key;
        }
    }

    if (!correctKey) {
        // Fallback: If answer is not in options, logic error in generation or parsing
        // But for migration safety, let's log it.
        // In valid generated files, text matches.

        // Strict Mode: Fail
        throw new Error(`Correct answer "${q.answer}" not found in options: ${JSON.stringify(q.options)}`);
    }

    data.correct_answer = correctKey;

    // Set is_correct flag
    data.options.forEach(opt => {
        if (opt.key === correctKey) {
            opt.is_correct = true;
        }
    });

    return data;
}

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Validate parsed questions
 */
function validateQuestions(questions) {
    const stats = {
        total: questions.length,
        byWeek: {},
        missingFields: []
    };

    for (const q of questions) {
        stats.byWeek[q.week] = (stats.byWeek[q.week] || 0) + 1;
        if (!q.options || q.options.length !== 4) {
            stats.missingFields.push(`${q.question_id}: Expected 4 options, got ${q.options?.length || 0}`);
        }
    }
    return stats;
}

/**
 * Insert questions into database
 */
async function insertQuestions(questions) {
    console.log(`\n📝 Inserting ${questions.length} questions into database...\n`);

    const db = getDB();
    const collection = db.collection('tblQuestion');

    // Check for existing questions
    const existingQuestions = await collection.find({
        question_id: { $in: questions.map(q => q.question_id) }
    }).toArray();

    const existingIds = new Set(existingQuestions.map(q => q.question_id));
    const newQuestions = questions.filter(q => !existingIds.has(q.question_id));

    console.log(`Existing questions (skipped): ${existingQuestions.length}`);
    console.log(`New questions to insert: ${newQuestions.length}\n`);

    if (newQuestions.length === 0) {
        console.log('✅ No new questions to insert.');
        return { inserted: 0, skipped: existingQuestions.length };
    }

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < newQuestions.length; i += batchSize) {
        const batch = newQuestions.slice(i, i + batchSize);
        const result = await collection.insertMany(batch);
        inserted += result.insertedCount;
        console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}: ${result.insertedCount} questions`);
    }

    return { inserted, skipped: existingQuestions.length };
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const isExecute = args.includes('--execute');

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║      WEEKLY APTITUDE TEST MIGRATION SCRIPT                     ║
║      Mode: ${isExecute ? 'EXECUTE (Insert to DB)' : 'DRY RUN (Validation Only)'}                 ║
╚════════════════════════════════════════════════════════════════╝
    `);

    try {
        const { questions, errors } = parseJsonFile(JSON_FILE);

        console.log(`\n✅ Successfully parsed ${questions.length} questions`);

        if (errors.length > 0) {
            console.log(`\n⚠️  Encountered ${errors.length} parsing errors:`);
            errors.slice(0, 5).forEach(err => console.log(`  - [${err.id}] ${err.error}`));
        }

        const stats = validateQuestions(questions);
        console.log(`\n📊 Validated Stats:`, stats.byWeek);

        if (isExecute) {
            await connectDB();
            await insertQuestions(questions);
            console.log(`\n✅ MIGRATION COMPLETE`);
            process.exit(0);
        } else {
            console.log(`\n✅ DRY RUN COMPLETE - No changes made.`);
            process.exit(0);
        }

    } catch (error) {
        console.error(`\n❌ Migration failed:`, error.message);
        process.exit(1);
    }
}

main();
