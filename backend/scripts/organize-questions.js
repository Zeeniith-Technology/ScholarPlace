/**
 * Question Organization Script
 * Organizes all questions in MongoDB by Week (1-6) and Day (1-5)
 * Ensures exactly 50 questions per day with proper difficulty distribution
 * 
 * Usage:
 *   node backend/scripts/organize-questions.js
 */

import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Week/Day mapping based on question ID ranges
 * 30 days total (6 weeks × 5 days)
 * 50 questions per day = 1500 total
 */
const WEEK_DAY_MAPPING = [
    // Week 1: Numbers, Integers, BODMAS (Q1-Q250)
    { week: 1, day: 1, startId: 1, endId: 50, topic: 'Integers & Number Systems' },
    { week: 1, day: 2, startId: 51, endId: 100, topic: 'Factors & Divisibility' },
    { week: 1, day: 3, startId: 101, endId: 150, topic: 'Divisibility Rules' },
    { week: 1, day: 4, startId: 151, endId: 200, topic: 'HCF & LCM' },
    { week: 1, day: 5, startId: 201, endId: 250, topic: 'BODMAS & Integration' },

    // Week 2: Percentages, Ratios, Proportions (Q251-Q500)
    { week: 2, day: 1, startId: 251, endId: 300, topic: 'Percentage Basics' },
    { week: 2, day: 2, startId: 301, endId: 350, topic: 'Successive Percentages' },
    { week: 2, day: 3, startId: 351, endId: 400, topic: 'Ratio Fundamentals' },
    { week: 2, day: 4, startId: 401, endId: 450, topic: 'Proportion Applications' },
    { week: 2, day: 5, startId: 451, endId: 500, topic: 'Integration' },

    // Week 3: Ratio, Proportion, Timework (Q501-Q750)
    { week: 3, day: 1, startId: 501, endId: 550, topic: 'Ratio Foundations' },
    { week: 3, day: 2, startId: 551, endId: 600, topic: 'Compound Ratios' },
    { week: 3, day: 3, startId: 601, endId: 650, topic: 'Proportion Fundamentals' },
    { week: 3, day: 4, startId: 651, endId: 700, topic: 'Timework Fundamentals' },
    { week: 3, day: 5, startId: 701, endId: 750, topic: 'Integration' },

    // Week 4: Timework Advanced, Pipes (Q751-Q1000)
    { week: 4, day: 1, startId: 751, endId: 800, topic: 'Timework Advanced' },
    { week: 4, day: 2, startId: 801, endId: 850, topic: 'Timework Variables' },
    { week: 4, day: 3, startId: 851, endId: 900, topic: 'Pipes Fundamentals' },
    { week: 4, day: 4, startId: 901, endId: 950, topic: 'Pipes Advanced' },
    { week: 4, day: 5, startId: 951, endId: 1000, topic: 'Integration' },

    // Week 5: Comprehensive Mastery (Q1001-Q1250)
    { week: 5, day: 1, startId: 1001, endId: 1050, topic: 'Comprehensive Mastery' },
    { week: 5, day: 2, startId: 1051, endId: 1100, topic: 'Advanced Integration' },
    { week: 5, day: 3, startId: 1101, endId: 1150, topic: 'Real-World Applications' },
    { week: 5, day: 4, startId: 1151, endId: 1200, topic: 'Interview Prep' },
    { week: 5, day: 5, startId: 1201, endId: 1250, topic: 'Expert Scenarios' },

    // Week 6: Finance (Q1251-Q1500)
    { week: 6, day: 1, startId: 1251, endId: 1300, topic: 'Profit/Loss Fundamentals' },
    { week: 6, day: 2, startId: 1301, endId: 1350, topic: 'Discount & Markup' },
    { week: 6, day: 3, startId: 1351, endId: 1400, topic: 'Simple Interest' },
    { week: 6, day: 4, startId: 1401, endId: 1450, topic: 'Compound Interest' },
    { week: 6, day: 5, startId: 1451, endId: 1500, topic: 'Financial Integration' }
];

