
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scholarplace'

async function fixQ001() {
    try {
        console.log('Connecting to MongoDB...')
        await mongoose.connect(MONGODB_URI)
        console.log('Connected.')

        const db = mongoose.connection.db
        const collection = db.collection('tblCodingProblem')

        console.log('Updating Q001 test cases...')
        const result = await collection.updateOne(
            { question_id: 'Q001' },
            {
                $set: {
                    "test_cases.0.expected_output": "Welcome to the World of Coding",
                    "test_cases.1.expected_output": "Welcome to the World of Coding"
                }
            }
        )

        console.log('Update result:', result)
        console.log('Done.')

    } catch (error) {
        console.error('Error:', error)
    } finally {
        await mongoose.disconnect()
    }
}

fixQ001()
