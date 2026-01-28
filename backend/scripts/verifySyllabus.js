import { connectDB, getDB } from '../methods.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Verify imported syllabus data
 */
async function verifySyllabus() {
    try {
        console.log('🔌 Connecting to database...');
        await connectDB();
        
        const database = getDB();
        const collection = database.collection('tblSyllabus');
        
        const syllabusData = await collection.find({}).sort({ week: 1 }).toArray();
        
        console.log(`\n📊 Found ${syllabusData.length} weeks in database\n`);
        
        syllabusData.forEach(week => {
            console.log(`Week ${week.week}: ${week.title}`);
            console.log(`  Modules: ${week.modules.length} - ${week.modules.join(', ')}`);
            console.log(`  Topics: ${week.topics.length}`);
            console.log(`  Status: ${week.status}`);
            console.log(`  Description: ${week.description?.substring(0, 100)}...`);
            console.log('');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

verifySyllabus();

