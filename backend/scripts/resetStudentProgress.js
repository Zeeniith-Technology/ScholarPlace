import dotenv from 'dotenv';
import { connectDB, getDB, fetchData, executeData } from '../methods.js';
import studentProgressSchema from '../schema/studentProgress.js';
import { ObjectId } from 'mongodb';

dotenv.config();

/**
 * Reset Student Progress Script
 * 
 * This script allows you to reset student progress data for syllabus completion.
 * 
 * Usage:
 *   node backend/scripts/resetStudentProgress.js [options]
 * 
 * Options:
 *   --student-id <id>     Reset progress for specific student (ObjectId)
 *   --week <number>       Reset progress for specific week (1-8)
 *   --all-students        Reset progress for all students
 *   --all-weeks           Reset progress for all weeks
 *   --days-only           Reset only days_completed
 *   --tests-only          Reset only practice_test_scores
 *   --assignments-only    Reset only assignments_completed
 *   --full-reset          Reset all progress fields (default)
 *   --dry-run             Show what would be deleted without actually deleting
 * 
 * Examples:
 *   node backend/scripts/resetStudentProgress.js --student-id 507f1f77bcf86cd799439011 --week 1
 *   node backend/scripts/resetStudentProgress.js --all-students --week 1
 *   node backend/scripts/resetStudentProgress.js --all-students --all-weeks --dry-run
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    studentId: null,
    week: null,
    allStudents: false,
    allWeeks: false,
    daysOnly: false,
    testsOnly: false,
    assignmentsOnly: false,
    fullReset: true,
    dryRun: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
        case '--student-id':
            options.studentId = args[++i];
            break;
        case '--week':
            options.week = parseInt(args[++i]);
            break;
        case '--all-students':
            options.allStudents = true;
            break;
        case '--all-weeks':
            options.allWeeks = true;
            break;
        case '--days-only':
            options.daysOnly = true;
            options.fullReset = false;
            break;
        case '--tests-only':
            options.testsOnly = true;
            options.fullReset = false;
            break;
        case '--assignments-only':
            options.assignmentsOnly = true;
            options.fullReset = false;
            break;
        case '--dry-run':
            options.dryRun = true;
            break;
        case '--help':
        case '-h':
            console.log(`
Reset Student Progress Script

Usage: node backend/scripts/resetStudentProgress.js [options]

Options:
  --student-id <id>       Reset progress for specific student (ObjectId)
  --week <number>         Reset progress for specific week (1-8)
  --all-students          Reset progress for all students
  --all-weeks             Reset progress for all weeks
  --days-only             Reset only days_completed
  --tests-only            Reset only practice_test_scores
  --assignments-only      Reset only assignments_completed
  --full-reset            Reset all progress fields (default)
  --dry-run               Show what would be deleted without actually deleting
  --help, -h              Show this help message

Examples:
  # Reset Week 1 progress for a specific student
  node backend/scripts/resetStudentProgress.js --student-id 507f1f77bcf86cd799439011 --week 1

  # Reset Week 1 progress for all students
  node backend/scripts/resetStudentProgress.js --all-students --week 1

  # Reset all progress for all students (dry run)
  node backend/scripts/resetStudentProgress.js --all-students --all-weeks --dry-run

  # Reset only practice test scores for Week 1
  node backend/scripts/resetStudentProgress.js --all-students --week 1 --tests-only
            `);
            process.exit(0);
    }
}

/**
 * Main function to reset student progress
 */
