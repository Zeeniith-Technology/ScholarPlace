'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader, clearAuth } from '@/utils/auth'
import {
  Building2,
  Users,
  TrendingUp,
  Award,
  BookOpen,
  Activity,
  RefreshCw,
  ArrowRight,
  BarChart3,
  MessageSquare,
  Target,
  Zap,
  Shield,
  Settings,
  FileText,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Bell,
  Plus,
  Eye,
  Download as DownloadIcon,
  LogOut,
  Code,
  Bug,
} from 'lucide-react'

interface DashboardStats {
  colleges: {
    total: number
    active: number
    inactive: number
    subscribed: number
  }
  students: {
    total: number
    active: number
    inactive: number
    withProgress: number
    engagementRate: number
  }
  progress: {
    totalDaysCompleted: number
    totalPracticeTests: number
    totalCodingProblems: number
    averageScore: number
  }
  exams: {
    total: number
    upcoming: number
  }
}

interface College {
  collage_id: string
  collage_name: string
  collage_status: number
  collage_subscription_status?: string
  studentCount?: number
  usage?: number
}

/**
 * Superadmin Dashboard - Interactive with Real Data
 * Route: /superadmin/dashboard
 */
export default function SuperadminDashboardPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [colleges, setColleges] = useState<College[]>([])
  const [selectedCollege, setSelectedCollege] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  // Verify authentication via API and fetch data from database
  useEffect(() => {
    let isMounted = true

    const verifyAuthAndFetchData = async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

        // Verify authentication by fetching profile (requires valid JWT token)
        const authHeader = getAuthHeader()
        console.log('[Dashboard] Auth check - Header exists:', !!authHeader)

        if (!authHeader) {
          console.log('[Dashboard] No auth token found, redirecting to login')
          clearAuth() // Clear any invalid data
          // Use router.push for better UX - auth state is already cleared
          router.push('/superadmin/login')
          return
        }

        console.log('[Dashboard] Fetching profile with token...')
        const profileRes = await fetch(`${apiBaseUrl}/profile/get`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
        })

        console.log('[Dashboard] Profile response status:', profileRes.status)

        // Only redirect on 401/403 (authentication errors)
        if (profileRes.status === 401 || profileRes.status === 403) {
          console.log('[Dashboard] Authentication failed, clearing token and redirecting to login')
          clearAuth() // Clear invalid token from localStorage
          // Use router.push for better UX - token is already cleared
          router.push('/superadmin/login')
          return
        }

        if (!profileRes.ok) {
          console.error('[Dashboard] Profile fetch failed with status:', profileRes.status)
          // Don't redirect on other errors, might be temporary network issue
          return
        }

        const profileResult = await profileRes.json()
        console.log('[Dashboard] Full profile result:', JSON.stringify(profileResult, null, 2))

        // Check role from either 'role' or 'person_role' field
        const userRole = profileResult.data?.role || profileResult.data?.person_role

        console.log('[Dashboard] Extracted role:', userRole)

        if (!profileResult.success) {
          console.log('[Dashboard] Profile request failed, clearing token and redirecting to login')
          clearAuth() // Clear invalid token
          router.push('/superadmin/login')
          return
        }

        if (userRole !== 'superadmin') {
          console.log('[Dashboard] Role mismatch - expected superadmin, got:', userRole, 'clearing token and redirecting to login')
          clearAuth() // Clear token for wrong role
          router.push('/superadmin/login')
          return
        }

        console.log('[Dashboard] ✅ Auth verified successfully!')

        console.log('[Dashboard] Auth verified, fetching dashboard data...')

        // Authentication verified via database, now fetch all dashboard data from database
        await fetchDashboardData()
      } catch (error) {
        console.error('[Dashboard] Auth verification error:', error)
        // Only redirect if we have no token
        const authHeader = getAuthHeader()
        if (!authHeader) {
          clearAuth() // Clear any invalid token
          router.push('/superadmin/login')
        }
        // Otherwise, don't redirect - might be a temporary network issue
      }
    }

    verifyAuthAndFetchData()
  }, []) // Empty dependency array - only run on mount

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

      // Get auth header for all requests
      const authHeader = getAuthHeader()
      if (!authHeader) {
        console.log('[Dashboard] No auth token in fetchDashboardData, redirecting to login')
        setIsLoading(false)
        router.push('/superadmin/login')
        return
      }

      // Create headers object for all API requests
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      }

      // Fetch overview stats
      const overviewRes = await fetch(`${apiBaseUrl}/superadmin/analytics/overview`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          collegeId: selectedCollege !== 'all' ? selectedCollege : undefined,
        }),
      })

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json()
        if (overviewData.success && overviewData.data) {
          setStats(overviewData.data)
        }
      }

      // Fetch colleges list
      const collegesRes = await fetch(`${apiBaseUrl}/superadmin/analytics/colleges`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })

      if (collegesRes.ok) {
        const collegesData = await collegesRes.json()
        if (collegesData.success && collegesData.data) {
          // Map college data to match our interface
          const mappedColleges = (collegesData.data.colleges || []).map((college: any) => ({
            collage_id: college.collegeId,
            collage_name: college.collegeName,
            collage_status: college.status === 'active' ? 1 : 0,
            collage_subscription_status: college.subscriptionStatus,
            studentCount: college.students?.total || 0,
            usage: college.students?.total > 0
              ? Math.round((college.students.withProgress / college.students.total) * 100)
              : 0,
          }))
          setColleges(mappedColleges)
        }
      }

      // Recent activity: only show when we have real activity from an API.
      // (No backend endpoint for activity feed yet – do not show fake/placeholder activity.)
      setRecentActivity([])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
      setLastRefresh(new Date())
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchDashboardData()
  }

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/superadmin/login'
  }

  const filteredColleges = colleges.filter((c) => {
    const matchesSearch =
      !search ||
      c.collage_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.collage_id?.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const statCards = [
    {
      label: 'Total Colleges',
      value: stats?.colleges.total || 0,
      subtitle: `${stats?.colleges.active || 0} active`,
      icon: Building2,
      color: 'blue',
      trend: null,
    },
    {
      label: 'Total Students',
      value: stats?.students.total || 0,
      subtitle: `${stats?.students.active || 0} active`,
      icon: Users,
      color: 'green',
      trend: `${stats?.students.engagementRate || 0}% engaged`,
    },
    {
      label: 'Days Completed',
      value: stats?.progress.totalDaysCompleted || 0,
      subtitle: `${stats?.progress.totalPracticeTests || 0} practice tests`,
      icon: Target,
      color: 'purple',
      trend: null,
    },
    {
      label: 'Average Score',
      value: `${stats?.progress.averageScore || 0}%`,
      subtitle: `${stats?.progress.totalCodingProblems || 0} coding problems`,
      icon: Award,
      color: 'orange',
      trend: null,
    },
  ]

  const quickActions = [
    {
      title: 'Platform Analytics',
      description: 'View comprehensive platform-wide statistics and insights',
      icon: BarChart3,
      color: 'blue',
      action: () => router.push('/superadmin/analytics'),
    },
    {
      title: 'Student Management',
      description: 'View and manage all students across the platform',
      icon: Users,
      color: 'green',
      action: () => router.push('/superadmin/students'),
    },
    {
      title: 'College Management',
      description: 'Add, edit, and manage colleges in the platform',
      icon: Building2,
      color: 'purple',
      action: () => router.push('/superadmin/colleges'),
    },
    {
      title: 'Syllabus Management',
      description: 'Import and manage syllabus data from Excel files',
      icon: FileText,
      color: 'orange',
      action: () => router.push('/superadmin/syllabus'),
    },
    {
      title: 'Bug Reports',
      description: 'Manage and review bug reports from students and staff',
      icon: Bug,
      color: 'red',
      action: () => router.push('/superadmin/bug-reports'),
    },
    {
      title: 'System Error Logs',
      description: 'View and investigate system error logs',
      icon: AlertCircle,
      color: 'red',
      action: () => router.push('/superadmin/error-logs'),
    },
    {
      title: 'Contact Inquiries',
      description: 'View and manage contact form submissions',
      icon: MessageSquare,
      color: 'blue',
      action: () => router.push('/superadmin/contact-inquiries'),
    },
  ]

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-5 w-80 bg-gray-100 rounded animate-pulse"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-20 bg-gray-300 rounded animate-pulse"></div>
                  <div className="h-3 w-32 bg-gray-100 rounded animate-pulse"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-neutral to-neutral-light bg-clip-text text-transparent">
              Platform Control Center
            </h1>
            <p className="text-neutral-light mt-1">
              Real-time insights and management dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-neutral-light flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={handleLogout}
              className="flex items-center gap-2 border-red-500/20 hover:bg-red-500/10 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            const colorClasses = {
              blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
              green: 'bg-green-500/10 text-green-600 border-green-500/20',
              purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
              orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
            }
            return (
              <Card
                key={stat.label}
                className={`p-6 border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 animate-smooth-appear ${colorClasses[stat.color as keyof typeof colorClasses]
                  }`}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses].split(' ')[0]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {stat.trend && (
                    <Badge variant="secondary" className="text-xs">
                      {stat.trend}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-light mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-neutral mb-1">{stat.value.toLocaleString()}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-neutral-light">{stat.subtitle}</p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions Panel */}
        <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 transition-all duration-300 hover:shadow-lg animate-smooth-appear" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-neutral mb-1">Quick Actions</h2>
              <p className="text-sm text-neutral-light">Common tasks and shortcuts</p>
            </div>
            <Zap className="w-8 h-8 text-primary transition-transform duration-300 hover:scale-110" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="primary"
              onClick={() => router.push('/superadmin/students')}
              className="flex items-center justify-center gap-2 h-auto py-4"
            >
              <Plus className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">Add Student</p>
                <p className="text-xs opacity-90">Quick create</p>
              </div>
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/superadmin/students/compare')}
              className="flex items-center justify-center gap-2 h-auto py-4"
            >
              <BarChart3 className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">Compare Students</p>
                <p className="text-xs opacity-90">Side-by-side</p>
              </div>
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast('Report generation feature coming soon', 'info')}
              className="flex items-center justify-center gap-2 h-auto py-4"
            >
              <DownloadIcon className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">Generate Report</p>
                <p className="text-xs opacity-90">Export data</p>
              </div>
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/superadmin/analytics')}
              className="flex items-center justify-center gap-2 h-auto py-4"
            >
              <Eye className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">View Analytics</p>
                <p className="text-xs opacity-90">Deep insights</p>
              </div>
            </Button>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Card
                key={action.title}
                className="group p-6 border-2 border-neutral-light/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer bg-gradient-to-br from-white to-secondary/5 animate-smooth-appear"
                onClick={action.action}
                style={{
                  animationDelay: `${(index + 4) * 100}ms`,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                    <Icon className="w-6 h-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-light group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="text-lg font-semibold text-neutral mb-2 group-hover:text-primary transition-colors duration-300">
                  {action.title}
                </h3>
                <p className="text-sm text-neutral-light leading-relaxed">
                  {action.description}
                </p>
              </Card>
            )
          })}
        </div>

        {/* Colleges Overview */}
        <Card className="p-6 border-2 border-neutral-light/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-neutral mb-1">Colleges Overview</h2>
              <p className="text-sm text-neutral-light">
                Manage and monitor all colleges on the platform
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search colleges..."
                className="w-full sm:w-64"
              />
              <Button
                variant="primary"
                onClick={() => router.push('/superadmin/colleges')}
                className="flex items-center gap-2"
              >
                Manage All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {colleges.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-neutral-light mx-auto mb-4" />
              <p className="text-neutral-light">No colleges found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredColleges.slice(0, 6).map((college) => (
                <Card
                  key={college.collage_id}
                  className="p-5 border border-neutral-light/20 hover:border-primary/50 hover:shadow-lg transition-all duration-300 group cursor-pointer"
                  onClick={() => router.push(`/superadmin/colleges`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium text-neutral-light uppercase tracking-wide mb-1">
                        {college.collage_id}
                      </p>
                      <h4 className="text-lg font-semibold text-neutral group-hover:text-primary transition-colors">
                        {college.collage_name}
                      </h4>
                    </div>
                    <Badge
                      variant={college.collage_status === 1 ? 'default' : 'secondary'}
                      className={
                        college.collage_status === 1
                          ? 'bg-green-500/10 text-green-600 border-green-500/20'
                          : 'bg-red-500/10 text-red-600 border-red-500/20'
                      }
                    >
                      {college.collage_status === 1 ? (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {college.collage_status === 1 ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-neutral-light">
                    {college.studentCount !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Students:</span>
                        <span className="font-semibold text-neutral">{college.studentCount}</span>
                      </div>
                    )}
                    {college.usage !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Usage:</span>
                        <span className="font-semibold text-neutral">{college.usage}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-light/10 flex items-center text-xs text-primary group-hover:gap-2 transition-all">
                    <span>View details</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {filteredColleges.length > 6 && (
            <div className="mt-6 text-center">
              <Button
                variant="secondary"
                onClick={() => router.push('/superadmin/colleges')}
                className="flex items-center gap-2 mx-auto"
              >
                View All {colleges.length} Colleges
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </Card>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engagement Metrics */}
          <Card className="p-6 border-2 border-neutral-light/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral">Engagement Metrics</h3>
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-light">Student Engagement</span>
                  <span className="text-sm font-semibold text-neutral">
                    {stats?.students.engagementRate || 0}%
                  </span>
                </div>
                <div className="w-full bg-neutral-light/10 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-primary to-secondary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.students.engagementRate || 0}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-light/10">
                <div>
                  <p className="text-xs text-neutral-light mb-1">Students with Progress</p>
                  <p className="text-2xl font-bold text-neutral">
                    {stats?.students.withProgress || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-light mb-1">Upcoming Exams</p>
                  <p className="text-2xl font-bold text-neutral">
                    {stats?.exams.upcoming || 0}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Real-time Activity Feed */}
          <Card className="p-6 border-2 border-neutral-light/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Recent Activity
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/superadmin/students')}
                className="text-xs"
              >
                View All
              </Button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-neutral-light">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity) => {
                  const Icon = activity.icon === 'Award' ? Award :
                    activity.icon === 'FileText' ? FileText :
                      activity.icon === 'CheckCircle2' ? CheckCircle2 :
                        activity.icon === 'Code' ? Code : TrendingUp
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-background-elevated rounded-lg hover:bg-background-surface transition-colors">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral">{activity.student}</p>
                        <p className="text-xs text-neutral-light">{activity.message}</p>
                        <p className="text-xs text-neutral-light mt-1">{activity.time}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          {/* Platform Health */}
          <Card className="p-6 border-2 border-neutral-light/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral">Platform Health</h3>
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-neutral">System Status</p>
                    <p className="text-xs text-neutral-light">All systems operational</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                  Healthy
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-light/10">
                <div>
                  <p className="text-xs text-neutral-light mb-1">Active Colleges</p>
                  <p className="text-2xl font-bold text-neutral">
                    {stats?.colleges.active || 0} / {stats?.colleges.total || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-light mb-1">Subscribed</p>
                  <p className="text-2xl font-bold text-neutral">
                    {stats?.colleges.subscribed || 0}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  )
}
