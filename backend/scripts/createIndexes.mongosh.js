/**
 * MongoDB Shell script – run in Compass (Mongosh tab) or mongosh CLI.
 * Creates all indexes used by the app (same as node scripts/createIndexes.js).
 *
 * In Compass: open your database → click "Mongosh" tab → paste this script → run.
 * To target a specific DB: db = db.getSiblingDB('YOUR_DB_NAME');
 */

// db = db.getSiblingDB('YOUR_DB_NAME');

function createIndex(coll, keys, options) {
  try {
    coll.createIndex(keys, options);
    return true;
  } catch (e) {
    if (e.code === 85 || e.codeName === 'IndexOptionsConflict' || (e.message && e.message.includes('already exists'))) {
      return false; // already exists
    }
    throw e;
  }
}

// ---- tblPersonMaster ----
print('Creating indexes for tblPersonMaster...');
const personColl = db.getCollection('tblPersonMaster');
createIndex(personColl, { person_email: 1 }, { unique: true, name: 'idx_person_email' });
createIndex(personColl, { person_role: 1 }, { name: 'idx_person_role' });
createIndex(personColl, { person_status: 1, person_deleted: 1 }, { name: 'idx_person_status_deleted' });
createIndex(personColl, { person_deleted: 1 }, { name: 'idx_person_deleted' });
createIndex(personColl, { person_collage_id: 1, person_role: 1 }, { name: 'idx_person_collage_role' });
createIndex(personColl, { person_collage_id: 1, department_id: 1, person_role: 1 }, { name: 'idx_person_collage_department_role' });
print('  tblPersonMaster done.\n');

// ---- tblExams ----
print('Creating indexes for tblExams...');
const examColl = db.getCollection('tblExams');
createIndex(examColl, { exam_type: 1, week: 1 }, { name: 'idx_exam_type_week' });
createIndex(examColl, { status: 1, scheduled_date: 1 }, { name: 'idx_exam_status_date' });
createIndex(examColl, { deleted: 1 }, { name: 'idx_exam_deleted' });
createIndex(examColl, { week: 1 }, { name: 'idx_exam_week' });
print('  tblExams done.\n');

// ---- tblerrorlog ----
print('Creating indexes for tblerrorlog...');
const errorColl = db.getCollection('tblerrorlog');
createIndex(errorColl, { timestamp: -1 }, { name: 'idx_error_timestamp' });
createIndex(errorColl, { error_code: 1 }, { name: 'idx_error_code' });
createIndex(errorColl, { backend_route: 1, timestamp: -1 }, { name: 'idx_error_route_timestamp' });
print('  tblerrorlog done.\n');

// ---- tblCollage ----
print('Creating indexes for tblCollage...');
const collageColl = db.getCollection('tblCollage');
createIndex(collageColl, { collage_status: 1, deleted: 1 }, { name: 'idx_collage_status_deleted' });
createIndex(collageColl, { collage_subscription_status: 1 }, { name: 'idx_collage_subscription' });
createIndex(collageColl, { collage_name: 1 }, { name: 'idx_collage_name' });
print('  tblCollage done.\n');

// ---- tblStudentProgress ----
print('Creating indexes for tblStudentProgress...');
const progressColl = db.getCollection('tblStudentProgress');
createIndex(progressColl, { student_id: 1, week: 1 }, { name: 'idx_progress_student_week' });
createIndex(progressColl, { student_id: 1 }, { name: 'idx_progress_student' });
createIndex(progressColl, { college_id: 1, department_id: 1 }, { name: 'idx_progress_college_department' });
print('  tblStudentProgress done.\n');

// ---- tblPracticeTest ----
print('Creating indexes for tblPracticeTest...');
const practiceColl = db.getCollection('tblPracticeTest');
createIndex(practiceColl, { student_id: 1 }, { name: 'idx_practice_student' });
createIndex(practiceColl, { college_id: 1, department_id: 1 }, { name: 'idx_practice_college_department' });
print('  tblPracticeTest done.\n');

// ---- tblCodeReview ----
print('Creating indexes for tblCodeReview...');
const codeReviewColl = db.getCollection('tblCodeReview');
createIndex(codeReviewColl, { submission_id: 1 }, { name: 'idx_code_review_submission' });
createIndex(codeReviewColl, { person_id: 1 }, { name: 'idx_code_review_person' });
createIndex(codeReviewColl, { person_id: 1, submission_id: 1 }, { name: 'idx_code_review_person_submission' });
createIndex(codeReviewColl, { person_id: 1, problem_id: 1, created_at: -1 }, { name: 'idx_code_review_person_problem_latest' });
createIndex(codeReviewColl, { person_id: 1, department_id: 1 }, { name: 'idx_code_review_person_department' });
print('  tblCodeReview done.\n');

// ---- tblCodingSubmissions ----
print('Creating indexes for tblCodingSubmissions...');
const submissionsColl = db.getCollection('tblCodingSubmissions');
createIndex(submissionsColl, { student_id: 1 }, { name: 'idx_submissions_student' });
createIndex(submissionsColl, { problem_id: 1 }, { name: 'idx_submissions_problem' });
createIndex(submissionsColl, { student_id: 1, problem_id: 1 }, { name: 'idx_submissions_student_problem' });
createIndex(submissionsColl, { student_id: 1, problem_id: 1, status: 1 }, { name: 'idx_submissions_student_problem_status' });
createIndex(submissionsColl, { student_id: 1, submitted_at: -1 }, { name: 'idx_submissions_student_submitted' });
createIndex(submissionsColl, { college_id: 1, department_id: 1 }, { name: 'idx_submissions_college_department' });
print('  tblCodingSubmissions done.\n');

// ---- tblCodingProblem ----
print('Creating indexes for tblCodingProblem...');
const codingProblemColl = db.getCollection('tblCodingProblem');
createIndex(codingProblemColl, { question_id: 1 }, { unique: true, name: 'idx_coding_problem_question_id' });
createIndex(codingProblemColl, { week: 1 }, { name: 'idx_coding_problem_week' });
createIndex(codingProblemColl, { week: 1, is_capstone: 1 }, { name: 'idx_coding_problem_week_capstone' });
createIndex(codingProblemColl, { week: 1, day: 1, is_capstone: 1 }, { name: 'idx_coding_problem_week_day_capstone' });
createIndex(codingProblemColl, { deleted: 1, status: 1 }, { name: 'idx_coding_problem_deleted_status' });
print('  tblCodingProblem done.\n');

// ---- tblQuestion ----
print('Creating indexes for tblQuestion...');
const questionColl = db.getCollection('tblQuestion');
createIndex(questionColl, { question_id: 1 }, { name: 'idx_question_question_id' });
createIndex(questionColl, { week: 1, day: 1 }, { name: 'idx_question_week_day' });
createIndex(questionColl, { question_type: 1, week: 1, day: 1 }, { name: 'idx_question_type_week_day' });
createIndex(questionColl, { deleted: 1 }, { name: 'idx_question_deleted' });
print('  tblQuestion done.\n');

print('All indexes created (existing indexes skipped).');
