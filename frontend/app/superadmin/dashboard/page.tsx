'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader } from '@/utils/auth'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import {
  Building2,
  Users,
  TrendingUp,
  Award,
  Activity,
  RefreshCw,
  ArrowRight,
  Target,
  Zap,
  Shield,
  FileText,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Bell,
  Plus,
  Download as DownloadIcon,
  Code,
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

/** Format a timestamp as a relative time ("5m ago"); returns '' for missing/invalid input. */
function formatRelativeTime(ts: unknown): string {
  if (!ts) return ''
  const d = new Date(ts as string)
  if (isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 0) return d.toLocaleString()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
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
  // Real platform health: measured API latency + error-log volume (last 24h)
  const [health, setHealth] = useState<{ apiOnline: boolean; latencyMs: number | null; errors24h: number | null }>({
    apiOnline: false,
    latencyMs: null,
    errors24h: null,
  })
  // Subscriptions that are expired or expire within 14 days (from the optional
  // collage_subscription_end_date set on the Colleges page)
  const [expiringSubs, setExpiringSubs] = useState<{ name: string; daysLeft: number }[]>([])

  const fetchExpiringSubscriptions = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/collage/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          projection: { collage_name: 1, collage_subscription_status: 1, collage_subscription_end_date: 1 },
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (!data.success || !Array.isArray(data.data)) return
      const alerts = data.data
        .filter((c: any) => c.collage_subscription_end_date && c.collage_subscription_status !== 'inactive')
        .map((c: any) => {
          const end = new Date(String(c.collage_subscription_end_date).slice(0, 10) + 'T23:59:59')
          return { name: c.collage_name, daysLeft: Math.ceil((end.getTime() - Date.now()) / 86400000) }
        })
        .filter((c: any) => !isNaN(c.daysLeft) && c.daysLeft <= 14)
        .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
      setExpiringSubs(alerts)
    } catch { /* alert banner is best-effort */ }
  }

  const fetchHealth = async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
    // 1. API reachability + latency (public health endpoint)
    let apiOnline = false
    let latencyMs: number | null = null
    try {
      const t0 = performance.now()
      const res = await fetch(`${apiBaseUrl}/health`, { cache: 'no-store' })
      latencyMs = Math.round(performance.now() - t0)
      apiOnline = res.ok
    } catch {
      apiOnline = false
      latencyMs = null
    }
    // 2. Error logs in the last 24 hours (best-effort; page still works if this fails)
    let errors24h: number | null = null
    try {
      const authHeader = getAuthHeader()
      if (authHeader) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const res = await fetch(`${apiBaseUrl}/superadmin/error-logs/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({
            filter: { timestamp: { $gte: since } },
            options: { limit: 1, count: true },
            projection: { _id: 1 },
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success && typeof data.count === 'number') errors24h = data.count
        }
      }
    } catch { /* leave null — shown as em dash */ }
    setHealth({ apiOnline, latencyMs, errors24h })
  }

  // Auth is enforced by SuperadminLayout (useSuperadminAuth); just load data.
  useEffect(() => {
    fetchDashboardData()
    fetchHealth()
    fetchExpiringSubscriptions()
  }, []) // Empty dependency array - only run on mount

  // Fetch only the overview stats, for a specific college (or all).
  // Takes collegeId explicitly to avoid stale-closure reads of state.
  const fetchOverview = async (collegeId: string) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
    const authHeader = getAuthHeader()
    if (!authHeader) return
    try {
      const overviewRes = await fetch(`${apiBaseUrl}/superadmin/analytics/overview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          collegeId: collegeId !== 'all' ? collegeId : undefined,
        }),
      })
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json()
        if (overviewData.success && overviewData.data) {
          setStats(overviewData.data)
        }
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching overview:', error)
    }
  }

  const handleCollegeFilterChange = async (collegeId: string) => {
    setSelectedCollege(collegeId)
    await fetchOverview(collegeId)
    setLastRefresh(new Date())
  }

  const fetchDashboardData = async (collegeId?: string) => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

      // Get auth header for all requests
      const authHeader = getAuthHeader()
      if (!authHeader) {
        setIsLoading(false)
        router.push('/superadmin/login')
        return
      }

      // Create headers object for all API requests
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      }

      // Fetch overview stats (respect the currently selected college filter)
      const effectiveCollege = collegeId ?? selectedCollege
      const overviewRes = await fetch(`${apiBaseUrl}/superadmin/analytics/overview`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          collegeId: effectiveCollege !== 'all' ? effectiveCollege : undefined,
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

      // Fetch recent activity
      const activityRes = await fetch(`${apiBaseUrl}/superadmin/analytics/recent-activity`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ limit: 10 }),
      })

      if (activityRes.ok) {
        const activityData = await activityRes.json()
        if (activityData.success && activityData.data) {
          // Map activity to include icons and format timestamps.
          // Backend sends { type, message, timestamp } — nothing else.
          const mappedActivity = (activityData.data.activities || [])
            .filter((activity: any) => activity && activity.message)
            .map((activity: any, index: number) => ({
              id: `activity-${index}`,
              message: activity.message,
              time: formatRelativeTime(activity.timestamp),
              icon: activity.type === 'registration' ? 'Award' :
                activity.type === 'test' ? 'FileText' :
                  activity.type === 'coding' ? 'Code' : 'CheckCircle2',
            }))
          setRecentActivity(mappedActivity)
        }
      }
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
    await Promise.all([fetchDashboardData(), fetchHealth()])
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

  if (isLoading && !stats) {
    return (
      <SuperadminLayout>
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
      </SuperadminLayout>
    )
  }

  return (
    <SuperadminLayout>
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
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs text-neutral-light flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <FilterSelect
              value={selectedCollege}
              onChange={handleCollegeFilterChange}
              widthClass="w-56"
              icon={Building2}
              options={[
                { value: 'all', label: 'All Colleges' },
                ...colleges.map((c) => ({ value: c.collage_id, label: c.collage_name })),
              ]}
            />
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Subscription expiry alert */}
        {expiringSubs.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-700">
                {expiringSubs.length} college subscription{expiringSubs.length !== 1 ? 's' : ''} need{expiringSubs.length === 1 ? 's' : ''} attention
              </p>
              <ul className="text-sm text-amber-700/90 mt-1 space-y-0.5">
                {expiringSubs.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">{s.name}</span>
                    {s.daysLeft < 0
                      ? ` — expired ${Math.abs(s.daysLeft)} day${Math.abs(s.daysLeft) !== 1 ? 's' : ''} ago`
                      : s.daysLeft === 0
                      ? ' — expires today'
                      : ` — expires in ${s.daysLeft} day${s.daysLeft !== 1 ? 's' : ''}`}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => router.push('/superadmin/colleges')}
              className="shrink-0 text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800"
            >
              Manage
            </button>
          </div>
        )}

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

        {/* Quick Actions — true tasks only. Plain navigation lives in the sidebar,
            so no duplicate nav cards/buttons here. */}
        <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 transition-all duration-300 hover:shadow-lg animate-smooth-appear" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-neutral mb-1">Quick Actions</h2>
              <p className="text-sm text-neutral-light">Common tasks and shortcuts</p>
            </div>
            <Zap className="w-8 h-8 text-primary transition-transform duration-300 hover:scale-110" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="primary"
              onClick={() => router.push('/superadmin/students?create=1')}
              className="flex items-center justify-center gap-2 h-auto py-4"
            >
              <Plus className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">Add Student</p>
                <p className="text-xs opacity-90">Opens the create form</p>
              </div>
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/superadmin/analytics')}
              className="flex items-center justify-center gap-2 h-auto py-4"
            >
              <DownloadIcon className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">Export Data</p>
                <p className="text-xs opacity-90">Via Analytics page</p>
              </div>
            </Button>
          </div>
        </Card>

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
                        <p className="text-sm font-medium text-neutral">{activity.message}</p>
                        {activity.time && (
                          <p className="text-xs text-neutral-light mt-1">{activity.time}</p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          {/* Platform Health — real measurements (API ping + 24h error volume) */}
          <Card className="p-6 border-2 border-neutral-light/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral">Platform Health</h3>
              <Shield className={`w-5 h-5 ${health.apiOnline ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg border mb-4 ${
              health.apiOnline
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="flex items-center gap-3">
                {health.apiOnline ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-neutral">Backend API</p>
                  <p className="text-xs text-neutral-light">
                    {health.apiOnline
                      ? `Online — ${health.latencyMs}ms response`
                      : 'Unreachable'}
                  </p>
                </div>
              </div>
              <Badge className={health.apiOnline
                ? 'bg-green-500/20 text-green-600 border-green-500/30'
                : 'bg-red-500/20 text-red-600 border-red-500/30'}>
                {health.apiOnline ? 'Online' : 'Down'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border mb-4 bg-background-elevated border-neutral-light/10">
              <div className="flex items-center gap-3">
                <AlertCircle className={`w-5 h-5 ${(health.errors24h ?? 0) > 0 ? 'text-orange-500' : 'text-green-600'}`} />
                <div>
                  <p className="text-sm font-medium text-neutral">Errors (last 24h)</p>
                  <p className="text-xs text-neutral-light">From system error logs</p>
                </div>
              </div>
              <span className={`text-lg font-bold ${(health.errors24h ?? 0) > 0 ? 'text-orange-500' : 'text-neutral'}`}>
                {health.errors24h ?? '—'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <p className="text-xs text-neutral-light mb-1">Active Students</p>
                <p className="text-2xl font-bold text-neutral">
                  {stats?.students.active || 0} / {stats?.students.total || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-light mb-1">Practice Tests Taken</p>
                <p className="text-2xl font-bold text-neutral">
                  {stats?.progress.totalPracticeTests || 0}
                </p>
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
    </SuperadminLayout>
  )
}