async function resetStudentProgress() {
    try {
        console.log('🔌 Connecting to database...');
        await connectDB();
        const db = getDB();
        const collection = db.collection('tblStudentProgress');

        // Build filter
        const filter = {};
        
        if (options.studentId) {
            try {
                filter.student_id = new ObjectId(options.studentId);
                console.log(`📌 Filtering by student ID: ${options.studentId}`);
            } catch (error) {
                console.error('❌ Invalid student ID format. Must be a valid ObjectId.');
                process.exit(1);
            }
        }

        if (options.week) {
            filter.week = options.week;
            console.log(`📌 Filtering by week: ${options.week}`);
        }

        if (!options.allStudents && !options.studentId) {
            console.error('❌ Error: Must specify either --student-id or --all-students');
            process.exit(1);
        }

        if (!options.allWeeks && !options.week) {
            console.error('❌ Error: Must specify either --week or --all-weeks');
            process.exit(1);
        }

        // Find matching records
        console.log('\n🔍 Finding matching progress records...');
        const matchingRecords = await fetchData(
            'tblStudentProgress',
            {},
            filter,
            {}
        );

        if (!matchingRecords.data || matchingRecords.data.length === 0) {
            console.log('✅ No matching records found. Nothing to reset.');
            process.exit(0);
        }

        console.log(`\n📊 Found ${matchingRecords.data.length} record(s) to reset:`);
        matchingRecords.data.forEach((record, index) => {
            console.log(`\n   ${index + 1}. Student ID: ${record.student_id}`);
            console.log(`      Week: ${record.week}`);
            console.log(`      Status: ${record.status || 'N/A'}`);
            console.log(`      Days Completed: ${record.days_completed?.length || 0}`);
            console.log(`      Assignments Completed: ${record.assignments_completed || 0}`);
            console.log(`      Tests Completed: ${record.tests_completed || 0}`);
            console.log(`      Practice Test Scores: ${record.practice_test_scores?.length || 0}`);
            console.log(`      Progress: ${record.progress_percentage || 0}%`);
        });

        if (options.dryRun) {
            console.log('\n🔍 DRY RUN MODE - No changes will be made.');
            console.log('\nTo actually reset, run without --dry-run flag.');
            process.exit(0);
        }

        // Confirm before proceeding
        console.log('\n⚠️  WARNING: This will reset student progress data!');
        console.log('   This action cannot be undone.');
        
        // In a real scenario, you might want to add a confirmation prompt here
        // For now, we'll proceed with the reset

        // Build update data (without $set wrapper - executeData will add it)
        let updateData = {};

        if (options.fullReset) {
            // Reset all progress fields
            updateData = {
                status: 'start',
                progress_percentage: 0,
                days_completed: [],
                assignments_completed: 0,
                tests_completed: 0,
                practice_tests_completed: 0,
                practice_test_scores: [],
                time_spent: 0,
                completed_at: null
            };
            console.log('\n🔄 Resetting all progress fields...');
        } else {
            // Reset specific fields
            if (options.daysOnly) {
                updateData.days_completed = [];
                console.log('\n🔄 Resetting days_completed...');
            }
            
            if (options.testsOnly) {
                updateData.practice_test_scores = [];
                updateData.practice_tests_completed = 0;
                updateData.tests_completed = 0;
                console.log('\n🔄 Resetting practice_test_scores...');
            }
            
            if (options.assignmentsOnly) {
                updateData.assignments_completed = 0;
                console.log('\n🔄 Resetting assignments_completed...');
            }

            // Recalculate progress percentage and status
            updateData.progress_percentage = 0;
            updateData.status = 'start';
        }

        // Perform update using direct MongoDB operations
        let updateCount = 0;
        const database = getDB();
        const progressCollection = database.collection('tblStudentProgress');
        
        for (const record of matchingRecords.data) {
            try {
                // Convert _id to ObjectId if it's a string
                let recordId = record._id;
                if (typeof recordId === 'string') {
                    recordId = new ObjectId(recordId);
                }
                
                const recordFilter = { _id: recordId };
                
                // Build the update operation with $set
                const updateOperation = {
                    $set: {
                        ...updateData,
                        updated_at: new Date()
                    }
                };
                
                // Use updateOne directly
                const result = await progressCollection.updateOne(
                    recordFilter,
                    updateOperation
                );

                if (result.modifiedCount > 0 || result.matchedCount > 0) {
                    updateCount++;
                } else {
                    console.error(`❌ Failed to update record ${record._id}: No document matched or already updated`);
                }
            } catch (error) {
                console.error(`❌ Error updating record ${record._id}:`, error.message);
            }
        }

        console.log(`\n✅ Successfully reset ${updateCount} out of ${matchingRecords.data.length} record(s).`);

        // Show summary
        console.log('\n📊 Reset Summary:');
        if (options.fullReset) {
            console.log('   ✓ Status reset to "start"');
            console.log('   ✓ Progress percentage reset to 0%');
            console.log('   ✓ Days completed cleared');
            console.log('   ✓ Assignments completed reset to 0');
            console.log('   ✓ Tests completed reset to 0');
            console.log('   ✓ Practice test scores cleared');
            console.log('   ✓ Time spent reset to 0');
            console.log('   ✓ Completion date cleared');
        } else {
            if (options.daysOnly) console.log('   ✓ Days completed cleared');
            if (options.testsOnly) console.log('   ✓ Practice test scores cleared');
            if (options.assignmentsOnly) console.log('   ✓ Assignments completed reset to 0');
        }

        console.log('\n🎉 Reset complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error resetting student progress:', error);
        process.exit(1);
    }
}

// Run the script
resetStudentProgress();

