/**
 * Study Help Controller
 * Clarify & Learn (Q&A with history) and Quick checks (practice from those sessions).
 * Names avoid "AI" for a neutral, product-like feel.
 */

import { ObjectId } from 'mongodb';
import { executeData, fetchData, getDB } from '../methods.js';
import aiService from '../services/aiService.js';
import conceptSessionSchema from '../schema/conceptSession.js';
import conceptCheckSchema from '../schema/conceptCheck.js';
import conceptCheckAttemptSchema from '../schema/conceptCheckAttempt.js';

/** Remove markdown asterisks from AI text so * and ** do not appear in the UI. */
function stripAsterisks(s) {
    if (typeof s !== 'string') return s || '';
    return s.replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1').replace(/\*+/g, '').replace(/\*/g, '');
}

export default class studyHelpController {

    /** POST /study-help/conversation/start */
    async startSession(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { topic, week, day } = req.body || {};

            if (!userId) {
                res.locals.responseData = { success: false, status: 401, message: 'Authentication required' };
                return next();
            }

            const doc = {
                student_id: userId.toString(),
                topic: topic || null,
                week: week || null,
                day: day || null,
                conversation: [],
                status: 'active',
            };

            const result = await executeData('tblConceptSession', doc, 'i', conceptSessionSchema);

            const sessionId = result?.data?.insertedId?.toString?.() || result?.data?._id?.toString?.();

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Session started',
                data: { session_id: sessionId, topic, week, day },
            };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to start session' };
            next();
        }
    }

    /** POST /study-help/conversation/ask */
    async ask(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { session_id, question } = req.body || {};

            if (!userId || !session_id || !question?.trim()) {
                res.locals.responseData = { success: false, status: 400, message: 'session_id and question are required' };
                return next();
            }

            const db = getDB();
            const coll = db.collection('tblConceptSession');
            const sid = /^[0-9a-fA-F]{24}$/.test(session_id) ? new ObjectId(session_id) : session_id;

            const session = await coll.findOne({ _id: sid, student_id: userId.toString() });
            if (!session) {
                res.locals.responseData = { success: false, status: 404, message: 'Session not found' };
                return next();
            }
            if (session.status !== 'active') {
                res.locals.responseData = { success: false, status: 400, message: 'Session is no longer active' };
                return next();
            }

            const history = Array.isArray(session.conversation) ? session.conversation : [];
            const answerResult = await aiService.answerQuestionWithHistory(question.trim(), {
                week: session.week,
                day: session.day,
                topic: session.topic,
            }, history);

            const studentTurn = { role: 'student', content: question.trim(), created_at: new Date().toISOString() };
            const assistantTurn = { role: 'assistant', content: stripAsterisks(answerResult.answer || ''), created_at: new Date().toISOString() };

            await coll.updateOne(
                { _id: sid, student_id: userId.toString() },
                {
                    $push: { conversation: { $each: [studentTurn, assistantTurn] } },
                    $set: { updated_at: new Date().toISOString() },
                }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Answer generated',
                data: {
                    answer: stripAsterisks(answerResult.answer || ''),
                    out_of_scope: answerResult.outOfScope === true,
                },
            };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to get answer' };
            next();
        }
    }

    /** POST /study-help/conversation/history */
    async getHistory(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { session_id } = req.body || {};

            if (!userId || !session_id) {
                res.locals.responseData = { success: false, status: 400, message: 'session_id is required' };
                return next();
            }

            const out = await fetchData(
                'tblConceptSession',
                { conversation: 1, topic: 1, week: 1, day: 1, status: 1, created_at: 1 },
                { _id: /^[0-9a-fA-F]{24}$/.test(session_id) ? new ObjectId(session_id) : session_id, student_id: userId.toString() },
                { limit: 1 }
            );

            const s = out?.data?.[0];
            if (!s) {
                res.locals.responseData = { success: false, status: 404, message: 'Session not found' };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                data: {
                    conversation: Array.isArray(s.conversation) ? s.conversation : [],
                    topic: s.topic,
                    week: s.week,
                    day: s.day,
                    status: s.status,
                    created_at: s.created_at,
                },
            };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to get history' };
            next();
        }
    }

    /** POST /study-help/conversation/list */
    async listSessions(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();

            if (!userId) {
                res.locals.responseData = { success: false, status: 401, message: 'Authentication required' };
                return next();
            }

            const out = await fetchData(
                'tblConceptSession',
                { _id: 1, topic: 1, week: 1, day: 1, status: 1, created_at: 1, updated_at: 1 },
                { student_id: userId.toString() },
                { sort: { updated_at: -1 }, limit: 50 }
            );

            const list = (out?.data || []).map((s) => ({
                session_id: s._id?.toString?.(),
                topic: s.topic,
                week: s.week,
                day: s.day,
                status: s.status,
                created_at: s.created_at,
                updated_at: s.updated_at,
            }));

            res.locals.responseData = { success: true, status: 200, data: { sessions: list } };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to list sessions' };
            next();
        }
    }

    /** POST /study-help/generate-check */
    async generateCheck(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { session_id } = req.body || {};

            if (!userId || !session_id) {
                res.locals.responseData = { success: false, status: 400, message: 'session_id is required' };
                return next();
            }

            const db = getDB();
            const coll = db.collection('tblConceptSession');
            const sid = /^[0-9a-fA-F]{24}$/.test(session_id) ? new ObjectId(session_id) : session_id;

            const session = await coll.findOne({ _id: sid, student_id: userId.toString() });
            if (!session) {
                res.locals.responseData = { success: false, status: 404, message: 'Session not found' };
                return next();
            }
            if (session.status === 'practice_generated') {
                res.locals.responseData = { success: false, status: 400, message: 'A Quick check was already created for this session' };
                return next();
            }

            const history = Array.isArray(session.conversation) ? session.conversation : [];
            const topic = session.topic || 'what you learned';
            let qs = await aiService.generateQuestionsFromConversation(history, topic);
            if ((qs || []).length < 20) {
                const need = 20 - (qs || []).length;
                const more = await aiService.generateMoreConceptQuestions(topic, need);
                qs = [...(qs || []), ...(more || [])];
            }

            const title = `Quick check: ${topic}`;
            const checkDoc = {
                student_id: userId.toString(),
                source_session_id: session_id,
                title,
                topic: session.topic || null,
                questions: (qs || []).slice(0, 25).map((q) => ({
                    question: stripAsterisks(q.question || ''),
                    options: (Array.isArray(q.options) ? q.options : (q.options ? [q.options] : [])).map((o) => stripAsterisks(String(o))),
                    correct_answer: stripAsterisks(String(q.correct_answer || q.correctAnswer || (q.options && q.options[0]) || '')),
                    explanation: stripAsterisks(q.explanation || ''),
                })),
                status: 'available',
            };

            const ins = await executeData('tblConceptCheck', checkDoc, 'i', conceptCheckSchema);
            const checkId = ins?.data?.insertedId?.toString?.() || ins?.data?._id?.toString?.();

            await coll.updateOne(
                { _id: sid, student_id: userId.toString() },
                { $set: { status: 'practice_generated', updated_at: new Date().toISOString() } }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Quick check created',
                data: {
                    concept_check_id: checkId,
                    title: checkDoc.title,
                    questions_count: (checkDoc.questions || []).length,
                },
            };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to create Quick check' };
            next();
        }
    }

    /** POST /study-help/check/list */
    async listChecks(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();

            if (!userId) {
                res.locals.responseData = { success: false, status: 401, message: 'Authentication required' };
                return next();
            }

            const out = await fetchData(
                'tblConceptCheck',
                { _id: 1, title: 1, topic: 1, status: 1, created_at: 1 },
                { student_id: userId.toString() },
                { sort: { created_at: -1 }, limit: 50 }
            );

            const list = (out?.data || []).map((c) => ({
                concept_check_id: c._id?.toString?.(),
                title: c.title,
                topic: c.topic,
                status: c.status,
                created_at: c.created_at,
            }));

            res.locals.responseData = { success: true, status: 200, data: { checks: list } };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to list Quick checks' };
            next();
        }
    }

    /** POST /study-help/check/get */
    async getCheck(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { concept_check_id } = req.body || {};

            if (!userId || !concept_check_id) {
                res.locals.responseData = { success: false, status: 400, message: 'concept_check_id is required' };
                return next();
            }

            const cid = /^[0-9a-fA-F]{24}$/.test(concept_check_id) ? new ObjectId(concept_check_id) : concept_check_id;
            const out = await fetchData(
                'tblConceptCheck',
                {},
                { _id: cid, student_id: userId.toString() },
                { limit: 1 }
            );

            const c = out?.data?.[0];
            if (!c) {
                res.locals.responseData = { success: false, status: 404, message: 'Quick check not found' };
                return next();
            }

            // Return questions without correct_answer and explanation for taking the test (strip asterisks for display)
            const forAttempt = (c.questions || []).map((q) => ({
                question: stripAsterisks(q.question || ''),
                options: (q.options || []).map((o) => stripAsterisks(String(o))),
            }));

            res.locals.responseData = {
                success: true,
                status: 200,
                data: {
                    concept_check_id: c._id?.toString?.(),
                    title: c.title,
                    topic: c.topic,
                    status: c.status,
                    questions: forAttempt,
                },
            };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to get Quick check' };
            next();
        }
    }

    /** POST /study-help/check/submit */
    async submitAttempt(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { concept_check_id, answers, time_spent } = req.body || {};

            if (!userId || !concept_check_id || !Array.isArray(answers)) {
                res.locals.responseData = { success: false, status: 400, message: 'concept_check_id and answers[] are required' };
                return next();
            }

            const cid = /^[0-9a-fA-F]{24}$/.test(concept_check_id) ? new ObjectId(concept_check_id) : concept_check_id;
            const check = await getDB().collection('tblConceptCheck').findOne({ _id: cid, student_id: userId.toString() });

            if (!check) {
                res.locals.responseData = { success: false, status: 404, message: 'Quick check not found' };
                return next();
            }

            const qs = check.questions || [];
            let correct = 0;
            const result = answers.map((a, i) => {
                const q = qs[i];
                const ca = q?.correct_answer;
                const ok = ca != null && String(a?.selected_answer || a).trim() === String(ca).trim();
                if (ok) correct++;
                return {
                    question_index: i,
                    selected_answer: a?.selected_answer ?? a,
                    correct_answer: ca,
                    is_correct: ok,
                };
            });

            const total = qs.length;
            const score = total > 0 ? Math.round((correct / total) * 100) : 0;

            const attemptDoc = {
                student_id: userId.toString(),
                concept_check_id: concept_check_id,
                score,
                total_questions: total,
                correct_answers: correct,
                incorrect_answers: total - correct,
                answers: result,
                time_spent: typeof time_spent === 'number' ? time_spent : 0,
                completed_at: new Date(),
            };

            await executeData('tblConceptCheckAttempt', attemptDoc, 'i', conceptCheckAttemptSchema);

            await getDB().collection('tblConceptCheck').updateOne(
                { _id: cid, student_id: userId.toString() },
                { $set: { status: 'attempted' } }
            );

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Attempt saved',
                data: {
                    score,
                    total_questions: total,
                    correct_answers: correct,
                    incorrect_answers: total - correct,
                    results: result,
                },
            };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to submit attempt' };
            next();
        }
    }

    /** POST /study-help/check/result – get questions with explanations after submit */
    async getCheckResult(req, res, next) {
        try {
            const userId = req.userId || req.user?.id || req.user?.person_id?.toString?.() || req.user?.userId?.toString?.();
            const { concept_check_id } = req.body || {};

            if (!userId || !concept_check_id) {
                res.locals.responseData = { success: false, status: 400, message: 'concept_check_id is required' };
                return next();
            }

            const cid = /^[0-9a-fA-F]{24}$/.test(concept_check_id) ? new ObjectId(concept_check_id) : concept_check_id;
            const out = await fetchData('tblConceptCheck', {}, { _id: cid, student_id: userId.toString() }, { limit: 1 });
            const c = out?.data?.[0];
            if (!c) {
                res.locals.responseData = { success: false, status: 404, message: 'Quick check not found' };
                return next();
            }

            const attempts = await fetchData(
                'tblConceptCheckAttempt',
                {},
                { concept_check_id, student_id: userId.toString() },
                { sort: { completed_at: -1 }, limit: 1 }
            );
            const last = attempts?.data?.[0];

            res.locals.responseData = {
                success: true,
                status: 200,
                data: {
                    title: c.title,
                    questions: (c.questions || []).map((q, i) => ({
                        question: stripAsterisks(q.question || ''),
                        options: (q.options || []).map((o) => stripAsterisks(String(o))),
                        correct_answer: stripAsterisks(String(q.correct_answer || '')),
                        explanation: stripAsterisks(q.explanation || ''),
                        your_answer: stripAsterisks(String(last?.answers?.[i]?.selected_answer ?? '')),
                        is_correct: last?.answers?.[i]?.is_correct,
                    })),
                    last_attempt: last ? {
                        score: last.score,
                        correct_answers: last.correct_answers,
                        total_questions: last.total_questions,
                        completed_at: last.completed_at,
                    } : null,
                },
            };
            next();
        } catch (e) {
            res.locals.responseData = { success: false, status: 500, message: e.message || 'Failed to get result' };
            next();
        }
    }
}
