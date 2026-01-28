/**
 * AI Service - Frontend API client for AI features
 * Handles all communication with backend AI endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

/**
 * Make authenticated API request using httpOnly cookies
 * Cookies are automatically sent by the browser
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies in request
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed with status ${response.status}`)
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

export interface AnalyzePerformanceRequest {
  week?: number
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