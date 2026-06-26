const fs = require('fs');

const sem3 = fs.readFileSync('Semester3_Curriculum.csv', 'utf-8');
const sem4 = fs.readFileSync('Semester4_Curriculum.csv', 'utf-8');
const sem5 = fs.readFileSync('Semester5_Curriculum.csv', 'utf-8');
const sem6 = fs.readFileSync('Semester6_Curriculum.csv', 'utf-8');
const sem7 = fs.readFileSync('Semester7_Curriculum.csv', 'utf-8');

// The headers are slightly different, so we will normalize them for the final combined file
const header = "Semester,Week,Day,DSA_Track,Aptitude_Track,Skill/Core/Placement_Track\n";

const processSem = (csvString, cols) => {
    const lines = csvString.trim().split('\n');
    lines.shift(); // remove header
    let result = '';
    lines.forEach(line => {
        const parts = line.split('","').map(p => p.replace(/"/g, ''));
        // parts[0] is Semester, parts[1] is Week, parts[2] is Day
        // parts[3] is DSA, parts[4] is Aptitude
        // parts[5] might be MERN/Tech/Placement or missing
        
        const track3 = parts[5] || "N/A";
        
        result += `"${parts[0]}","${parts[1]}","${parts[2]}","${parts[3]}","${parts[4]}","${track3}"\n`;
    });
    return result;
};

const combined = header + 
    processSem(sem3, 5) + 
    processSem(sem4, 5) + 
    processSem(sem5, 6) + 
    processSem(sem6, 6) + 
    processSem(sem7, 6);

fs.writeFileSync('d:\\scholarplace\\ScholarPlace_Complete_Curriculum.csv', combined);
console.log("ScholarPlace_Complete_Curriculum.csv generated successfully in root folder!");
