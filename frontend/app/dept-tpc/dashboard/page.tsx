'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DepartmentTPCLayout } from '@/components/layouts/DepartmentTPCLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader, clearAuth, getToken } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'
import {
  Users,
  TrendingUp,
  Award,
  Target,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  BookOpen,
  FileText,
  ArrowRight,
  GraduationCap,
  RefreshCw,
  Building2,
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
 * TPC/DeptTPC Dashboard Page
 * Admin dashboard for TPC and Department TPC to manage students and track performance
 * Route: /dept-tpc/dashboard
 */
export default function DepartmentTPCDashboardPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [topPerformers, setTopPerformers] = useState<any[]>([])
  const [needsAttention, setNeedsAttention] = useState<any[]>([])
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    setIsMounted(true)
    checkAuth()
    fetchDashboardData()
  }, [])

  const checkAuth = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl()
      
      const authHeader = getAuthHeader()
      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const profileRes = await fetch(`${apiBaseUrl}/profile/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      })

      // Only redirect on 401/403 (authentication errors)
      if (profileRes.status === 401 || profileRes.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      if (!profileRes.ok) {
        // Don't redirect on other errors, allow retry
        return
      }

      const profileResult = await profileRes.json()
      const userRole = profileResult.data?.role || profileResult.data?.person_role
      const normalizedRole = userRole?.toLowerCase()
      
      // Only allow DeptTPC to access this dashboard
      if (!profileResult.success || (normalizedRole !== 'depttpc' && normalizedRole !== 'dept-tpc')) {
        if (normalizedRole === 'tpc') {
          window.location.href = '/tpc/dashboard'
        } else {
          clearAuth()
          window.location.href = '/auth/login'
        }
        return
      }

      setUserInfo(profileResult.data)
    } catch (error) {
      console.error('[DeptTPC Dashboard] Auth verification error:', error)
      // Only redirect on network errors if we have no token
      const authHeader = getAuthHeader()
      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
      }
      // Otherwise, don't redirect - might be a temporary network issue
    }
  }

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()
      if (!authHeader) {
        window.location.href = '/auth/login'
        return
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      }

      // Fetch dashboard stats (DeptTPC endpoint)
      const statsResponse = await fetch(`${apiBaseUrl}/tpc-dept/dashboard/stats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })

      const statsData = await statsResponse.json()
      if (statsData.success) {
        setStats(statsData.data)
      } else {
        showToast(statsData.message || 'Failed to load dashboard statistics', 'error')
      }

      // Fetch top performers
      const topResponse = await fetch(`${apiBaseUrl}/tpc-dept/students/top-performers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ limit: 5 }),
      })

      const topData = await topResponse.json()
      if (topData.success) {
        setTopPerformers(Array.isArray(topData.data) ? topData.data : [])
      }

      // Fetch students needing attention
      const attentionResponse = await fetch(`${apiBaseUrl}/tpc-dept/students/needs-attention`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })

      const attentionData = await attentionResponse.json()
      if (attentionData.success) {
        setNeedsAttention(Array.isArray(attentionData.data) ? attentionData.data : [])
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error)
      showToast('Failed to load dashboard data', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchDashboardData()
  }

  const totalStudentsCount = useCountUp(stats?.totalStudents || 0, 1500)
  const activeStudentsCount = useCountUp(stats?.activeStudents || 0, 1500)
  const averageScoreCount = useCountUp(stats?.averageScore || 0, 1500)
  const testsCompletedCount = useCountUp(stats?.testsCompleted || 0, 2000)

  if (isLoading && !stats) {
    return (
      <DepartmentTPCLayout>
        <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-4 w-64 bg-gray-100 rounded animate-pulse"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <div className="space-y-3">
                  <div className={`h-4 w-24 bg-gray-200 rounded`} style={{ animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`, animationDelay: `${i * 0.1}s` }}></div>
                  <div className={`h-10 w-20 bg-gray-300 rounded`} style={{ animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`, animationDelay: `${i * 0.15}s` }}></div>
                  <div className={`h-3 w-32 bg-gray-100 rounded`} style={{ animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`, animationDelay: `${i * 0.2}s` }}></div>
                </div>
              </Card>
            ))}
          </div>

          {/* Content Sections Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <div className="space-y-4">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
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
      </DepartmentTPCLayout>
    )
  }

  return (
    <DepartmentTPCLayout>
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-opacity duration-300 ${
            isMounted ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2 leading-tight">
              {userInfo?.role === 'TPC' ? 'TPC Dashboard' : 'Department TPC Dashboard'}
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              Manage students, track performance, and monitor progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-background-surface border border-neutral-light/20 hover:bg-background-elevated transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-neutral-light ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <Badge variant="primary" className="text-xs sm:text-sm">
              <GraduationCap className="w-3 h-3 mr-1" />
              Department TPC
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 animate-smooth-appear" style={{ animationDelay: '0ms' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light">Total Students</p>
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-primary mb-1 tabular-nums">
                {totalStudentsCount}
              </p>
              <p className="text-xs text-neutral-light">{activeStudentsCount} active</p>
            </div>
          </Card>

          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-secondary/10 hover:-translate-y-0.5 animate-smooth-appear" style={{ animationDelay: '100ms' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light">Average Score</p>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-secondary transition-transform duration-300 group-hover:scale-110" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-secondary mb-1 tabular-nums">
                {averageScoreCount}%
              </p>
              <p className="text-xs text-neutral-light">Overall average</p>
            </div>
          </Card>

          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5 animate-smooth-appear" style={{ animationDelay: '200ms' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light">Tests Completed</p>
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-accent transition-transform duration-300 group-hover:scale-110" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-accent mb-1 tabular-nums">
                {testsCompletedCount}
              </p>
              <p className="text-xs text-neutral-light">Across all students</p>
            </div>
          </Card>

          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 animate-smooth-appear" style={{ animationDelay: '300ms' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs sm:text-sm text-neutral-light">Top Performers</p>
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
              </div>
              <p className="text-2xl sm:text-3xl font-heading font-bold text-primary mb-1 tabular-nums">
                {stats?.topPerformers || 0}
              </p>
              <p className="text-xs text-neutral-light">Score ≥85%</p>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Top Performers */}
          <div className="lg:col-span-2">
            <Card className="transition-all duration-300 hover:shadow-lg animate-smooth-appear" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-heading font-bold text-neutral flex items-center">
                  <Award className="w-5 h-5 mr-2 text-primary transition-transform duration-300 hover:scale-110" />
                  Top Performers
                </h2>
                <Link
                  href="/dept-tpc/students"
                  className="text-xs sm:text-sm text-primary hover:underline font-medium flex items-center gap-1 transition-all duration-200 hover:gap-2 group"
                >
                  View All
                  <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
              {topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {topPerformers.map((student, index) => (
                    <div
                      key={student._id || student.person_id || index}
                      className="p-4 rounded-lg border border-neutral-light/20 bg-background-elevated hover:bg-background-surface transition-all duration-300 hover:shadow-md hover:border-primary/20 animate-stagger-fade"
                      style={{ animationDelay: `${500 + index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-neutral text-sm sm:text-base">
                              {student.person_name || 'Unknown'}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {student.progress?.average_score || 0}%
                              </Badge>
                              <span className="text-xs text-neutral-light">
                                {student.progress?.total_days_completed || 0} days
                              </span>
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/dept-tpc/students`}
                          className="text-primary hover:underline text-xs sm:text-sm"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-light">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No top performers yet</p>
                </div>
              )}
            </Card>
          </div>

          {/* Students Needing Attention */}
          <div>
            <Card className="transition-all duration-300 hover:shadow-lg animate-smooth-appear" style={{ animationDelay: '600ms' }}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-heading font-bold text-neutral flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-accent transition-transform duration-300 hover:scale-110" />
                  Needs Attention
                </h2>
              </div>
              {needsAttention.length > 0 ? (
                <div className="space-y-3">
                  {needsAttention.slice(0, 4).map((student, index) => (
                    <div
                      key={student._id || student.person_id || index}
                      className="p-3 rounded-lg bg-accent/10 border border-accent/20 transition-all duration-300 hover:bg-accent/20 hover:shadow-sm hover:scale-[1.02] animate-stagger-fade"
                      style={{ animationDelay: `${700 + index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-neutral text-sm">{student.person_name || 'Unknown'}</h3>
                        <Badge variant="accent" className="text-xs">
                          {student.progress?.average_score || 0}%
                        </Badge>
                      </div>
                      <div className="text-xs text-neutral-light space-y-1">
                        {student.progress ? (
                          <>
                            <p>Score: {student.progress.average_score || 0}%</p>
                            <p>Days completed: {student.progress.total_days_completed || 0}</p>
                          </>
                        ) : (
                          <p>No progress recorded</p>
                        )}
                      </div>
                      <Link
                        href={`/dept-tpc/students`}
                        className="text-xs text-primary hover:underline mt-2 inline-block"
                      >
                        View Profile →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-light">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>All students are performing well!</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-heading font-bold text-neutral mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch">
            <Link href="/dept-tpc/students" className="block h-full">
              <Card className="group h-full min-h-[100px] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer animate-smooth-appear flex items-center" style={{ animationDelay: '800ms' }}>
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-all duration-300 group-hover:scale-110">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral text-sm sm:text-base truncate">Manage Students</h3>
                    <p className="text-xs text-neutral-light">View all students</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/dept-tpc/tests" className="block h-full">
              <Card className="group h-full min-h-[100px] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer animate-smooth-appear flex items-center" style={{ animationDelay: '900ms' }}>
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-secondary/20 group-hover:bg-secondary/30 transition-all duration-300 group-hover:scale-110">
                    <FileText className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral text-sm sm:text-base truncate">Manage Tests</h3>
                    <p className="text-xs text-neutral-light">Schedule tests</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/dept-tpc/analytics" className="block h-full">
              <Card className="group h-full min-h-[100px] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer animate-smooth-appear flex items-center" style={{ animationDelay: '1000ms' }}>
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-all duration-300 group-hover:scale-110">
                    <BarChart3 className="w-5 h-5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral text-sm sm:text-base truncate">View Analytics</h3>
                    <p className="text-xs text-neutral-light">Performance insights</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/dept-tpc/reports" className="block h-full">
              <Card className="group h-full min-h-[100px] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer animate-smooth-appear flex items-center" style={{ animationDelay: '1100ms' }}>
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-all duration-300 group-hover:scale-110">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral text-sm sm:text-base truncate">Generate Reports</h3>
                    <p className="text-xs text-neutral-light">Export data</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/dept-tpc/test-approvals" className="block h-full">
              <Card className="group h-full min-h-[100px] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer animate-smooth-appear flex items-center" style={{ animationDelay: '1200ms' }}>
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-all duration-300 group-hover:scale-110">
                    <AlertCircle className="w-5 h-5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral text-sm sm:text-base truncate">Test Approvals</h3>
                    <p className="text-xs text-neutral-light">Approve retakes</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </DepartmentTPCLayout>
  )
}
