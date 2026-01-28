import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB, getDB } from '../methods.js';
import syllabusSchema from '../schema/syllabus.js';
import { executeData } from '../methods.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Import Syllabus from Excel File
 * This script reads the Excel file and imports syllabus data into MongoDB
 */
async function importSyllabus() {
    try {
        const excelPath = path.join(__dirname, '../../Designed_syllabus.xlsx');
        
        if (!fs.existsSync(excelPath)) {
            console.error('❌ Excel file not found at:', excelPath);
            process.exit(1);
        }

        console.log('📖 Reading Excel file:', excelPath);
        const workbook = XLSX.readFile(excelPath);
        
        // Get reference data from topic sheets
        const aptitudeModules = parseTopicSheet(workbook, 'Aptitude_topics_indepth');
        const dsaModules = parseTopicSheet(workbook, 'DSA_topics_indepth');
        
        console.log(`\n📚 Found ${aptitudeModules.length} Aptitude modules`);
        console.log(`📚 Found ${dsaModules.length} DSA modules`);
        
        // Process week sheets (Week1 through Week8)
        const allSyllabusData = [];
        const weekSheets = workbook.SheetNames.filter(name => name.startsWith('Week'));
        
        for (const sheetName of weekSheets.sort()) {
            const weekNum = parseInt(sheetName.replace('Week', ''));
            if (isNaN(weekNum)) continue;
            
            console.log(`\n📄 Processing ${sheetName}...`);
            const weekData = parseWeekSheet(workbook, sheetName, weekNum, aptitudeModules, dsaModules);
            
            if (weekData) {
                allSyllabusData.push(weekData);
                console.log(`   ✓ Created Week ${weekNum}: ${weekData.title}`);
            }
        }
        
        if (allSyllabusData.length === 0) {
            console.log('\n⚠️  No valid syllabus data found');
            process.exit(1);
        }
        
        console.log(`\n✅ Processed ${allSyllabusData.length} weeks`);
        
        // Connect to database first
        console.log('\n🔌 Connecting to database...');
        await connectDB();
        
        // Get database instance
        const database = getDB();
        const collection = database.collection('tblSyllabus');
        
        console.log('\n🗑️  Clearing existing syllabus data...');
        await collection.deleteMany({});
        
        console.log('\n💾 Inserting syllabus data into database...');
        const result = await executeData(
            'tblSyllabus',
            allSyllabusData,
            'i',
            syllabusSchema
        );
        
        if (result.success) {
            console.log(`\n✅ Successfully imported ${result.insertedCount || allSyllabusData.length} weeks!`);
            console.log('\n📊 Summary:');
            allSyllabusData.forEach(week => {
                console.log(`   Week ${week.week}: ${week.modules.length} modules, ${week.topics.length} topics`);
            });
            console.log('\n🎉 Syllabus import complete! You can now view it in the student syllabus page.');
        } else {
            console.error('❌ Failed to import syllabus data');
            process.exit(1);
        }
        
        // Close database connection
        process.exit(0);
    } catch (error) {
        console.error('❌ Error importing syllabus:', error);
        process.exit(1);
    }
}

/**
 * Parse topic sheet (Aptitude or DSA) to get module details
 */
function parseTopicSheet(workbook, sheetName) {
    const modules = [];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) return modules;
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });
    
    jsonData.forEach(row => {
        if (row.Module) {
            const topics = parseArrayField(row.Topics || row['Topics']);
            modules.push({
                module: row.Module,
                topics: topics,
                duration: row.Duration || '',
                questions: row.Questions || row['MCQs'] || row['Coding Q'] || '',
                miniTest: row['Mini-Test'] || '',
                passPercent: row['Pass %'] || ''
            });
        }
    });
    
    return modules;
}

/**
 * Parse week sheet to create syllabus entry
 */
