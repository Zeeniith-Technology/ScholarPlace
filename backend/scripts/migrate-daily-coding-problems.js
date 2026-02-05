/**
 * Migration Script: Daily Coding Problems
 * 
 * Imports ~150 daily coding problems from JSON files into MongoDB
 * Source files: week1_part1.json through week5_part3.json (15 files)
 * Target collection: tblCodingProblem
 * 
 * Usage:
 *   node scripts/migrate-daily-coding-problems.js [--dry-run]
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scholarplace'

// Collection name
const COLLECTION_NAME = 'tblCodingProblem'

// Source files mapping
const SOURCE_FILES = [
    { week: 1, file: 'week1_part1.json', days: [1, 2] },
    { week: 1, file: 'week1_part2.json', days: [3, 4] },
    { week: 1, file: 'week1_part3.json', days: [5] },
    { week: 2, file: 'week2_part1.json', days: [1, 2] },
    { week: 2, file: 'week2_part2.json', days: [3, 4] },
    { week: 2, file: 'week2_part3.json', days: [5] },
    { week: 3, file: 'week3_part1.json', days: [1, 2] },
    { week: 3, file: 'week3_part2.json', days: [3, 4] },
    { week: 3, file: 'week3_part3.json', days: [5] },
    { week: 4, file: 'week4_part1.json', days: [1, 2] },
    { week: 4, file: 'week4_part2.json', days: [3, 4] },
    { week: 4, file: 'week4_part3.json', days: [5] },
    { week: 5, file: 'week5_part1.json', days: [1, 2] },
    { week: 5, file: 'week5_part2.json', days: [3, 4] },
    { week: 5, file: 'week5_part3.json', days: [5] },
]

// Schema matching tblCodingProblem
const codingProblemSchema = new mongoose.Schema({
    question_id: { type: String, required: true, unique: true },
    week: { type: Number, required: true },
    day: { type: Number, required: true },
    title: { type: String, required: true },
    difficulty: { type: String, required: true },
    estimated_time_minutes: { type: Number, required: true },
    category: { type: String, default: 'DSA' },
    company_tags: [String],
    learning_outcomes: [String],
    problem_statement: {
        description: String,
        constraints: [String],
        input_format: String,
        output_format: String,
        example: {
            input: String,
            output: String,
            explanation: String,
        },
    },
    test_cases: [
        {
            tc_id: String,
            input: String,
            expected_output: String,
            explanation: String,
            category: String,
        },
    ],
    hints: [
        {
            hint_level: Number,
            hint_text: String,
            hint_type: String,
        },
    ],
    complexity_guidance: {
        time_complexity: String,
        space_complexity: String,
        optimal_approach: String,
    },
    concepts_tested: [String],
    is_capstone: { type: Boolean, default: false }, // false for daily problems
    created_at: { type: Date, default: Date.now },
})

const CodingProblem = mongoose.model('CodingProblem', codingProblemSchema, COLLECTION_NAME)

/**
 * Transform JSON problem to database schema
 */
function transformProblem(problem, week, day) {
    return {
        question_id: problem.problem_id,
        week: week,
        day: day,
        title: problem.metadata.title,
        difficulty: problem.metadata.difficulty_level,
        estimated_time_minutes: problem.metadata.estimated_time_minutes,
        category: problem.metadata.category || 'DSA',
        company_tags: problem.metadata.company_tags || [],
        learning_outcomes: problem.metadata.learning_outcomes || [],
        problem_statement: {
            description: problem.problem_statement.description,
            constraints: problem.problem_statement.constraints || [],
            input_format: problem.problem_statement.input_format,
            output_format: problem.problem_statement.output_format,
            example: problem.problem_statement.example || {},
        },
        test_cases: problem.test_cases || [],
        hints: problem.hints || [],
        complexity_guidance: problem.complexity_guidance || {},
        concepts_tested: [problem.metadata.topic],
        is_capstone: false, // Daily problems
        created_at: new Date().toISOString(),
    }
}

/**
 * Load and parse JSON file
 */
async function loadJSONFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8')
        return JSON.parse(data)
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message)
        return null
    }
}

/**
 * Main migration function
 */
async function migrate(dryRun = false) {
    console.log('='.repeat(60))
    console.log('Daily Coding Problems Migration')
    console.log('='.repeat(60))
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`)
    console.log(`Target: ${COLLECTION_NAME}`)
    console.log()

    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...')
        await mongoose.connect(MONGODB_URI)
        console.log('✓ Connected to MongoDB\n')

        const dataDir = path.join(__dirname, '..', 'data', 'questions')
        let totalProblems = 0
        let successCount = 0
        let skipCount = 0
        let errorCount = 0

        // Process each file
        for (const sourceFile of SOURCE_FILES) {
            const filePath = path.join(dataDir, sourceFile.file)
            console.log(`Processing: ${sourceFile.file} (Week ${sourceFile.week})`)

            const problems = await loadJSONFile(filePath)
            if (!problems || !Array.isArray(problems)) {
                console.log(`  ✗ Invalid or empty file\n`)
                continue
            }

            console.log(`  Found ${problems.length} problems`)

            // Process each problem
            for (const problem of problems) {
                totalProblems++

                try {
                    // Get day from metadata
                    const day = problem.metadata.day
                    if (!day || !sourceFile.days.includes(day)) {
                        console.log(`  ⚠ Problem ${problem.problem_id}: Day ${day} not in expected range ${sourceFile.days}`)
                    }

                    // Transform to schema
                    const transformedProblem = transformProblem(problem, sourceFile.week, day)

                    if (dryRun) {
                        console.log(`  [DRY RUN] Would insert: ${transformedProblem.question_id} (Week ${sourceFile.week}, Day ${day})`)
                        successCount++
                    } else {
                        // Check if already exists
                        const existing = await CodingProblem.findOne({
                            question_id: transformedProblem.question_id,
                        })

                        if (existing) {
                            console.log(`  ⊘ Skipped (exists): ${transformedProblem.question_id}`)
                            skipCount++
                        } else {
                            await CodingProblem.create(transformedProblem)
                            console.log(`  ✓ Inserted: ${transformedProblem.question_id} (Week ${sourceFile.week}, Day ${day})`)
                            successCount++
                        }
                    }
                } catch (error) {
                    console.log(`  ✗ Error with ${problem.problem_id}: ${error.message}`)
                    errorCount++
                }
            }

            console.log()
        }

        // Summary
        console.log('='.repeat(60))
        console.log('Migration Summary')
        console.log('='.repeat(60))
        console.log(`Total problems processed: ${totalProblems}`)
        console.log(`Successfully migrated: ${successCount}`)
        console.log(`Skipped (duplicates): ${skipCount}`)
        console.log(`Errors: ${errorCount}`)
        console.log()

        if (dryRun) {
            console.log('⚠ DRY RUN MODE - No changes were made to the database')
        } else {
            console.log('✓ Migration completed successfully!')
        }
    } catch (error) {
        console.error('Migration failed:', error)
        process.exit(1)
    } finally {
        await mongoose.connection.close()
        console.log('\nDatabase connection closed.')
    }
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

// Run migration
migrate(dryRun)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error)
        process.exit(1)
    })
