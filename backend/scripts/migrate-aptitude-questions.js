/**
 * Migration Script: Aptitude Questions
 * Parses FINAL_APTITUDE_BANK_1500.md and populates tblQuestion collection
 * 
 * Usage:
 *   node backend/scripts/migrate-aptitude-questions.js --dry-run   (validation only)
 *   node backend/scripts/migrate-aptitude-questions.js --execute   (actual migration)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the markdown file
const MARKDOWN_FILE = path.join(__dirname, '../../Question/Aptitude/FINAL_APTITUDE_BANK_1500.md');

/**
 * Parse markdown file and extract questions
 */
function parseMarkdownFile(filePath) {
    console.log(`\n📖 Reading file: ${filePath}`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const questions = [];
    const errors = [];

    // Split by question blocks - handle both formats:
    // Old: **Question 1:** 
    // New: **Question Q1251:**
    const questionBlocks = content.split(/(?=\*\*Question (?:Q?\d+):)/);

    console.log(`📊 Found ${questionBlocks.length} potential question blocks\n`);

    for (const block of questionBlocks) {
        if (!block.trim() || !block.includes('**Question')) continue;

        try {
            const question = parseQuestionBlock(block);
            if (question) {
                questions.push(question);
            }
        } catch (error) {
            errors.push({
                block: block.substring(0, 100) + '...',
                error: error.message
            });
        }
    }

    return { questions, errors };
}

/**
 * Parse individual question block
 */
function parseQuestionBlock(block) {
    const data = {};

    // Extract Question ID and Text
    // Handle both: "**Question 1:**" and "**Question Q1251:**"
    const questionMatch = block.match(/\*\*Question (Q?\d+):\*\*\s*(.+?)(?=\*\*Options:|\n\n)/s);
    if (!questionMatch) return null;

    let questionId = questionMatch[1];
    // If ID doesn't start with 'Q', add it
    if (!questionId.startsWith('Q')) {
        questionId = 'Q' + questionId;
    }
    data.question_id = questionId;
    data.question_text = questionMatch[2].trim();

    // Extract Options
    const optionsMatch = block.match(/\*\*Options:\*\*\s*\n([\s\S]+?)(?=\n\*\*Answer:)/);
    if (optionsMatch) {
        const optionsText = optionsMatch[1];
        const options = [];
        const optionLines = optionsText.match(/([A-D])\)\s*(.+)/g);

        if (optionLines) {
            for (const line of optionLines) {
                const match = line.match(/([A-D])\)\s*(.+)/);
                if (match) {
                    options.push({
                        key: match[1],
                        text: match[2].trim(),
                        is_correct: false
                    });
                }
            }
        }
        data.options = options;
    }

    // Extract Correct Answer
    const answerMatch = block.match(/\*\*Answer:\*\*\s*([A-D])/);
    if (answerMatch) {
        data.correct_answer = answerMatch[1];
        // Mark the correct option
        if (data.options) {
            const correctOption = data.options.find(opt => opt.key === data.correct_answer);
            if (correctOption) {
                correctOption.is_correct = true;
            }
        }
    }

    // Extract Difficulty
    const difficultyMatch = block.match(/\*\*Difficulty:\*\*\s*(Easy|Medium|Hard|Expert)/);
    if (difficultyMatch) {
        data.difficulty = difficultyMatch[1];
    }

    // Extract Topic
    const topicMatch = block.match(/\*\*Topic:\*\*\s*(.+?)(?=\n|$)/);
    if (topicMatch) {
        data.topic = topicMatch[1].trim();
    }

    // Extract Week
    const weekMatch = block.match(/\*\*Week:\*\*\s*(\d+)/);
    if (weekMatch) {
        data.week = parseInt(weekMatch[1]);
    }

    // Extract Day
    const dayMatch = block.match(/\*\*Day:\*\*\s*(\d+)/);
    if (dayMatch) {
        data.day = parseInt(dayMatch[1]);
    }

    // Extract Explanation
    const explanationMatch = block.match(/\*\*Explanation:\*\*\s*(.+?)(?=\n---|$)/s);
    if (explanationMatch) {
        data.explanation = explanationMatch[1].trim();
    }

    // Set fixed values for all aptitude questions
    data.question_type = 'aptitude';
    data.category = 'aptitude';
    data.status = 'active';
    data.version = 1;
    data.deleted = false;
    data.tags = [];
    data.created_at = new Date();
    data.updated_at = new Date();

    // Validate required fields
    if (!data.question_id || !data.question_text || !data.correct_answer ||
        !data.week || !data.day || !data.difficulty) {
        throw new Error(`Missing required fields in ${data.question_id || 'unknown'}`);
    }

    return data;
}

/**
 * Validate parsed questions
 */