/**
 * Helper function to extract numeric ID from question_id
 */
function extractNumericId(questionId) {
    const match = questionId.match(/Q?(\d+)/);
    return match ? parseInt(match[1]) : null;
}

/**
 * Analyze current distribution in database
 */
async function analyzeCurrentDistribution() {
    console.log('\n📊 Analyzing Current Distribution...\n');

    const db = getDB();
    const collection = db.collection('tblQuestion');

    // Total count
    const totalCount = await collection.countDocuments({});
    console.log(`Total questions: ${totalCount}`);

    // Count by week
    const byWeek = await collection.aggregate([
        { $group: { _id: '$week', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]).toArray();

    console.log('\nCurrent Week Distribution:');
    byWeek.forEach(w => {
        console.log(`  Week ${w._id || 'null'}: ${w.count} questions`);
    });

    // Count by difficulty
    const byDifficulty = await collection.aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]).toArray();

    console.log('\nCurrent Difficulty Distribution:');
    byDifficulty.forEach(d => {
        console.log(`  ${d._id || 'null'}: ${d.count} questions`);
    });

    // Questions without week/day
    const missingMetadata = await collection.countDocuments({
        $or: [
            { week: null },
            { day: null },
            { week: { $exists: false } },
            { day: { $exists: false } }
        ]
    });

    console.log(`\nQuestions missing week/day: ${missingMetadata}`);

    return { totalCount, byWeek, byDifficulty, missingMetadata };
}

/**
 * Update questions with week/day assignments
 */
async function organizeQuestions() {
    console.log('\n🔄 Organizing Questions by Week and Day...\n');

    const db = getDB();
    const collection = db.collection('tblQuestion');

    let totalUpdated = 0;
    const dayStats = [];

    for (const mapping of WEEK_DAY_MAPPING) {
        console.log(`\n--- Week ${mapping.week}, Day ${mapping.day}: ${mapping.topic} ---`);
        console.log(`   Target: Q${mapping.startId}-Q${mapping.endId} (50 questions)`);

        // Build query for questions in this range
        const questions = await collection.find({
            $or: [
                // Match Q1, Q2, etc.
                { question_id: { $in: generateQuestionIds(mapping.startId, mapping.endId) } },
                // Also try numeric comparison for questions without 'Q' prefix
                { question_id: { $regex: new RegExp(`^Q?(${mapping.startId}|${mapping.startId + 1}|...|${mapping.endId})$`) } }
            ]
        }).toArray();

        // Sort by extracting numeric ID
        const sortedQuestions = questions.sort((a, b) => {
            const numA = extractNumericId(a.question_id);
            const numB = extractNumericId(b.question_id);
            return numA - numB;
        });

        console.log(`   Found: ${sortedQuestions.length} questions`);

        // Update each question
        if (sortedQuestions.length > 0) {
            const questionIds = sortedQuestions.map(q => q._id);

            const result = await collection.updateMany(
                { _id: { $in: questionIds } },
                {
                    $set: {
                        week: mapping.week,
                        day: mapping.day,
                        updated_at: new Date().toISOString()
                    }
                }
            );

            totalUpdated += result.modifiedCount;
            console.log(`   ✅ Updated: ${result.modifiedCount} questions`);

            // Calculate difficulty distribution for this day
            const difficultyDist = sortedQuestions.reduce((acc, q) => {
                acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
                return acc;
            }, {});

            dayStats.push({
                week: mapping.week,
                day: mapping.day,
                topic: mapping.topic,
                totalQuestions: sortedQuestions.length,
                difficultyDistribution: difficultyDist,
                questionIdRange: `Q${mapping.startId}-Q${mapping.endId}`
            });
        } else {
            console.log(`   ⚠️  No questions found in this range`);
        }
    }

    console.log(`\n✅ Total questions updated: ${totalUpdated}\n`);

    return dayStats;
}

