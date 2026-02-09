'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { getAuthHeader } from '@/utils/auth'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Award,
  Video,
  Calendar,
  AlertCircle,
  BarChart3,
  Zap,
  FileText,
  Brain,
  List,
  FileText as FileTextIcon,
  Calendar as CalendarIcon,
  ChevronRight,
} from 'lucide-react'

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

// Track label: DSA-only weeks vs DSA & Aptitude combined
type TrackLabel = 'DSA' | 'DSA & Aptitude'

// FULL SYLLABUS DEFINITION (DSA & Aptitude curriculum)
const FULL_SYLLABUS: Array<{
  week: number
  title: string
  track: TrackLabel
  modules: string[]
  topics: string[]
  assignments: number
  tests: number
  duration: string
  isComingSoon?: boolean
}> = [
    {
      week: 1,
      title: "Foundation & Logic Building",
      track: "DSA & Aptitude",
      modules: ["Basics of Programming", "Control Structures"],
      topics: ["Input/Output", "Data Types", "Operators", "Conditional Statements", "Loops (For, While)", "Pattern Printing", "Functions"],
      assignments: 6,
      tests: 1,
      duration: "10-12 Hours"
    },
    {
      week: 2,
      title: "Arrays & Strings",
      track: "DSA & Aptitude",
      modules: ["Data Structures I", "Problem Solving"],
      topics: ["Introduction to Arrays", "Linear Search", "Binary Search", "Two Pointer Technique", "Sliding Window", "Introduction to Strings", "2D Arrays"],
      assignments: 8,
      tests: 1,
      duration: "12-15 Hours"
    },
    {
      week: 3,
      title: "Recursion & Sorting",
      track: "DSA & Aptitude",
      modules: ["Algorithms I", "Recursion Depth"],
      topics: ["Recursion Basics", "Recursion on Arrays", "Merge Sort", "Quick Sort", "Backtracking Introduction", "Space Complexity"],
      assignments: 8,
      tests: 1,
      duration: "14-16 Hours"
    },
    {
      week: 4,
      title: "Linked Lists",
      track: "DSA & Aptitude",
      modules: ["Data Structures II", "Pointers"],
      topics: ["Singly Linked List", "Doubly Linked List", "Circular Linked List", "Fast & Slow Pointers", "Reversing a Linked List", "Intersection Point"],
      assignments: 7,
      tests: 1,
      duration: "12-14 Hours"
    },
    {
      week: 5,
      title: "Stacks & Queues",
      track: "DSA & Aptitude",
      modules: ["Data Structures III", "LIFO & FIFO"],
      topics: ["Stack Implementation", "Queue Implementation", "Monotonic Stack", "Priority Queue Basics", "Circular Queue", "Applications of Stack"],
      assignments: 7,
      tests: 1,
      duration: "12-14 Hours"
    },
    {
      week: 6,
      title: "DSA & Aptitude Prep - I",
      track: "DSA & Aptitude",
      modules: ["Trees & Quant"],
      topics: ["Introduction to Trees", "Binary Trees", "Tree Traversals", "Height & Depth", "Number Systems", "Percentages", "Ratio & Proportion"],
      assignments: 5,
      tests: 1,
      duration: "14-16 Hours"
    },
    {
      week: 7,
      title: "DSA & Aptitude Prep - II",
      track: "DSA & Aptitude",
      modules: ["Graphs & Reasoning"],
      topics: ["Introduction to Graphs", "BFS & DFS", "Connected Components", "Blood Relations", "Coding-Decoding", "Direction Sense", "Seating Arrangement"],
      assignments: 5,
      tests: 1,
      duration: "14-16 Hours",
      isComingSoon: true
    },
    {
      week: 8,
      title: "Final Preparation",
      track: "DSA & Aptitude",
      modules: [],
      topics: ["Mock Tests", "Comprehensive DSA Revision", "Verbal Ability: Reading Comprehension", "Sentence Correction", "System Design Basics"],
      assignments: 5,
      tests: 2,
      duration: "15-18 Hours",
      isComingSoon: true
    }
  ]

/**
 * Student Syllabus Page
 * Displays the complete course syllabus with weekly breakdown
 * Route: /student/syllabus
 */
