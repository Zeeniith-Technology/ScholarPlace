/**
 * AI Service - Frontend API client for AI features
 * Handles all communication with backend AI endpoints
 */

import { getAuthHeader } from '@/utils/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

/** Map backend/network errors to user-friendly messages */
function getFriendlyAIError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('api key') || lower.includes('api_key') || lower.includes('gemini')) return 'AI service is not configured. Please try again later.'
  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('quota')) return 'Too many requests. Please wait a minute and try again.'
  if (lower.includes('401') || lower.includes('unauthorized')) return 'Please sign in again to use AI features.'
  if (lower.includes('500') || lower.includes('internal')) return 'AI service is temporarily unavailable. Please try again in a few minutes.'
  if (lower.includes('network') || lower.includes('fetch')) return 'Connection problem. Check your internet and try again.'
  return message
}

/**
 * Make authenticated API request using app auth (same as rest of student analytics)
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const authHeader = typeof window !== 'undefined' ? getAuthHeader() : null

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { 'Authorization': authHeader } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    const msg = error.message || `Request failed with status ${response.status}`
    throw new Error(getFriendlyAIError(msg))
  }

  return response.json()
}

/**
 * AI Service Interface
 */
export interface CodeReviewRequest {
  code: string
  language: 'javascript' | 'c' | 'cpp' | 'python'
  problem_id?: string
  problem_description?: string
  week?: number
  day?: string
}

export interface CodeReviewResponse {
  success: boolean
  data: {
    review: string
    strengths?: string[]
    issues?: string[]
    suggestions?: string[]
    learning_points?: string[]
  }
}

export interface HintRequest {
  problem_id: string
  problem_description: string
  student_code?: string
  language: 'javascript' | 'c' | 'cpp' | 'python'
  week?: number
  day?: string
}

export interface HintResponse {
  success: boolean
  data: {
    hint: string
    hint_number: number
    is_final: boolean
    hints_remaining: number
  }
}

export interface LearningPathRequest {
  week?: number
  analyticsContext?: AnalyticsContextSummary
}

export interface LearningPathResponse {
  success: boolean
  data: {
    weak_areas: string[]
    recommended_days: string[]
    focus_areas: string[]
    study_plan: string
    motivation: string
  }
}

export interface GenerateQuestionsRequest {
  topic: string
  difficulty: 'easy' | 'intermediate' | 'difficult'
  count?: number
}

export interface GenerateQuestionsResponse {
  success: boolean
  data: {
    questions: Array<{
      question: string
      options: string[]
      correct_answer: string
      explanation: string
    }>
  }
}

export interface AnalyticsContextSummary {
  performanceData?: { overallScore?: number; testsCompleted?: number; averageScore?: number; improvement?: number }
  subjectPerformance?: Array<{ subject: string; score: number; tests: number }>
  weeklyProgressSummary?: Array<{ week: string; score: number }>
}

export interface AnalyzePerformanceRequest {
  week?: number
  analyticsContext?: AnalyticsContextSummary
}

export interface AnalyzePerformanceResponse {
  success: boolean
  data: {
    overall_score: string
    strong_areas: string[]
    weak_areas: string[]
    recommendations: string[]
    feedback: string
  }
}

export interface AnswerQuestionRequest {
  question: string
  context?: {
    current_day?: string
    current_week?: number
    current_topic?: string
  }
}

export interface AnswerQuestionResponse {
  success: boolean
  data: {
    answer: string
    out_of_scope: boolean
  }
}

/**
 * AI Service Class
 */
export class AIService {
  /**
   * Review student code and provide feedback
   */
  static async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    return apiRequest('/ai/code-review', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Get AI tutor hint for a coding problem
   */
  static async getHint(request: HintRequest): Promise<HintResponse> {
    return apiRequest('/ai/hint', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Generate personalized learning path
   */
  static async generateLearningPath(request: LearningPathRequest = {}): Promise<LearningPathResponse> {
    return apiRequest('/ai/learning-path', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Generate practice questions
   */
  static async generateQuestions(request: GenerateQuestionsRequest): Promise<GenerateQuestionsResponse> {
    return apiRequest('/ai/generate-questions', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Analyze student performance
   */
  static async analyzePerformance(request: AnalyzePerformanceRequest = {}): Promise<AnalyzePerformanceResponse> {
    return apiRequest('/ai/analyze-performance', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Answer student question (scope-restricted)
   */
  static async answerQuestion(request: AnswerQuestionRequest): Promise<AnswerQuestionResponse> {
    return apiRequest('/ai/answer-question', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }
}

export default AIService