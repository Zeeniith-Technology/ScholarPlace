
import { connectDB, getDB, fetchData } from '../methods.js';
import studentProgressController from '../controller/studentProgress.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const USER_ID = '69848464a2a6236cb6412a36'; // Confirmed ID
const WEEK = 1;

async function verifyResponse() {
    try {
        await connectDB();

        // Mock Response object to capture output
        const res = {
            locals: {},
            status: function (code) {
                console.log(`[MockRes] Status set to ${code}`);
                return this;
            },
            json: function (data) {
                console.log('[MockRes] JSON sent:', JSON.stringify(data, null, 2));
                this.locals.responseData = data; // store it
            }
        };

        // Mock Request object
        const req = {
            body: { week: WEEK },
            userId: USER_ID, // studentProgressController uses this
            user: { role: 'Student' }
        };

        const controller = new studentProgressController();
        const next = (err) => { if (err) console.error('Next called with error:', err); };

        console.log('--- Simulating checkWeekCompletion ---');
        await controller.checkWeekCompletion(req, res, next);

        console.log('Controller execution finished.');
        if (res.locals.responseData) {
            console.log('Final Response Data:', JSON.stringify(res.locals.responseData, null, 2));
        } else {
            console.log('NO response data found in res.locals');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // give time for logs to flush
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.exit();
    }
}

verifyResponse();
