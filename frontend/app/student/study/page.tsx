'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  BookOpen,
  Play,
  Lock,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  Target,
  BookMarked,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAuthHeader } from '@/utils/auth'
import { WeeklyFeedbackModal } from '@/components/feedback/WeeklyFeedbackModal'

/**
 * Learning Landing Page
 * Shows available weeks for learning and allows students to start their weekly learning.
 * Includes a mandatory weekly feedback column (FEEDBACK) after the STATUS column.
 * Route: /student/study
 */
export default function LearningPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [syllabusData, setSyllabusData] = useState<any[]>([])
  const [studentProgressByWeek, setStudentProgressByWeek] = useState<{ [week: number]: any }>({})

  // Track which weeks already have feedback submitted (Set of week numbers)
  const [submittedFeedbackWeeks, setSubmittedFeedbackWeeks] = useState<Set<number>>(new Set())
  const [checkingFeedback, setCheckingFeedback] = useState(false)

  // Modal state
  const [feedbackModalWeek, setFeedbackModalWeek] = useState<number | null>(null)

  useEffect(() => {
    setIsMounted(true)
    fetchSyllabus()
    fetchStudentProgress()
  }, [])

  const fetchSyllabus = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (authHeader) headers['Authorization'] = authHeader

      const response = await fetch(`${apiBaseUrl}/syllabus/list`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          filter: {},
          projection: {},
          options: { sort: { week: 1 } }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) setSyllabusData(result.data)
      }
    } catch (error) {
      console.error('Error fetching syllabus:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStudentProgress = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const response = await fetch(`${apiBaseUrl}/student-progress/list`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ filter: {}, projection: {}, options: { sort: { week: 1 } } })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const progressMap: { [week: number]: any } = {}
          result.data.forEach((progress: any) => {
            progressMap[progress.week] = progress
          })

          // Sync Week 1 completion if needed (legacy support)
          if (progressMap[1]?.status !== 'completed') {
            try {
              const completionRes = await fetch(`${apiBaseUrl}/student-progress/check-week-completion`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                body: JSON.stringify({ week: 1 }),
              })
              if (completionRes.ok) {
                const completion = await completionRes.json()
                if (completion?.success && completion?.data?.isCompleted) {
                  progressMap[1] = { ...(progressMap[1] || { week: 1 }), status: 'completed' }
                }
              }
            } catch (err) {
              console.error('[Student Progress] Week completion sync failed:', err)
            }
          }

          setStudentProgressByWeek(progressMap)
        }
      }
    } catch (error) {
      console.error('Error fetching student progress:', error)
    }
  }

  /**
   * Check which weeks already have feedback submitted.
   * Called once after progress is loaded, for all accessible weeks.
   */
  const checkSubmittedFeedback = useCallback(async (accessibleWeeks: number[]) => {
    if (accessibleWeeks.length === 0) return
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
    const authHeader = getAuthHeader()
    if (!authHeader) return

    setCheckingFeedback(true)
    try {
      const response = await fetch(`${apiBaseUrl}/student/feedback/check-submitted-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ week_numbers: accessibleWeeks })
      })
      const data = await response.json()
      if (data?.success && Array.isArray(data?.data?.submitted_weeks)) {
        setSubmittedFeedbackWeeks(new Set(data.data.submitted_weeks))
      }
    } catch (err) {
      console.error('[Feedback] checkSubmittedFeedback bulk error:', err)
    } finally {
      setCheckingFeedback(false)
    }
  }, [])

  const isWeekUnlocked = (weekNumber: number) => {
    if (weekNumber === 1) return true
    const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'
    if (isTestMode && weekNumber <= 6) return true
    
    // Check if previous week is completed
    const previousWeekProgress = studentProgressByWeek[weekNumber - 1]
    const isPrevCompleted = previousWeekProgress?.status === 'completed'
    
    // Check if previous week feedback is submitted
    const isPrevFeedbackSubmitted = submittedFeedbackWeeks.has(weekNumber - 1)
    
    return isPrevCompleted && isPrevFeedbackSubmitted
  }

  const getStudentWeekStatus = (weekNumber: number) => {
    if (!isWeekUnlocked(weekNumber)) return 'locked'
    const progress = studentProgressByWeek[weekNumber]
    if (!progress) return 'start'

    const hasDaysCompleted = progress.days_completed?.length > 0
    const hasAssignmentsCompleted = progress.assignments_completed > 0
    const hasTestsCompleted = progress.tests_completed > 0
    const hasDsaProgress = progress.coding_problems_completed?.length > 0 || progress.verified_days?.length > 0
    const hasAptitudeProgress = progress.practice_tests_completed > 0 || progress.practice_test_scores?.length > 0

    if (progress.status === 'completed') return 'completed'
    if (hasDaysCompleted || hasAssignmentsCompleted || hasTestsCompleted || hasDsaProgress || hasAptitudeProgress) return 'in_progress'

    const status = progress.status || 'start'
    return status === 'locked' ? 'start' : status
  }

  const handleStartWeek = (week: number, status: string) => {
    if (status === 'locked') return

    const weekRoutes: Record<number, string> = {
      1: '/student/study/week-1-select',
      2: '/student/study/week-2-select',
      3: '/student/study/week-3-select',
      4: '/student/study/week-4-select',
      5: '/student/study/week-5-select',
      6: '/student/study/week-6-select',
    }
    router.push(weekRoutes[week] ?? `/student/study/${week}?day=day-1`)
  }

  // Practicals: 2 per week (static)
  const practicalsPerWeek = 2

  const defaultWeeks = [
    { week: 1, title: 'Fundamentals',      tests: 1 },
    { week: 2, title: 'Advanced Concepts', tests: 1 },
    { week: 3, title: 'Data Structures',   tests: 0 },
    { week: 4, title: 'Algorithms',        tests: 0 },
    { week: 5, title: 'Problem Solving',   tests: 0 },
    { week: 6, title: 'Interview Prep',    tests: 0 },
    { week: 7, title: 'Mock Tests',        tests: 0, isComingSoon: true },
    { week: 8, title: 'Final Review',      tests: 0, isComingSoon: true },
  ]

  const weeklySchedule = defaultWeeks.map((week) => {
    const apiWeek = syllabusData.find((item: any) => item.week === week.week)
    const merged = apiWeek ? { ...week, ...apiWeek } : week
    return { ...merged, practicals: practicalsPerWeek }
  })

  // Once progress is loaded, check feedback submission for all relevant weeks
  useEffect(() => {
    if (isLoading) return
    const allWeeksToCheck = [1, 2, 3, 4, 5, 6]
    checkSubmittedFeedback(allWeeksToCheck)
  }, [isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Feedback helpers ──────────────────────────────────────────────────────

  /** Whether a week is eligible to show a feedback button */
  const isFeedbackEligible = (weekNum: number, isComingSoon: boolean) => {
    if (isComingSoon) return false
    const st = getStudentWeekStatus(weekNum)
    return st === 'completed'
  }

  const handleFeedbackSubmitted = (weekNum: number) => {
    setSubmittedFeedbackWeeks(prev => new Set(prev).add(weekNum))
    setFeedbackModalWeek(null)
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Header */}
        <div className={cn('transition-opacity duration-500', isMounted ? 'opacity-100' : 'opacity-0')}>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20">
              <BookMarked className="w-7 h-7 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-neutral mb-2 leading-tight">
                Start Weekly Learning
              </h1>
              <div className="text-sm sm:text-base text-neutral-light flex items-center gap-2 font-medium">
                <Target className="w-4 h-4 text-primary" />
                <span>Choose a week to begin your learning journey</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-neutral-light">Loading available weeks...</p>
            </div>
          </div>
        ) : (
          /* ── Weeks Table ─────────────────────────────────────────────────── */
          <Card className="overflow-hidden">
            {/* Header Info */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">{weeklySchedule.length} weeks</span>
                  <span>•</span>
                  <span>DSA &amp; Aptitude course roadmap</span>
                </div>
                <div className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">WEEK</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">PRACTICALS</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">STATUS</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      <span className="flex items-center justify-end gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                        FEEDBACK
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySchedule.map((week: any, index: number) => {
                    const weekNum = week.week || index + 1
                    const studentStatus = getStudentWeekStatus(weekNum)
                    const isActive = studentStatus === 'start' || studentStatus === 'in_progress'
                    const isCompleted = studentStatus === 'completed'
                    const isLocked = studentStatus === 'locked' || !studentStatus
                    const isComingSoon = week.isComingSoon || false
                    const feedbackEligible = isFeedbackEligible(weekNum, isComingSoon)
                    const feedbackDone = submittedFeedbackWeeks.has(weekNum)

                    return (
                      <tr
                        key={weekNum}
                        className={cn(
                          'group border-b border-gray-200 transition-all duration-300',
                          isActive && !isComingSoon && 'bg-blue-50/50',
                          isCompleted && !isComingSoon && 'bg-green-50/50',
                          !isLocked && !isComingSoon && 'hover:bg-gray-50 cursor-pointer hover:shadow-sm',
                          (isLocked || isComingSoon) && 'opacity-50'
                        )}
                        onClick={() => !isLocked && !isComingSoon && handleStartWeek(weekNum, studentStatus)}
                      >
                        {/* WEEK Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {isActive && !isComingSoon && (
                              <div className="w-1 h-16 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                            {isCompleted && !isComingSoon && (
                              <div className="w-1 h-16 bg-green-500 rounded-full flex-shrink-0" />
                            )}
                            {(!isActive && !isCompleted) || isComingSoon ? (
                              <div className="w-1 h-16 bg-transparent flex-shrink-0" />
                            ) : null}
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-lg font-bold text-base transition-all duration-300 flex-shrink-0',
                                isCompleted && !isComingSoon && 'bg-green-600 text-white shadow-md',
                                isActive && !isComingSoon && 'bg-blue-600 text-white shadow-md',
                                (isLocked || isComingSoon) && 'bg-gray-200 text-gray-500 border border-gray-300'
                              )}>
                                {isCompleted && !isComingSoon ? (
                                  <CheckCircle2 className="w-5 h-5" />
                                ) : weekNum}
                              </div>
                              <div>
                                <div className="font-bold text-base text-gray-900">Week {weekNum}</div>
                                <div className="text-xs text-gray-600">{week.title || 'Course Content'}</div>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* PRACTICALS Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'flex items-center justify-center w-10 h-10 rounded-lg font-bold text-base flex-shrink-0',
                              isActive && !isComingSoon ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                            )}>
                              {weekNum}
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="text-sm font-semibold text-gray-900">
                                {week.practicals ?? 2} practicals
                              </div>
                              {isActive && !isComingSoon && (
                                <Badge
                                  variant="primary"
                                  className="text-xs px-2 py-0.5 w-fit bg-blue-100 text-blue-700 border border-blue-200"
                                >
                                  Current
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* STATUS Column */}
                        <td className="px-6 py-4 text-right">
                          {isComingSoon ? (
                            <Badge
                              variant="secondary"
                              className="text-xs px-3 py-1.5 font-semibold bg-amber-100 text-amber-700 border border-amber-200 ml-auto w-fit"
                            >
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                <span>Coming Soon</span>
                              </span>
                            </Badge>
                          ) : studentStatus === 'start' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartWeek(weekNum, studentStatus)
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 ml-auto"
                            >
                              <Clock className="w-4 h-4" />
                              Start
                            </button>
                          ) : isActive ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartWeek(weekNum, studentStatus)
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 ml-auto"
                            >
                              <Play className="w-4 h-4" />
                              Resume
                            </button>
                          ) : isCompleted ? (
                            <Badge
                              variant="secondary"
                              className="text-xs px-3 py-1.5 font-semibold bg-green-600 text-white border-0 ml-auto w-fit"
                            >
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completed</span>
                              </span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="default"
                              className="text-xs px-3 py-1.5 font-semibold bg-gray-100 text-gray-600 border border-gray-300 ml-auto w-fit"
                            >
                              <span className="flex items-center gap-1.5">
                                <Lock className="w-3 h-3" />
                                <span>Locked</span>
                              </span>
                            </Badge>
                          )}
                        </td>

                        {/* FEEDBACK Column — mandatory for all accessible weeks */}
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {feedbackEligible ? (
                            feedbackDone ? (
                              /* Already submitted */
                              <Badge
                                variant="secondary"
                                className="text-xs px-3 py-1.5 font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 ml-auto w-fit"
                              >
                                <span className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Done ✓
                                </span>
                              </Badge>
                            ) : (
                              /* Not yet submitted — mandatory CTA */
                              <button
                                disabled={checkingFeedback}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFeedbackModalWeek(weekNum)
                                }}
                                className={cn(
                                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 ml-auto',
                                  'bg-amber-500 hover:bg-amber-600 text-white',
                                  'animate-pulse-once'
                                )}
                              >
                                <MessageSquare className="w-4 h-4" />
                                Give Feedback
                              </button>
                            )
                          ) : (
                            /* Locked / coming soon — show dash */
                            <span className="text-gray-300 text-lg ml-auto block text-right">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && weeklySchedule.length === 0 && (
          <Card className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-neutral-light mx-auto mb-4" />
            <h3 className="text-xl font-bold text-neutral mb-2">No Weeks Available</h3>
            <p className="text-neutral-light">Check back later for new learning content.</p>
          </Card>
        )}

        {/* Quick Stats */}
        {!isLoading && weeklySchedule.length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-primary/10 via-background-surface to-secondary/10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/20">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-neutral-light">Total Weeks</p>
                  <p className="text-2xl font-bold text-neutral">{weeklySchedule.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-secondary/20">
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-neutral-light">Completed</p>
                  <p className="text-2xl font-bold text-neutral">
                    {weeklySchedule.filter((w: any, i: number) =>
                      getStudentWeekStatus(w.week || i + 1) === 'completed'
                    ).length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-amber-100">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-light">Feedback Given</p>
                  <p className="text-2xl font-bold text-neutral">{submittedFeedbackWeeks.size}</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Weekly Feedback Modal */}
      {feedbackModalWeek !== null && (
        <WeeklyFeedbackModal
          weekNumber={feedbackModalWeek}
          onClose={() => setFeedbackModalWeek(null)}
          onSubmitted={() => handleFeedbackSubmitted(feedbackModalWeek)}
        />
      )}
    </StudentLayout>
  )
}
