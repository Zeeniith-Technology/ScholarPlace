
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const uri = process.env.MONGO_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        console.log("Connected to DB:", process.env.DB_NAME);

        const userId = '697b1e1eaed8f1efab75981a'; // Prushti Shah
        const weekNum = 1;

        console.log(`\nGenerating AI Data for User: ${userId}, Week: ${weekNum}`);

        // --- Logic from aiController.js ---

        // 1. Fetch Syllabus Progress
        const progressResult = await db.collection('tblStudentProgress').find({
            student_id: userId,
            week: weekNum
        }).toArray();

        // 2. Fetch Practice Tests (Aptitude)
        const allPracticeTests = await db.collection('tblPracticeTest').find({
            student_id: userId,
            week: weekNum
        }).toArray();

        const aptitudeDaily = allPracticeTests.filter(t => t.day !== 'weekly-test');
        const aptitudeWeekly = allPracticeTests.filter(t => t.day === 'weekly-test');

        // 3. Fetch Coding (DSA) Progress
        let dsaDaily = { completed: 0, total: 0, score: 0 };
        let dsaWeekly = { completed: 0, total: 0, score: 0 };

        const problemsCollection = db.collection('tblCodingProblem');

        // Get ALL problems for this week
        const allProblems = await problemsCollection.find({
            week: weekNum,
            deleted: { $ne: true }
        }).project({ question_id: 1, title: 1, day: 1, is_capstone: 1 }).toArray();

        console.log(`[Debug] Total coding problems found: ${allProblems.length}`);

        if (allProblems.length > 0) {
            const problemIds = allProblems.map(p => p.question_id);
            const submissionsCollection = db.collection('tblCodingSubmissions');

            // Get student's passed submissions
            // Try matching string ID
            let submissions = await submissionsCollection.find({
                student_id: userId.toString(),
                problem_id: { $in: problemIds },
                status: 'passed'
            }).project({ problem_id: 1 }).toArray();

            console.log(`[Debug] Submissions found (String ID): ${submissions.length}`);

            // If 0, try ObjectId? (Just to check format)
            if (submissions.length === 0) {
                const subObj = await submissionsCollection.find({
                    student_id: new ObjectId(userId),
                    problem_id: { $in: problemIds },
                    status: 'passed'
                }).project({ problem_id: 1 }).toArray();
                console.log(`[Debug] Submissions found (ObjectId): ${subObj.length}`);
            }

            const completedProblemIds = new Set(submissions.map(s => s.problem_id));

            // Categorize problems
            const dailyProblems = allProblems.filter(p => !p.is_capstone);
            const weeklyProblems = allProblems.filter(p => p.is_capstone);

            // Calculate DSA Daily Stats
            const dailyCompleted = dailyProblems.filter(p => completedProblemIds.has(p.question_id)).length;
            dsaDaily = {
                completed: dailyCompleted,
                total: dailyProblems.length,
                score: dailyProblems.length > 0 ? Math.round((dailyCompleted / dailyProblems.length) * 100) : 0
            };

            // Calculate DSA Weekly (Capstone) Stats
            const weeklyCompleted = weeklyProblems.filter(p => completedProblemIds.has(p.question_id)).length;
            dsaWeekly = {
                completed: weeklyCompleted,
                total: weeklyProblems.length,
                score: weeklyProblems.length > 0 ? Math.round((weeklyCompleted / weeklyProblems.length) * 100) : 0
            };
        }

        const studentData = {
            syllabusProgress: progressResult,
            aptitude: {
                dailyPractice: aptitudeDaily,
                weeklyTest: aptitudeWeekly
            },
            dsa: {
                dailyPractice: dsaDaily,
                weeklyTest: dsaWeekly
            }
        };

        console.log("\n--- Final Student Data sent to AI ---");
        console.log(JSON.stringify(studentData, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.close();
    }
}

run();
