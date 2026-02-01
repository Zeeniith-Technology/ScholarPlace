'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { getAuthHeader, clearAuth, getToken } from '@/utils/auth'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Target,
  Award,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight,
  Flame,
  BarChart3,
  FileText,
  RefreshCw,
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

/**
 * Student Dashboard Page
 * Main home page for students after login
 * Route: /student/dashboard
 */
export default function StudentDashboardPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [hasData, setHasData] = useState(false)
  const [userName, setUserName] = useState('Student')
  const [progressData, setProgressData] = useState({
    weeksCompleted: 0,
    totalWeeks: 8,
    currentWeek: 1,
    totalPracticeTests: 0,
    averagePracticeScore: 0,
    totalTimeSpent: 0,
    totalDaysCompleted: 0,
    progressByWeek: []
  })
  const [isLoadingProgress, setIsLoadingProgress] = useState(true)

  // Fetch student progress summary
  const fetchProgressSummary = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      
      if (!authHeader) {
        console.error('[Dashboard] No auth token found')
        setIsLoadingProgress(false)
        return
      }

      const response = await fetch(`${apiBaseUrl}/student-progress/summary`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setProgressData(data.data)
          const d = data.data
          setHasData((d.weeksCompleted || 0) > 0 || (d.totalDaysCompleted || 0) > 0 || (d.totalPracticeTests || 0) > 0)
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error)
    } finally {
      setIsLoadingProgress(false)
    }
  }

  // Check if user has data (tests, activities, etc.)
  const checkUserData = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      // Check for tests/exams
      const response = await fetch(`${apiBaseUrl}/exam/list`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {},
          projection: { _id: 1 },
          options: { limit: 1 }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const hasExamData = data.success && data.data && data.data.length > 0
        // Also check if we have progress data
        setHasData(hasExamData || progressData.weeksCompleted > 0)
      } else {
        setHasData(progressData.weeksCompleted > 0)
      }
    } catch (error) {
      setHasData(progressData.weeksCompleted > 0)
    }
  }

  const [isRefreshing, setIsRefreshing] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
        
        // Check if token exists in localStorage
        const token = getToken()
        console.log('[Student Dashboard] Token check:', { hasToken: !!token, tokenLength: token?.length })
        
        const authHeader = getAuthHeader()
        if (!authHeader) {
          console.log('[Student Dashboard] No auth token found, redirecting to login')
          clearAuth() // Clear any invalid data
          window.location.href = '/auth/login'
          return
        }

        console.log('[Student Dashboard] Fetching profile with token...')
        const profileRes = await fetch(`${apiBaseUrl}/profile/get`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
        })

        console.log('[Student Dashboard] Profile response status:', profileRes.status)

        // Only redirect on 401/403 (authentication errors)
        if (profileRes.status === 401 || profileRes.status === 403) {
          console.log('[Student Dashboard] Authentication failed, clearing token and redirecting to login')
          clearAuth()
          window.location.href = '/auth/login'
          return
        }

        if (!profileRes.ok) {
          console.error('[Student Dashboard] Profile fetch failed with status:', profileRes.status)
          // Don't redirect on other errors, might be temporary network issue
          return
        }

        const profileResult = await profileRes.json()
        console.log('[Student Dashboard] Profile result:', { 
          success: profileResult.success, 
          role: profileResult.data?.role, 
          person_role: profileResult.data?.person_role 
        })
        
        const userRole = profileResult.data?.role || profileResult.data?.person_role
        const normalizedRole = userRole?.toLowerCase()
        
        // Only allow Student role
        if (!profileResult.success || normalizedRole !== 'student') {
          console.log('[Student Dashboard] Invalid role or failed profile check, clearing token and redirecting to login')
          clearAuth()
          window.location.href = '/auth/login'
          return
        }

        console.log('[Student Dashboard] ✅ Auth verified successfully!')
      } catch (error) {
        console.error('[Student Dashboard] Auth verification error:', error)
        // Only redirect if we have no token
        const authHeader = getAuthHeader()
        if (!authHeader) {
          clearAuth()
          window.location.href = '/auth/login'
        }
      }
    }

    setIsMounted(true)
    checkAuth()
    fetchProgressSummary()
  }, [router])

  useEffect(() => {
    if (!isLoadingProgress) {
      checkUserData()
    }
  }, [progressData, isLoadingProgress])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true)
      Promise.all([
        fetchProgressSummary(),
        checkUserData(),
      ]).finally(() => {
        setIsRefreshing(false)
      })
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchProgressSummary(),
        checkUserData(),
      ])
    } finally {
      setIsRefreshing(false)
    }
  }
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('auth')
      if (auth) {
        try {
          const authData = JSON.parse(auth)
          if (authData.user?.name) {
            setUserName(authData.user.name)
          } else if (authData.email) {
            const emailName = authData.email.split('@')[0]
            setUserName(emailName.split('.').map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(' '))
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [])

  // Calculate progress percentage
  const progressPercentage = progressData.totalWeeks > 0
    ? Math.round((progressData.weeksCompleted / progressData.totalWeeks) * 100)
    : 0

  // Stats from progress API (all from DB)
  const stats = {
    progress: progressPercentage,
    testsCompleted: progressData.totalPracticeTests,
    streak: progressData.currentStreak ?? 0,
    currentWeek: progressData.currentWeek ?? 1,
    totalWeeks: progressData.totalWeeks ?? 6,
    totalDaysCompleted: progressData.totalDaysCompleted ?? 0,
  }

  // Upcoming tests: not yet in DB; show empty. Can be extended later with syllabus-based upcoming.
  const upcomingTests: Array<{ id: number; title: string; date: string; time: string; modules: string[]; difficulty: string; status: string }> = []

  const progressCount = useCountUp(stats.progress, 1500)
  const testsCount = useCountUp(stats.testsCompleted, 1200)
  const streakCount = useCountUp(stats.streak, 1000)
  const totalWeeksForDisplay = Math.max(1, stats.totalWeeks)

  // Get current time of day for greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Render dashboard content
  const renderDashboardContent = () => (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      <div
        className={`transition-opacity duration-300 ${
          isMounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2 leading-tight">
              {getGreeting()}, {userName}! 👋
            </h1>
            <div className="text-sm sm:text-base text-neutral-light">
              <div className="flex items-center gap-3">
                Welcome back to your 6th Semester dashboard
                {isRefreshing && (
                  <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                )}
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs sm:text-sm">
              <Calendar className="w-3 h-3 mr-1" />
              Week {stats.currentWeek} of {totalWeeksForDisplay}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 animate-smooth-appear" style={{ animationDelay: '0ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-neutral-light">Overall Progress</p>
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
            </div>
            <p className="text-2xl sm:text-3xl font-heading font-bold text-primary mb-1 tabular-nums">
              {progressCount}%
            </p>
            <p className="text-xs text-neutral-light">{stats.totalDaysCompleted} days completed</p>
          </div>
        </Card>

        <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-secondary/10 hover:-translate-y-0.5 animate-smooth-appear" style={{ animationDelay: '100ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-neutral-light">Tests Completed</p>
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-secondary transition-transform duration-300 group-hover:scale-110" />
            </div>
            <p className="text-2xl sm:text-3xl font-heading font-bold text-secondary mb-1 tabular-nums">
              {testsCount}
            </p>
            <p className="text-xs text-neutral-light">
              {stats.testsCompleted} test{stats.testsCompleted !== 1 ? 's' : ''} completed
            </p>
          </div>
        </Card>

        <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5 animate-smooth-appear" style={{ animationDelay: '200ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-neutral-light">Current Streak</p>
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-accent transition-transform duration-300 group-hover:scale-110" />
            </div>
            <p className="text-2xl sm:text-3xl font-heading font-bold text-accent mb-1 tabular-nums">
              {streakCount} days
            </p>
            <p className="text-xs text-neutral-light">Keep it up! 🔥</p>
          </div>
        </Card>

        <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 animate-smooth-appear" style={{ animationDelay: '300ms' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-neutral-light">Current Rank</p>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
            </div>
            <p className="text-2xl sm:text-3xl font-heading font-bold text-primary mb-1 tabular-nums">
              N/A
            </p>
            <p className="text-xs text-neutral-light">
              No ranking yet
            </p>
          </div>
        </Card>
      </div>

      <div>
        <Card className="transition-all duration-300 hover:shadow-lg animate-smooth-appear" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-heading font-bold text-neutral flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary transition-transform duration-300 hover:scale-110" />
              Upcoming Tests
            </h2>
            <Link
              href="/student/tests"
              className="text-xs sm:text-sm text-primary hover:underline font-medium flex items-center gap-1 transition-all duration-200 hover:gap-2 group"
            >
              View All
              <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingTests.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-neutral-light/30 mx-auto mb-4" />
                <p className="text-neutral-light">No upcoming tests</p>
                <p className="text-sm text-neutral-light/70 mt-2">Start your journey to see scheduled tests</p>
              </div>
            ) : (
              upcomingTests.map((test, index) => (
                <div
                  key={test.id}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 hover:shadow-md hover:scale-[1.01] animate-stagger-fade ${
                    test.status === 'upcoming'
                      ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                      : 'border-neutral-light/20 bg-background-elevated opacity-60'
                  }`}
                  style={{ animationDelay: `${500 + index * 50}ms` }}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-neutral text-sm sm:text-base">
                            {test.title}
                          </h3>
                          {test.status === 'locked' && (
                            <Badge variant="default" className="text-xs">
                              Locked
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-light">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(test.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at {test.time}
                          </span>
                          <Badge variant="default" className="text-xs">
                            {test.difficulty}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {test.modules.map((module, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {module}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {test.status === 'upcoming' && (
                        <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap">
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link href="/student/syllabus">
          <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer animate-smooth-appear" style={{ animationDelay: '800ms' }}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-all duration-300 group-hover:scale-110">
                <BookOpen className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral text-sm sm:text-base">View Syllabus</h3>
                <p className="text-xs text-neutral-light">Check modules</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/student/tests">
          <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer animate-smooth-appear" style={{ animationDelay: '900ms' }}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-secondary/20 group-hover:bg-secondary/30 transition-all duration-300 group-hover:scale-110">
                <FileText className="w-5 h-5 text-secondary transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral text-sm sm:text-base">Take Test</h3>
                <p className="text-xs text-neutral-light">Start assessment</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/student/analytics">
          <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer animate-smooth-appear" style={{ animationDelay: '1000ms' }}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-all duration-300 group-hover:scale-110">
                <BarChart3 className="w-5 h-5 text-accent transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral text-sm sm:text-base">View Analytics</h3>
                <p className="text-xs text-neutral-light">Track progress</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/student/profile">
          <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer animate-smooth-appear" style={{ animationDelay: '1100ms' }}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-all duration-300 group-hover:scale-110">
                <Users className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral text-sm sm:text-base">Profile</h3>
                <p className="text-xs text-neutral-light">View settings</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )

  // Show skeleton loader while initial data is loading
  if (isLoadingProgress && !hasData) {
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-5 w-80 bg-gray-100 rounded animate-pulse"></div>
            </div>
            <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 sm:p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`h-4 w-24 bg-gray-200 rounded`} style={{ animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`, animationDelay: `${i * 0.1}s` }}></div>
                    <div className={`h-5 w-5 bg-gray-200 rounded`} style={{ animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`, animationDelay: `${i * 0.12}s` }}></div>
                  </div>
                  <div className={`h-8 w-16 bg-gray-300 rounded`} style={{ animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`, animationDelay: `${i * 0.15}s` }}></div>
                  <div className={`h-3 w-32 bg-gray-100 rounded`} style={{ animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`, animationDelay: `${i * 0.2}s` }}></div>
                </div>
              </Card>
            ))}
          </div>

          {/* Content Sections Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border border-gray-200 rounded-lg">
                      <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <Card className="p-6">
              <div className="space-y-4">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      {renderDashboardContent()}
    </StudentLayout>
  )
}
