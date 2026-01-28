'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getAuthHeader } from '@/utils/auth'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Eye,
  Target,
  Brain,
} from 'lucide-react'

interface PracticeTest {
  _id: string
  student_id: string
  week: number
  day: string
  attempt: number
  score: number
  total_questions: number
  correct_answers: number
  incorrect_answers: number
  time_spent: number
  questions_attempted: Array<{
    question_id: string
    question: string
    selected_answer: string
    correct_answer: string
    is_correct: boolean
    time_spent: number
    question_type: string
    explanation: string
    options: string[]
  }>
  started_at: string
  completed_at: string
  status: string
  created_at: string
}

const days = {
  'pre-week': { label: 'PRE-WEEK', title: 'I/O (Input/Output) - Essential Basics' },
  'day-1': { label: 'Day 1', title: 'Data Types & Variables' },
  'day-2': { label: 'Day 2', title: 'Operators & Decision Making' },
  'day-3': { label: 'Day 3', title: 'Loops & Patterns' },
  'day-4': { label: 'Day 4', title: 'Arrays (DSA Foundation)' },
  'day-5': { label: 'Day 5', title: 'Functions (Basics)' },
}

/**
 * Practice Test History Page
 * Shows all practice test attempts with detailed results
 * Route: /student/tests/practice-history?week=1&day=day-1
 */
function PracticeTestHistoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [practiceTests, setPracticeTests] = useState<PracticeTest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTest, setSelectedTest] = useState<PracticeTest | null>(null)
  const [filterWeek, setFilterWeek] = useState<number | null>(null)
  const [filterDay, setFilterDay] = useState<string | null>(null)

  useEffect(() => {
    const weekParam = searchParams.get('week')
    const dayParam = searchParams.get('day')
    const studentIdParam = searchParams.get('studentId')

    if (weekParam) setFilterWeek(parseInt(weekParam))
    if (dayParam) setFilterDay(dayParam)

    fetchPracticeTests(
      weekParam ? parseInt(weekParam) : null,
      dayParam || null,
      studentIdParam || null
    )
  }, [searchParams])

  const fetchPracticeTests = async (
    week: number | null = null,
    day: string | null = null,
    studentId: string | null = null
  ) => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      // Get studentId from query param or use logged-in user's ID (from backend)
      let finalStudentId = studentId

      // Build filter with studentId, week, and day
      const filter: any = {}
      if (finalStudentId) {
        filter.student_id = finalStudentId
      }
      if (week) filter.week = week
      if (day) filter.day = day

      console.log('[PracticeTestHistory] Fetching with filter:', filter)

      const response = await fetch(`${apiBaseUrl}/practice-test/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeader() ? { Authorization: getAuthHeader() as string } : {}),
        },
        body: JSON.stringify({
          filter: filter,
          projection: {},
          options: { sort: { created_at: -1 } }
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[PracticeTestHistory] API response:', result)
        if (result.success && result.data) {
          console.log('[PracticeTestHistory] Setting practice tests:', result.data.length, 'items')
          setPracticeTests(Array.isArray(result.data) ? result.data : [])
        } else {
          console.warn('[PracticeTestHistory] Response not successful or no data:', result)
          setPracticeTests([])
        }
      } else {
        const errorText = await response.text()
        console.error('[PracticeTestHistory] API error:', response.status, errorText)
        setPracticeTests([])
      }
    } catch (error) {
      console.error('[PracticeTestHistory] Error fetching practice tests:', error)
      setPracticeTests([])
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`
    }
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'error'
  }

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-neutral-light">Loading practice test history...</p>
          </Card>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/student/tests')}
            className="flex items-center gap-2 text-neutral-light hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Tests</span>
          </button>
          <h1 className="text-3xl font-bold text-neutral mb-2">Practice Test History</h1>
          <p className="text-neutral-light">View all your practice test attempts and detailed results</p>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-neutral">Week:</label>
              <select
                value={filterWeek || ''}
                onChange={(e) => {
                  const week = e.target.value ? parseInt(e.target.value) : null
                  setFilterWeek(week)
                  fetchPracticeTests(week, filterDay)
                }}
                className="px-3 py-1.5 rounded-lg border border-neutral-light/20 bg-background-surface text-neutral text-sm"
              >
                <option value="">All Weeks</option>
                <option value="1">Week 1</option>
                <option value="2">Week 2</option>
                <option value="3">Week 3</option>
                <option value="4">Week 4</option>
                <option value="5">Week 5</option>
                <option value="6">Week 6</option>
                <option value="7">Week 7</option>
                <option value="8">Week 8</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-neutral">Day:</label>
              <select
                value={filterDay || ''}
                onChange={(e) => {
                  const day = e.target.value || null
                  setFilterDay(day)
                  fetchPracticeTests(filterWeek, day)
                }}
                className="px-3 py-1.5 rounded-lg border border-neutral-light/20 bg-background-surface text-neutral text-sm"
              >
                <option value="">All Days</option>
                {Object.entries(days).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {practiceTests.length === 0 ? (
          <Card className="p-12 text-center">
            <Brain className="w-16 h-16 text-neutral-light/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral mb-2">No Practice Tests Found</h3>
            <p className="text-neutral-light mb-6">You haven't taken any practice tests yet.</p>
            <button
              onClick={() => router.push('/student/study')}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-all"
            >
              Start Learning
            </button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {practiceTests.map((test) => (
              <Card key={test._id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-neutral">
                        {days[test.day as keyof typeof days]?.label || test.day} - Week {test.week}
                      </h3>
                      <Badge variant={getScoreColor(test.score)} className="text-sm">
                        {test.score}%
                      </Badge>
                      {test.attempt > 1 && (
                        <Badge variant="default" className="text-sm">
                          Attempt {test.attempt}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-neutral-light">
                          <span className="font-semibold text-neutral">{test.correct_answers}</span> Correct
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-neutral-light">
                          <span className="font-semibold text-neutral">{test.incorrect_answers}</span> Incorrect
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm text-neutral-light">
                          <span className="font-semibold text-neutral">{formatTime(test.time_spent)}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-secondary" />
                        <span className="text-sm text-neutral-light">
                          <span className="font-semibold text-neutral">{test.total_questions}</span> Questions
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-light">
                      <Calendar className="w-3 h-3" />
                      <span>Completed: {formatDate(test.completed_at)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedTest(selectedTest?._id === test._id ? null : test)}
                    className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {selectedTest?._id === test._id ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                {/* Detailed View */}
                {selectedTest?._id === test._id && (
                  <div className="mt-6 pt-6 border-t border-neutral-light/20">
                    <h4 className="text-lg font-semibold text-neutral mb-4">Question Details</h4>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {test.questions_attempted.map((q, idx) => (
                        <div
                          key={q.question_id}
                          className={`p-4 rounded-lg border ${q.is_correct
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                            }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral">Question {idx + 1}</span>
                              <Badge
                                variant={q.is_correct ? 'success' : 'error'}
                                className="text-xs"
                              >
                                {q.is_correct ? 'Correct' : 'Incorrect'}
                              </Badge>
                              <Badge variant="default" className="text-xs">
                                {q.question_type}
                              </Badge>
                            </div>
                            <span className="text-xs text-neutral-light">
                              {Math.floor(q.time_spent / 60)}m {q.time_spent % 60}s
                            </span>
                          </div>

                          <p className="text-sm text-neutral mb-3 font-medium">{q.question}</p>

                          <div className="space-y-2 mb-3">
                            {q.options.map((option, optIdx) => (
                              <div
                                key={optIdx}
                                className={`p-2 rounded text-sm ${option === q.correct_answer
                                  ? 'bg-green-100 text-green-800 font-semibold'
                                  : option === q.selected_answer && !q.is_correct
                                    ? 'bg-red-100 text-red-800 font-semibold'
                                    : 'bg-neutral-light/10 text-neutral-light'
                                  }`}
                              >
                                {option}
                                {option === q.correct_answer && ' ✓'}
                                {option === q.selected_answer && !q.is_correct && ' ✗'}
                              </div>
                            ))}
                          </div>

                          {q.explanation && (
                            <div className="mt-3 p-3 bg-background-surface rounded border border-neutral-light/20">
                              <p className="text-xs font-semibold text-neutral mb-1">Explanation:</p>
                              <p className="text-xs text-neutral-light">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}

export default function PracticeTestHistoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>}>
      <PracticeTestHistoryContent />
    </Suspense>
  )
}
