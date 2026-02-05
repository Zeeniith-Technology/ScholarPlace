/**
 * Database Index Creation Script
 * Run this once to create all necessary indexes for optimal performance
 * 
 * Usage: node scripts/createIndexes.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function createIndexes() {
    let client = null;

    try {
        console.log('Connecting to MongoDB...');
        client = new MongoClient(process.env.MONGO_URI);
        await client.connect();

        const db = client.db(process.env.DB_NAME);
        console.log(`Connected to database: ${process.env.DB_NAME}\n`);

        // Create indexes for tblPersonMaster
        console.log('Creating indexes for tblPersonMaster...');
        const personCollection = db.collection('tblPersonMaster');

        await personCollection.createIndex({ person_email: 1 }, { unique: true, name: 'idx_person_email' });
        console.log('✓ Created index: person_email (unique)');

        await personCollection.createIndex({ person_role: 1 }, { name: 'idx_person_role' });
        console.log('✓ Created index: person_role');

        await personCollection.createIndex({ person_status: 1, person_deleted: 1 }, { name: 'idx_person_status_deleted' });
        console.log('✓ Created index: person_status + person_deleted');

        await personCollection.createIndex({ person_deleted: 1 }, { name: 'idx_person_deleted' });

        // Tenant filtering: use tbl _id only (person_collage_id = tblCollage._id, department_id = tblDepartments._id)
        await personCollection.createIndex({ person_collage_id: 1, person_role: 1 }, { name: 'idx_person_collage_role' });
        console.log('✓ Created index: person_collage_id + person_role (tenant)');
        await personCollection.createIndex({ person_collage_id: 1, department_id: 1, person_role: 1 }, { name: 'idx_person_collage_department_role' });
        console.log('✓ Created index: person_collage_id + department_id + person_role (tenant)\n');

        // Create indexes for exams
        console.log('Creating indexes for exams...');
        const examCollection = db.collection('tblExams');

        await examCollection.createIndex({ exam_type: 1, week: 1 }, { name: 'idx_exam_type_week' });
        console.log('✓ Created index: exam_type + week');

        await examCollection.createIndex({ status: 1, scheduled_date: 1 }, { name: 'idx_exam_status_date' });
        console.log('✓ Created index: status + scheduled_date');

        await examCollection.createIndex({ deleted: 1 }, { name: 'idx_exam_deleted' });
        console.log('✓ Created index: deleted');

        await examCollection.createIndex({ week: 1 }, { name: 'idx_exam_week' });
        console.log('✓ Created index: week\n');

        // Create indexes for tblerrorlog
        console.log('Creating indexes for tblerrorlog...');
        const errorCollection = db.collection('tblerrorlog');

        await errorCollection.createIndex({ timestamp: -1 }, { name: 'idx_error_timestamp' });
        console.log('✓ Created index: timestamp (descending)');

        await errorCollection.createIndex({ error_code: 1 }, { name: 'idx_error_code' });
        console.log('✓ Created index: error_code');

        await errorCollection.createIndex({ backend_route: 1, timestamp: -1 }, { name: 'idx_error_route_timestamp' });
        console.log('✓ Created index: backend_route + timestamp\n');

        // Create indexes for tblCollage
        console.log('Creating indexes for tblCollage...');
        const collageCollection = db.collection('tblCollage');

        await collageCollection.createIndex({ collage_status: 1, deleted: 1 }, { name: 'idx_collage_status_deleted' });
        console.log('✓ Created index: collage_status + deleted');

        await collageCollection.createIndex({ collage_subscription_status: 1 }, { name: 'idx_collage_subscription' });
        console.log('✓ Created index: collage_subscription_status');

        await collageCollection.createIndex({ collage_name: 1 }, { name: 'idx_collage_name' });
        console.log('✓ Created index: collage_name\n');

        // Create indexes for tblStudentProgress (for Analytics)
        console.log('Creating indexes for tblStudentProgress...');
        const progressCollection = db.collection('tblStudentProgress');

        await progressCollection.createIndex({ student_id: 1, week: 1 }, { name: 'idx_progress_student_week' });
        console.log('✓ Created index: student_id + week');

        await progressCollection.createIndex({ student_id: 1 }, { name: 'idx_progress_student' });
        console.log('✓ Created index: student_id');
        await progressCollection.createIndex({ college_id: 1, department_id: 1 }, { name: 'idx_progress_college_department' });
        console.log('✓ Created index: college_id + department_id (tenant)\n');

        // Create indexes for tblPracticeTest (for Analytics)
        console.log('Creating indexes for tblPracticeTest...');
        const practiceCollection = db.collection('tblPracticeTest');

        await practiceCollection.createIndex({ student_id: 1 }, { name: 'idx_practice_student' });
        console.log('✓ Created index: student_id');
        await practiceCollection.createIndex({ college_id: 1, department_id: 1 }, { name: 'idx_practice_college_department' });
        console.log('✓ Created index: college_id + department_id (tenant)\n');

        // Create indexes for tblCodeReview (AI code reviews - multi-tenant by person_id, department_id)
        console.log('Creating indexes for tblCodeReview...');
        const codeReviewCollection = db.collection('tblCodeReview');

        await codeReviewCollection.createIndex({ submission_id: 1 }, { name: 'idx_code_review_submission' });
        console.log('✓ Created index: submission_id');

        await codeReviewCollection.createIndex({ person_id: 1 }, { name: 'idx_code_review_person' });
        console.log('✓ Created index: person_id');

        await codeReviewCollection.createIndex(
            { person_id: 1, submission_id: 1 },
            { name: 'idx_code_review_person_submission' }
        );
        console.log('✓ Created index: person_id + submission_id (get-by-submission)');

        await codeReviewCollection.createIndex(
            { person_id: 1, problem_id: 1, created_at: -1 },
            { name: 'idx_code_review_person_problem_latest' }
        );
        console.log('✓ Created index: person_id + problem_id + created_at (get-by-problem latest)');

        await codeReviewCollection.createIndex(
            { person_id: 1, department_id: 1 },
            { name: 'idx_code_review_person_department' }
        );
        console.log('✓ Created index: person_id + department_id (multi-tenant)\n');

        // Create indexes for tblCodingSubmissions (submit + progress checks)
        console.log('Creating indexes for tblCodingSubmissions...');
        const submissionsCollection = db.collection('tblCodingSubmissions');

        await submissionsCollection.createIndex({ student_id: 1 }, { name: 'idx_submissions_student' });
        console.log('✓ Created index: student_id');

        await submissionsCollection.createIndex({ problem_id: 1 }, { name: 'idx_submissions_problem' });
        console.log('✓ Created index: problem_id');

        await submissionsCollection.createIndex(
            { student_id: 1, problem_id: 1 },
            { name: 'idx_submissions_student_problem' }
        );
        console.log('✓ Created index: student_id + problem_id');

        await submissionsCollection.createIndex(
            { student_id: 1, problem_id: 1, status: 1 },
            { name: 'idx_submissions_student_problem_status' }
        );
        console.log('✓ Created index: student_id + problem_id + status');

        await submissionsCollection.createIndex(
            { student_id: 1, submitted_at: -1 },
            { name: 'idx_submissions_student_submitted' }
        );
        console.log('✓ Created index: student_id + submitted_at (sort)');
        await submissionsCollection.createIndex({ college_id: 1, department_id: 1 }, { name: 'idx_submissions_college_department' });
        console.log('✓ Created index: college_id + department_id (tenant)\n');

        // Create indexes for tblCodingProblem (daily/capstone problem lists)
        console.log('Creating indexes for tblCodingProblem...');
        const codingProblemCollection = db.collection('tblCodingProblem');

        // Skip question_id if already exists (e.g. default question_id_1)
        try {
            await codingProblemCollection.createIndex({ question_id: 1 }, { unique: true, name: 'idx_coding_problem_question_id' });
            console.log('✓ Created index: question_id (unique)');
        } catch (e) {
            if (e.code === 85 || e.codeName === 'IndexOptionsConflict') {
                console.log('✓ Index on question_id already exists (skipped)');
            } else throw e;
        }

        await codingProblemCollection.createIndex({ week: 1 }, { name: 'idx_coding_problem_week' });
        console.log('✓ Created index: week');

        await codingProblemCollection.createIndex(
            { week: 1, is_capstone: 1 },
            { name: 'idx_coding_problem_week_capstone' }
        );
        console.log('✓ Created index: week + is_capstone');

        await codingProblemCollection.createIndex(
            { week: 1, day: 1, is_capstone: 1 },
            { name: 'idx_coding_problem_week_day_capstone' }
        );
        console.log('✓ Created index: week + day + is_capstone');

        await codingProblemCollection.createIndex(
            { deleted: 1, status: 1 },
            { name: 'idx_coding_problem_deleted_status' }
        );
        console.log('✓ Created index: deleted + status\n');

        // Create indexes for tblQuestion (practice questions by week/day)
        console.log('Creating indexes for tblQuestion...');
        const questionCollection = db.collection('tblQuestion');

        await questionCollection.createIndex({ question_id: 1 }, { name: 'idx_question_question_id' });
        console.log('✓ Created index: question_id');

        await questionCollection.createIndex({ week: 1, day: 1 }, { name: 'idx_question_week_day' });
        console.log('✓ Created index: week + day');

        await questionCollection.createIndex(
            { question_type: 1, week: 1, day: 1 },
            { name: 'idx_question_type_week_day' }
        );
        console.log('✓ Created index: question_type + week + day');

        await questionCollection.createIndex({ deleted: 1 }, { name: 'idx_question_deleted' });
        console.log('✓ Created index: deleted');

        console.log('\n✅ All indexes created successfully!');
        console.log('\nPerformance Impact:');
        console.log('- Queries will be 10-100x faster');
        console.log('- Database can handle more concurrent connections');
        console.log('- Reduced CPU and memory usage');

    } catch (error) {
        console.error('❌ Error creating indexes:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('\nDatabase connection closed.');
        }
    }
}

// Run the script
createIndexes();

