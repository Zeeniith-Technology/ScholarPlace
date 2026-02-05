
import { connectDB, executeData } from '../methods.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    try {
        await connectDB();

        const dbPath = path.join(__dirname, '../data/questions/questions_db.json');

        if (!fs.existsSync(dbPath)) {
            console.error('questions_db.json not found!');
            process.exit(1);
        }

        const questions = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        console.log(`Loaded ${questions.length} questions from JSON.`);

        const transformedData = questions.map(q => {
            // Map difficulty to Title Case
            let diff = q.metadata.difficulty_level;
            diff = diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
            if (diff === 'Very_hard') diff = 'Expert'; // Map Very_Hard to Expert if exists

            return {
                question_id: q.problem_id,
                question_type: 'coding',
                category: q.metadata.category || 'DSA',
                topic: q.metadata.topic,
                subtopic: q.metadata.title,
                question_text: q.problem_statement.description,
                options: [],
                correct_answer: 'Refer to Test Cases',
                difficulty: diff,
                week: q.metadata.week,
                day: q.metadata.day,
                tags: q.metadata.company_tags,

                // Extended fields for DSA
                problem_statement: q.problem_statement,
                test_cases: q.test_cases,
                hints: q.hints,
                complexity_guidance: q.complexity_guidance,
                metadata: q.metadata,

                version: 1,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted: false
            };
        });

        // Insert in batches
        const batchSize = 50;
        let totalInserted = 0;

        for (let i = 0; i < transformedData.length; i += batchSize) {
            const batch = transformedData.slice(i, i + batchSize);
            console.log(`Inserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} questions)...`);

            // Pass schema as null to skip applySchema validation
            const result = await executeData('tblQuestion', batch, 'i', null);

            if (result && result.success) {
                console.log(`Batch success. IDs: ${result.insertedCount || 'Unknown count'}`);
                totalInserted += (result.insertedCount || batch.length);
            } else {
                console.error('Batch failed:', result);
            }
        }

        console.log(`Total questions processed. Inserted approximately: ${totalInserted}`);
        process.exit(0);

    } catch (err) {
        console.error('Error in insertion script:', err);
        process.exit(1);
    }
}

run();
