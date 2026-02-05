/**
 * Clear only college/department/student/TPC-related data for a fresh start.
 * Does NOT touch hardcoded data: tblQuestion, tblSyllabus, tblCodingProblem, tblRoles, tblerrorlog.
 * Superadmin is NEVER removed: only non-Superadmin users (Student, TPC, Dept TPC) are deleted from tblPersonMaster.
 *
 * Usage (local/dev): node scripts/clearDbForFreshStart.js
 * Usage (production): CONFIRM_PRODUCTION=yes node scripts/clearDbForFreshStart.js
 * Env: MONGO_URI, DB_NAME (from .env)
 *
 * Production safety: If MONGO_URI looks like production (e.g. mongodb.net) or RUN_ON_PRODUCTION=1,
 * the script requires CONFIRM_PRODUCTION=yes or it will exit without clearing.
 *
 * DO NOT run without verifying. Ask before running.
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

/** True if we consider the current MONGO_URI to be production (requires explicit confirmation). */
function isProductionUri(uri) {
    if (!uri || typeof uri !== 'string') return false;
    const u = uri.toLowerCase();
    if (process.env.RUN_ON_PRODUCTION === '1') return true;
    return u.includes('mongodb.net') || u.includes('atlas') || u.includes('production');
}

/** Exit if this is production and user has not set CONFIRM_PRODUCTION=yes. */
function requireProductionConfirmation() {
    const uri = process.env.MONGO_URI;
    if (!isProductionUri(uri)) return;
    if (process.env.CONFIRM_PRODUCTION === 'yes') return;
    console.error('This looks like a PRODUCTION database (e.g. Atlas / mongodb.net).');
    console.error('To clear production, you must set: CONFIRM_PRODUCTION=yes');
    console.error('Example: CONFIRM_PRODUCTION=yes node scripts/clearDbForFreshStart.js');
    process.exit(1);
}

// Only college-, department-, student-, TPC/Dept TPC-related data. NOT questions, syllabus, coding problems, roles, error log.
const COLLECTIONS_CLEAR_FULL = [
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
    'tblStudentLearningProfile',
];

async function clearDbForFreshStart() {
    let client = null;

    try {
        const uri = process.env.MONGO_URI;
        const dbName = process.env.DB_NAME;

        if (!uri || !dbName) {
            console.error('Missing MONGO_URI or DB_NAME in .env');
            process.exit(1);
        }

        requireProductionConfirmation();

        if (isProductionUri(uri)) {
            console.log('Running on PRODUCTION (CONFIRM_PRODUCTION=yes).\n');
        }

        console.log('Connecting to MongoDB...');
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db(dbName);
        console.log(`Connected to database: ${dbName}\n`);
        console.log('Superadmin is never removed.\n');

        let totalDeleted = 0;

        // 1. Clear collections that should go to 0 documents
        for (const collName of COLLECTIONS_CLEAR_FULL) {
            try {
                const coll = db.collection(collName);
                const countBefore = await coll.countDocuments();
                const result = await coll.deleteMany({});
                const deleted = result.deletedCount ?? 0;
                totalDeleted += deleted;
                console.log(`  ${collName}: deleted ${deleted} (had ${countBefore})`);
            } catch (err) {
                // Collection might not exist
                if (err.code === 26 || err.message?.includes('not found')) {
                    console.log(`  ${collName}: (collection missing, skipped)`);
                } else {
                    console.error(`  ${collName}: ERROR`, err.message);
                }
            }
        }

        // 2. tblPersonMaster: delete only non-Superadmin users (Superadmin is never removed)
        const personColl = db.collection('tblPersonMaster');
        const superCount = await personColl.countDocuments({
            person_role: { $regex: /^superadmin$/i }
        });
        const result = await personColl.deleteMany({
            person_role: { $not: { $regex: /^superadmin$/i } }
        });
        const deleted = result.deletedCount ?? 0;
        totalDeleted += deleted;
        console.log(`  tblPersonMaster: deleted ${deleted} non-Superadmin users (kept ${superCount} Superadmin – never removed)`);

        console.log(`\nDone. Total documents deleted: ${totalDeleted}`);
        console.log('You can login as Superadmin and create college + TPC/Dept TPC/Students from 0.');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('\nDisconnected from MongoDB.');
        }
    }
}

clearDbForFreshStart();
