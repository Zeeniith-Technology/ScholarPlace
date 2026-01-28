import dotenv from 'dotenv';
import { connectDB, fetchData, executeData } from '../methods.js';
import personMasterSchema from '../schema/PersonMaster.js';
import bcrypt from 'bcrypt';

dotenv.config();

/**
 * Add Superadmin User Script
 * 
 * This script adds a superadmin user to the database.
 * 
 * Usage:
 *   node backend/scripts/addSuperadmin.js
 * 
 * The script will:
 * 1. Check if superadmin already exists
 * 2. Hash the password
 * 3. Insert the superadmin user into tblPersonMaster
 * 4. Display success message
 */

const SUPERADMIN_EMAIL = 'dharmiksuthar0509@gmail.com';
const SUPERADMIN_PASSWORD = 'Dharmik@12';
const SUPERADMIN_NAME = 'Super Admin';

async function addSuperadmin() {
    try {
        console.log('🔌 Connecting to database...');
        await connectDB();
        console.log('✅ Database connected successfully\n');

        // Check if superadmin already exists
        console.log(`🔍 Checking if superadmin with email "${SUPERADMIN_EMAIL}" already exists...`);
        const existingUser = await fetchData(
            'tblPersonMaster',
            { _id: 1, person_email: 1, person_name: 1, person_role: 1 },
            { 
                person_email: SUPERADMIN_EMAIL.toLowerCase().trim(),
                person_deleted: false 
            },
            {}
        );

        if (existingUser.success && existingUser.data && existingUser.data.length > 0) {
            const user = existingUser.data[0];
            console.log(`⚠️  Superadmin already exists!`);
            console.log(`   ID: ${user._id}`);
            console.log(`   Email: ${user.person_email}`);
            console.log(`   Name: ${user.person_name}`);
            console.log(`   Role: ${user.person_role}`);
            console.log('\n❌ Script aborted. User already exists in database.');
            process.exit(0);
        }

        console.log('✅ No existing superadmin found. Proceeding to create...\n');

        // Hash password
        console.log('🔐 Hashing password...');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, saltRounds);
        console.log('✅ Password hashed successfully\n');

        // Prepare superadmin user data
        const superadminData = {
            person_email: SUPERADMIN_EMAIL.toLowerCase().trim(),
            person_name: SUPERADMIN_NAME,
            person_role: 'superadmin',
            person_password: hashedPassword,
            person_status: 'active',
            person_deleted: false,
            contact_number: '',
            department: '',
            semester: null,
            enrollment_number: '',
            college_name: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Insert superadmin user
        console.log('📝 Inserting superadmin user into database...');
        const insertResponse = await executeData(
            'tblPersonMaster',
            superadminData,
            'i', // insert operation
            personMasterSchema
        );

        if (!insertResponse.success) {
            console.error('❌ Failed to insert superadmin user');
            console.error('Error:', insertResponse.error || 'Unknown error');
            process.exit(1);
        }

        const insertedId = insertResponse.data?.insertedId || insertResponse.data?._id;
        console.log('✅ Superadmin user inserted successfully!\n');

        // Fetch and display the created user
        const createdUser = await fetchData(
            'tblPersonMaster',
            {},
            { _id: insertedId },
            {}
        );

        if (createdUser.success && createdUser.data && createdUser.data.length > 0) {
            const user = createdUser.data[0];
            console.log('📋 Superadmin User Details:');
            console.log('   ──────────────────────────────────────');
            console.log(`   ID: ${user._id}`);
            console.log(`   Email: ${user.person_email}`);
            console.log(`   Name: ${user.person_name}`);
            console.log(`   Role: ${user.person_role}`);
            console.log(`   Status: ${user.person_status}`);
            console.log(`   Created At: ${user.createdAt || user.created_at || 'N/A'}`);
            console.log('   ──────────────────────────────────────\n');
        }

        console.log('✅ Script completed successfully!');
        console.log(`\n📧 Login Credentials:`);
        console.log(`   Email: ${SUPERADMIN_EMAIL}`);
        console.log(`   Password: ${SUPERADMIN_PASSWORD}\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error occurred while adding superadmin:');
        console.error(error);
        process.exit(1);
    }
}

// Run the script
addSuperadmin();
