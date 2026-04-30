/**
 * AI Service Layer
 * Uses Anthropic Claude (claude-sonnet-4-6) as the primary AI provider.
 *
 * This service handles:
 * - Code review and feedback
 * - AI tutor with hints
 * - Personalized learning paths
 * - Question generation
 * - Performance analysis
 * - Scope restrictions
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

class AIService {
    constructor() {
        // Initialize cache for AI responses
        this.cache = new Map();

        this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;

        /**
         * Model: claude-sonnet-4-6
         * Switch to 'claude-opus-4-6' for the most capable model.
         */
        this.modelName = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

        if (this.anthropicApiKey) {
            this.client = new Anthropic({ apiKey: this.anthropicApiKey });
            console.log(`[AIService] Initialized with model: ${this.modelName}`);
        } else {
            console.warn('[AIService] ANTHROPIC_API_KEY not found. AI features will not work.');
        }

        // Scope restrictions - only these topics are allowed
        this.allowedTopics = [
            'C Programming', 'C++ Programming', 'JavaScript',
            'Data Types', 'Variables', 'Operators', 'Decision Making',
            'Loops', 'Arrays', 'Functions', 'Input/Output',
            'DSA Basics', 'Programming Fundamentals'
        ];
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /**
     * Core method: send a prompt to Claude and get back the response text.
     * @param {string} systemPrompt
     * @param {string} userPrompt
     * @param {number} maxTokens
     * @returns {Promise<string>}
     */
    async _callClaude(systemPrompt, userPrompt, maxTokens = 2048) {
        if (!this.client) throw new Error('Anthropic client not initialized. Check ANTHROPIC_API_KEY.');

        const message = await this.client.messages.create({
            model: this.modelName,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt }
            ]
        });

        // message.content is an array of content blocks; grab all text blocks
        return message.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('');
    }

    // ─── Cache helpers ────────────────────────────────────────────────────────

    getCached(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    setCached(key, value, ttlSeconds = 600) {
        this.cache.set(key, {
            value,
            expires: Date.now() + ttlSeconds * 1000
        });
        if (this.cache.size > 1000) {
            const now = Date.now();
            for (const [k, v] of this.cache.entries()) {
                if (now > v.expires) this.cache.delete(k);
            }
        }
    }

    generateCacheKey(prefix, data) {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `${prefix}:${hash}`;
    }

    // ─── Text sanitization ────────────────────────────────────────────────────

    stripMarkdownAsterisks(text) {
        if (typeof text !== 'string') return text;
        return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    }

    sanitizePlainText(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const out = Array.isArray(obj) ? [] : {};
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string') out[k] = this.stripMarkdownAsterisks(v);
            else if (Array.isArray(v)) out[k] = v.map(item => typeof item === 'string' ? this.stripMarkdownAsterisks(item) : item);
            else out[k] = v;
        }
        return out;
    }

    // ─── Scope checks ─────────────────────────────────────────────────────────

    isWithinScope(userQuery) {
        const queryLower = userQuery.toLowerCase();
        const scopeKeywords = [
            'c programming', 'c++', 'javascript', 'js',
            'data types', 'variables', 'operators', 'loops',
            'arrays', 'functions', 'input output', 'io',
            'dsa', 'data structures', 'algorithms basics',
            'programming', 'code', 'coding', 'syntax'
        ];
        return scopeKeywords.some(keyword => queryLower.includes(keyword));
    }

    isWithinScopeStudyHelp(userQuery) {
        const q = userQuery.toLowerCase();
        const k = [
            'c programming', 'c++', 'javascript', 'data types', 'variables', 'operators',
            'loops', 'arrays', 'functions', 'dsa', 'programming', 'code', 'syntax',
            'integer', 'factor', 'divisibility', 'hcf', 'lcm', 'bodmas', 'aptitude',
            'quantitative', 'number', 'percentage', 'ratio', 'equation', 'algebra',
            'multiplication', 'division', 'addition', 'subtraction', 'math', 'solve'
        ];
        return k.some(kw => q.includes(kw)) || q.length > 10;
    }

    // ─── System prompt ────────────────────────────────────────────────────────

    getSystemPrompt(context = 'general') {
        return `You are an AI tutor for a college-level programming learning platform.
Your role is to help students learn C, C++, and JavaScript programming fundamentals.

IMPORTANT RULES:
1. ONLY answer questions related to: C Programming, C++ Programming, JavaScript, Data Types, Variables, Operators, Loops, Arrays, Functions, Input/Output, and DSA basics.
2. If asked about topics outside this scope, politely decline and redirect to project topics.
3. Never provide complete solutions - guide students to learn.
4. Be encouraging and educational.
5. Explain concepts clearly with examples.
6. Focus on fundamentals and best practices.

Context: ${context}`;
    }

    // ─── Code Review ──────────────────────────────────────────────────────────

    async reviewCode(code, language, problemContext = null) {
        const cacheKey = this.generateCacheKey('code_review', { code, language, problemContext });
        const cached = this.getCached(cacheKey);
        if (cached) {
            console.log('[AIService] Returning cached code review');
            return cached;
        }

        try {
            const result = await this._reviewCode(code, language, problemContext);
            this.setCached(cacheKey, result, 1800);
            return result;
        } catch (error) {
            console.error('AI Code Review Error:', error);
            throw new Error('Failed to review code. Please try again.');
        }
    }

    async _reviewCode(code, language, problemContext) {
        const contextBlock = problemContext ? `\n\nProblem Context:\n${problemContext}\n` : '';
        const userPrompt = `${contextBlock}
Code to review:
\`\`\`${language}
${code}
\`\`\`

Analyze:
1. Correctness - Does it work?
2. Code Quality - Is it clean, readable, maintainable?
3. Best Practices - Does it follow language conventions?
4. Efficiency - Can it be optimized?
5. Learning Points - What concepts does this demonstrate?

Focus on: what could be done in a better way, and which way is the ideal or perfect way to write this code.

Format your response as:
- Strengths: [what's good]
- What could be better: [improvements and better approaches]
- Ideal / best way to write this code: [recommended approach or pattern]
- Suggestions: [how to improve]
- Learning: [key concepts to understand]`;

        return this._callClaude(this.getSystemPrompt('code-review'), userPrompt, 2048);
    }

    // ─── AI Tutor Hints ───────────────────────────────────────────────────────

    async getHint(problemDescription, studentCode, language, hintNumber, previousHints = []) {
        try {
            if (hintNumber > 3) {
                return {
                    hint: "You've used all 3 hints. Try to solve it step by step. Review the problem requirements and your code logic.",
                    isFinal: true
                };
            }
            return await this._getHint(problemDescription, studentCode, language, hintNumber, previousHints);
        } catch (error) {
            console.error('AI Tutor Hint Error:', error);
            throw new Error('Failed to get hint. Please try again.');
        }
    }

    async _getHint(problemDescription, studentCode, language, hintNumber, previousHints) {
        const previousHintsText = previousHints.length > 0
            ? `Previous hints given:\n${previousHints.map((h, i) => `Hint ${i + 1}: ${h}`).join('\n')}`
            : 'No previous hints given.';

        const lengthConstraints = {
            1: '1-2 sentences, very subtle hint',
            2: '2-3 sentences, more direct hint',
            3: '3-4 sentences, most helpful hint (but still not the answer)'
        };

        const userPrompt = `Problem:
${problemDescription}

Student's Current Code:
\`\`\`${language}
${studentCode || 'No code written yet'}
\`\`\`

${previousHintsText}

CRITICAL INSTRUCTIONS FOR HINT #${hintNumber}:
- This is a HINT, not an explanation or tutorial
- Maximum length: ${lengthConstraints[hintNumber]}
- DO NOT explain concepts in detail
- DO NOT provide examples unless absolutely necessary
- DO NOT use phrases like "That's an excellent question" or "When you think about"
- DO NOT give a lecture - just a brief nudge
- Point to the key concept or approach needed
- Make it progressively more helpful (hint 1 is subtle, hint 3 is more direct)
- Never give the complete answer or solution
- Be direct and concise

Your response should be ONLY the hint text. Start directly with the hint, no introductory phrases.`;

        let hintText = (await this._callClaude(this.getSystemPrompt('ai-tutor'), userPrompt, 256)).trim();

        // Remove verbose openings
        const verboseOpenings = [
            "That's an excellent question",
            "That's a great question",
            "When you think about",
            "Let me help you understand",
            "I'd encourage you to",
            "To get a helpful hint"
        ];
        for (const opening of verboseOpenings) {
            if (hintText.toLowerCase().startsWith(opening.toLowerCase())) {
                const sentences = hintText.split(/[.!?]+/);
                if (sentences.length > 1) {
                    hintText = sentences.slice(1).join('.').trim();
                    if (hintText && !hintText.endsWith('.')) hintText += '.';
                }
            }
        }

        const maxWords = hintNumber === 1 ? 30 : hintNumber === 2 ? 50 : 80;
        const words = hintText.split(/\s+/);
        if (words.length > maxWords) {
            hintText = words.slice(0, maxWords).join(' ') + '...';
        }

        return { hint: hintText, hintNumber, isFinal: hintNumber >= 3 };
    }

    // ─── Learning Path ────────────────────────────────────────────────────────

    async generateLearningPath(studentPerformance) {
        const cacheKey = this.generateCacheKey('learning_path', studentPerformance);
        const cached = this.getCached(cacheKey);
        if (cached) {
            console.log('[AIService] Returning cached learning path');
            return cached;
        }

        try {
            const result = await this._generateLearningPath(studentPerformance);
            this.setCached(cacheKey, result, 1800);
            return result;
        } catch (error) {
            console.error('AI Learning Path Error:', error);
            const errorMessage = error.message || 'Failed to generate learning path.';
            if (errorMessage.includes('429') || errorMessage.includes('rate_limit')) {
                throw new Error('AI Service Rate Limit Exceeded. Please try again later.');
            }
            throw new Error(`AI Error: ${errorMessage}`);
        }
    }

    async _generateLearningPath(studentPerformance) {
        const { analyticsContext, ...dataForPrompt } = studentPerformance;
        const contextBlock = analyticsContext
            ? `\n\nDashboard summary:\n${JSON.stringify(analyticsContext, null, 2)}\n\n`
            : '';

        const userPrompt = `Student Performance Data:
${JSON.stringify(dataForPrompt, null, 2)}${contextBlock}

Based on this performance, generate a personalized learning path:
1. Identify weak areas (topics with <80% score after 3 attempts)
2. Suggest specific days/topics to revisit
3. Recommend practice questions focus areas
4. Provide study schedule suggestions
5. Give encouragement and motivation

IMPORTANT: Use plain text only. Do NOT use asterisks (*) or ** for bold. No markdown formatting.

Format as JSON:
{
  "weakAreas": ["topic1", "topic2"],
  "recommendedDays": ["day-1", "day-2"],
  "focusAreas": ["arrays", "functions"],
  "studyPlan": "suggested study approach",
  "motivation": "encouraging message"
}`;

        const text = await this._callClaude(this.getSystemPrompt('personalized-learning'), userPrompt, 1024);
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) return this.sanitizePlainText(JSON.parse(jsonMatch[0]));
            return { analysis: this.stripMarkdownAsterisks(text) };
        } catch {
            return { analysis: this.stripMarkdownAsterisks(text) };
        }
    }

    // ─── Question Generation ──────────────────────────────────────────────────

    async generateQuestions(topic, difficulty, count = 5) {
        try {
            if (!this.isWithinScope(topic)) {
                throw new Error('Topic is outside project scope. Please focus on C, C++, JavaScript fundamentals.');
            }
            return await this._generateQuestions(topic, difficulty, count);
        } catch (error) {
            console.error('AI Question Generation Error:', error);
            throw error;
        }
    }

    async _generateQuestions(topic, difficulty, count) {
        const userPrompt = `Generate ${count} ${difficulty} level multiple-choice questions about: ${topic}

Requirements:
- Each question should have 4 options (A, B, C, D)
- Only one correct answer
- Include detailed explanation
- Focus on practical understanding
- Make questions educational and clear

Format as JSON array:
[
  {
    "question": "question text",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "detailed explanation"
  }
]`;

        const text = await this._callClaude(this.getSystemPrompt('question-generation'), userPrompt, 2048);
        try {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            throw new Error('Failed to parse questions');
        } catch {
            throw new Error('Failed to generate questions in correct format.');
        }
    }

    // ─── Test Question Generation (TPC) ───────────────────────────────────────

    async generateTestQuestions(module, topic, difficulty, count = 10) {
        return await this._generateTestQuestions(module, topic, difficulty, count);
    }

    async _generateTestQuestions(module, topic, difficulty, count) {
        try {
            const systemPrompt = `You are an expert ${module} educator creating practice test questions.

STRICT RULES:
1. Generate EXACTLY ${count} multiple-choice questions
2. Each question must have EXACTLY 4 options
3. Mark the correct answer clearly (0-3 index)
4. Questions must be relevant to: "${topic}"
5. Difficulty level: ${difficulty}
6. Module: ${module}
7. Response MUST be valid JSON array, no markdown, no extra text
8. Each question must have: text, options (array of 4 strings), correct_option (0-3), marks (default 1)

${difficulty === 'Mixed' ? 'Include a mix of Easy, Medium, and Hard questions.' : `All questions should be ${difficulty} level.`}

${module === 'DSA'
    ? 'Focus on conceptual understanding, algorithm analysis, time/space complexity, data structures, and problem-solving strategies.'
    : 'Focus on logical reasoning, quantitative aptitude, verbal ability, or data interpretation as relevant to the topic.'
}

EXAMPLE OUTPUT FORMAT:
[
  {
    "text": "What is the time complexity of binary search in a sorted array?",
    "options": ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
    "correct_option": 1,
    "marks": 1
  }
]

Return ONLY the JSON array, nothing else.`;

            const userPrompt = `Generate ${count} high-quality ${difficulty} level questions on "${topic}" for ${module} module now.`;

            let text = (await this._callClaude(systemPrompt, userPrompt, 4096)).trim();

            // Strip markdown fences if present
            text = text.replace(/^```json\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/, '');

            const questions = JSON.parse(text);
            if (!Array.isArray(questions)) throw new Error('AI response is not an array');

            const validatedQuestions = questions.map((q, idx) => {
                if (!q.text || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correct_option !== 'number') {
                    console.warn(`[AI] Invalid question at index ${idx}, skipping:`, q);
                    return null;
                }
                return {
                    text: q.text.trim(),
                    options: q.options.map(opt => String(opt).trim()),
                    correct_option: q.correct_option,
                    marks: q.marks || 1
                };
            }).filter(q => q !== null);

            console.log(`[AI] Generated ${validatedQuestions.length}/${count} valid questions for ${module} - ${topic} (${difficulty})`);

            if (validatedQuestions.length === 0) throw new Error('No valid questions generated');
            return validatedQuestions;
        } catch (error) {
            console.error('[AI] Test Generation Error:', error);
            throw error;
        }
    }

    // ─── Performance Analysis ─────────────────────────────────────────────────

    async analyzePerformance(studentData) {
        const cacheKey = this.generateCacheKey('perf_analysis', studentData);
        const cached = this.getCached(cacheKey);
        if (cached) {
            console.log('[AIService] Returning cached performance analysis');
            return cached;
        }

        try {
            const result = await this._analyzePerformance(studentData);
            this.setCached(cacheKey, result, 600);
            return result;
        } catch (error) {
            console.error('AI Performance Analysis Error:', error);
            throw new Error('Failed to analyze performance.');
        }
    }

    async _analyzePerformance(studentData) {
        const { analyticsContext, ...dataForPrompt } = studentData;
        const contextBlock = analyticsContext
            ? `\n\nDashboard summary:\n${JSON.stringify(analyticsContext, null, 2)}\n\n`
            : '';

        const userPrompt = `Student Performance Data:
${JSON.stringify(dataForPrompt, null, 2)}${contextBlock}

Analyze the data carefully. Note that "dsa" and "aptitude" have separate "dailyPractice" and "weeklyTest" sections.

Instructions:
1. Check for Partial Data: If the student has progress in ONE area but not others, acknowledge the progress.
2. Specific Feedback based on actual scores.
3. Distinguish between Daily Practice and Weekly Tests.

IMPORTANT: Use plain text only. Do NOT use asterisks (*) or **. No markdown formatting.

Output Format (JSON):
{
  "overallScore": "percentage",
  "strongAreas": ["list of strong areas"],
  "weakAreas": ["specific weak areas"],
  "recommendations": ["actionable steps"],
  "feedback": "Encouraging summary."
}`;

        const text = await this._callClaude(this.getSystemPrompt('performance-analysis'), userPrompt, 1024);
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) return this.sanitizePlainText(JSON.parse(jsonMatch[0]));
            return { analysis: this.stripMarkdownAsterisks(text) };
        } catch {
            return { analysis: this.stripMarkdownAsterisks(text) };
        }
    }

    // ─── Answer Question ──────────────────────────────────────────────────────

    async answerQuestion(question, context = {}) {
        try {
            if (!this.isWithinScope(question)) {
                return {
                    answer: "I can only help with topics related to C Programming, C++ Programming, JavaScript, Data Types, Variables, Operators, Loops, Arrays, Functions, and DSA basics. Please ask questions related to these topics.",
                    outOfScope: true
                };
            }

            const contextText = context.currentDay
                ? `Student is currently studying: ${context.currentDay}`
                : '';

            const userPrompt = `${contextText}

Student Question: ${question}

Provide a clear, educational answer:
- Explain the concept
- Give examples if relevant
- Guide them to understand, don't just give answers
- Keep it concise but thorough`;

            const answer = await this._callClaude(this.getSystemPrompt('question-answering'), userPrompt, 1024);
            return { answer, outOfScope: false };
        } catch (error) {
            console.error('AI Question Answering Error:', error);
            throw new Error('Failed to answer question.');
        }
    }

    async answerQuestionWithHistory(question, context = {}, conversationHistory = []) {
        try {
            if (!this.isWithinScopeStudyHelp(question)) {
                return {
                    answer: "I can help with programming (C, C++, JavaScript, DSA), quantitative aptitude (numbers, factors, HCF, LCM, BODMAS), and related basics. Ask about something you're learning in your course.",
                    outOfScope: true
                };
            }
            if (!this.client) throw new Error('Anthropic client not available.');

            const ctx = [
                context.week && `Week: ${context.week}`,
                context.day && `Day: ${context.day}`,
                context.topic && `Topic: ${context.topic}`,
            ].filter(Boolean).join('; ') || 'General';

            // Build messages array with conversation history
            const messages = [];

            if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
                for (const turn of conversationHistory) {
                    messages.push({
                        role: turn.role === 'student' ? 'user' : 'assistant',
                        content: (turn.content || '').slice(0, 800)
                    });
                }
            }

            messages.push({ role: 'user', content: question });

            const systemPrompt = `${this.getSystemPrompt('question-answering')}

Context: ${ctx}

Provide a clear, step-by-step explanation. If they seem stuck, break it down further. Keep the answer focused.
Do NOT use asterisks (*) or double asterisks (**) for formatting; write in plain text only.`;

            const message = await this.client.messages.create({
                model: this.modelName,
                max_tokens: 1024,
                system: systemPrompt,
                messages
            });

            const answer = message.content
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('');

            return { answer, outOfScope: false };
        } catch (e) {
            console.error('answerQuestionWithHistory:', e);
            throw e;
        }
    }

    // ─── Quiz from Conversation ───────────────────────────────────────────────

    async generateQuestionsFromConversation(conversation, topicLabel = 'what you learned') {
        try {
            if (!this.client) throw new Error('Anthropic client not available.');

            const summary = Array.isArray(conversation) && conversation.length > 0
                ? conversation.map(t => `${t.role}: ${(t.content || '').slice(0, 600)}`).join('\n')
                : `Topic: ${topicLabel}`;

            const userPrompt = `Create a quiz from this teaching conversation. You MUST generate at least 20 multiple-choice questions. If the conversation is short, create more questions on the same topics to reach 20.

Conversation or topic:
${summary.slice(0, 6000)}

Each question: "question" (string), "options" (array of exactly 4 strings), "correctAnswer" (exact full text of one of the 4 options), "explanation" (string).
Do NOT use asterisks (*) or ** in question, options, or explanation; use plain text only.
Output ONLY a JSON array, no other text. Example: [{"question":"...","options":["a","b","c","d"],"correctAnswer":"b","explanation":"..."}]`;

            const text = await this._callClaude(this.getSystemPrompt('question-generation'), userPrompt, 4096);
            const m = text.match(/\[[\s\S]*\]/);
            if (!m) throw new Error('Could not parse generated questions.');
            const arr = JSON.parse(m[0]);
            return (Array.isArray(arr) ? arr : []).slice(0, 25).map(q => ({
                question: q.question || '',
                options: q.options || [],
                correct_answer: q.correctAnswer ?? q.correct_answer,
                explanation: q.explanation || '',
            }));
        } catch (e) {
            console.error('generateQuestionsFromConversation:', e);
            throw e;
        }
    }

    async generateMoreConceptQuestions(topicLabel, count) {
        try {
            if (!this.client) throw new Error('Anthropic client not available.');
            const n = Math.max(1, Math.min(50, Math.ceil(Number(count) || 5)));

            const userPrompt = `Generate exactly ${n} multiple-choice questions on this topic: ${String(topicLabel || 'programming basics')}.

Each question: "question" (string), "options" (array of exactly 4 strings), "correctAnswer" (exact full text of one of the 4 options), "explanation" (string).
Do NOT use asterisks (*) or ** in question, options, or explanation; use plain text only.
Output ONLY a JSON array, no other text.`;

            const text = await this._callClaude(this.getSystemPrompt('question-generation'), userPrompt, 4096);
            const m = text.match(/\[[\s\S]*\]/);
            if (!m) return [];
            const arr = JSON.parse(m[0]);
            return (Array.isArray(arr) ? arr : []).slice(0, n).map(q => ({
                question: q.question || '',
                options: q.options || [],
                correct_answer: q.correctAnswer ?? q.correct_answer,
                explanation: q.explanation || '',
            }));
        } catch (e) {
            console.error('generateMoreConceptQuestions:', e);
            return [];
        }
    }

    // ─── Test Performance Analysis ────────────────────────────────────────────

    async analyzeTestPerformance(testData, previousTests = [], testType = 'practice') {
        try {
            if (!this.client) throw new Error('Anthropic client not available.');

            const { score, questions_attempted = [], week, day, time_spent } = testData;
            const totalQuestions = questions_attempted.length;
            const correctCount = questions_attempted.filter(q => q.is_correct).length;

            const topics = {};
            questions_attempted.forEach(q => {
                const topic = q.question_topic?.[0] || 'General';
                topics[topic] = topics[topic] || { correct: 0, total: 0 };
                topics[topic].total++;
                if (q.is_correct) topics[topic].correct++;
            });

            const topicPerformance = Object.entries(topics).map(([topic, stats]) => ({
                topic,
                accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
                correct: stats.correct,
                total: stats.total
            }));

            let comparison = null;
            if (previousTests.length > 0) {
                const prevScores = previousTests.map(t => t.score || 0);
                const avgPrevScore = prevScores.reduce((a, b) => a + b, 0) / prevScores.length;
                const lastScore = prevScores[prevScores.length - 1];
                const improvement = score - lastScore;
                comparison = {
                    previous_score: lastScore,
                    average_previous: Math.round(avgPrevScore),
                    improvement: Math.round(improvement),
                    trend: improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable'
                };
            }

            const userPrompt = `Test Details:
- Type: ${testType === 'practice' ? 'Daily Practice Test' : 'Weekly Test'}
- Week: ${week}${day ? `, Day: ${day}` : ''}
- Score: ${score}%
- Correct: ${correctCount}/${totalQuestions}
- Time spent: ${time_spent || 0} minutes

Topic Performance:
${topicPerformance.map(t => `- ${t.topic}: ${t.accuracy}% (${t.correct}/${t.total} correct)`).join('\n')}

${comparison ? `Previous Performance:
- Last attempt: ${comparison.previous_score}%
- Average: ${comparison.average_previous}%
- Change: ${comparison.improvement > 0 ? '+' : ''}${comparison.improvement}%
- Trend: ${comparison.trend}
` : 'This appears to be their first attempt.\n'}

Provide:
1. Learning patterns detected
2. Strengths
3. Weak areas
4. Personalized guidance (2-3 sentences)
5. Specific recommendations (3-5 steps)
6. Topics to revisit

Do NOT use asterisks (*) or **. Plain text only.

Output as JSON:
{
  "learning_patterns": ["pattern1"],
  "strengths": ["strength1"],
  "weak_areas": ["weakness1"],
  "guidance": "personalized message",
  "recommendations": ["rec1"],
  "topics_to_revisit": ["topic1"],
  "performance_trend": "${comparison?.trend || 'new'}"
}`;

            const systemPrompt = 'You are an AI learning coach analyzing a student\'s test performance. Provide personalized guidance based on their results.';
            const text = await this._callClaude(systemPrompt, userPrompt, 1024);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Could not parse AI analysis response.');

            const analysis = JSON.parse(jsonMatch[0]);
            return {
                learning_patterns: Array.isArray(analysis.learning_patterns) ? analysis.learning_patterns : [],
                strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
                weak_areas: Array.isArray(analysis.weak_areas) ? analysis.weak_areas : [],
                guidance: analysis.guidance || 'Keep practicing and reviewing the concepts.',
                recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
                topics_to_revisit: Array.isArray(analysis.topics_to_revisit) ? analysis.topics_to_revisit : [],
                performance_trend: analysis.performance_trend || comparison?.trend || 'new',
                comparison
            };
        } catch (e) {
            console.error('analyzeTestPerformance:', e);
            return {
                learning_patterns: [],
                strengths: score >= 70 ? ['Good understanding of basics'] : [],
                weak_areas: score < 70 ? ['Need more practice'] : [],
                guidance: score >= 80
                    ? 'Great job! You have a strong grasp of the concepts. Keep practicing to maintain this level.'
                    : score >= 60
                        ? 'You are making progress. Review the incorrect answers and practice similar problems to improve further.'
                        : "Don't worry, learning takes time. Review the study material again and practice more problems on the topics you found challenging.",
                recommendations: score < 70
                    ? ['Review the study material for this day/week', 'Practice similar problems', 'Focus on understanding the explanations']
                    : ['Continue practicing', 'Try more challenging problems'],
                topics_to_revisit: [],
                performance_trend: 'new',
                comparison: null
            };
        }
    }
}

// Export singleton instance
export default new AIService();