function validateQuestions(questions) {
    console.log(`\n✅ Validation Report:\n`);

    const stats = {
        total: questions.length,
        byWeek: {},
        byDifficulty: {},
        byDay: {},
        missingFields: []
    };

    for (const q of questions) {
        // Count by week
        stats.byWeek[q.week] = (stats.byWeek[q.week] || 0) + 1;

        // Count by difficulty
        stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;

        // Count by day
        stats.byDay[q.day] = (stats.byDay[q.day] || 0) + 1;

        // Check for missing options
        if (!q.options || q.options.length !== 4) {
            stats.missingFields.push(`${q.question_id}: Expected 4 options, got ${q.options?.length || 0}`);
        }
    }

    console.log(`Total Questions: ${stats.total}`);
    console.log(`\nBy Week:`);
    Object.keys(stats.byWeek).sort().forEach(week => {
        console.log(`  Week ${week}: ${stats.byWeek[week]} questions`);
    });

    console.log(`\nBy Difficulty:`);
    Object.keys(stats.byDifficulty).sort().forEach(diff => {
        console.log(`  ${diff}: ${stats.byDifficulty[diff]} questions`);
    });

    console.log(`\nBy Day:`);
    Object.keys(stats.byDay).sort().forEach(day => {
        console.log(`  Day ${day}: ${stats.byDay[day]} questions`);
    });

    if (stats.missingFields.length > 0) {
        console.log(`\n⚠️  Issues found (${stats.missingFields.length}):`);
        stats.missingFields.slice(0, 10).forEach(issue => console.log(`  - ${issue}`));
        if (stats.missingFields.length > 10) {
            console.log(`  ... and ${stats.missingFields.length - 10} more`);
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

    console.log(`Existing questions (will be skipped): ${existingQuestions.length}`);
    console.log(`New questions to insert: ${newQuestions.length}\n`);

    if (newQuestions.length === 0) {
        console.log('✅ No new questions to insert.');
        return { inserted: 0, skipped: existingQuestions.length };
    }

    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < newQuestions.length; i += batchSize) {
        const batch = newQuestions.slice(i, i + batchSize);
        const result = await collection.insertMany(batch);
        inserted += result.insertedCount;
        console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}: ${result.insertedCount} questions`);
    }

    // Create indexes
    console.log(`\n🔍 Creating indexes...`);
    await collection.createIndex({ question_id: 1 }, { unique: true });
    await collection.createIndex({ category: 1 });
    await collection.createIndex({ week: 1, day: 1 });
    await collection.createIndex({ difficulty: 1 });
    await collection.createIndex({ topic: 1 });
    await collection.createIndex({ status: 1 });
    console.log(`✅ Indexes created successfully`);

    return { inserted, skipped: existingQuestions.length };
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const isExecute = args.includes('--execute');

    if (!isDryRun && !isExecute) {
        console.log(`
Usage:
  node backend/scripts/migrate-aptitude-questions.js --dry-run   (validation only)
  node backend/scripts/migrate-aptitude-questions.js --execute   (actual migration)
        `);
        process.exit(1);
    }

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║         APTITUDE QUESTIONS MIGRATION SCRIPT                    ║
║         Mode: ${isDryRun ? 'DRY RUN (Validation Only)' : 'EXECUTE (Insert to DB)'}       ║
╚════════════════════════════════════════════════════════════════╝
    `);

    try {
        // Parse markdown file
        const { questions, errors } = parseMarkdownFile(MARKDOWN_FILE);

        console.log(`\n✅ Successfully parsed ${questions.length} questions`);

        if (errors.length > 0) {
            console.log(`\n⚠️  Encountered ${errors.length} parsing errors:`);
            errors.slice(0, 5).forEach((err, idx) => {
                console.log(`\n${idx + 1}. ${err.error}`);
                console.log(`   Block: ${err.block}`);
            });
            if (errors.length > 5) {
                console.log(`\n   ... and ${errors.length - 5} more errors`);
            }
        }

        // Validate questions
        const stats = validateQuestions(questions);

        // Category check
        const allAptitude = questions.every(q => q.category === 'aptitude');
        console.log(`\n✅ All questions have category: "aptitude" = ${allAptitude}`);

        if (isDryRun) {
            console.log(`\n✅ DRY RUN COMPLETE - No data was inserted into database`);
            console.log(`\n📊 Summary:`);
            console.log(`   - Total questions parsed: ${questions.length}`);
            console.log(`   - Parsing errors: ${errors.length}`);
            console.log(`   - Ready for migration: ${questions.length - errors.length}`);
        } else if (isExecute) {
            // Connect to database
            await connectDB();

            // Insert questions
            const result = await insertQuestions(questions);

            console.log(`\n✅ MIGRATION COMPLETE`);
            console.log(`\n📊 Summary:`);
            console.log(`   - Total questions processed: ${questions.length}`);
            console.log(`   - Questions inserted: ${result.inserted}`);
            console.log(`   - Questions skipped (duplicates): ${result.skipped}`);
            console.log(`   - Parsing errors: ${errors.length}`);
        }

    } catch (error) {
        console.error(`\n❌ Migration failed:`, error.message);
        console.error(error.stack);
        process.exit(1);
    }

    process.exit(0);
}

// Run migration
main();
