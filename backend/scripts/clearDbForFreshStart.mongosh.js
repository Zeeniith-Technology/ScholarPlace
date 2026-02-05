/**
 * MongoDB Shell script – run in Compass (Mongosh tab) or mongosh CLI.
 * Clears only college/department/student/TPC data. Superadmin is NEVER removed.
 * Does NOT touch: tblQuestion, tblSyllabus, tblCodingProblem, tblRoles, tblerrorlog.
 *
 * In Compass: open your database → click "Mongosh" tab → paste this script → run.
 * If you need to switch DB first, uncomment and set: db = db.getSiblingDB('YOUR_DB_NAME');
 */

// Optional: switch to your database (uncomment and set name if not already connected to the right db)
// db = db.getSiblingDB('YOUR_DB_NAME');

const collectionsFullClear = [
  'tblCollage',
  'tblDepartments',
  'tblTPC',
  'tblDeptTPC',
  'tblStudentProgress',
  'tblPracticeTest',
  'tblTestAnalysis',
  'tblTestState',
  'tblBlockedTestRetake',
  'tblConceptSession',
  'tblConceptCheck',
  'tblConceptCheckAttempt',
  'tblPasswordReset',
  'tblDeptTest',
  'tblCodingSubmissions',
  'tblCodeReview',
  'tblExams',
  'tblAIInteraction',
  'tblStudentLearningProfile'
];

let totalDeleted = 0;

// 1. Clear collections (delete all documents; collections stay for indexes)
collectionsFullClear.forEach(collName => {
  try {
    const coll = db.getCollection(collName);
    const countBefore = coll.countDocuments({});
    const result = coll.deleteMany({});
    const deleted = result.deletedCount || 0;
    totalDeleted += deleted;
    print(`${collName}: deleted ${deleted} (had ${countBefore})`);
  } catch (e) {
    if (e.code === 26 || (e.message && e.message.includes('not found'))) {
      print(`${collName}: (collection missing, skipped)`);
    } else {
      print(`${collName}: ERROR ${e.message}`);
    }
  }
});

// 2. tblPersonMaster: delete only non-Superadmin (Superadmin is never removed)
const personColl = db.getCollection('tblPersonMaster');
const superCount = personColl.countDocuments({ person_role: { $regex: /^superadmin$/i } });
const personResult = personColl.deleteMany({ person_role: { $not: { $regex: /^superadmin$/i } } });
const personDeleted = personResult.deletedCount || 0;
totalDeleted += personDeleted;
print(`tblPersonMaster: deleted ${personDeleted} non-Superadmin (kept ${superCount} Superadmin)`);

print('');
print(`Done. Total documents deleted: ${totalDeleted}`);
print('Log in as Superadmin and create college + departments + TPC/Dept TPC/Students from 0.');
