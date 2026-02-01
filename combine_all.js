const fs = require('fs');
const path = require('path');

const outputList = [];
outputList.push("# Aptitude Mastery Program - 6 Week Answer Sheet\n\n");

for (let i = 1; i <= 6; i++) {
    const dailyFile = `Week${i}_Daily.md`;
    const testFile = `Week${i}_Test.md`;

    if (fs.existsSync(dailyFile)) {
        outputList.push(`\n\n---\n\n`);
        // Daily content usually starts with ## Week X, so we rely on that.
        // Or we can ensure structure.
        // Let's read and append.
        const dailyContent = fs.readFileSync(dailyFile, 'utf8');
        outputList.push(dailyContent);
    }

    if (fs.existsSync(testFile)) {
        outputList.push(`\n\n### Week ${i} Weekly Test\n\n`);
        const testContent = fs.readFileSync(testFile, 'utf8');
        outputList.push(testContent);
    }
}

const finalContent = outputList.join("");
fs.writeFileSync('Aptitude_Answer_Sheet_6_Weeks.md', finalContent);
console.log("Combined file created at Aptitude_Answer_Sheet_6_Weeks.md");