function parseWeekSheet(workbook, sheetName, weekNum, aptitudeModules, dsaModules) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return null;
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });
    
    if (jsonData.length === 0) return null;
    
    // Collect all modules and topics from the week
    const weekAptitudeModules = new Set();
    const weekDsaModules = new Set();
    const allTopics = new Set();
    const dailyFlows = [];
    const testsDue = [];
    
    jsonData.forEach(row => {
        // Extract aptitude modules
        if (row['Aptitude Module'] || row['Aptitude']) {
            const aptModule = row['Aptitude Module'] || row['Aptitude'];
            if (aptModule && aptModule !== '-') {
                // For Week 7-8, handle mock test format differently
                if (weekNum >= 7) {
                    // Week 7-8 have different format - extract meaningful text
                    if (aptModule.toLowerCase().includes('mock') || aptModule.toLowerCase().includes('test')) {
                        weekAptitudeModules.add('Mock Tests');
                    } else if (aptModule.toLowerCase().includes('revision') || aptModule.toLowerCase().includes('all')) {
                        weekAptitudeModules.add('Revision');
                    } else {
                        // Extract first meaningful part before parentheses or special chars
                        const cleanModule = aptModule.split('(')[0].split('(')[0].trim();
                        if (cleanModule.length > 2) {
                            weekAptitudeModules.add(cleanModule);
                        }
                    }
                } else {
                    // Extract module number (e.g., "1. Numbers" -> "1. Numbers")
                    const moduleMatch = aptModule.match(/(\d+[a-z]?\.?\s*[^\(]+)/);
                    if (moduleMatch) {
                        weekAptitudeModules.add(moduleMatch[1].trim());
                    } else if (aptModule.trim().length > 0 && !aptModule.includes('(')) {
                        weekAptitudeModules.add(aptModule.trim());
                    }
                }
            }
        }
        
        // Extract DSA modules
        if (row['DSA Module'] || row['DSA']) {
            const dsaModule = row['DSA Module'] || row['DSA'];
            if (dsaModule && dsaModule !== '-') {
                // For Week 7-8, handle mock test format differently
                if (weekNum >= 7) {
                    if (dsaModule.toLowerCase().includes('mock') || dsaModule.toLowerCase().includes('test') || dsaModule.toLowerCase().includes('coding')) {
                        weekDsaModules.add('Mock Tests');
                    } else if (dsaModule.toLowerCase().includes('revision') || dsaModule.toLowerCase().includes('all')) {
                        weekDsaModules.add('Revision');
                    } else {
                        const cleanModule = dsaModule.split('(')[0].split('(')[0].trim();
                        if (cleanModule.length > 2) {
                            weekDsaModules.add(cleanModule);
                        }
                    }
                } else {
                    const moduleMatch = dsaModule.match(/(\d+[a-z]?\.?\s*[^\(]+)/);
                    if (moduleMatch) {
                        weekDsaModules.add(moduleMatch[1].trim());
                    } else if (dsaModule.trim().length > 0 && !dsaModule.includes('(')) {
                        weekDsaModules.add(dsaModule.trim());
                    }
                }
            }
        }
        
        // Collect daily flows
        if (row['Daily Flow']) {
            dailyFlows.push(row['Daily Flow']);
        }
        
        // Collect tests
        if (row['Tests Due'] && row['Tests Due'] !== '-') {
            testsDue.push(row['Tests Due']);
        }
    });
    
    // Get topics from module references
    const aptitudeModuleList = Array.from(weekAptitudeModules);
    const dsaModuleList = Array.from(weekDsaModules);
    
    aptitudeModuleList.forEach(moduleName => {
        const moduleData = aptitudeModules.find(m => 
            m.module.includes(moduleName.split('.')[0]) || 
            moduleName.includes(m.module.split('.')[0])
        );
        if (moduleData) {
            moduleData.topics.forEach(topic => allTopics.add(topic));
        }
    });
    
    dsaModuleList.forEach(moduleName => {
        const moduleData = dsaModules.find(m => 
            m.module.includes(moduleName.split('.')[0]) || 
            moduleName.includes(m.module.split('.')[0])
        );
        if (moduleData) {
            moduleData.topics.forEach(topic => allTopics.add(topic));
        }
    });
    
    // Combine all modules
    const allModules = [...aptitudeModuleList, ...dsaModuleList];
    
    // Determine status based on week number
    let status = 'locked';
    if (weekNum === 1) {
        status = 'upcoming';
    } else if (weekNum < 1) {
        status = 'completed';
    }
    
    // Create title - better handling for Week 7-8
    let title = `Week ${weekNum}`;
    if (weekNum <= 6) {
        const aptTitle = aptitudeModuleList.length > 0 ? aptitudeModuleList[0] : '';
        const dsaTitle = dsaModuleList.length > 0 ? dsaModuleList[0] : '';
        if (aptTitle && dsaTitle) {
            title = `Week ${weekNum}: ${aptTitle} & ${dsaTitle}`;
        } else if (aptTitle) {
            title = `Week ${weekNum}: ${aptTitle}`;
        } else if (dsaTitle) {
            title = `Week ${weekNum}: ${dsaTitle}`;
        }
    } else if (weekNum === 7) {
        title = 'Week 7: Mock Tests & Practice';
    } else if (weekNum === 8) {
        title = 'Week 8: Final Preparation & Placement Simulation';
    }
    
    // Create description from daily flows
    const description = dailyFlows.length > 0 
        ? dailyFlows.join(' | ')
        : `Week ${weekNum} syllabus content`;
    
    return {
        week: weekNum,
        title: title || `Week ${weekNum}`,
        modules: allModules,
        topics: Array.from(allTopics),
        assignments: 0, // Can be calculated or added manually
        tests: testsDue.length,
        duration: '2 hours daily', // Default, can be customized
        status: status,
        description: description,
        learning_objectives: [],
        resources: []
    };
}

/**
 * Parse array field from Excel
 */
function parseArrayField(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        return value.split(/[,;]/).map(item => item.trim()).filter(item => item.length > 0);
    }
    return [];
}

// Run the import
importSyllabus();
