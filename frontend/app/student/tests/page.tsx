'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  FileText,
  Clock,
  CheckCircle2,
  Lock,
  Calendar,
  Target,
  TrendingUp,
  Award,
  AlertCircle,
  Play,
  RefreshCw,
  Brain,
  Calculator,
} from 'lucide-react'
import { getAuthHeader } from '@/utils/auth'

/**
 * Student Tests Page
 * List all available and completed tests
 * Route: /student/tests
 */
export default function StudentTestsPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'completed' | 'locked'>('all')
  const [isMounted, setIsMounted] = useState(false)
  const [tests, setTests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [weeklyTestEligibility, setWeeklyTestEligibility] = useState<any>(null)
  const [stats, setStats] = useState({
    completed: 0,
    upcoming: 0,
    locked: 0,
    averageScore: 0,
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    setIsMounted(true)
    fetchTests()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true)
      fetchTests().finally(() => {
        setIsRefreshing(false)
        setLastRefresh(new Date())
      })
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchTests()
      setLastRefresh(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }

  // Check weekly test eligibility
  const checkWeeklyTestEligibility = async (week: number) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error('[WeeklyTestEligibility] No auth token found')
        return null
      }

      const response = await fetch(`${apiBaseUrl}/student-progress/check-weekly-test-eligibility`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ week, track: 'dsa' }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          return data.data
        }
      }
      return null
    } catch (error) {
      console.error('Error checking weekly test eligibility:', error)
      return null
    }
  }

  const fetchTests = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      // Check eligibility for Week 1 weekly test
      const eligibility = await checkWeeklyTestEligibility(1)
      setWeeklyTestEligibility(eligibility)

      const response = await fetch(`${apiBaseUrl}/exam/list`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {},
          projection: {},
          options: { sort: { exam_date: -1 } }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data && data.data.length > 0) {
          // Transform API data to match UI format
          const transformedTests = data.data.map((exam: any, index: number) => {
            const examDate = exam.exam_date ? new Date(exam.exam_date) : new Date()
            const now = new Date()
            const isPast = examDate < now
            const hasScore = exam.score !== undefined && exam.score !== null
            const isWeeklyTest = exam.exam_type === 'weekly'

            let status = 'locked'
            if (hasScore && isPast) {
              status = 'completed'
            } else if (!isPast && !hasScore) {
              // For weekly tests, check eligibility
              if (isWeeklyTest && eligibility && !eligibility.eligible) {
                status = 'locked' // Lock if not eligible
              } else {
                status = 'upcoming'
              }
            }

            return {
              id: exam._id || index,
              title: exam.exam_name || exam.exam_title || `Exam ${index + 1}`,
              type: isWeeklyTest ? 'weekly' : 'mini',
              date: exam.exam_date || examDate.toISOString().split('T')[0],
              time: exam.exam_time || '10:00 AM',
              modules: exam.modules || exam.topics || [],
              difficulty: exam.difficulty || 'Medium',
              status: status,
              score: exam.score,
              duration: exam.duration || '60 minutes',
              questions: exam.total_questions || exam.questions_count || 30,
              isWeeklyTest: isWeeklyTest,
              eligibility: isWeeklyTest ? eligibility : null,
            }
          })

          setTests(transformedTests)

          // Calculate stats
          const completed = transformedTests.filter((t: any) => t.status === 'completed').length
          const upcoming = transformedTests.filter((t: any) => t.status === 'upcoming').length
          const locked = transformedTests.filter((t: any) => t.status === 'locked').length
          const completedWithScores = transformedTests.filter((t: any) => t.status === 'completed' && t.score !== undefined)
          const avgScore = completedWithScores.length > 0
            ? Math.round(completedWithScores.reduce((sum: number, t: any) => sum + (t.score || 0), 0) / completedWithScores.length)
            : 0

          setStats({
            completed,
            upcoming,
            locked,
            averageScore: avgScore,
          })
        } else {
          // No exams in DB: show fallback – daily tests of current week + Capstone + Weekly Aptitude
          const authHeader = getAuthHeader()
          let currentWeek = 1
          if (authHeader) {
            try {
              const summaryRes = await fetch(`${apiBaseUrl}/student-progress/summary`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                body: JSON.stringify({}),
              })
              if (summaryRes.ok) {
                const summaryData = await summaryRes.json()
                if (summaryData.success && summaryData.data?.currentWeek != null) {
                  currentWeek = Math.min(6, Math.max(1, summaryData.data.currentWeek))
                }
              }
            } catch (_) { /* keep currentWeek 1 */ }
          }
          const baseDate = new Date()
          baseDate.setDate(baseDate.getDate() + 1)
          const dateStr = baseDate.toISOString().split('T')[0]
          const fallbackTests: any[] = []
          // Daily tests for current week (Day 1–5) – link to Learning for that day
          const studyBase = currentWeek === 1 ? '/student/study/week-1' : `/student/study/${currentWeek}`
          for (let d = 1; d <= 5; d++) {
            fallbackTests.push({
              id: `daily-${currentWeek}-day-${d}`,
              title: `Week ${currentWeek} Day ${d} Test`,
              type: 'daily',
              date: dateStr,
              time: '—',
              modules: ['DSA & Aptitude'],
              difficulty: 'Mixed',
              status: 'upcoming',
              duration: '—',
              questions: 0,
              isWeeklyTest: false,
              eligibility: null,
              href: `${studyBase}?day=day-${d}`,
            })
          }
          // Capstone + Weekly Aptitude
          fallbackTests.push(
            { id: 'capstone-fallback', title: `Week ${currentWeek} Capstone Project`, type: 'weekly', date: dateStr, time: '—', modules: ['DSA'], difficulty: 'Coding', status: 'upcoming', duration: '—', questions: 2, isWeeklyTest: true, eligibility: null, href: `/student/capstone-test/week-${currentWeek}` },
            { id: 'aptitude-fallback', title: `Week ${currentWeek} Aptitude Test`, type: 'weekly', date: dateStr, time: '—', modules: ['Aptitude'], difficulty: 'Mixed', status: 'upcoming', duration: '60 minutes', questions: 50, isWeeklyTest: true, eligibility, href: `/student/aptitude/weekly/${currentWeek}` },
          )
          setTests(fallbackTests)
          setStats({ completed: 0, upcoming: fallbackTests.length, locked: 0, averageScore: 0 })
        }
      } else {
        setTests([])
      }
    } catch (error) {
      console.error('Error fetching tests:', error)
      setTests([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTests = tests.filter((test) => {
    if (activeFilter === 'all') return true
    return test.status === activeFilter
  })

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-700 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2 leading-tight">
              Tests & Assessments
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              View and take your weekly tests and module assessments
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/student/aptitude/weekly"
              className="px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border border-accent/30"
            >
              <Calculator className="w-4 h-4" />
              Weekly Aptitude
            </Link>
            <Link
              href="/student/tests/practice-history"
              className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border border-primary/30"
            >
              <Brain className="w-4 h-4" />
              Practice Test History
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-secondary/10 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light">Completed</p>
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-secondary tabular-nums">
                {stats.completed}
              </p>
              <p className="text-xs text-neutral-light">Tests done</p>
            </div>
          </Card>

          <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light">Upcoming</p>
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-primary tabular-nums">
                {stats.upcoming}
              </p>
              <p className="text-xs text-neutral-light">Available soon</p>
            </div>
          </Card>

          <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-accent/10 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light">Average Score</p>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-accent tabular-nums">
                {stats.averageScore}%
              </p>
              <p className="text-xs text-neutral-light">Across all tests</p>
            </div>
          </Card>

          <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light">Locked</p>
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-light" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-neutral-light tabular-nums">
                {stats.locked}
              </p>
              <p className="text-xs text-neutral-light">Not available yet</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {(['all', 'upcoming', 'completed', 'locked'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95 capitalize ${activeFilter === filter
                ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                : 'bg-background-surface text-neutral-light hover:bg-background-elevated hover:text-neutral border border-neutral-light/20 hover:border-primary/30 hover:shadow-md'
                }`}
            >
              {filter === 'all' ? 'All Tests' : filter}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="text-center py-12">
            <Clock className="w-12 h-12 text-neutral-light mx-auto mb-4 animate-spin" />
            <p className="text-neutral-light">Loading tests...</p>
          </Card>
        )}

        {/* Tests List */}
        {!isLoading && (
          <div className="space-y-3 sm:space-y-4">
            {filteredTests.map((test, index) => (
              <Card
                key={test.id}
                className={`transition-all duration-500 hover:shadow-xl animate-fade-in-up ${test.status === 'completed'
                  ? 'border-secondary/30 bg-secondary/5'
                  : test.status === 'upcoming'
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-neutral-light/20 bg-background-elevated opacity-60'
                  }`}
                style={{ animationDelay: `${400 + index * 50}ms` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start sm:items-center gap-3 mb-3">
                      <div
                        className={`p-2 sm:p-3 rounded-lg ${test.status === 'completed'
                          ? 'bg-secondary/20'
                          : test.status === 'upcoming'
                            ? 'bg-primary/20'
                            : 'bg-neutral-light/20'
                          }`}
                      >
                        <FileText
                          className={`w-5 h-5 sm:w-6 sm:h-6 ${test.status === 'completed'
                            ? 'text-secondary'
                            : test.status === 'upcoming'
                              ? 'text-primary'
                              : 'text-neutral-light'
                            }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-neutral text-base sm:text-lg">
                            {test.title}
                          </h3>
                          <Badge
                            variant={
                              test.type === 'weekly' ? 'primary' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {test.type === 'weekly' ? 'Weekly' : test.type === 'daily' ? 'Daily' : 'Mini-Test'}
                          </Badge>
                          {test.status === 'locked' && (
                            <Badge variant="default" className="text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-neutral-light mb-2">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            {new Date(test.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            {test.time}
                          </span>
                          <Badge variant="default" className="text-xs">
                            {test.difficulty}
                          </Badge>
                          <span>• {test.duration}</span>
                          <span>• {test.questions} questions</span>
                        </div>
                        {test.modules && test.modules.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {test.modules.map((module: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {module}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {test.status === 'completed' && test.score !== undefined && (
                          <div className="mt-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-secondary" />
                            <span className="text-sm font-semibold text-secondary">
                              Score: {test.score}%
                            </span>
                          </div>
                        )}
                        {/* Show eligibility requirements for weekly tests */}
                        {test.isWeeklyTest && test.eligibility && !test.eligibility.eligible && test.status === 'locked' && (
                          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-start gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-yellow-600 mb-2">
                                  Requirements Not Met
                                </p>
                                <div className="space-y-1.5 text-xs text-neutral-light">
                                  {/* Practice Test Requirements */}
                                  {!test.eligibility.practice_tests.eligible && (
                                    <div>
                                      <p className="font-medium text-yellow-600 mb-1">Practice Tests:</p>
                                      <ul className="list-disc list-inside ml-2 space-y-0.5">
                                        {test.eligibility.practice_tests.missing.length > 0 && (
                                          <li>Missing tests for: {test.eligibility.practice_tests.missing.join(', ')}</li>
                                        )}
                                        {test.eligibility.practice_tests.failed.length > 0 && (
                                          <li>Need ≥70% on: {test.eligibility.practice_tests.failed.map((f: any) => `${f.day} (current: ${f.score}%)`).join(', ')}</li>
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                  {/* Coding Problems Requirements */}
                                  {!test.eligibility.coding_problems.eligible && (
                                    <div>
                                      <p className="font-medium text-yellow-600 mb-1">Coding Problems:</p>
                                      <p>Complete all coding problems ({test.eligibility.coding_problems.completed}/{test.eligibility.coding_problems.total} completed)</p>
                                    </div>
                                  )}
                                  <p className="text-xs mt-2 pt-2 border-t border-yellow-500/20">
                                    <strong>Requirements:</strong> Score ≥70% on all practice tests + Complete all coding problems
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:flex-shrink-0">
                    {test.status === 'completed' && (
                      <Button variant="secondary" className="text-xs sm:text-sm">
                        View Results
                      </Button>
                    )}
                    {test.status === 'upcoming' && (test.href ? (
                      <Button
                        variant="primary"
                        className="text-xs sm:text-sm"
                        onClick={() => {
                          if (test.href.includes('capstone-test')) {
                            window.open(test.href, 'Capstone', 'width=1200,height=800,scrollbars=yes,resizable=yes')
                          } else {
                            router.push(test.href)
                          }
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Test
                      </Button>
                    ) : (
                      <Button variant="primary" className="text-xs sm:text-sm">
                        <Play className="w-4 h-4 mr-2" />
                        Start Test
                      </Button>
                    ))}
                    {test.status === 'locked' && (
                      <div className="flex items-center text-xs text-neutral-light">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {test.isWeeklyTest && test.eligibility && !test.eligibility.eligible
                          ? 'Requirements not met'
                          : 'Complete previous modules'}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredTests.length === 0 && (
          <Card className="text-center py-12">
            <FileText className="w-12 h-12 text-neutral-light mx-auto mb-4" />
            <p className="text-neutral-light">No tests found for this filter.</p>
            <p className="text-sm text-neutral-light/70 mt-2">Start your journey to see available tests</p>
          </Card>
        )}
      </div>
    </StudentLayout >
  )
}
