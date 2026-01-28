import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB, getDB, executeData, fetchData } from '../methods.js';
import syllabusSchema from '../schema/syllabus.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Update Week 1 Syllabus with Day-wise Content
 * Parses the Week-1-Complete-Lighter-Version file and updates Week 1 syllabus
 */
async function updateWeek1Syllabus() {
    try {
        const filePath = path.join(__dirname, '../../Product_Syllabus/Week-1-Complete-Lighter-Version');
        
        if (!fs.existsSync(filePath)) {
            console.error('❌ File not found at:', filePath);
            process.exit(1);
        }

        console.log('📖 Reading Week 1 syllabus file...');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        // Parse the file content
        const parsedData = parseWeek1Content(fileContent);
        
        console.log('\n📊 Parsed Data Summary:');
        console.log(`   Modules: ${parsedData.modules.length}`);
        console.log(`   Topics: ${parsedData.topics.length}`);
        console.log(`   Days: ${parsedData.days.length}`);
        
        // Connect to database
        console.log('\n🔌 Connecting to database...');
        await connectDB();
        
        // Check if Week 1 exists
        const existingWeek1 = await fetchData(
            'tblSyllabus',
            {},
            { week: 1 },
            {}
        );
        
        const week1Data = {
            week: 1,
            title: parsedData.title,
            modules: parsedData.modules,
            topics: parsedData.topics,
            assignments: parsedData.assignments || 0,
            tests: parsedData.tests || 0,
            duration: parsedData.duration || '2 hours/day | Total: 10 hours',
            status: 'start',
            description: parsedData.description,
            learning_objectives: parsedData.learning_objectives,
            resources: parsedData.resources || [],
            days: parsedData.days, // Day-wise breakdown
            updated_at: new Date().toISOString()
        };
        
        if (existingWeek1.data && existingWeek1.data.length > 0) {
            // Update existing Week 1
            console.log('\n🔄 Updating existing Week 1 syllabus...');
            const result = await executeData(
                'tblSyllabus',
                week1Data,
                'u',
                syllabusSchema,
                { week: 1 }
            );
            
            if (result.success) {
                console.log('✅ Successfully updated Week 1 syllabus!');
            } else {
                console.error('❌ Failed to update Week 1 syllabus');
                process.exit(1);
            }
        } else {
            // Insert new Week 1
            console.log('\n💾 Inserting new Week 1 syllabus...');
            const result = await executeData(
                'tblSyllabus',
                week1Data,
                'i',
                syllabusSchema
            );
            
            if (result.success) {
                console.log('✅ Successfully inserted Week 1 syllabus!');
            } else {
                console.error('❌ Failed to insert Week 1 syllabus');
                process.exit(1);
            }
        }
        
        console.log('\n📋 Week 1 Syllabus Structure:');
        console.log(`   Title: ${week1Data.title}`);
        console.log(`   Duration: ${week1Data.duration}`);
        console.log(`   Modules: ${week1Data.modules.join(', ')}`);
        console.log(`   Total Topics: ${week1Data.topics.length}`);
        console.log(`   Days Covered: ${week1Data.days.length}`);
        
        console.log('\n🎉 Week 1 syllabus update complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating Week 1 syllabus:', error);
        process.exit(1);
    }
}

/**
 * Parse Week 1 content from markdown file - Enhanced to capture all content
 */
