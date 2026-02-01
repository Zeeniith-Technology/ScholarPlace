const fs = require('fs');
const path = require('path');

const jsonPath = './backend/data/weekly_tests/tests_WT001_to_WT006.json';

try {
    if (!fs.existsSync(jsonPath)) {
        console.error(`File not found: ${jsonPath}`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    data.tests.forEach(test => {
        let content = `### Weekly Test ${test.week}\n\n`;
        test.questions.forEach(q => {
            content += `**Q${q.question_number}:** ${q.question}\n`;
            if (q.options) {
                content += `*(Options: ${q.options.join(', ')})*\n`;
            }
            content += `**Answer:** ${q.answer}\n`;
            content += `**Explanation:** ${q.explanation}\n\n`;
        });

        const fileName = `Week${test.week}_Test.md`;
        fs.writeFileSync(fileName, content);
        console.log(`Generated ${fileName}`);
    });

} catch (error) {
    console.error('Error processing JSON:', error);
}
