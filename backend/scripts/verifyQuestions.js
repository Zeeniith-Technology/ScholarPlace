/**
 * Verification script for Week 1 questions
 * Checks that all questions are properly organized by day
 */

import week1Questions, { questionsByDay, questionsStats } from '../data/questions.js';

console.log('='.repeat(60));
console.log('Week 1 DSA Questions Verification');
console.log('='.repeat(60));

// Check total count
console.log(`\n✅ Total Questions: ${week1Questions.length}`);
console.log(`   Expected: 150 (30 per day × 5 days)`);
console.log(`   Status: ${week1Questions.length === 150 ? '✓ PASS' : '✗ FAIL'}`);

// Check each day
const days = ['pre-week', 'day-1', 'day-2', 'day-3', 'day-4', 'day-5'];
const dayNames = {
    'pre-week': 'PRE-WEEK (I/O)',
    'day-1': 'Day 1 (Data Types & Variables)',
    'day-2': 'Day 2 (Operators & Decision Making)',
    'day-3': 'Day 3 (Loops & Patterns)',
    'day-4': 'Day 4 (Arrays)',
    'day-5': 'Day 5 (Functions)'
};

console.log('\n📊 Questions by Day:');
console.log('-'.repeat(60));

let allValid = true;

days.forEach(day => {
    const questions = questionsByDay[day];
    const stats = questionsStats[day];
    const isValid = questions.length === 30;
    
    if (!isValid) allValid = false;
    
    console.log(`\n${dayNames[day]}:`);
    console.log(`  Total: ${questions.length} ${isValid ? '✓' : '✗ (Expected 30)'}`);
    console.log(`  Easy: ${stats.easy}`);
    console.log(`  Intermediate: ${stats.intermediate}`);
    console.log(`  Difficult: ${stats.difficult}`);
    
    // Check for duplicate question IDs
    const questionIds = questions.map(q => q.question_id);
    const uniqueIds = new Set(questionIds);
    if (questionIds.length !== uniqueIds.size) {
        console.log(`  ⚠️  WARNING: Duplicate question IDs found!`);
        allValid = false;
    }
});

// Check for missing fields
console.log('\n🔍 Checking question structure...');
const requiredFields = ['question_id', 'question', 'options', 'answer', 'question_type', 'time_taken', 'question_topic', 'question_subtopic', 'link', 'explanation', 'day', 'language'];

let structureValid = true;
week1Questions.forEach((q, index) => {
    const missingFields = requiredFields.filter(field => !(field in q));
    if (missingFields.length > 0) {
        console.log(`  ✗ Question ${q.question_id} missing fields: ${missingFields.join(', ')}`);
        structureValid = false;
    }
    
    // Check options count
    if (!q.options || q.options.length !== 4) {
        console.log(`  ✗ Question ${q.question_id} has ${q.options?.length || 0} options (expected 4)`);
        structureValid = false;
    }
});

if (structureValid) {
    console.log('  ✓ All questions have required fields');
}

// Check for duplicate questions across all days
console.log('\n🔍 Checking for duplicate questions...');
const allQuestionIds = week1Questions.map(q => q.question_id);
const uniqueQuestionIds = new Set(allQuestionIds);
if (allQuestionIds.length !== uniqueQuestionIds.size) {
    console.log(`  ✗ WARNING: Found duplicate question IDs!`);
    const duplicates = allQuestionIds.filter((id, index) => allQuestionIds.indexOf(id) !== index);
    console.log(`  Duplicates: ${[...new Set(duplicates)].join(', ')}`);
    allValid = false;
} else {
    console.log('  ✓ No duplicate question IDs found');
}

// Final summary
console.log('\n' + '='.repeat(60));
if (allValid && structureValid) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log('   Questions are properly organized by day.');
} else {
    console.log('❌ SOME CHECKS FAILED!');
    console.log('   Please review the issues above.');
}
console.log('='.repeat(60));
