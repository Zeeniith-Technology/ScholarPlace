
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables properly
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const resetSuperAdminPassword = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/scholarplace';
        console.log('Connecting to MongoDB:', mongoUri);

        await mongoose.connect(mongoUri);
        console.log('Connected successfully.');

        // Define schema inline to avoid import issues
        const PersonSchema = new mongoose.Schema({}, { strict: false, collection: 'tblPersonMaster' });
        const PersonMaster = mongoose.model('PersonMaster', PersonSchema);

        // Find Superadmin
        const superadmin = await PersonMaster.findOne({ person_role: 'superadmin' });

        if (!superadmin) {
            console.error('❌ No Superadmin found in the database!');
            process.exit(1);
        }

        console.log(`Found Superadmin: ${superadmin.person_name} (${superadmin.person_email})`);

        // New Password
        const newPassword = 'admin'; // You can change this
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update Password
        await PersonMaster.updateOne(
            { _id: superadmin._id },
            { $set: { person_password: hashedPassword } }
        );

        console.log(`\n✅ Password successfully reset for ${superadmin.person_email}`);
        console.log(`📧 Email: ${superadmin.person_email}`);
        console.log(`🔑 New Password: ${newPassword}`);
        console.log('-----------------------------------');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
};

resetSuperAdminPassword();
