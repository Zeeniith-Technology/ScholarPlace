'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Brain,
  Trophy,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  AlertCircle,
  Play,
  Target,
} from 'lucide-react'
import { CodeEditor } from '@/components/ui/CodeEditor'
import { QuestionGeneration } from '@/components/ai/QuestionGeneration'
import { getAuthHeader } from '@/utils/auth'

interface Question {
  question_id: string
  question: string
  options: string[]
  answer: string
  question_type: 'easy' | 'intermediate' | 'difficult'
  time_taken: string
  question_topic: string[]
  question_subtopic: string
  link: string
  explanation: string
  day: string
  language: string[]
  question_format?: 'multiple_choice' | 'coding'
  code_template?: string
  test_cases?: Array<{
    input: string
    expectedOutput: string
    description?: string
  }>
  coding_language?: 'javascript' | 'c' | 'cpp' | 'python'
}

interface AnswerState {
  [questionId: string]: {
    selected: string
    isCorrect: boolean | null
    timeSpent: number
  }
}

/**
 * Week 1 Practice Test Page
 * Route: /student/practice/week-1?day=pre-week|day-1|day-2|day-3|day-4|day-5
 */
export default function Week1PracticePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [day, setDay] = useState<string>('pre-week')
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerState>({})
  const [showResults, setShowResults] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [totalTime, setTotalTime] = useState(0)
  const [testStarted, setTestStarted] = useState(false)
  const [previousTestScore, setPreviousTestScore] = useState<number | null>(null)
  const [canRetake, setCanRetake] = useState(false)
  const [testAttempt, setTestAttempt] = useState(1)
  const [questionStartTimes, setQuestionStartTimes] = useState<{ [questionId: string]: number }>({})
  const [codeAnswers, setCodeAnswers] = useState<{ [questionId: string]: string }>({})
  const [showQuestionGenerator, setShowQuestionGenerator] = useState(false)
  const [testAnalysis, setTestAnalysis] = useState<any>(null)

  const days = {
    'pre-week': { label: 'PRE-WEEK', title: 'I/O (Input/Output) - Essential Basics' },
    'day-1': { label: 'Day 1', title: 'Data Types & Variables' },
    'day-2': { label: 'Day 2', title: 'Operators & Decision Making' },
    'day-3': { label: 'Day 3', title: 'Loops & Patterns' },
    'day-4': { label: 'Day 4', title: 'Arrays (DSA Foundation)' },
    'day-5': { label: 'Day 5', title: 'Functions (Basics)' },
  }

  // Disable copy-paste and text selection during test
  useEffect(() => {
    if (testStarted && !showResults) {
      // Prevent context menu (right-click)
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault()
        return false
      }

      // Prevent copy (Ctrl+C, Cmd+C)
      const handleCopy = (e: ClipboardEvent) => {
        e.preventDefault()
        return false
      }

      // Prevent cut (Ctrl+X, Cmd+X)
      const handleCut = (e: ClipboardEvent) => {
        e.preventDefault()
        return false
      }

      // Prevent paste (Ctrl+V, Cmd+V)
      const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault()
        return false
      }

      // Prevent select all (Ctrl+A, Cmd+A)
      const handleSelectAll = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
          e.preventDefault()
          return false
        }
      }

      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (view source)
      const handleDevTools = (e: KeyboardEvent) => {
        if (
          e.key === 'F12' ||
          ((e.ctrlKey || e.metaKey) && (e.shiftKey && (e.key === 'I' || e.key === 'J'))) ||
          ((e.ctrlKey || e.metaKey) && e.key === 'U')
        ) {
          e.preventDefault()
          return false
        }
      }

      // Add event listeners
      document.addEventListener('contextmenu', handleContextMenu)
      document.addEventListener('copy', handleCopy)
      document.addEventListener('cut', handleCut)
      document.addEventListener('paste', handlePaste)
      document.addEventListener('keydown', handleSelectAll)
      document.addEventListener('keydown', handleDevTools)

      // Cleanup
      return () => {
        document.removeEventListener('contextmenu', handleContextMenu)
        document.removeEventListener('copy', handleCopy)
        document.removeEventListener('cut', handleCut)
        document.removeEventListener('paste', handlePaste)
        document.removeEventListener('keydown', handleSelectAll)
        document.removeEventListener('keydown', handleDevTools)
      }
    }
  }, [testStarted, showResults])

  useEffect(() => {
    const dayParam = searchParams.get('day') || 'pre-week'
    setDay(dayParam)
    fetchQuestions(dayParam)
    checkPreviousTestScore(dayParam)
  }, [searchParams])

  const checkPreviousTestScore = async (dayParam: string) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error('[Practice] No auth token found')
        return
      }

      const response = await fetch(`${apiBaseUrl}/student-progress/list`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          filter: { week: 1 },
          projection: {},
          options: {}
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && result.data.length > 0) {
          const progress = result.data[0]
          const testScores = progress.practice_test_scores || []
          const dayTest = testScores.find((t: any) => t.day === dayParam)

          if (dayTest) {
            setPreviousTestScore(dayTest.score)
            setTestAttempt(dayTest.attempt || 1)
            // Can retake only if score < 80%
            if (dayTest.score < 80) {
              setCanRetake(true)
            } else {
              setCanRetake(false)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking previous test score:', error)
    }
  }

  useEffect(() => {
    if (testStarted && startTime) {
      const interval = setInterval(() => {
        setTotalTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [testStarted, startTime])

  const fetchQuestions = async (dayParam: string) => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const response = await fetch(`${apiBaseUrl}/questions/week1`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ day: dayParam }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data && data.data.questions) {
          // Shuffle questions for variety
          const shuffled = [...data.data.questions].sort(() => Math.random() - 0.5)
          setQuestions(shuffled)

          // Initialize answer state
          const initialAnswers: AnswerState = {}
          const initialCodeAnswers: { [key: string]: string } = {}
          shuffled.forEach(q => {
            initialAnswers[q.question_id] = {
              selected: '',
              isCorrect: null,
              timeSpent: 0,
            }
            if (q.question_format === 'coding' && q.code_template) {
              initialCodeAnswers[q.question_id] = q.code_template
            }
          })
          setAnswers(initialAnswers)
          setCodeAnswers(initialCodeAnswers)
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startTest = () => {
    setTestStarted(true)
    const now = Date.now()
    setStartTime(now)

    // Initialize start time for first question
    if (questions.length > 0) {
      setQuestionStartTimes({
        [questions[0].question_id]: now
      })
    }
  }

  const handleAnswerSelect = (questionId: string, selectedAnswer: string) => {
    const question = questions.find(q => q.question_id === questionId)
    if (!question) return

    const isCorrect = selectedAnswer === question.answer
    // Calculate actual time spent on this question
    const questionStartTime = questionStartTimes[questionId] || Date.now()
    const timeSpentOnQuestion = Math.floor((Date.now() - questionStartTime) / 1000) // in seconds
    const previousTimeSpent = answers[questionId]?.timeSpent || 0
    const totalTimeSpent = previousTimeSpent + timeSpentOnQuestion

    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        selected: selectedAnswer,
        isCorrect,
        timeSpent: totalTimeSpent,
      },
    }))
  }

  const goToNextQuestion = () => {
    // Track time when moving to next question
    const currentQuestion = questions[currentQuestionIndex]
    if (currentQuestion && testStarted) {
      const questionId = currentQuestion.question_id
      const questionStartTime = questionStartTimes[questionId] || Date.now()
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000) // in seconds
      const previousTimeSpent = answers[questionId]?.timeSpent || 0

      // Update time spent for current question before switching
      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          timeSpent: previousTimeSpent + timeSpent
        }
      }))
    }

    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)

      // Set start time for the next question
      const nextQuestion = questions[nextIndex]
      if (nextQuestion && testStarted) {
        setQuestionStartTimes(prev => ({
          ...prev,
          [nextQuestion.question_id]: Date.now()
        }))
      }
    }
  }

  const goToPreviousQuestion = () => {
    // Track time when moving to previous question
    const currentQuestion = questions[currentQuestionIndex]
    if (currentQuestion && testStarted) {
      const questionId = currentQuestion.question_id
      const questionStartTime = questionStartTimes[questionId] || Date.now()
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000) // in seconds
      const previousTimeSpent = answers[questionId]?.timeSpent || 0

      // Update time spent for current question before switching
      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          timeSpent: previousTimeSpent + timeSpent
        }
      }))
    }

    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(prevIndex)

      // Set start time for the previous question
      const prevQuestion = questions[prevIndex]
      if (prevQuestion && testStarted) {
        setQuestionStartTimes(prev => ({
          ...prev,
          [prevQuestion.question_id]: Date.now()
        }))
      }
    }
  }

  const goToQuestion = (index: number) => {
    // Track time when jumping to a specific question
    const currentQuestion = questions[currentQuestionIndex]
    if (currentQuestion && testStarted) {
      const questionId = currentQuestion.question_id
      const questionStartTime = questionStartTimes[questionId] || Date.now()
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000) // in seconds
      const previousTimeSpent = answers[questionId]?.timeSpent || 0

      // Update time spent for current question before switching
      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          timeSpent: previousTimeSpent + timeSpent
        }
      }))
    }

    setCurrentQuestionIndex(index)

    // Set start time for the target question
    const targetQuestion = questions[index]
    if (targetQuestion && testStarted) {
      setQuestionStartTimes(prev => ({
        ...prev,
        [targetQuestion.question_id]: Date.now()
      }))
    }
  }

  const submitTest = async () => {
    setShowResults(true)
    setTestStarted(false)

    // Calculate final time spent
    const finalTimeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000 / 60) : 0 // in minutes

    // Save detailed test data to database
    try {
      const { correct, total, percentage } = getScore()
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      // Build questions_attempted array with all question details
      const questionsAttempted = questions.map((q) => {
        const answerState = answers[q.question_id]
        const isCorrect = answerState?.isCorrect || false

        return {
          question_id: q.question_id,
          question: q.question,
          selected_answer: answerState?.selected || '',
          correct_answer: q.answer,
          is_correct: isCorrect,
          time_spent: answerState?.timeSpent || 0, // in seconds
          question_type: q.question_type,
          question_topic: q.question_topic,
          question_subtopic: q.question_subtopic,
          explanation: q.explanation || '',
          options: q.options || []
        }
      })

      // Save detailed practice test data to tblPracticeTest (includes AI analysis)
      const detailedTestResponse = await fetch(`${apiBaseUrl}/practice-test/save`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week: 1,
          day: day,
          score: percentage,
          totalQuestions: total,
          correctAnswers: correct,
          incorrectAnswers: total - correct,
          timeSpent: finalTimeSpent,
          questionsAttempted: questionsAttempted
        }),
      })

      if (detailedTestResponse.ok) {
        const testData = await detailedTestResponse.json()
        // AI analysis is included in the response
        if (testData.success && testData.data?.analysis) {
          setTestAnalysis(testData.data.analysis)
        }
      } else {
        console.error('Error saving detailed practice test data')
      }

      // Also save practice test score to student progress (for backward compatibility and progress tracking)
      await fetch(`${apiBaseUrl}/student-progress/update-practice-score`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week: 1,
          day: day,
          score: percentage
        }),
      })
    } catch (error) {
      console.error('Error saving practice test data:', error)
    }
  }

  const resetTest = () => {
    setShowResults(false)
    setCurrentQuestionIndex(0)
    setTestStarted(false)
    setStartTime(null)
    setTotalTime(0)
    setTestAnalysis(null)
    const initialAnswers: AnswerState = {}
    questions.forEach(q => {
      initialAnswers[q.question_id] = {
        selected: '',
        isCorrect: null,
        timeSpent: 0,
      }
    })
    setAnswers(initialAnswers)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getScore = () => {
    const correct = Object.values(answers).filter(a => a.isCorrect === true).length
    const total = questions.length
    const percentage = Math.round((correct / total) * 100)
    return { correct, total, percentage }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/20 text-green-600 border-green-500/30'
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
      case 'difficult':
        return 'bg-red-500/20 text-red-600 border-red-500/30'
      default:
        return 'bg-neutral-light/20 text-neutral-light'
    }
  }

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-neutral-light">Loading questions...</p>
          </Card>
        </div>
      </StudentLayout>
    )
  }

  if (questions.length === 0) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="p-12 text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-neutral-light mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral mb-2">No Questions Available</h2>
            <p className="text-neutral-light mb-4">
              Questions for {days[day as keyof typeof days]?.title} are not available.
            </p>
            <button
              onClick={() => router.push(`/student/study/week-1?day=${day}`)}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Back to Study
            </button>
          </Card>
        </div>
      </StudentLayout>
    )
  }

  // Results View
  if (showResults) {
    const { correct, total, percentage } = getScore()
    const answeredCount = Object.entries(answers).filter(([questionId, answer]) => {
      const question = questions.find(q => q.question_id === questionId)
      if (question?.question_format === 'coding') {
        return codeAnswers[questionId] && codeAnswers[questionId].trim() !== ''
      }
      return answer.selected !== ''
    }).length

    return (
      <StudentLayout>
        <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ${testStarted && !showResults ? 'practice-test-no-copy' : ''}`}>
          <div className="mb-6">
            <button
              onClick={() => router.push(`/student/study/week-1?day=${day}`)}
              className="flex items-center gap-2 text-neutral-light hover:text-primary transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Study</span>
            </button>
          </div>

          {/* Results Summary */}
          <Card className="mb-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-4">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-neutral mb-2">Test Completed!</h1>
              <p className="text-lg text-neutral-light mb-6">
                {days[day as keyof typeof days]?.title}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                <div className="bg-background-surface rounded-lg p-4 border border-neutral-light/20">
                  <div className="text-3xl font-bold text-primary mb-1">{correct}/{total}</div>
                  <div className="text-sm text-neutral-light">Correct Answers</div>
                </div>
                <div className="bg-background-surface rounded-lg p-4 border border-neutral-light/20">
                  <div className="text-3xl font-bold text-secondary mb-1">{percentage}%</div>
                  <div className="text-sm text-neutral-light">Score</div>
                </div>
                <div className="bg-background-surface rounded-lg p-4 border border-neutral-light/20">
                  <div className="text-3xl font-bold text-neutral mb-1">{formatTime(totalTime)}</div>
                  <div className="text-sm text-neutral-light">Time Taken</div>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={resetTest}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Retake Test
                </button>
                <button
                  onClick={() => router.push(`/student/study/week-1?day=${day}`)}
                  className="px-6 py-3 bg-background-elevated hover:bg-background-elevated/80 text-neutral rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Review Study Material
                </button>
              </div>
            </div>
          </Card>

          {/* AI Guidance */}
          {testAnalysis && (
            <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral">Personalized Guidance</h2>
                </div>

                <div className="mb-4 p-4 rounded-xl bg-background-surface border border-primary/10">
                  <p className="text-neutral leading-relaxed">{testAnalysis.guidance}</p>
                </div>

                {testAnalysis.strengths && testAnalysis.strengths.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Your Strengths
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {testAnalysis.strengths.map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-lg bg-green-500/10 text-green-700 text-sm border border-green-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {testAnalysis.weak_areas && testAnalysis.weak_areas.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Areas to Improve
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {testAnalysis.weak_areas.map((w: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-lg bg-orange-500/10 text-orange-700 text-sm border border-orange-500/20">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {testAnalysis.recommendations && testAnalysis.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {testAnalysis.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-neutral-light">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {testAnalysis.comparison && (
                  <div className="mt-4 pt-4 border-t border-neutral-light/20">
                    <p className="text-xs text-neutral-light">
                      {testAnalysis.comparison.improvement > 0
                        ? `📈 Improved by ${testAnalysis.comparison.improvement}% from your last attempt!`
                        : testAnalysis.comparison.improvement < 0
                          ? `📉 Score decreased by ${Math.abs(testAnalysis.comparison.improvement)}% - review the material and try again.`
                          : 'Score is similar to your last attempt. Keep practicing!'}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Detailed Results */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-neutral mb-4">Question Review</h2>
            {questions.map((question, index) => {
              const answerState = answers[question.question_id]
              const isCorrect = answerState?.isCorrect
              const selected = answerState?.selected

              return (
                <Card key={question.question_id} className={`border-2 select-none ${isCorrect ? 'border-green-500/30 bg-green-500/5' :
                    isCorrect === false ? 'border-red-500/30 bg-red-500/5' :
                      'border-neutral-light/20'
                  }`}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isCorrect ? 'bg-green-500 text-white' :
                            isCorrect === false ? 'bg-red-500 text-white' :
                              'bg-neutral-light/20 text-neutral-light'
                          }`}>
                          {index + 1}
                        </div>
                        <Badge className={getDifficultyColor(question.question_type)}>
                          {question.question_type}
                        </Badge>
                      </div>
                      {isCorrect !== null && (
                        <div>
                          {isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <p className="text-lg font-semibold text-neutral mb-4 select-none">{question.question}</p>

                      <div className="space-y-2">
                        {question.options.map((option, optIdx) => {
                          const isSelected = selected === option
                          const isCorrectAnswer = option === question.answer

                          return (
                            <div
                              key={optIdx}
                              className={`p-3 rounded-lg border-2 transition-all ${isCorrectAnswer
                                  ? 'bg-green-500/20 border-green-500/50'
                                  : isSelected && !isCorrectAnswer
                                    ? 'bg-red-500/20 border-red-500/50'
                                    : 'bg-background-elevated border-neutral-light/20'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-sm ${isCorrectAnswer
                                    ? 'bg-green-500 text-white'
                                    : isSelected && !isCorrectAnswer
                                      ? 'bg-red-500 text-white'
                                      : 'bg-neutral-light/30 text-neutral-light'
                                  }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </div>
                                <span className="text-neutral select-none">{option}</span>
                                {isCorrectAnswer && (
                                  <Badge className="ml-auto bg-green-500 text-white">Correct</Badge>
                                )}
                                {isSelected && !isCorrectAnswer && (
                                  <Badge className="ml-auto bg-red-500 text-white">Your Answer</Badge>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {question.explanation && (
                      <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <HelpCircle className="w-5 h-5 text-primary" />
                          <span className="font-semibold text-neutral">Explanation</span>
                        </div>
                        <p className="text-sm text-neutral-light leading-relaxed select-none">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </StudentLayout>
    )
  }

  // Test Start Screen
  if (!testStarted) {
    return (
      <StudentLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <button
              onClick={() => router.push(`/student/study/week-1?day=${day}`)}
              className="flex items-center gap-2 text-neutral-light hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Study</span>
            </button>
          </div>

          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-6">
                <Brain className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-neutral mb-2">
                Practice Test: {days[day as keyof typeof days]?.label}
              </h1>
              <p className="text-lg text-neutral-light mb-8">
                {days[day as keyof typeof days]?.title}
              </p>

              <div className="bg-background-surface rounded-lg p-6 mb-8 border border-neutral-light/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div>
                    <div className="text-2xl font-bold text-primary mb-1">{questions.length}</div>
                    <div className="text-sm text-neutral-light">Total Questions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-secondary mb-1">
                      {Math.ceil(questions.reduce((sum, q) => sum + parseInt(q.time_taken), 0) / 60)}
                    </div>
                    <div className="text-sm text-neutral-light">Estimated Time (minutes)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-neutral mb-1">All Levels</div>
                    <div className="text-sm text-neutral-light">Difficulty Mix</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-left bg-background-surface p-4 rounded-lg border border-neutral-light/20">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-neutral-light">
                    You can review and change answers before submitting
                  </span>
                </div>
                <div className="flex items-center gap-3 text-left bg-background-surface p-4 rounded-lg border border-neutral-light/20">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-neutral-light">
                    Detailed explanations provided for each question
                  </span>
                </div>
                <div className="flex items-center gap-3 text-left bg-background-surface p-4 rounded-lg border border-neutral-light/20">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-neutral-light">
                    Track your progress and identify areas for improvement
                  </span>
                </div>
              </div>

              {/* AI Question Generator */}
              <div className="mb-6">
                <button
                  onClick={() => setShowQuestionGenerator(!showQuestionGenerator)}
                  className="w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-semibold transition-all flex items-center justify-center gap-2 border-2 border-primary/30"
                >
                  <Brain className="w-5 h-5" />
                  {showQuestionGenerator ? 'Hide' : 'Show'} AI Question Generator
                </button>
                {showQuestionGenerator && (
                  <div className="mt-4">
                    <QuestionGeneration
                      onClose={() => setShowQuestionGenerator(false)}
                      onQuestionsGenerated={(questions) => {
                        console.log('Generated questions:', questions)
                        // You can handle the generated questions here
                        // For example, add them to the practice test or show them in a modal
                      }}
                    />
                  </div>
                )}
              </div>

              {previousTestScore !== null && previousTestScore >= 80 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">Test Already Passed</span>
                    </div>
                    <p className="text-sm text-green-600">
                      You scored {previousTestScore}% on this test. Since your score is 80% or above, you cannot retake this test.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/student/study/week-1?day=${day}`)}
                    className="px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold text-lg transition-all flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl"
                  >
                    <BookOpen className="w-6 h-6" />
                    Back to Learning
                  </button>
                </div>
              ) : previousTestScore !== null && previousTestScore < 80 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700 mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-semibold">Retake Available</span>
                    </div>
                    <p className="text-sm text-yellow-600">
                      Your previous score was {previousTestScore}% (below 80%). You can retake this test to improve your score.
                    </p>
                    <p className="text-xs text-yellow-500 mt-1">
                      Attempt #{testAttempt + 1}
                    </p>
                  </div>
                  <button
                    onClick={startTest}
                    className="px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold text-lg transition-all flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl"
                  >
                    <RotateCcw className="w-6 h-6" />
                    Retake Practice Test
                  </button>
                </div>
              ) : (
                <button
                  onClick={startTest}
                  className="px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold text-lg transition-all flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl"
                >
                  <Play className="w-6 h-6" />
                  Start Practice Test
                </button>
              )}
            </div>
          </Card>
        </div>
      </StudentLayout>
    )
  }

  // Test In Progress
  const currentQuestion = questions[currentQuestionIndex]
  const answerState = answers[currentQuestion.question_id]
  const answeredCount = Object.entries(answers).filter(([questionId, answer]) => {
    const question = questions.find(q => q.question_id === questionId)
    if (question?.question_format === 'coding') {
      return codeAnswers[questionId] && codeAnswers[questionId].trim() !== ''
    }
    return answer.selected !== ''
  }).length

  return (
    <StudentLayout>
      <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ${testStarted && !showResults ? 'practice-test-no-copy' : ''}`}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral mb-1">
                {days[day as keyof typeof days]?.label} - Practice Test
              </h1>
              <p className="text-sm text-neutral-light">{days[day as keyof typeof days]?.title}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-background-elevated rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-semibold text-neutral">{formatTime(totalTime)}</span>
              </div>
              <div className="px-4 py-2 bg-primary/10 rounded-lg">
                <span className="text-sm font-semibold text-primary">
                  {answeredCount}/{questions.length} Answered
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-neutral-light/20 rounded-full h-2 mb-4">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            {questions.map((q, idx) => {
              const ans = answers[q.question_id]
              const isAnswered = ans?.selected !== ''
              const isCurrent = idx === currentQuestionIndex

              return (
                <button
                  key={q.question_id}
                  onClick={() => goToQuestion(idx)}
                  className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${isCurrent
                      ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                      : isAnswered
                        ? 'bg-green-500/20 text-green-600 border-2 border-green-500/30'
                        : 'bg-background-elevated text-neutral-light border border-neutral-light/20 hover:bg-primary/10'
                    }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>

        {/* Question Card */}
        <Card className={`mb-6 ${currentQuestion.question_format === 'coding' ? '' : 'select-none'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  {currentQuestionIndex + 1}
                </div>
                <div>
                  <div className="text-sm text-neutral-light">Question {currentQuestionIndex + 1} of {questions.length}</div>
                  <Badge className={getDifficultyColor(currentQuestion.question_type)}>
                    {currentQuestion.question_type}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xl font-semibold text-neutral mb-6 leading-relaxed select-none">
                {currentQuestion.question}
              </p>

              {/* Coding Question */}
              {currentQuestion.question_format === 'coding' ? (
                <div className="mt-4">
                  <CodeEditor
                    language={currentQuestion.coding_language || 'javascript'}
                    initialCode={codeAnswers[currentQuestion.question_id] || currentQuestion.code_template || ''}
                    onCodeChange={(code) => {
                      setCodeAnswers(prev => ({
                        ...prev,
                        [currentQuestion.question_id]: code
                      }))
                      // Auto-save code as answer
                      handleAnswerSelect(currentQuestion.question_id, code)
                    }}
                    testCases={currentQuestion.test_cases}
                    readOnly={false}
                    height="400px"
                  />
                </div>
              ) : (
                /* Multiple Choice Question */
                <div className="space-y-3">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = answerState?.selected === option

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswerSelect(currentQuestion.question_id, option)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-background-elevated border-neutral-light/20 text-neutral hover:border-primary/50 hover:bg-primary/5'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${isSelected
                              ? 'bg-primary text-white'
                              : 'bg-neutral-light/30 text-neutral-light'
                            }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </div>
                          <span className="text-base select-none">{option}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${currentQuestionIndex === 0
                ? 'bg-neutral-light/10 text-neutral-light cursor-not-allowed'
                : 'bg-background-elevated text-neutral hover:bg-primary/10'
              }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <div className="flex gap-3">
            {answeredCount === questions.length && (
              <button
                onClick={submitTest}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Submit Test
              </button>
            )}
          </div>

          <button
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${currentQuestionIndex === questions.length - 1
                ? 'bg-neutral-light/10 text-neutral-light cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
              }`}
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </StudentLayout>
  )
}
