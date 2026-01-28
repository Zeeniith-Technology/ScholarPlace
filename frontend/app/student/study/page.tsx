'use client'

import React, { useState, useEffect } from 'react'
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
  ArrowRight,
  BookMarked,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAuthHeader } from '@/utils/auth'

/**
 * Learning Landing Page
 * Shows available weeks for learning and allows students to start their weekly learning
 * Route: /student/study
 */
export default function LearningPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [syllabusData, setSyllabusData] = useState<any[]>([])
  const [studentProgressByWeek, setStudentProgressByWeek] = useState<{ [week: number]: any }>({})

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
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (authHeader) {
        headers['Authorization'] = authHeader
      }
      
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
        if (result.success && result.data) {
          setSyllabusData(result.data)
        }
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
      
      if (!authHeader) {
        console.error('[Student Progress] No auth token found')
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
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const progressMap: { [week: number]: any } = {}
          result.data.forEach((progress: any) => {
            progressMap[progress.week] = progress
          })
          setStudentProgressByWeek(progressMap)
        }
      }
    } catch (error) {
      console.error('Error fetching student progress:', error)
    }
  }

  const isWeekUnlocked = (weekNumber: number) => {
    if (weekNumber === 1) return true
    const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'
    if (isTestMode && (weekNumber === 2 || weekNumber === 3 || weekNumber === 4 || weekNumber === 5 || weekNumber === 6)) return true
    const previousWeekProgress = studentProgressByWeek[weekNumber - 1]
    return previousWeekProgress?.status === 'completed'
  }

  // Helper function to get student's status for a week
  const getStudentWeekStatus = (weekNumber: number) => {
    if (!isWeekUnlocked(weekNumber)) {
      return 'locked'
    }

    const progress = studentProgressByWeek[weekNumber]
    if (!progress) {
      return 'start'
    }

    // If status is 'in_progress' but no actual progress made, treat it as 'start'
    // This ensures "Start" button shows until actual progress made
    const hasDaysCompleted = progress.days_completed && progress.days_completed.length > 0
    const hasAssignmentsCompleted = progress.assignments_completed && progress.assignments_completed > 0
    const hasTestsCompleted = progress.tests_completed && progress.tests_completed > 0
    
    if (progress.status === 'in_progress' && !hasDaysCompleted && !hasAssignmentsCompleted && !hasTestsCompleted) {
      return 'start'
    }
    return progress.status || 'locked'
  }

  const handleStartWeek = (week: number, status: string) => {
    if (status === 'locked') return
    
    // For Week 1, show selection page with DSA and Aptitude options
    if (week === 1) {
      router.push('/student/study/week-1-select')
    } else if (week === 2) {
      router.push('/student/study/week-2-select')
    } else if (week === 3) {
      router.push('/student/study/week-3-select')
    } else if (week === 4) {
      router.push('/student/study/week-4-select')
    } else if (week === 5) {
      router.push('/student/study/week-5-select')
    } else if (week === 6) {
      router.push('/student/study/week-6-select')
    } else {
      // For Week 7+, use dynamic route
      router.push(`/student/study/${week}?day=day-1`)
    }
  }

  const defaultWeeks = [
    { week: 1, title: 'Fundamentals', assignments: 6, tests: 1 },
    { week: 2, title: 'Advanced Concepts', assignments: 0, tests: 0 },
    { week: 3, title: 'Data Structures', assignments: 0, tests: 0 },
    { week: 4, title: 'Algorithms', assignments: 0, tests: 0 },
    { week: 5, title: 'Problem Solving', assignments: 0, tests: 0 },
    { week: 6, title: 'Interview Prep', assignments: 0, tests: 0 },
    { week: 7, title: 'Mock Tests', assignments: 0, tests: 0 },
    { week: 8, title: 'Final Review', assignments: 0, tests: 0 },
  ]

  const weeklySchedule = defaultWeeks.map((week) => {
    const apiWeek = syllabusData.find((item: any) => item.week === week.week)
    return apiWeek ? { ...week, ...apiWeek } : week
  })

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <div className={cn(
          'transition-opacity duration-500',
          isMounted ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="flex items-center gap-4 mb-2">
            <div className="relative">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/15 to-secondary/20 backdrop-blur-sm shadow-lg shadow-primary/10 transition-transform duration-300 hover:scale-105">
                <BookMarked className="w-7 h-7 text-primary transition-transform duration-300 hover:scale-110" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse-slow" />
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
          /* Weeks Table Layout */
          <Card className="overflow-hidden">
            {/* Header Info */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">{weeklySchedule.length} weeks</span>
                  <span>•</span>
                  <span>Complete course roadmap</span>
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ASSIGNMENTS</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySchedule.map((week: any, index: number) => {
                    const studentStatus = getStudentWeekStatus(week.week || index + 1)
                    const isActive = studentStatus === 'start' || studentStatus === 'in_progress'
                    const isCompleted = studentStatus === 'completed'
                    const isLocked = studentStatus === 'locked' || !studentStatus
                    const canStart = !isLocked
                    const weekNum = week.week || index + 1

                    return (
                      <tr
                        key={weekNum}
                        className={cn(
                          'group border-b border-gray-200 transition-all duration-300',
                          isActive && 'bg-blue-50/50',
                          isCompleted && 'bg-green-50/50',
                          !isLocked && 'hover:bg-gray-50 cursor-pointer hover:shadow-sm',
                          isLocked && 'opacity-50'
                        )}
                        onClick={() => !isLocked && handleStartWeek(weekNum, studentStatus)}
                      >
                        {/* WEEK Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {/* Status Indicator Bar */}
                            {isActive && (
                              <div className="w-1 h-16 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                            {isCompleted && (
                              <div className="w-1 h-16 bg-green-500 rounded-full flex-shrink-0" />
                            )}
                            {!isActive && !isCompleted && (
                              <div className="w-1 h-16 bg-transparent flex-shrink-0" />
                            )}
                            
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-lg font-bold text-base transition-all duration-300 flex-shrink-0',
                                isCompleted && 'bg-green-600 text-white shadow-md',
                                isActive && 'bg-blue-600 text-white shadow-md',
                                isLocked && 'bg-gray-200 text-gray-500 border border-gray-300'
                              )}>
                                {isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                  weekNum
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-base text-gray-900">
                                  Week {weekNum}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {week.title || 'Course Content'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* ASSIGNMENTS Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'flex items-center justify-center w-10 h-10 rounded-lg font-bold text-base flex-shrink-0',
                              isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                            )}>
                              {weekNum}
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="text-sm font-semibold text-gray-900">
                                {week.week === 1 ? '6' : (week.assignments || 0)} practice assignments
                              </div>
                              {isActive && (
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
                          {studentStatus === 'start' && weekNum === 1 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push('/student/study/week-1-select')
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 ml-auto"
                            >
                              <Clock className="w-4 h-4" />
                              Start
                            </button>
                          ) : studentStatus === 'start' && weekNum > 1 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (weekNum === 2) {
                                  router.push('/student/study/week-2-select')
                                } else if (weekNum === 3) {
                                  router.push('/student/study/week-3-select')
                                } else if (weekNum === 4) {
                                  router.push('/student/study/week-4-select')
                                } else if (weekNum === 5) {
                                  router.push('/student/study/week-5-select')
                                } else if (weekNum === 6) {
                                  router.push('/student/study/week-6-select')
                                } else {
                                  router.push(`/student/study/${weekNum}?day=day-1`)
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 ml-auto"
                            >
                              <Clock className="w-4 h-4" />
                              Start
                            </button>
                          ) : studentStatus === 'start' ? (
                            <Badge
                              variant="primary"
                              className="text-xs px-3 py-1.5 font-semibold bg-blue-100 text-blue-700 border border-blue-200 ml-auto w-fit"
                            >
                              <span className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3" />
                                <span>Start</span>
                              </span>
                            </Badge>
                          ) : isActive && weekNum === 1 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push('/student/study/week-1?day=pre-week')
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 ml-auto"
                            >
                              <Play className="w-4 h-4" />
                              Resume
                            </button>
                          ) : isActive && weekNum > 1 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (weekNum === 2) {
                                  router.push('/student/study/week-2-select')
                                } else if (weekNum === 3) {
                                  router.push('/student/study/week-3-select')
                                } else if (weekNum === 4) {
                                  router.push('/student/study/week-4-select')
                                } else if (weekNum === 5) {
                                  router.push('/student/study/week-5-select')
                                } else if (weekNum === 6) {
                                  router.push('/student/study/week-6-select')
                                } else {
                                  router.push(`/student/study/${weekNum}?day=day-1`)
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 ml-auto"
                            >
                              <Play className="w-4 h-4" />
                              Resume
                            </button>
                          ) : isActive ? (
                            <Badge
                              variant="primary"
                              className="text-xs px-3 py-1.5 font-semibold bg-blue-100 text-blue-700 border border-blue-200 ml-auto w-fit"
                            >
                              <span className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3" />
                                <span>In Progress</span>
                              </span>
                            </Badge>
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
                <div className="p-3 rounded-lg bg-primary/20">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-neutral-light">In Progress</p>
                  <p className="text-2xl font-bold text-neutral">
                    {weeklySchedule.filter((w: any, i: number) => {
                      const status = getStudentWeekStatus(w.week || i + 1)
                      return status === 'start' || status === 'in_progress'
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </StudentLayout>
  )
}