/**
 * Generate array of question IDs for a range
 */
function generateQuestionIds(start, end) {
    const ids = [];
    for (let i = start; i <= end; i++) {
        ids.push(`Q${i}`);
    }
    return ids;
}

/**
 * Verify organization
 */
async function verifyOrganization() {
    console.log('\n✅ Verification Report\n');
    console.log('='.repeat(60));

    const db = getDB();
    const collection = db.collection('tblQuestion');

    // Check 1: Total questions
    const totalQuestions = await collection.countDocuments({});
    console.log(`\n✓ Total Questions: ${totalQuestions}`);

    // Check 2: Questions per week
    console.log('\n✓ Questions per Week:');
    for (let week = 1; week <= 6; week++) {
        const count = await collection.countDocuments({ week });
        const expected = 250;
        const status = count === expected ? '✅' : '⚠️ ';
        console.log(`  Week ${week}: ${count} questions ${status}`);
    }

    // Check 3: Questions per day
    console.log('\n✓ Questions per Day:');
    for (const mapping of WEEK_DAY_MAPPING) {
        const count = await collection.countDocuments({
            week: mapping.week,
            day: mapping.day
        });
        const expected = 50;
        const status = count === expected ? '✅' : count === 0 ? '❌' : `⚠️  (${count})`;
        console.log(`  Week ${mapping.week}, Day ${mapping.day}: ${status}`);
    }

    // Check 4: Missing week/day
    const missingMetadata = await collection.countDocuments({
        $or: [
            { week: null },
            { day: null },
            { week: { $exists: false } },
            { day: { $exists: false } }
        ]
    });
    console.log(`\n✓ Questions without week/day: ${missingMetadata} ${missingMetadata === 0 ? '✅' : '⚠️ '}`);

    // Check 5: Valid values
    const invalidWeek = await collection.countDocuments({
        week: { $nin: [1, 2, 3, 4, 5, 6] }
    });
    const invalidDay = await collection.countDocuments({
        day: { $nin: [1, 2, 3, 4, 5] }
    });
    console.log(`\n✓ Invalid week values: ${invalidWeek} ${invalidWeek === 0 ? '✅' : '⚠️ '}`);
    console.log(`✓ Invalid day values: ${invalidDay} ${invalidDay === 0 ? '✅' : '⚠️ '}`);

    // Check 6: Difficulty distribution
    console.log('\n✓ Overall Difficulty Distribution:');
    const diffDist = await collection.aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]).toArray();

    diffDist.forEach(d => {
        const percentage = ((d.count / totalQuestions) * 100).toFixed(1);
        console.log(`  ${d._id}: ${d.count} (${percentage}%)`);
    });

    console.log('\n' + '='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║         QUESTION ORGANIZATION SCRIPT                           ║
║         Organize 1500 questions by Week and Day                ║
╚════════════════════════════════════════════════════════════════╝
    `);

    try {
        // Connect to database
        await connectDB();

        // Step 1: Analyze current state
        await analyzeCurrentDistribution();

        // Step 2: Organize questions
        const dayStats = await organizeQuestions();

        // Step 3: Verify organization
        await verifyOrganization();

        // Step 4: Display day statistics
        console.log('\n📊 Day-wise Statistics:\n');
        dayStats.forEach(stat => {
            console.log(`Week ${stat.week}, Day ${stat.day}: ${stat.topic}`);
            console.log(`  Total: ${stat.totalQuestions} questions`);
            console.log(`  Difficulty:`, stat.difficultyDistribution);
            console.log('');
        });

        console.log('✅ Organization complete!\n');

    } catch (error) {
        console.error('\n❌ Error during organization:', error.message);
        console.error(error.stack);
        process.exit(1);
    }

    process.exit(0);
}

// Run the script
main();
