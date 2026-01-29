
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables properly
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const checkStudents = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/scholarplace';
        console.log('Connecting to MongoDB:', mongoUri);

        await mongoose.connect(mongoUri);
        console.log('Connected successfully.\n');

        // Define schema inline to avoid import issues
        const PersonSchema = new mongoose.Schema({}, { strict: false, collection: 'tblPersonMaster' });
        const PersonMaster = mongoose.model('PersonMaster', PersonSchema);

        // Exact filter from controller
        const filter = {
            person_role: 'Student',
            person_deleted: { $ne: true } // Exclude soft-deleted students
        };

        console.log('Running Query with filter:', JSON.stringify(filter, null, 2));

        const students = await PersonMaster.find(filter);

        console.log(`\nFound ${students.length} Student(s):`);
        console.log('-----------------------------------');

        students.forEach((s, index) => {
            console.log(`#${index + 1}`);
            console.log(`   ID: ${s._id}`);
            console.log(`   Name: ${s.person_name}`);
            console.log(`   Email: ${s.person_email}`);
            console.log(`   Role: ${s.person_role}`);
            console.log(`   Status: ${s.person_status}`);
            console.log(`   College ID: ${s.person_collage_id}`);
            console.log('-----------------------------------');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB.');
    }
};

checkStudents();
