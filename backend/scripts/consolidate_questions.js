
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data/questions');
const outputFile = path.join(dataDir, 'questions_db.json');

async function consolidate() {
    try {
        const files = fs.readdirSync(dataDir).filter(f => f.startsWith('week') && f.endsWith('.json'));
        let allQuestions = [];

        console.log(`Found ${files.length} partial files.`);

        files.sort(); // Ensure order week1...week5

        for (const file of files) {
            const filePath = path.join(dataDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const questions = JSON.parse(content);
            console.log(`Loaded ${questions.length} questions from ${file}`);
            allQuestions = allQuestions.concat(questions);
        }

        console.log(`Total consolidated questions: ${allQuestions.length}`);

        // Basic Validation
        const ids = new Set();
        let errors = 0;
        allQuestions.forEach(q => {
            if (ids.has(q.problem_id)) {
                console.error(`Duplicate ID found: ${q.problem_id}`);
                errors++;
            }
            ids.add(q.problem_id);

            if (!q.problem_statement || !q.problem_statement.description) {
                console.error(`Missing description in ${q.problem_id}`);
                errors++;
            }
        });

        if (errors > 0) {
            console.error(`Found ${errors} validation errors.`);
        } else {
            console.log('Validation passed: Unique IDs and basic structure OK.');
        }

        fs.writeFileSync(outputFile, JSON.stringify(allQuestions, null, 2));
        console.log(`Successfully wrote to ${outputFile}`);

    } catch (err) {
        console.error('Error consolidating:', err);
    }
}

consolidate();
