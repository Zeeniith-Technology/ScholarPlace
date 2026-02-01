
const fs = require('fs');
const path = require('path');

const BANK_FILE = 'd:\\scholarplace\\Question\\Aptitude\\FINAL_APTITUDE_BANK_1500.md';
const OUTPUT_DIR = 'd:\\scholarplace';

function parseQuestions(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const questions = [];
    const questionBlocks = content.split(/(?=\*\*Question (?:Q?\d+):)/);

    for (const block of questionBlocks) {
        if (!block.trim() || !block.includes('**Question')) continue;

        const q = {};

        // Match Question Number & Text
        const qMatch = block.match(/\*\*Question (?:Q?(\d+)):\*\*\s*(.+?)(?=\*\*Options:|\n\n)/s);
        if (qMatch) {
            q.number = parseInt(qMatch[1]);
            q.text = qMatch[2].trim();
        }

        // Match Options
        const optMatch = block.match(/\*\*Options:\*\*\s*\n([\s\S]+?)(?=\n\*\*Answer:)/);
        if (optMatch) {
            q.options = optMatch[1].split('\n').filter(l => l.trim()).map(l => l.trim());
        }

        // Match Answer
        const ansMatch = block.match(/\*\*Answer:\*\*\s*(.+)/);
        if (ansMatch) q.answer = ansMatch[1].trim();

        // Match Explanation
        const expMatch = block.match(/\*\*Explanation:\*\*\s*(.+?)(?=\n---|$)/s);
        if (expMatch) q.explanation = expMatch[1].trim();

        // Match Week & Day
        const wMatch = block.match(/\*\*Week:\*\*\s*(\d+)/);
        if (wMatch) q.week = parseInt(wMatch[1]);

        const dMatch = block.match(/\*\*Day:\*\*\s*(\d+)/);
        if (dMatch) q.day = parseInt(dMatch[1]);

        // Match Topic
        const topMatch = block.match(/\*\*Topic:\*\*\s*(.+)/);
        if (topMatch) q.topic = topMatch[1].trim();

        if (q.week && q.day) {
            questions.push(q);
        }
    }
    return questions;
}

function generateMarkdown(questions) {
    const questionsByWeek = {};

    questions.forEach(q => {
        if (!questionsByWeek[q.week]) questionsByWeek[q.week] = {};
        if (!questionsByWeek[q.week][q.day]) questionsByWeek[q.week][q.day] = [];
        questionsByWeek[q.week][q.day].push(q);
    });

    for (let week = 1; week <= 6; week++) {
        if (!questionsByWeek[week]) continue;

        let content = `# Week ${week} Daily Practice Questions\n\n`;

        for (let day = 1; day <= 5; day++) {
            const dayQuestions = questionsByWeek[week][day];
            if (!dayQuestions || dayQuestions.length === 0) continue;

            const topic = dayQuestions[0].topic || `Topic for Day ${day}`;
            content += `### Day ${day}: ${topic}\n\n`;
            content += `---\n\n`;

            dayQuestions.sort((a, b) => a.number - b.number);

            dayQuestions.forEach(q => {
                content += `**Q${q.number}:** ${q.text}\n`;
                if (q.options) {
                    content += `*(Options: ${q.options.join(', ')})*\n`;
                }
                content += `**Answer:** ${q.answer}\n`;
                content += `**Explanation:** ${q.explanation}\n\n`;
            });
        }

        const outputPath = path.join(OUTPUT_DIR, `Week${week}_Daily.md`);
        fs.writeFileSync(outputPath, content);
        console.log(`Generated ${outputPath}`);
    }
}

try {
    console.log("Parsing questions...");
    const questions = parseQuestions(BANK_FILE);
    console.log(`Parsed ${questions.length} questions.`);
    generateMarkdown(questions);
    console.log("Done.");
} catch (err) {
    console.error("Error:", err);
}
