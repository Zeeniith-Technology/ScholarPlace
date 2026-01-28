import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract main topics from the DSA fundamentals file
 */
function extractTopics(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Extract main topics from the file
        const topics = [];
        
        // Look for topic patterns
        const topicPatterns = [
            /- 8\.\d+:\s*([^\n]+)/g,  // Matches "- 8.1: I/O & Basic Syntax"
            /##\s+PART\s+[A-Z]:\s*([^\n]+)/g,  // Matches "## PART A: I/O (INPUT/OUTPUT)"
            /###\s+[A-Z]\d+:\s*([^\n]+)/g,  // Matches "### A1: What is I/O?"
        ];
        
        // Extract from the initial topic list
        const initialTopics = content.match(/- 8\.\d+:\s*([^\n]+)/g);
        if (initialTopics) {
            initialTopics.forEach(topic => {
                const cleanTopic = topic.replace(/^- 8\.\d+:\s*/, '').trim();
                if (cleanTopic && !topics.includes(cleanTopic)) {
                    topics.push(cleanTopic);
                }
            });
        }
        
        // Extract main sections
        const sections = content.match(/##\s+PART\s+[A-Z]:\s*([^\n]+)/g);
        if (sections) {
            sections.forEach(section => {
                const cleanSection = section.replace(/##\s+PART\s+[A-Z]:\s*/, '').trim();
                // Extract key words from section titles
                if (cleanSection.includes('I/O')) {
                    if (!topics.includes('I/O (Input/Output)')) {
                        topics.push('I/O (Input/Output)');
                    }
                }
                if (cleanSection.includes('SYNTAX')) {
                    if (!topics.includes('Syntax')) {
                        topics.push('Syntax');
                    }
                }
            });
        }
        
        // Add specific subtopics found in the content
        const specificTopics = [
            'I/O (Input/Output)',
            'Basic Syntax',
            'Variables',
            'Data Types',
            'Control Structures',
            'Functions',
            'Recursion Intro',
            'Big-O Notation',
            'Time Complexity'
        ];
        
        specificTopics.forEach(topic => {
            if (content.includes(topic) && !topics.includes(topic)) {
                topics.push(topic);
            }
        });
        
        // Remove duplicates and sort
        const uniqueTopics = [...new Set(topics)];
        
        return uniqueTopics;
    } catch (error) {
        console.error('Error reading file:', error);
        return [];
    }
}

// Main execution
const filePath = path.join(__dirname, '../../Product_Syllabus/1_Fundamental_DSA');

if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    process.exit(1);
}

console.log('📖 Reading file:', filePath);
const topics = extractTopics(filePath);

console.log('\n📚 Extracted Topics for Week 1 DSA:\n');
topics.forEach((topic, index) => {
    console.log(`${index + 1}. ${topic}`);
});

console.log('\n\n📋 Topics formatted for upload (comma-separated):');
console.log(topics.join(', '));

console.log('\n\n📋 Topics formatted for upload (one per line):');
topics.forEach(topic => console.log(topic));

console.log('\n✅ Ready to upload!');
console.log('\n💡 Instructions:');
console.log('1. Go to: http://localhost:3000/superadmin/syllabus');
console.log('2. Use "Update Week-Specific Content" section');
console.log('3. Select Week: 1');
console.log('4. Select Content Type: DSA Topics');
console.log('5. Module Name: 1. Fundamentals');
console.log('6. Paste the topics (comma-separated or one per line)');
console.log('7. Click "Update Week 1 DSA Content"');