function parseWeek1Content(content) {
    const lines = content.split('\n');
    
    // Extract title
    const titleMatch = content.match(/# 📘 WEEK 1[^#]*?## ([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : 'Week 1 – DSA Fundamentals (Lighter Version)';
    
    // Extract duration
    const durationMatch = content.match(/\*\*Duration:\*\* ([^\n]+)/);
    const duration = durationMatch ? durationMatch[1].trim() : '2 hours/day | Total: 10 hours';
    
    const modules = ['I/O Basics', 'Data Types & Variables', 'Operators & Decision Making', 'Loops & Patterns', 'Arrays', 'Functions'];
    const topics = [];
    const learning_objectives = [];
    const days = [];
    
    let currentDay = null;
    let currentDayContent = [];
    let inLearningOutcomes = false;
    let inDaySection = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
        
        // Detect PRE-WEEK section
        if (trimmedLine.includes('# 🟢 PRE-WEEK:') || (trimmedLine.includes('PRE-WEEK') && trimmedLine.includes('I/O'))) {
            if (currentDay) {
                // Save previous day with full content
                currentDay.content = currentDayContent.join('\n');
                days.push({ ...currentDay });
            }
            currentDay = {
                day: 'PRE-WEEK',
                title: 'I/O (Input/Output) - Essential Basics',
                topics: ['I/O Basics', 'printf', 'scanf', 'cout', 'cin', 'console.log', 'prompt'],
                learning_outcomes: [],
                key_concepts: [],
                content: ''
            };
            currentDayContent = [];
            inLearningOutcomes = false;
            inDaySection = true;
            continue;
        }
        
        // Detect DAY sections - handle both em dash and regular dash
        const dayMatch = trimmedLine.match(/# 🟢 DAY (\d+)[\s–-]+(.+)/);
        if (dayMatch) {
            if (currentDay) {
                // Save previous day with full content
                currentDay.content = currentDayContent.join('\n');
                days.push({ ...currentDay });
            }
            const dayTitle = dayMatch[2].trim();
            currentDay = {
                day: `Day ${dayMatch[1]}`,
                title: dayTitle,
                topics: [],
                learning_outcomes: [],
                key_concepts: [],
                content: ''
            };
            currentDayContent = [];
            inLearningOutcomes = false;
            inDaySection = true;
            continue;
        }
        
        // Stop when we reach week summary or next week
        if (trimmedLine.includes('## 📋 WEEK 1 SUMMARY') || 
            trimmedLine.includes('WEEK 1 SUMMARY') ||
            trimmedLine.includes('# 📘 WEEK 2')) {
            if (currentDay) {
                currentDay.content = currentDayContent.join('\n');
                days.push({ ...currentDay });
            }
            break;
        }
        
        // Collect content for current day
        if (currentDay && inDaySection) {
            // Detect Learning Outcomes section
            if (trimmedLine.includes('## Learning Outcomes') || (trimmedLine.includes('Learning Outcomes') && nextLine.includes('By the end'))) {
                inLearningOutcomes = true;
                currentDayContent.push(line);
                continue;
            }
            
            // Stop collecting learning outcomes when we hit a new section
            if (trimmedLine.startsWith('##') && !trimmedLine.includes('Learning Outcomes')) {
                inLearningOutcomes = false;
            }
            
            // Extract learning outcomes
            if (inLearningOutcomes && (trimmedLine.startsWith('✅') || trimmedLine.startsWith('- '))) {
                const objective = trimmedLine.replace(/^[✅\-\*]\s*/, '').trim();
                if (objective && objective.length > 5) {
                    if (!learning_objectives.includes(objective)) {
                        learning_objectives.push(objective);
                    }
                    if (!currentDay.learning_outcomes.includes(objective)) {
                        currentDay.learning_outcomes.push(objective);
                    }
                }
            }
            
            // Extract topics from day titles and content
            const dayTopics = extractTopicsFromTitle(currentDay.title);
            dayTopics.forEach(topic => {
                if (!currentDay.topics.includes(topic)) {
                    currentDay.topics.push(topic);
                }
                if (!topics.includes(topic)) {
                    topics.push(topic);
                }
            });
            
            // Extract from "What is" sections
            if (trimmedLine.startsWith('## What is') || trimmedLine.startsWith('## What is a')) {
                const concept = trimmedLine.replace(/## What is (a |an )?/, '').replace('?', '').trim();
                if (concept && !currentDay.key_concepts.includes(concept)) {
                    currentDay.key_concepts.push(concept);
                }
            }
            
            // Collect all content lines
            currentDayContent.push(line);
        }
    }
    
    // Add last day
    if (currentDay) {
        currentDay.content = currentDayContent.join('\n');
        days.push(currentDay);
    }
    
    // Extract additional topics from content
    extractTopicsFromContent(content, topics);
    
    // Build comprehensive description
    const description = buildDescription(title, duration, days);
    
    return {
        title,
        duration,
        modules,
        topics: [...new Set(topics)].sort(), // Remove duplicates and sort
        learning_objectives,
        description,
        days,
        assignments: 5, // One per day
        tests: 1, // End of week test
        resources: [
            'GeeksforGeeks',
            'Programiz',
            'W3Schools',
            'TutorialsPoint'
        ]
    };
}

/**
 * Extract topics from day title
 */
function extractTopicsFromTitle(title) {
    const topics = [];
    
    // Common topic patterns
    if (title.includes('Data Types')) topics.push('Data Types');
    if (title.includes('Variables')) topics.push('Variables');
    if (title.includes('Operators')) topics.push('Operators');
    if (title.includes('Decision Making')) topics.push('Decision Making', 'if-else', 'switch-case');
    if (title.includes('Loops')) topics.push('Loops', 'for loop', 'while loop', 'do-while');
    if (title.includes('Patterns')) topics.push('Patterns', 'Star Patterns');
    if (title.includes('Arrays')) topics.push('Arrays', '1D Arrays', '2D Arrays');
    if (title.includes('Functions')) topics.push('Functions', 'Parameters', 'Return');
    if (title.includes('I/O') || title.includes('Input/Output')) {
        topics.push('I/O', 'Input/Output', 'printf', 'scanf', 'cout', 'cin');
    }
    
    return topics;
}

/**
 * Extract topics from content more comprehensively
 */
function extractTopicsFromContent(content, topics) {
    // Common DSA and programming topics with patterns
    const topicPatterns = [
        { pattern: /Data Types?/gi, topic: 'Data Types' },
        { pattern: /Variables?/gi, topic: 'Variables' },
        { pattern: /Operators?/gi, topic: 'Operators' },
        { pattern: /Decision Making/gi, topic: 'Decision Making' },
        { pattern: /if-else|if\s*\(/gi, topic: 'if-else' },
        { pattern: /switch-case|switch\s*\(/gi, topic: 'switch-case' },
        { pattern: /ternary/gi, topic: 'Ternary Operator' },
        { pattern: /Loops?/gi, topic: 'Loops' },
        { pattern: /for\s+loop/gi, topic: 'for loop' },
        { pattern: /while\s+loop/gi, topic: 'while loop' },
        { pattern: /do-while/gi, topic: 'do-while loop' },
        { pattern: /break\s*;/gi, topic: 'break' },
        { pattern: /continue\s*;/gi, topic: 'continue' },
        { pattern: /Patterns?/gi, topic: 'Patterns' },
        { pattern: /Arrays?/gi, topic: 'Arrays' },
        { pattern: /2D\s+Array|Matrix/gi, topic: '2D Arrays' },
        { pattern: /Functions?/gi, topic: 'Functions' },
        { pattern: /Parameters?/gi, topic: 'Parameters' },
        { pattern: /Return|return\s+/gi, topic: 'Return' },
        { pattern: /printf|scanf/gi, topic: 'C I/O' },
        { pattern: /cout|cin/gi, topic: 'C++ I/O' },
        { pattern: /console\.log|prompt/gi, topic: 'JavaScript I/O' },
        { pattern: /\bint\b/gi, topic: 'int' },
        { pattern: /\bfloat\b/gi, topic: 'float' },
        { pattern: /\bchar\b/gi, topic: 'char' },
        { pattern: /\bstring\b/gi, topic: 'string' },
        { pattern: /\bbool\b/gi, topic: 'bool' },
        { pattern: /\bvar\b/gi, topic: 'var' },
        { pattern: /\blet\b/gi, topic: 'let' },
        { pattern: /\bconst\b/gi, topic: 'const' }
    ];
    
    topicPatterns.forEach(({ pattern, topic }) => {
        if (pattern.test(content) && !topics.includes(topic)) {
            topics.push(topic);
        }
    });
}

/**
 * Build comprehensive description with day-wise breakdown
 */
function buildDescription(title, duration, days) {
    let desc = `${title}\n\nDuration: ${duration}\n\n`;
    desc += '**Week Overview:**\n';
    desc += 'This week covers fundamental programming concepts and DSA basics, structured day-by-day for gradual learning.\n\n';
    
    desc += '**Day-wise Breakdown:**\n\n';
    
    days.forEach(day => {
        desc += `**${day.day}: ${day.title}**\n`;
        if (day.learning_outcomes.length > 0) {
            desc += 'Learning Outcomes:\n';
            day.learning_outcomes.forEach(outcome => {
                desc += `- ${outcome}\n`;
            });
        }
        if (day.topics.length > 0) {
            desc += 'Topics Covered:\n';
            day.topics.slice(0, 5).forEach(topic => {
                desc += `- ${topic}\n`;
            });
            if (day.topics.length > 5) {
                desc += `- ... and ${day.topics.length - 5} more topics\n`;
            }
        }
        desc += '\n';
    });
    
    desc += '**Total Practice Questions:** 25\n';
    desc += '**Languages Covered:** C, C++, JavaScript\n';
    desc += '**Placement Ready:** ✅ YES\n';
    
    return desc;
}

// Run the script
updateWeek1Syllabus();

