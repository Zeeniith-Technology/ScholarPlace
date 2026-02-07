
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

async function verifyListResponse() {
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
                console.log('[MockRes] JSON sent'); // Don't log full JSON yet, it might be huge
                this.locals.responseData = data; // store it
            }
        };

        // Mock Request object for LIST (which usually filters by user in controller)
        const req = {
            body: {
                filter: { week: WEEK }
            },
            userId: USER_ID,
            user: { role: 'Student', id: USER_ID },
            headers: { 'x-user-role': 'Student' } // simulating auth middleware
        };

        const controller = new studentProgressController();
        const next = (err) => { if (err) console.error('Next called with error:', err); };

        console.log('--- Simulating listStudentProgress ---');
        await controller.listStudentProgress(req, res, next);

        console.log('Controller execution finished.');
        if (res.locals.responseData) {
            const data = res.locals.responseData.data;
            // We want to see the specific record for Week 1
            const week1Record = Array.isArray(data) ? data.find(r => r.week === 1 || r.week === '1') : data;

            console.log('Week 1 Record from LIST:', JSON.stringify(week1Record, null, 2));

            if (week1Record) {
                console.log('CHECK: capstone_completed =', week1Record.capstone_completed);
                console.log('CHECK: status =', week1Record.status);
            } else {
                console.log('CHECK: Record NOT FOUND in list response');
            }

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

verifyListResponse();
