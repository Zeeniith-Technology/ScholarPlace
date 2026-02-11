
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

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

async function clearDb() {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI not found in environment variables');
        process.exit(1);
    }

    const client = new MongoClient(process.env.MONGO_URI);

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        console.log(`Connected to database: ${process.env.DB_NAME}`);

        let totalDeleted = 0;

        // 1. Clear collections
        for (const collName of collectionsFullClear) {
            try {
                const coll = db.collection(collName);
                const countBefore = await coll.countDocuments();
                if (countBefore > 0) {
                    const result = await coll.deleteMany({});
                    const deleted = result.deletedCount;
                    totalDeleted += deleted;
                    console.log(`${collName}: deleted ${deleted} (had ${countBefore})`);
                } else {
                    console.log(`${collName}: empty, skipped`);
                }
            } catch (e) {
                console.log(`${collName}: ERROR ${e.message}`);
            }
        }

        // 2. tblPersonMaster: delete only non-Superadmin
        const personColl = db.collection('tblPersonMaster');
        const superCount = await personColl.countDocuments({ person_role: { $regex: /^superadmin$/i } });
        const personResult = await personColl.deleteMany({ person_role: { $not: { $regex: /^superadmin$/i } } });
        const personDeleted = personResult.deletedCount || 0;
        totalDeleted += personDeleted;
        console.log(`tblPersonMaster: deleted ${personDeleted} non-Superadmin (kept ${superCount} Superadmin)`);

        console.log('');
        console.log(`Done. Total documents deleted: ${totalDeleted}`);
        console.log('You can now log in as Superadmin and create college + departments + TPC/Dept TPC/Students from 0.');

    } catch (error) {
        console.error('Error clearing database:', error);
    } finally {
        await client.close();
    }
}

clearDb();
