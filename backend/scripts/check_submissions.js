
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scholarplace'

async function checkSubmissions() {
    try {
        console.log('Connecting to MongoDB...')
        await mongoose.connect(MONGODB_URI)
        console.log('Connected.')

        const db = mongoose.connection.db
        const collection = db.collection('tblCodingSubmissions')

        console.log('Checking submissions for Q001...')
        const submissions = await collection.find({ problem_id: 'Q001' }).sort({ submitted_at: -1 }).limit(5).toArray()

        if (submissions.length === 0) {
            console.log('No submissions found for Q001.')
        } else {
            console.log(`Found ${submissions.length} recent submissions:`)
            submissions.forEach(sub => {
                console.log(`- User: ${sub.student_id}`)
                console.log(`  Status: ${sub.status}`)
                console.log(`  Date: ${sub.submitted_at}`)
                console.log(`  Score: ${sub.score}`)
                console.log('---')
            })
        }

    } catch (error) {
        console.error('Error:', error)
    } finally {
        await mongoose.disconnect()
    }
}

checkSubmissions()