export default function StudentSyllabusPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<number>(1)
  const [viewMode, setViewMode] = useState<'table' | 'detailed' | 'timeline'>('table')
  const [isLoading, setIsLoading] = useState(true)
  const [topicsModalOpen, setTopicsModalOpen] = useState(false)
  const [selectedWeekTopics, setSelectedWeekTopics] = useState<{ week: number; title: string; topics: string[] } | null>(null)

  // Progress State
  const [studentProgress, setStudentProgress] = useState({
    weeksCompleted: 0,
    totalWeeks: 8,
    currentWeek: 1,
    overallScore: 0,
    modulesCompleted: 0,
    totalModules: 12, // 12 Modules total
  })
  const [studentProgressByWeek, setStudentProgressByWeek] = useState<{ [week: number]: any }>({})
  const [, setIsRefreshing] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    fetchProgress()
    fetchStudentProgress()
    setIsLoading(false) // Syllabus is static now, so "loading" is just fetching progress
  }, [])

  // Auto-refresh progress every 30 seconds (no UI indicator)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true)
      Promise.all([fetchProgress(), fetchStudentProgress()]).finally(() => setIsRefreshing(false))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStudentProgress = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error('[Syllabus] No auth token found')
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
          filter: {},
          projection: {},
          options: { sort: { week: 1 } }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Create a map of week -> progress
          const progressMap: { [week: number]: any } = {}
          data.data.forEach((progress: any) => {
            progressMap[progress.week] = progress
          })
          setStudentProgressByWeek(progressMap)
        }
      }
    } catch (error) {
      console.error('Error fetching student progress:', error)
    }
  }

  const fetchProgress = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      // Use student-progress/summary for correct overall score
      const response = await fetch(`${apiBaseUrl}/student-progress/summary`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader || '',
        },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const summary = data.data;
          // Use averagePracticeScore or calculate from exams if needed, 
          // but summary usually has the most accurate aggregated score.
          const overallScore = summary.averagePracticeScore || 0;

          setStudentProgress(prev => ({
            ...prev,
            overallScore
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error)
    }
  }

  // Helper: Get derived status for a week
  const getWeekStatus = (weekNum: number) => {
    const progress = studentProgressByWeek[weekNum]

    // Status Logic:
    // 1. Explicit Status from DB
    if (progress && progress.status) return progress.status

    // 2. Week 1 is always unlocked (at least 'start')
    if (weekNum === 1) return 'start'

    // 3. Sequential Unlock: If previous week is completed, this one is 'start'
    const prevProgress = studentProgressByWeek[weekNum - 1]
    if (prevProgress && prevProgress.status === 'completed') return 'start'

    // 4. Default Locked
    return 'locked'
  }

  // Compute Weekly Schedule by merging Static Data + Dynamic Progress
  const weeklySchedule = FULL_SYLLABUS.map(week => {
    const status = getWeekStatus(week.week)
    return {
      ...week,
      status: status,
      // Pass-through other progress metrics if needed
      progress: studentProgressByWeek[week.week]
    }
  })

  // Update Aggregated Stats based on merged schedule
  useEffect(() => {
    const weeksCompleted = weeklySchedule.filter(w => w.status === 'completed').length
    const currentWeekItem = weeklySchedule.find(w => w.status === 'start' || w.status === 'in_progress')
    const currentWeek = currentWeekItem ? currentWeekItem.week : (weeksCompleted === 8 ? 8 : weeksCompleted + 1)

    // Calculate modules completed (assuming all modules in a completed week are done)
    const modulesCompleted = weeklySchedule
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + w.modules.length, 0)

    setStudentProgress(prev => ({
      ...prev,
      weeksCompleted,
      currentWeek,
      modulesCompleted
    }))
  }, [studentProgressByWeek])

  const masteredCount = useCountUp(studentProgress.weeksCompleted, 1500)
  const currentWeekData = weeklySchedule.find((w: any) => w.week === selectedWeek) || weeklySchedule[0]

  const handleStartWeek = (week: number, status: string) => {
    if (status === 'locked') return

    // For Week 1, special flow
    if (week === 1) {
      router.push('/student/study/week-1-select')
    } else {
      // For other weeks, go to coding dashboard or generic week view
      router.push(`/student/coding/week-${week}`)
    }
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Enhanced Header */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 transition-all duration-700 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20">
                <BookOpen className="w-7 h-7 text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-neutral mb-2 leading-tight bg-gradient-to-r from-neutral to-neutral-light bg-clip-text">
                  DSA & Aptitude Syllabus
                </h1>
                <div className="text-sm sm:text-base text-neutral-light flex items-center gap-2 font-medium">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Complete placement preparation roadmap — DSA and Aptitude topics</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Badge variant="secondary" className="text-xs sm:text-sm px-4 py-2 bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20 shadow-sm">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-primary" />
              <span className="font-semibold">Week {studentProgress.currentWeek}</span>
              <span className="mx-1 text-neutral-light">of</span>
              <span className="font-semibold">{studentProgress.totalWeeks}</span>
            </Badge>
            <div className="flex gap-2 p-1 bg-background-elevated rounded-xl border border-neutral-light/20">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 rounded-lg transition-all duration-300 relative ${viewMode === 'table'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 scale-105'
                  : 'text-neutral-light hover:bg-background-surface hover:text-neutral hover:scale-105'
                  }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`p-2.5 rounded-lg transition-all duration-300 relative ${viewMode === 'detailed'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 scale-105'
                  : 'text-neutral-light hover:bg-background-surface hover:text-neutral hover:scale-105'
                  }`}
                title="Detailed View"
              >
                <FileTextIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2.5 rounded-lg transition-all duration-300 relative ${viewMode === 'timeline'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 scale-105'
                  : 'text-neutral-light hover:bg-background-surface hover:text-neutral hover:scale-105'
                  }`}
                title="Timeline View"
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Progress Overview Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 bg-gradient-to-br from-primary/5 via-background-surface to-background-surface border-2 border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light font-medium">Weeks Completed</p>
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-primary mb-1 tabular-nums">
                {masteredCount}/{studentProgress.totalWeeks}
              </p>
              <div className="mt-3 pt-3 border-t border-neutral-light/10">
                <div className="w-full bg-neutral-light/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000"
                    style={{ width: `${studentProgress.totalWeeks > 0 ? (masteredCount / studentProgress.totalWeeks) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-neutral-light mt-1">{Math.round((masteredCount / studentProgress.totalWeeks) * 100)}% progress</p>
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-secondary/20 hover:-translate-y-2 bg-gradient-to-br from-secondary/5 via-background-surface to-background-surface border-2 border-secondary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light font-medium">Modules Completed</p>
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-secondary mb-1 tabular-nums">
                {studentProgress.modulesCompleted}/{studentProgress.totalModules}
              </p>
              <p className="text-xs text-neutral-light">Modules mastered</p>
            </div>
          </Card>

          <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-accent/20 hover:-translate-y-2 bg-gradient-to-br from-accent/5 via-background-surface to-background-surface border-2 border-accent/20">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light font-medium">Overall Score</p>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-accent mb-1 tabular-nums">
                {studentProgress.overallScore}%
              </p>
              <p className="text-xs text-neutral-light">{studentProgress.overallScore > 0 ? 'Above average' : 'No scores yet'}</p>
            </div>
          </Card>

          <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 bg-gradient-to-br from-primary/5 via-background-surface to-background-surface border-2 border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light font-medium">Current Week</p>
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-primary mb-1 tabular-nums">
                Week {studentProgress.currentWeek}
              </p>
              <p className="text-xs text-neutral-light">Keep going! 🚀</p>
            </div>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="text-center py-16 border-2 border-dashed border-neutral-light/20 bg-gradient-to-br from-background-surface to-background-elevated">
            <div className="inline-block p-4 rounded-full bg-primary/10 mb-4">
              <BookOpen className="w-12 h-12 text-primary/50 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-neutral mb-2">Loading syllabus...</h3>
            <p className="text-sm text-neutral-light/70">Fetching course content</p>
          </Card>
        )}

        {/* Table View - Enhanced UI */}
        {!isLoading && viewMode === 'table' && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">WEEK</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">TRACK</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">TOPICS</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySchedule.map((week: any) => {
                    const status = week.status
                    const isActive = status === 'start' || status === 'in_progress'
                    const isCompleted = status === 'completed'
                    const isLocked = status === 'locked'
                    const isComingSoon = week.isComingSoon || false

                    return (
                      <tr
                        key={week.week}
                        className={cn(
                          'group border-b border-gray-200 transition-all duration-200 hover:bg-gray-50/80',
                          !isLocked && !isComingSoon && 'cursor-pointer'
                        )}
                        onClick={() => !isLocked && !isComingSoon && handleStartWeek(week.week, status)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-1 h-16 flex-shrink-0" aria-hidden />

                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-lg font-bold text-base transition-all duration-300 flex-shrink-0 bg-gray-100 text-gray-800 border border-gray-200'
                              )}>
                                {week.week}
                              </div>
                              <div>
                                <div className="font-bold text-base text-gray-900">
                                  {week.title}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Week {week.week}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs px-2.5 py-1 font-semibold',
                              week.track === 'DSA & Aptitude'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            )}
                          >
                            {week.track}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-lg">
                            {week.topics?.slice(0, 4).map((topic: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0.5 border border-gray-200 bg-white/60">
                                {topic}
                              </Badge>
                            ))}
                            {week.topics?.length > 4 && (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                                +{week.topics.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Detailed View */}
        {!isLoading && viewMode === 'detailed' && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {weeklySchedule.map((week: any, index) => {
              const isComingSoon = week.isComingSoon || false;
              return (
                <Card
                  key={week.week}
                  className={`transition-all duration-700 hover:shadow-2xl ${isComingSoon ? 'border-neutral-light/20 bg-background-surface opacity-75' :
                    week.status === 'completed'
                      ? 'border-secondary/30 bg-gradient-to-br from-secondary/5 to-background-surface'
                      : (week.status === 'start' || week.status === 'in_progress')
                        ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-background-surface'
                        : 'border-neutral-light/20 bg-background-surface'
                    } border-2`}
                >
                  <div className="flex flex-col md:flex-row items-start justify-between gap-6 p-2">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-heading font-bold text-xl shadow-lg flex-shrink-0 ${isComingSoon ? 'bg-gray-100 text-gray-400' :
                        week.status === 'completed' ? 'bg-green-600 text-white' :
                          (week.status === 'start' || week.status === 'in_progress') ? 'bg-blue-600 text-white' :
                            'bg-gray-100 text-gray-400'
                        }`}>
                        {week.status === 'completed' && !isComingSoon ? <CheckCircle2 /> : week.week}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-heading font-bold text-neutral mb-2">
                          {week.title}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {week.topics?.map((topic: string, i: number) => (
                            <Badge key={i} variant="secondary" className="bg-white/50 border border-gray-100">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-neutral-light">
                          <span className="flex items-center gap-1"><Brain className="w-4 h-4" /> {week.modules?.length} Modules</span>
                          <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {week.assignments} Assignments</span>
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {week.duration}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 min-w-[140px]">
                      <Badge variant={
                        isComingSoon ? 'default' :
                          week.status === 'completed' ? 'secondary' :
                            (week.status === 'start' || week.status === 'in_progress') ? 'primary' : 'default'
                      } className="capitalize px-3 py-1">
                        {isComingSoon ? 'Coming Soon' : week.status === 'in_progress' ? 'In Progress' : week.status}
                      </Badge>

                      {week.status !== 'locked' && !isComingSoon && (
                        <button
                          onClick={() => handleStartWeek(week.week, week.status)}
                          className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                        >
                          {week.status === 'start' ? 'Start Week' : week.status === 'completed' ? 'Review' : 'Continue'}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Timeline View - Simple Implementation */}
        {!isLoading && viewMode === 'timeline' && (
          <Card className="p-8">
            <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
              {weeklySchedule.map((week: any) => {
                const isComingSoon = week.isComingSoon || false;
                return (
                  <div key={week.week} className="relative pl-8">
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white ${isComingSoon ? 'border-gray-300' :
                      week.status === 'completed' ? 'border-green-500 bg-green-500' :
                        (week.status === 'start' || week.status === 'in_progress') ? 'border-blue-500 animate-pulse' :
                          'border-gray-300'
                      }`} />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                      <h3 className={`text-lg font-bold ${week.status === 'locked' || isComingSoon ? 'text-gray-400' : 'text-gray-800'
                        }`}>Week {week.week}: {week.title} {isComingSoon && '(Coming Soon)'}</h3>
                      <Badge variant="secondary">{week.duration}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      {week.topics?.slice(0, 5).join(', ')}...
                    </p>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

      </div>
    </StudentLayout>
  )
}
