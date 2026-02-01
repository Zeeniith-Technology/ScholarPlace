/**
 * AI Service Layer
 * Abstracted AI service that supports Gemini Pro now, can easily switch to GPT-4 later
 * 
 * This service handles:
 * - Code review and feedback
 * - AI tutor with hints
 * - Personalized learning paths
 * - Question generation
 * - Performance analysis
 * - Scope restrictions
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class AIService {
    constructor() {
        // Gemini Pro Configuration
        this.provider = process.env.AI_PROVIDER || 'gemini'; // 'gemini' or 'openai'
        this.geminiApiKey = process.env.GEMINI_API_KEY;

        // Initialize Gemini if API key is available
        if (this.geminiApiKey && this.provider === 'gemini') {
            // Initialize Gemini SDK
            this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
            /**
             * Model notes:
             * - gemini-2.5-flash  (recommended - fast and free tier)
             * - gemini-2.5-pro    (more capable)
             * - gemini-2.0-flash  (alternative)
             */
            const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
            this.model = this.genAI.getGenerativeModel({ model: modelName });
            console.log(`[AIService] Initialized with model: ${modelName}`);
        } else {
            console.warn('[AIService] Gemini API key not found. AI features will not work.');
        }

        // Scope restrictions - only these topics are allowed
        this.allowedTopics = [
            'C Programming', 'C++ Programming', 'JavaScript',
            'Data Types', 'Variables', 'Operators', 'Decision Making',
            'Loops', 'Arrays', 'Functions', 'Input/Output',
            'DSA Basics', 'Programming Fundamentals'
        ];
    }

    /**
     * Strip markdown asterisks from text so UI shows plain text only
     */
    stripMarkdownAsterisks(text) {
        if (typeof text !== 'string') return text;
        return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    }

    /**
     * Sanitize analysis/learning-path object: strip ** and * from all string values
     */
    sanitizePlainText(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const out = Array.isArray(obj) ? [] : {};
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string') out[k] = this.stripMarkdownAsterisks(v);
            else if (Array.isArray(v)) out[k] = v.map((item) => typeof item === 'string' ? this.stripMarkdownAsterisks(item) : item);
            else out[k] = v;
        }
        return out;
    }

    /**
     * Check if query is within project scope
     */
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

    /**
     * Generate system prompt with scope restrictions
     */
    getSystemPrompt(context = 'general') {
        const basePrompt = `You are an AI tutor for a college-level programming learning platform. 
Your role is to help students learn C, C++, and JavaScript programming fundamentals.

IMPORTANT RULES:
1. ONLY answer questions related to: C Programming, C++ Programming, JavaScript, Data Types, Variables, Operators, Loops, Arrays, Functions, Input/Output, and DSA basics.
2. If asked about topics outside this scope, politely decline and redirect to project topics.
3. Never provide complete solutions - guide students to learn.
4. Be encouraging and educational.
5. Explain concepts clearly with examples.
6. Focus on fundamentals and best practices.

Context: ${context}`;

        return basePrompt;
    }

    /**
     * Code Review - Analyze student code and provide feedback
     */
    async reviewCode(code, language, problemContext) {
        try {
            if (this.provider === 'gemini') {
                return await this.reviewCodeGemini(code, language, problemContext);
            } else if (this.provider === 'openai') {
                return await this.reviewCodeOpenAI(code, language, problemContext);
            }
        } catch (error) {
            console.error('AI Code Review Error:', error);
            throw new Error('Failed to review code. Please try again.');
        }
    }

    async reviewCodeGemini(code, language, problemContext) {
        const prompt = `${this.getSystemPrompt('code-review')}

Review this ${language} code for the following problem:
${problemContext}

Student Code:
\`\`\`${language}
${code}
\`\`\`

Provide detailed feedback on:
1. Correctness - Does it solve the problem?
2. Code Quality - Is it readable and well-structured?
3. Best Practices - Are there better approaches?
4. Efficiency - Can it be optimized?
5. Learning Points - What concepts does this demonstrate?

Format your response as:
- Strengths: [what's good]
- Issues: [what needs improvement]
- Suggestions: [how to improve]
- Learning: [key concepts to understand]`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    /**
     * AI Tutor - Provide hints (max 3 per problem)
     */
    async getHint(problemDescription, studentCode, language, hintNumber, previousHints = []) {
        try {
            if (hintNumber > 3) {
                return {
                    hint: "You've used all 3 hints. Try to solve it step by step. Review the problem requirements and your code logic.",
                    isFinal: true
                };
            }

            if (this.provider === 'gemini') {
                return await this.getHintGemini(problemDescription, studentCode, language, hintNumber, previousHints);
            } else if (this.provider === 'openai') {
                return await this.getHintOpenAI(problemDescription, studentCode, language, hintNumber, previousHints);
            }
        } catch (error) {
            console.error('AI Tutor Hint Error:', error);
            throw new Error('Failed to get hint. Please try again.');
        }
    }

    async getHintGemini(problemDescription, studentCode, language, hintNumber, previousHints) {
        const previousHintsText = previousHints.length > 0
            ? `Previous hints given:\n${previousHints.map((h, i) => `Hint ${i + 1}: ${h}`).join('\n')}`
            : 'No previous hints given.';

        // Define length constraints based on hint number
        const lengthConstraints = {
            1: '1-2 sentences, very subtle hint',
            2: '2-3 sentences, more direct hint',
            3: '3-4 sentences, most helpful hint (but still not the answer)'
        };

        const prompt = `${this.getSystemPrompt('ai-tutor')}

Problem:
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
- Be direct and concise - get straight to the point

Example of a GOOD hint: "Think about how C handles multi-dimensional data structures. What do you call an array where each element is itself an array?"

Example of a BAD hint: "That's an excellent question that gets into how we can organize data structures in C! When you think about an 'array of arrays,' you're essentially imagining..." (TOO LONG, TOO VERBOSE)

Your response should be ONLY the hint text, ${lengthConstraints[hintNumber]}. Start directly with the hint, no introductory phrases.`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;

        // Post-process to ensure conciseness
        let hintText = response.text().trim();

        // Remove common verbose openings
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
                // Find the first sentence after the opening
                const sentences = hintText.split(/[.!?]+/);
                if (sentences.length > 1) {
                    hintText = sentences.slice(1).join('.').trim();
                    if (hintText && !hintText.endsWith('.')) hintText += '.';
                }
            }
        }

        // Limit to reasonable length (max 200 words for hint 3, 100 for hint 1)
        const maxWords = hintNumber === 1 ? 30 : hintNumber === 2 ? 50 : 80;
        const words = hintText.split(/\s+/);
        if (words.length > maxWords) {
            hintText = words.slice(0, maxWords).join(' ') + '...';
        }

        return {
            hint: hintText,
            hintNumber: hintNumber,
            isFinal: hintNumber >= 3
        };
    }

    /**
     * Generate Personalized Learning Path
     */
    async generateLearningPath(studentPerformance) {
        try {
            if (this.provider === 'gemini') {
                return await this.generateLearningPathGemini(studentPerformance);
            } else if (this.provider === 'openai') {
                return await this.generateLearningPathOpenAI(studentPerformance);
            }
        } catch (error) {
            console.error('AI Learning Path Error:', error);
            throw new Error('Failed to generate learning path.');
        }
    }

    async generateLearningPathGemini(studentPerformance) {
        const { analyticsContext, ...dataForPrompt } = studentPerformance;
        const contextBlock = analyticsContext
            ? `\n\nDashboard summary (overall scores, subject performance, weekly trend - use to tailor the path):\n${JSON.stringify(analyticsContext, null, 2)}\n\n`
            : '';
        const prompt = `${this.getSystemPrompt('personalized-learning')}

Student Performance Data:
${JSON.stringify(dataForPrompt, null, 2)}${contextBlock}

Based on this performance, generate a personalized learning path:
1. Identify weak areas (topics with <80% score after 3 attempts)
2. Suggest specific days/topics to revisit
3. Recommend practice questions focus areas
4. Provide study schedule suggestions
5. Give encouragement and motivation

IMPORTANT: Use plain text only. Do NOT use asterisks (*) or ** for bold. No markdown formatting in weakAreas, recommendedDays, focusAreas, studyPlan, or motivation. Write in plain sentences.

Format as JSON:
{
  "weakAreas": ["topic1", "topic2"],
  "recommendedDays": ["day-1", "day-2"],
  "focusAreas": ["arrays", "functions"],
  "studyPlan": "suggested study approach",
  "motivation": "encouraging message"
}`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;

        try {
            // Try to parse JSON response
            const text = response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return this.sanitizePlainText(parsed);
            }
            return { analysis: this.stripMarkdownAsterisks(text) };
        } catch (parseError) {
            return { analysis: this.stripMarkdownAsterisks(response.text()) };
        }
    }

    /**
     * Generate Questions for Student
     */
    async generateQuestions(topic, difficulty, count = 5) {
        try {
            // Check scope
            if (!this.isWithinScope(topic)) {
                throw new Error('Topic is outside project scope. Please focus on C, C++, JavaScript fundamentals.');
            }

            if (this.provider === 'gemini') {
                return await this.generateQuestionsGemini(topic, difficulty, count);
            } else if (this.provider === 'openai') {
                return await this.generateQuestionsOpenAI(topic, difficulty, count);
            }
        } catch (error) {
            console.error('AI Question Generation Error:', error);
            throw error;
        }
    }

    async generateQuestionsGemini(topic, difficulty, count) {
        const prompt = `${this.getSystemPrompt('question-generation')}

Generate ${count} ${difficulty} level multiple-choice questions about: ${topic}

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

        const result = await this.model.generateContent(prompt);
        const response = await result.response;

        try {
            const text = response.text();
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Failed to parse questions');
        } catch (parseError) {
            throw new Error('Failed to generate questions in correct format.');
        }
    }

    /**
     * Analyze Performance and Provide Feedback
     */
    async analyzePerformance(studentData) {
        try {
            if (this.provider === 'gemini') {
                return await this.analyzePerformanceGemini(studentData);
            } else if (this.provider === 'openai') {
                return await this.analyzePerformanceOpenAI(studentData);
            }
        } catch (error) {
            console.error('AI Performance Analysis Error:', error);
            throw new Error('Failed to analyze performance.');
        }
    }

    async analyzePerformanceGemini(studentData) {
        const { analyticsContext, ...dataForPrompt } = studentData;
        const contextBlock = analyticsContext
            ? `\n\nDashboard summary (use to enrich your feedback - overall scores, subject breakdown, weekly trend):\n${JSON.stringify(analyticsContext, null, 2)}\n\n`
            : '';
        const prompt = `${this.getSystemPrompt('performance-analysis')}

Student Performance Data:
${JSON.stringify(dataForPrompt, null, 2)}${contextBlock}

Analyze the data carefully. Note that "dsa" and "aptitude" have separate "dailyPractice" and "weeklyTest" sections.

Instructions:
1. **Check for Partial Data**: If the student has progress in ONE area (e.g., DSA Daily) but not others, acknowledge the progress. DO NOT say "No data/activity" if *any* section has data.
2. **Specific Feedback**: 
   - If 'dsa.dailyPractice.score' > 0, praise their coding practice.
   - If 'aptitude.dailyPractice' is empty, encourage them to start aptitude.
   - distinguishable between 'Daily Practice' and 'Weekly Tests'.
3. **Strong/Weak Areas**: Base these strictly on the provided scores.

IMPORTANT: Use plain text only. Do NOT use asterisks (*) or ** for bold. No markdown formatting in overallScore, strongAreas, weakAreas, recommendations, or feedback. Write in plain sentences.

Output Format (JSON):
{
  "overallScore": "percentage (average of available scores)",
  "strongAreas": ["list of areas with good progress"],
  "weakAreas": ["specific areas with low/no progress"],
  "recommendations": ["actionable steps based on missing items"],
  "feedback": "Encouraging summary acknowledging what they HAVE done."
}`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;

        try {
            const text = response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return this.sanitizePlainText(parsed);
            }
            return { analysis: this.stripMarkdownAsterisks(response.text()) };
        } catch (parseError) {
            return { analysis: this.stripMarkdownAsterisks(response.text()) };
        }
    }

    /**
     * Answer Student Question (with scope check)
     */
    async answerQuestion(question, context = {}) {
        try {
            // Check if question is within scope
            if (!this.isWithinScope(question)) {
                return {
                    answer: "I can only help with topics related to C Programming, C++ Programming, JavaScript, Data Types, Variables, Operators, Loops, Arrays, Functions, and DSA basics. Please ask questions related to these topics.",
                    outOfScope: true
                };
            }

            if (this.provider === 'gemini') {
                return await this.answerQuestionGemini(question, context);
            } else if (this.provider === 'openai') {
                return await this.answerQuestionOpenAI(question, context);
            }
        } catch (error) {
            console.error('AI Question Answering Error:', error);
            throw new Error('Failed to answer question.');
        }
    }

    async answerQuestionGemini(question, context) {
        const contextText = context.currentDay
            ? `Student is currently studying: ${context.currentDay}`
            : '';

        const prompt = `${this.getSystemPrompt('question-answering')}

${contextText}

Student Question: ${question}

Provide a clear, educational answer:
- Explain the concept
- Give examples if relevant
- Guide them to understand, don't just give answers
- Keep it concise but thorough`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;

        return {
            answer: response.text(),
            outOfScope: false
        };
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

    async answerQuestionWithHistory(question, context = {}, conversationHistory = []) {
        try {
            if (!this.isWithinScopeStudyHelp(question)) {
                return {
                    answer: "I can help with programming (C, C++, JavaScript, DSA), quantitative aptitude (numbers, factors, HCF, LCM, BODMAS), and related basics. Ask about something you're learning in your course.",
                    outOfScope: true
                };
            }
            if (!this.model) throw new Error('AI model not available.');

            const ctx = [
                context.week && `Week: ${context.week}`,
                context.day && `Day: ${context.day}`,
                context.topic && `Topic: ${context.topic}`,
            ].filter(Boolean).join('; ') || 'General';

            let historyBlock = '';
            if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
                historyBlock = 'Previous conversation:\n' + conversationHistory.map((t) => {
                    const who = t.role === 'student' ? 'Student' : 'Tutor';
                    return `${who}: ${(t.content || '').slice(0, 800)}`;
                }).join('\n\n') + '\n\n---\nContinue the teaching. Build on what you already explained.\n\n';
            }

            const prompt = `${this.getSystemPrompt('question-answering')}

Context: ${ctx}
${historyBlock}Student: ${question}

Provide a clear, step-by-step explanation. If they seem stuck, break it down further. Keep the answer focused.
Do NOT use asterisks (*) or double asterisks (**) for formatting; write in plain text only.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return { answer: response.text(), outOfScope: false };
        } catch (e) {
            console.error('answerQuestionWithHistory:', e);
            throw e;
        }
    }

    async generateQuestionsFromConversation(conversation, topicLabel = 'what you learned') {
        try {
            if (!this.model) throw new Error('AI model not available.');

            const summary = Array.isArray(conversation) && conversation.length > 0
                ? conversation.map((t) => `${t.role}: ${(t.content || '').slice(0, 600)}`).join('\n')
                : `Topic: ${topicLabel}`;

            const prompt = `Create a quiz from this teaching conversation. You MUST generate at least 20 multiple-choice questions. If the conversation is short, create more questions on the same topics to reach 20.

Conversation or topic:
${summary.slice(0, 6000)}

Each question: "question" (string), "options" (array of exactly 4 strings), "correctAnswer" (exact full text of one of the 4 options), "explanation" (string).
Do NOT use asterisks (*) or ** in question, options, or explanation; use plain text only.
Output ONLY a JSON array, no other text. Example: [{"question":"...","options":["a","b","c","d"],"correctAnswer":"b","explanation":"..."}]`;

            const result = await this.model.generateContent(prompt);
            const text = result?.response?.text() || '';
            const m = text.match(/\[[\s\S]*\]/);
            if (!m) throw new Error('Could not parse generated questions.');
            const arr = JSON.parse(m[0]);
            return (Array.isArray(arr) ? arr : []).slice(0, 25).map((q) => ({
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

    /**
     * Generate extra multiple-choice questions on a topic (e.g. to reach minimum 20).
     * Same JSON shape as generateQuestionsFromConversation. No asterisks in output.
     */
    async generateMoreConceptQuestions(topicLabel, count) {
        try {
            if (!this.model) throw new Error('AI model not available.');
            const n = Math.max(1, Math.min(50, Math.ceil(Number(count) || 5)));

            const prompt = `Generate exactly ${n} multiple-choice questions on this topic: ${String(topicLabel || 'programming basics')}.

Each question: "question" (string), "options" (array of exactly 4 strings), "correctAnswer" (exact full text of one of the 4 options), "explanation" (string).
Do NOT use asterisks (*) or ** in question, options, or explanation; use plain text only.
Output ONLY a JSON array, no other text. Example: [{"question":"...","options":["a","b","c","d"],"correctAnswer":"b","explanation":"..."}]`;

            const result = await this.model.generateContent(prompt);
            const text = result?.response?.text() || '';
            const m = text.match(/\[[\s\S]*\]/);
            if (!m) return [];
            const arr = JSON.parse(m[0]);
            return (Array.isArray(arr) ? arr : []).slice(0, n).map((q) => ({
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

    /**
     * Analyze test performance and generate personalized guidance
     * @param {Object} testData - Current test attempt data
     * @param {Array} previousTests - Previous test attempts for this student (same week/day if practice)
     * @param {String} testType - 'practice' or 'weekly'
     * @returns {Object} Analysis with guidance, patterns, strengths, weaknesses, recommendations
     */
    async analyzeTestPerformance(testData, previousTests = [], testType = 'practice') {
        try {
            if (!this.model) throw new Error('AI model not available.');

            const { score, questions_attempted = [], week, day, time_spent } = testData;
            const totalQuestions = questions_attempted.length;
            const correctCount = questions_attempted.filter(q => q.is_correct).length;
            const incorrectCount = totalQuestions - correctCount;

            // Analyze question topics/types for patterns
            const topics = {};
            const questionTypes = {};
            const timePatterns = [];

            questions_attempted.forEach(q => {
                const topic = q.question_topic?.[0] || 'General';
                topics[topic] = (topics[topic] || { correct: 0, total: 0 });
                topics[topic].total++;
                if (q.is_correct) topics[topic].correct++;

                const qType = q.question_type || 'multiple-choice';
                questionTypes[qType] = (questionTypes[qType] || { correct: 0, total: 0 });
                questionTypes[qType].total++;
                if (q.is_correct) questionTypes[qType].correct++;

                if (q.time_spent) timePatterns.push(q.time_spent);
            });

            // Calculate topic performance
            const topicPerformance = Object.entries(topics).map(([topic, stats]) => ({
                topic,
                accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
                correct: stats.correct,
                total: stats.total
            }));

            // Compare with previous attempts
            let comparison = null;
            if (previousTests.length > 0) {
                const prevScores = previousTests.map(t => t.score || 0);
                const avgPrevScore = prevScores.reduce((a, b) => a + b, 0) / prevScores.length;
                const lastScore = prevScores[prevScores.length - 1];
                const improvement = score - lastScore;
                const trend = improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable';

                comparison = {
                    previous_score: lastScore,
                    average_previous: Math.round(avgPrevScore),
                    improvement: Math.round(improvement),
                    trend
                };
            }

            // Build context for AI
            const context = {
                testType,
                week,
                day: day || null,
                score,
                totalQuestions,
                correctCount,
                incorrectCount,
                timeSpent: time_spent || 0,
                topicPerformance: topicPerformance.slice(0, 10), // Top 10 topics
                previousAttempts: previousTests.length,
                comparison
            };

            const prompt = `You are an AI learning coach analyzing a student's test performance. Provide personalized guidance based on their results.

Test Details:
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
` : 'This appears to be their first attempt at this test.\n'}

Analyze this performance and provide:
1. Learning patterns you detect (e.g., "visual-learner", "needs-repetition", "strong-in-basics", "struggles-with-advanced", "fast-learner", "methodical-approach")
2. Strengths (topics/concepts they excel at)
3. Weak areas (topics that need improvement)
4. Personalized guidance message (2-3 sentences, encouraging and actionable)
5. Specific recommendations (3-5 actionable steps)
6. Topics to revisit (list of specific topics)

Do NOT use asterisks (*) or ** in any text. Use plain text only.

Output as JSON:
{
  "learning_patterns": ["pattern1", "pattern2"],
  "strengths": ["strength1", "strength2"],
  "weak_areas": ["weakness1", "weakness2"],
  "guidance": "personalized message here",
  "recommendations": ["recommendation1", "recommendation2"],
  "topics_to_revisit": ["topic1", "topic2"],
  "performance_trend": "${comparison?.trend || 'new'}"
}`;

            const result = await this.model.generateContent(prompt);
            const text = result?.response?.text() || '';
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
                performance_trend: analysis.performance_trend || (comparison?.trend || 'new'),
                comparison: comparison
            };
        } catch (e) {
            console.error('analyzeTestPerformance:', e);
            // Return fallback analysis
            return {
                learning_patterns: [],
                strengths: score >= 70 ? ['Good understanding of basics'] : [],
                weak_areas: score < 70 ? ['Need more practice'] : [],
                guidance: score >= 80
                    ? 'Great job! You have a strong grasp of the concepts. Keep practicing to maintain this level.'
                    : score >= 60
                        ? 'You are making progress. Review the incorrect answers and practice similar problems to improve further.'
                        : 'Don\'t worry, learning takes time. Review the study material again and practice more problems on the topics you found challenging.',
                recommendations: score < 70
                    ? ['Review the study material for this day/week', 'Practice similar problems', 'Focus on understanding the explanations']
                    : ['Continue practicing', 'Try more challenging problems'],
                topics_to_revisit: [],
                performance_trend: 'new',
                comparison: null
            };
        }
    }

    // ========== GPT-4 Methods (for future upgrade) ==========

    async reviewCodeOpenAI(code, language, problemContext) {
        // TODO: Implement when upgrading to GPT-4
        throw new Error('OpenAI integration not yet implemented');
    }

    async getHintOpenAI(problemDescription, studentCode, language, hintNumber, previousHints) {
        // TODO: Implement when upgrading to GPT-4
        throw new Error('OpenAI integration not yet implemented');
    }

    async generateLearningPathOpenAI(studentPerformance) {
        // TODO: Implement when upgrading to GPT-4
        throw new Error('OpenAI integration not yet implemented');
    }

    async generateQuestionsOpenAI(topic, difficulty, count) {
        // TODO: Implement when upgrading to GPT-4
        throw new Error('OpenAI integration not yet implemented');
    }

    async analyzePerformanceOpenAI(studentData) {
        // TODO: Implement when upgrading to GPT-4
        throw new Error('OpenAI integration not yet implemented');
    }

    async answerQuestionOpenAI(question, context) {
        // TODO: Implement when upgrading to GPT-4
        throw new Error('OpenAI integration not yet implemented');
    }
}

// Export singleton instance
export default new AIService();
