'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAuthHeader } from '@/utils/auth'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Users,
  Calendar,
  CheckCircle2,
  Sparkles,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileText,
} from 'lucide-react'

// Import custom chart components
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { PieChart } from '@/components/charts/PieChart'
import { AreaChart } from '@/components/charts/AreaChart'
import { LearningPath } from '@/components/ai/LearningPath'
import { PerformanceAnalysis } from '@/components/ai/PerformanceAnalysis'

/**
 * Hook for number counting animation
 */
function useCountUp(end: number, duration: number = 2000, start: number = 0): number {
  const [count, setCount] = useState(start)
  const startTimeRef = React.useRef<number | null>(null)
  const rafRef = React.useRef<number>()

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime
      }
      const progress = Math.min((currentTime - startTimeRef.current) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(start + (end - start) * easeOutQuart))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [end, duration, start])

  return count
}

/**
 * Student Analytics Page
 * Displays detailed performance analytics and progress tracking in graph form
 * Route: /student/analytics
 */
export default function StudentAnalyticsPage() {
  const [activeView, setActiveView] = useState<'overview' | 'progress' | 'rank'>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [performanceData, setPerformanceData] = useState({
    overallScore: 0,
    testsCompleted: 0,
    totalTests: 0,
    averageScore: 0,
    improvement: 0,
    rank: 0,
    totalStudents: 0,
    rankChange: 0,
  })
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([])
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([])
  const [monthlyScoreTrend, setMonthlyScoreTrend] = useState<any[]>([])
  const [rankHistory, setRankHistory] = useState<any[]>([])

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [aiWeek, setAiWeek] = useState(1)

  useEffect(() => {
    setIsMounted(true)
    fetchAnalytics()
  }, [])



  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchAnalytics()
      setLastRefresh(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

      // Fetch both Exams and Practice Tests in parallel
      console.log('Fetching analytics data...')

      const authHeader = getAuthHeader()
      // Helper to fetch DSA progress for a specific week
      const fetchDSAProgress = async (week: number) => {
        try {
          const res = await fetch(`${apiBaseUrl}/coding-problems/progress/${week}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader || ''
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.completedDailyProblems > 0) {
              return {
                exam_name: `DSA Week ${week} Practice`,
                week: week,
                day: 'dsa-progress',
                // Calculate score based on completion of daily problems
                score: data.totalDailyProblems > 0
                  ? Math.round((data.completedDailyProblems / data.totalDailyProblems) * 100)
                  : 0,
                totalQuestions: data.totalDailyProblems,
                correctAnswers: data.completedDailyProblems,
                exam_date: new Date(), // Use current date as we don't have exact completion time
                modules: ['DSA'],
                topics: ['Data Structures', 'Algorithms'],
                isPractice: true,
                type: 'dsa'
              };
            }
          }
        } catch (e) {
          console.error(`Error fetching DSA progress for week ${week}`, e);
        }
        return null;
      };

      const [examResponse, practiceResponse, ...dsaResponses] = await Promise.all([
        fetch(`${apiBaseUrl}/exam/list`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader || ''
          },
          body: JSON.stringify({ filter: {}, projection: {}, options: { sort: { exam_date: 1 } } }),
        }),
        fetch(`${apiBaseUrl}/practice-test/list`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader || ''
          },
          body: JSON.stringify({ filter: {}, options: { sort: { created_at: 1 } } }),
        }),
        // Fetch DSA progress for weeks 1-6
        fetchDSAProgress(1),
        fetchDSAProgress(2),
        fetchDSAProgress(3),
        fetchDSAProgress(4),
        fetchDSAProgress(5),
        fetchDSAProgress(6),
      ])

      let allExams: any[] = []

      // Process Exams
      if (examResponse.ok) {
        const data = await examResponse.json()
        console.log('Exam API Response:', data)
        if (data.success && data.data) {
          allExams = [...allExams, ...data.data]
        }
      } else {
        console.error('Exam API Failed:', examResponse.status, examResponse.statusText)
      }

      // Process Practice Tests and normalize key fields
      if (practiceResponse.ok) {
        const data = await practiceResponse.json()
        console.log('Practice API Response:', data)
        if (data.success && data.data) {
          const practiceTests = data.data.map((test: any) => ({
            ...test,
            exam_name: test.day === 'weekly-test' ? `Weekly Test ${test.week}` : `Practice ${test.week} - ${test.day}`,
            exam_date: test.completed_at || test.created_at,
            score: test.score, // Already percentage
            modules: [test.category || 'Aptitude'], // Normalize category to modules
            topics: test.category ? [test.category] : ['General'],
            isPractice: true
          }))
          allExams = [...allExams, ...practiceTests]
        }
      } else {
        console.error('Practice API Failed:', practiceResponse.status, practiceResponse.statusText)
      }

      // Process DSA Progress
      dsaResponses.forEach((dsaItem: any) => {
        if (dsaItem) {
          allExams.push(dsaItem);
        }
      });

      console.log('Combined Exams Data:', allExams)

      // Sort by date
      allExams.sort((a, b) => {
        const dateA = new Date(a.exam_date || a.created_at).getTime()
        const dateB = new Date(b.exam_date || b.created_at).getTime()
        return dateA - dateB
      })

      // Calculate performance metrics using allExams
      const completedExams = allExams.filter((exam: any) => exam.score !== undefined && exam.score !== null)
      const totalExams = completedExams.length // Using completed count as total since practice tests are only saved when completed
      const avgScore = completedExams.length > 0
        ? Math.round(completedExams.reduce((sum: number, exam: any) => sum + (Number(exam.score) || 0), 0) / completedExams.length)
        : 0

      // Calculate improvement (compare last month vs previous month)
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1)

      const lastMonthExams = completedExams.filter((exam: any) => {
        const examDate = exam.exam_date ? new Date(exam.exam_date) : new Date()
        return examDate >= lastMonth && examDate < now
      })

      const previousMonthExams = completedExams.filter((exam: any) => {
        const examDate = exam.exam_date ? new Date(exam.exam_date) : new Date()
        return examDate >= previousMonth && examDate < lastMonth
      })

      const lastMonthAvg = lastMonthExams.length > 0
        ? Math.round(lastMonthExams.reduce((sum: number, exam: any) => sum + (Number(exam.score) || 0), 0) / lastMonthExams.length)
        : 0

      const previousMonthAvg = previousMonthExams.length > 0
        ? Math.round(previousMonthExams.reduce((sum: number, exam: any) => sum + (Number(exam.score) || 0), 0) / previousMonthExams.length)
        : 0

      const improvement = previousMonthAvg > 0 ? lastMonthAvg - previousMonthAvg : 0

      // Calculate subject performance
      const subjectMap = new Map<string, { scores: number[], count: number }>()
      completedExams.forEach((exam: any) => {
        const subjects = exam.modules || exam.topics || ['General']
        const score = Number(exam.score) || 0
        subjects.forEach((subject: string) => {
          // Capitalize first letter
          const normalizedSubject = subject.charAt(0).toUpperCase() + subject.slice(1)

          if (!subjectMap.has(normalizedSubject)) {
            subjectMap.set(normalizedSubject, { scores: [], count: 0 })
          }
          const data = subjectMap.get(normalizedSubject)!
          data.scores.push(score)
          data.count++
        })
      })

      const subjectPerf = Array.from(subjectMap.entries()).map(([subject, data]) => ({
        subject,
        score: Math.round(data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length),
        tests: data.count,
        trend: 'up' as const,
      }))

      // Weekly progress by course/syllabus week (Week 1–6), not calendar week
      const weeklyData: any[] = []
      for (let weekNum = 1; weekNum <= 6; weekNum++) {
        const weekExams = completedExams.filter((exam: any) => Number(exam.week) === weekNum)
        const weekAvg = weekExams.length > 0
          ? Math.round(weekExams.reduce((sum: number, exam: any) => sum + (Number(exam.score) || 0), 0) / weekExams.length)
          : 0
        weeklyData.push({
          week: `Week ${weekNum}`,
          score: weekAvg,
        })
      }

      // Calculate monthly trend (last 6 months)
      const monthlyData: any[] = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

        const monthExams = completedExams.filter((exam: any) => {
          const examDate = exam.exam_date ? new Date(exam.exam_date) : new Date()
          return examDate >= monthStart && examDate <= monthEnd
        })

        const monthAvg = monthExams.length > 0
          ? Math.round(monthExams.reduce((sum: number, exam: any) => sum + (Number(exam.score) || 0), 0) / monthExams.length)
          : 0

        monthlyData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          score: monthAvg,
          average: monthAvg, // In real app, this would be batch average
        })
      }

      setPerformanceData({
        overallScore: avgScore,
        testsCompleted: completedExams.length,
        totalTests: totalExams,
        averageScore: avgScore,
        improvement,
        rank: 0, // Would need separate API for ranking
        totalStudents: 0, // Would need separate API
        rankChange: 0,
      })

      setSubjectPerformance(subjectPerf)
      setWeeklyProgress(weeklyData)
      setMonthlyScoreTrend(monthlyData)
      setRankHistory([]) // Would need separate API for rank history
      setIsLoading(false)

    } catch (error) {
      console.error('Error fetching analytics:', error)
      setIsLoading(false)
    }
  }

  const testCompletionData = [
    { name: 'Completed', value: performanceData.testsCompleted, color: '#10B981' },
    { name: 'Remaining', value: Math.max(0, performanceData.totalTests - performanceData.testsCompleted), color: '#64748B' },
  ]

  const subjectComparison = subjectPerformance.map((subj) => ({
    name: subj.subject,
    score: subj.score,
    tests: subj.tests,
  }))

  const achievements = [
    { id: 1, title: 'Consistency Master', description: '7 days streak', icon: Award, unlocked: performanceData.testsCompleted >= 7, color: 'from-yellow-400 to-orange-500' },
    { id: 2, title: 'Test Champion', description: 'Completed 20 tests', icon: CheckCircle2, unlocked: performanceData.testsCompleted >= 20, color: 'from-green-400 to-emerald-500' },
    { id: 3, title: 'Top Performer', description: 'Rank in top 10%', icon: Target, unlocked: false, color: 'from-blue-400 to-indigo-500' },
    { id: 4, title: 'Perfect Week', description: '100% attendance', icon: Calendar, unlocked: false, color: 'from-purple-400 to-pink-500' },
  ]

  const COLORS = {
    primary: '#4F46E5',
    secondary: '#10B981',
    accent: '#F59E0B',
    neutral: '#64748B',
  }

  // Animated counters
  const overallScoreCount = useCountUp(performanceData.overallScore, 1500)
  const testsCompletedCount = useCountUp(performanceData.testsCompleted, 1200)
  const averageScoreCount = useCountUp(performanceData.averageScore, 1500)

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto space-y-6 p-6">
          <Card className="text-center py-16">
            <div className="inline-block mb-4">
              <BarChart3 className="w-16 h-16 text-primary mx-auto animate-spin" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-neutral">Loading analytics...</p>
              <p className="text-sm text-neutral-light">Crunching your performance data</p>
            </div>
          </Card>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Enhanced Header */}
        <div className={`flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all duration-700 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral mb-1">
                    Performance Analytics
                  </h1>
                  {isRefreshing && (
                    <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                  )}
                </div>
                <div className="text-neutral-light flex items-center gap-2 flex-wrap">
                  <Activity className="w-4 h-4 shrink-0" />
                  <span>Track your progress, identify strengths, and improve weak areas</span>
                  {lastRefresh && (
                    <span className="text-xs text-neutral-light/80">
                      · Last updated: {lastRefresh.toLocaleDateString() === new Date().toLocaleDateString()
                        ? 'Today'
                        : lastRefresh.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      , {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>

        {/* Enhanced View Selector */}
        <div className={`flex flex-wrap gap-3 transition-all duration-700 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`} style={{ transitionDelay: '100ms' }}>
          {(['overview', 'progress', 'rank'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${activeView === view
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-background-surface text-neutral-light hover:bg-background-elevated hover:text-neutral border border-neutral-light/20'
                }`}
            >
              {view === 'overview' && 'Performance Overview'}
              {view === 'progress' && 'Progress Tracking'}
              {view === 'rank' && 'Rank & Comparison'}
            </button>
          ))}
        </div>

        {/* Overview View */}
        {activeView === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Enhanced Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-neutral-light/15 bg-background-surface">
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-neutral-light mb-2 font-medium">Overall Score</p>
                      <p className="text-4xl sm:text-5xl font-heading font-bold text-primary mb-2 tabular-nums">
                        {overallScoreCount}%
                      </p>
                      {performanceData.improvement !== 0 && (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${performanceData.improvement > 0 ? 'text-secondary' : 'text-red-500'
                          }`}>
                          {performanceData.improvement > 0 ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          {performanceData.improvement > 0 ? '+' : ''}{performanceData.improvement}% this month
                        </div>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10">
                      <BarChart3 className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  {performanceData.testsCompleted > 0 ? (
                    <div className="mt-4 pt-4 border-t border-neutral-light/10">
                      <div className="w-full bg-neutral-light/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(overallScoreCount, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-light mt-3">Complete a test to get started</p>
                  )}
                </div>
              </Card>

              <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-neutral-light/15 bg-background-surface">
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-neutral-light mb-2 font-medium">Tests Completed</p>
                      <p className="text-4xl sm:text-5xl font-heading font-bold text-secondary mb-2 tabular-nums">
                        {testsCompletedCount}
                      </p>
                      <p className="text-xs text-neutral-light">
                        {performanceData.totalTests > 0 ? `of ${performanceData.totalTests} total` : 'No tests yet'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/10">
                      <CheckCircle2 className="w-7 h-7 text-secondary" />
                    </div>
                  </div>
                  {performanceData.totalTests > 0 ? (
                    <div className="mt-4 pt-4 border-t border-neutral-light/10">
                      <div className="w-full bg-neutral-light/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-secondary to-emerald-500/80 rounded-full transition-all duration-700"
                          style={{ width: `${(testsCompletedCount / performanceData.totalTests) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-light mt-3">Complete practice or weekly tests</p>
                  )}
                </div>
              </Card>

              <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-neutral-light/15 bg-background-surface">
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-neutral-light mb-2 font-medium">Average Score</p>
                      <p className="text-4xl sm:text-5xl font-heading font-bold text-primary mb-2 tabular-nums">
                        {averageScoreCount}%
                      </p>
                      <p className="text-xs text-neutral-light">Across all tests</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Target className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  {performanceData.testsCompleted > 0 ? (
                    <div className="mt-4 pt-4 border-t border-neutral-light/10">
                      <div className="w-full bg-neutral-light/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(averageScoreCount, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-light mt-3">Complete tests to see your average</p>
                  )}
                </div>
              </Card>

              <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-neutral-light/15 bg-background-surface">
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-neutral-light mb-2 font-medium">Current Rank</p>
                      <p className="text-4xl sm:text-5xl font-heading font-bold text-accent mb-2 tabular-nums">
                        {performanceData.rank > 0 ? `#${performanceData.rank}` : 'N/A'}
                      </p>
                      {performanceData.rankChange !== 0 && (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${performanceData.rankChange > 0 ? 'text-secondary' : 'text-red-500'
                          }`}>
                          {performanceData.rankChange > 0 ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          {performanceData.rankChange > 0 ? '↑' : '↓'} {Math.abs(performanceData.rankChange)} positions
                        </div>
                      )}
                      {performanceData.rank <= 0 && (
                        <p className="text-xs text-neutral-light">Complete tests to get ranked</p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-accent/10">
                      <Users className="w-7 h-7 text-accent" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Subject Performance Bar Chart */}
            {subjectPerformance.length > 0 && (
              <Card className="border border-neutral-light/15 bg-background-surface">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-heading font-bold text-neutral">
                      Subject-wise Performance
                    </h2>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-background-elevated/50">
                  <BarChart
                    data={subjectComparison.map((subj) => ({
                      name: subj.name,
                      value: subj.score,
                      value2: subj.tests * 10,
                    }))}
                    height={300}
                    color={COLORS.primary}
                    color2={COLORS.secondary}
                    label1="Score (%)"
                    label2="Tests (scaled)"
                  />
                </div>
              </Card>
            )}

            {/* Test Completion & Monthly Score Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Test Completion */}
              <Card className="border border-neutral-light/15 bg-background-surface">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <Target className="w-5 h-5 text-secondary" />
                  </div>
                  <h2 className="text-lg font-semibold text-neutral">
                    Test Completion Status
                  </h2>
                </div>
                {performanceData.totalTests > 0 ? (
                  <div className="flex justify-center p-6">
                    <div className="relative">
                      <PieChart data={testCompletionData} size={220} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-neutral">{performanceData.testsCompleted}</p>
                          <p className="text-sm text-neutral-light">of {performanceData.totalTests}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="p-4 rounded-full bg-neutral-light/10 mb-4">
                      <FileText className="w-10 h-10 text-neutral-light" />
                    </div>
                    <p className="font-medium text-neutral mb-1">No tests yet</p>
                    <p className="text-sm text-neutral-light mb-4 max-w-xs">Complete practice or weekly tests to see your progress here.</p>
                    <Link
                      href="/student/tests"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Go to Tests →
                    </Link>
                  </div>
                )}
              </Card>

              {/* Monthly Score Trend */}
              <Card className="border border-neutral-light/15 bg-background-surface">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-neutral">
                    Monthly Score Trend
                  </h2>
                </div>
                {performanceData.testsCompleted > 0 ? (
                  <div className="p-4 rounded-lg bg-background-elevated/50">
                    <AreaChart
                      data={monthlyScoreTrend.map((item) => ({
                        label: item.month,
                        value: item.score,
                        value2: item.average,
                      }))}
                      height={280}
                      color={COLORS.primary}
                      color2={COLORS.secondary}
                      label1="Your Score"
                      label2="Batch Average"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="p-4 rounded-full bg-neutral-light/10 mb-4">
                      <TrendingUp className="w-10 h-10 text-neutral-light" />
                    </div>
                    <p className="font-medium text-neutral mb-1">No score data yet</p>
                    <p className="text-sm text-neutral-light mb-4 max-w-xs">Complete your first test to see your score trend over time.</p>
                    <Link
                      href="/student/tests"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Go to Tests →
                    </Link>
                  </div>
                )}
              </Card>
            </div>

            {/* CTA when no data */}
            {performanceData.testsCompleted === 0 && (
              <Card className="border border-dashed border-primary/30 bg-primary/5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <BarChart3 className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral">Ready to get started?</h3>
                      <p className="text-sm text-neutral-light">Take a practice or weekly test to unlock your analytics and track progress.</p>
                    </div>
                  </div>
                  <Link
                    href="/student/tests"
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Go to Tests
                  </Link>
                </div>
              </Card>
            )}

            {/* AI insights: week selector + components */}
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-neutral">AI insights for week</span>
                <select
                  value={aiWeek}
                  onChange={(e) => setAiWeek(Number(e.target.value))}
                  className="rounded-lg border border-neutral-light/30 bg-background-surface px-3 py-2 text-sm text-neutral focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {[1, 2, 3, 4, 5, 6].map((w) => (
                    <option key={w} value={w}>Week {w}</option>
                  ))}
                </select>
              </div>
              <PerformanceAnalysis
                week={aiWeek}
                analyticsContext={{
                  performanceData: {
                    overallScore: performanceData.overallScore,
                    testsCompleted: performanceData.testsCompleted,
                    averageScore: performanceData.averageScore,
                    improvement: performanceData.improvement,
                  },
                  subjectPerformance,
                  weeklyProgressSummary: weeklyProgress,
                }}
              />
              <LearningPath
                week={aiWeek}
                analyticsContext={{
                  performanceData: {
                    overallScore: performanceData.overallScore,
                    testsCompleted: performanceData.testsCompleted,
                    averageScore: performanceData.averageScore,
                  },
                  subjectPerformance,
                  weeklyProgressSummary: weeklyProgress,
                }}
              />
            </div>
          </div>
        )}

        {/* Progress Tracking View */}
        {activeView === 'progress' && (
          <div className="space-y-6 animate-fade-in">
            {weeklyProgress.length > 0 ? (
              <>
                <Card className="border border-neutral-light/15 bg-background-surface">
                  <div className="flex flex-col gap-1 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Activity className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-neutral">
                        Weekly Progress Trend
                      </h2>
                    </div>
                    <p className="text-sm text-neutral-light pl-11">
                      Score by course week (Week 1–6). Complete practice or weekly tests for a week to see progress here.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-background-elevated/50 min-h-[320px]">
                    <LineChart
                      data={weeklyProgress.map((item) => ({
                        label: item.week,
                        value: item.score,
                      }))}
                      height={320}
                      color={COLORS.primary}
                      yMin={0}
                      yMax={100}
                    />
                  </div>
                </Card>

                <Card className="border border-neutral-light/15 bg-background-surface">
                  <div className="flex flex-col gap-1 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary/10">
                        <BarChart3 className="w-5 h-5 text-secondary" />
                      </div>
                      <h2 className="text-lg font-semibold text-neutral">
                        Monthly Score Comparison
                      </h2>
                    </div>
                    <p className="text-sm text-neutral-light pl-11">
                      Your score vs batch average by month (last 6 months). Scores are 0–100.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-background-elevated/50 min-h-[340px]">
                    <BarChart
                      data={monthlyScoreTrend.map((item) => ({
                        name: item.month,
                        value: item.score,
                        value2: item.average,
                      }))}
                      height={340}
                      color={COLORS.primary}
                      color2={COLORS.secondary}
                      label1="Your Score"
                      label2="Batch Average"
                      yMax={100}
                    />
                  </div>
                </Card>
              </>
            ) : (
              <Card className="text-center py-16 border border-dashed border-neutral-light/20 bg-background-surface">
                <div className="p-4 rounded-full bg-neutral-light/10 inline-block mb-4">
                  <TrendingUp className="w-12 h-12 text-neutral-light" />
                </div>
                <h3 className="text-lg font-semibold text-neutral mb-2">No progress data yet</h3>
                <p className="text-sm text-neutral-light mb-4 max-w-sm mx-auto">Complete practice or weekly tests to see your progress over time.</p>
                <Link href="/student/tests" className="text-sm font-medium text-primary hover:underline">Go to Tests →</Link>
              </Card>
            )}
          </div>
        )}

        {/* Rank & Comparison View */}
        {activeView === 'rank' && (
          <div className="space-y-6 animate-fade-in">
            {performanceData.rank > 0 ? (
              <>
                <Card className="border border-neutral-light/15 bg-background-surface">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Users className="w-5 h-5 text-accent" />
                    </div>
                    <h2 className="text-lg font-semibold text-neutral">
                      Rank History (Lower is Better)
                    </h2>
                  </div>
                  {rankHistory.length > 0 ? (
                    <div className="p-4 rounded-xl bg-background-elevated/50">
                      <LineChart
                        data={rankHistory.map((item) => ({
                          label: item.month,
                          value: item.rank,
                        }))}
                        height={400}
                        color={COLORS.accent}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-light">
                      <Users className="w-12 h-12 mx-auto mb-4 text-neutral-light/30" />
                      Rank history will be available after more tests
                    </div>
                  )}
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border border-neutral-light/15 bg-background-surface">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Award className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-neutral">
                        Your Ranking
                      </h2>
                    </div>
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-primary via-secondary to-accent mb-6 shadow-2xl shadow-primary/30 animate-pulse">
                        <span className="text-5xl font-heading font-bold text-white">
                          #{performanceData.rank}
                        </span>
                      </div>
                      <p className="text-xl font-semibold text-neutral mb-2">
                        Out of {performanceData.totalStudents} students
                      </p>
                      <p className="text-sm text-neutral-light mb-6">
                        You&apos;re in the top {Math.round((performanceData.rank / performanceData.totalStudents) * 100)}%
                      </p>
                      {performanceData.rankChange !== 0 && (
                        <Badge variant="secondary" className="text-sm px-4 py-2">
                          {performanceData.rankChange > 0 ? (
                            <ArrowUpRight className="w-4 h-4 mr-1" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 mr-1" />
                          )}
                          Moved {performanceData.rankChange > 0 ? 'up' : 'down'} {Math.abs(performanceData.rankChange)} positions
                        </Badge>
                      )}
                    </div>
                  </Card>

                  <Card className="border border-neutral-light/15 bg-background-surface">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-secondary/10">
                        <Award className="w-5 h-5 text-secondary" />
                      </div>
                      <h2 className="text-lg font-semibold text-neutral">
                        Achievements
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {achievements.map((achievement) => {
                        const Icon = achievement.icon
                        return (
                          <div
                            key={achievement.id}
                            className={`group relative p-5 rounded-xl border transition-all duration-200 ${achievement.unlocked
                              ? `bg-gradient-to-br ${achievement.color} border-transparent shadow-lg`
                              : 'border-neutral-light/20 bg-background-elevated opacity-60'
                              }`}
                          >
                            {achievement.unlocked && (
                              <div className="absolute -top-2 -right-2">
                                <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                              </div>
                            )}
                            <Icon
                              className={`w-10 h-10 mb-3 ${achievement.unlocked ? 'text-white' : 'text-neutral-light'
                                }`}
                            />
                            <h3 className={`font-semibold text-sm mb-1 ${achievement.unlocked ? 'text-white' : 'text-neutral'
                              }`}>
                              {achievement.title}
                            </h3>
                            <p className={`text-xs ${achievement.unlocked ? 'text-white/80' : 'text-neutral-light'
                              }`}>
                              {achievement.description}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </div>
              </>
            ) : (
              <Card className="text-center py-16 border border-dashed border-neutral-light/20 bg-background-surface">
                <div className="p-4 rounded-full bg-neutral-light/10 inline-block mb-4">
                  <Users className="w-12 h-12 text-neutral-light" />
                </div>
                <h3 className="text-lg font-semibold text-neutral mb-2">Ranking not available yet</h3>
                <p className="text-sm text-neutral-light mb-4 max-w-sm mx-auto">Complete more tests to see your rank and compare with peers.</p>
                <Link href="/student/tests" className="text-sm font-medium text-primary hover:underline">Go to Tests →</Link>
              </Card>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
