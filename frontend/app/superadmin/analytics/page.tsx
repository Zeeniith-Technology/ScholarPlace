'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthHeader, clearAuth } from '@/utils/auth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Toast, useToast } from '@/components/ui/Toast'
import { exportAnalyticsData } from '@/utils/exportUtils'
import {
  TrendingUp,
  Users,
  Building2,
  Award,
  BookOpen,
  Code,
  BarChart3,
  RefreshCw,
  Download,
  ArrowLeft,
  Target,
  Activity,
} from 'lucide-react'

/**
 * Superadmin Analytics Page
 * Route: /superadmin/analytics
 */
export default function SuperadminAnalyticsPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [collegeStats, setCollegeStats] = useState<any[]>([])
  const [studentAnalytics, setStudentAnalytics] = useState<any[]>([])
  const [selectedCollege, setSelectedCollege] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [selectedCollege])

  const checkAuth = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) {
        router.push('/superadmin/login')
        return
      }
      
      // Verify authentication by fetching profile (requires valid JWT token)
      const profileRes = await fetch(`${apiBaseUrl}/profile/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      })
      
      // Only redirect on 401/403 (authentication errors)
      if (profileRes.status === 401 || profileRes.status === 403) {
        console.log('[Analytics Page] Authentication failed, clearing token and redirecting to login')
        clearAuth()
        window.location.href = '/superadmin/login'
        return
      }

      if (!profileRes.ok) {
        console.error('[Analytics Page] Profile fetch failed with status:', profileRes.status)
        // Don't redirect on other errors
        return
      }

      const profileResult = await profileRes.json()
      const userRole = profileResult.data?.role || profileResult.data?.person_role
      if (!profileResult.success || userRole !== 'superadmin') {
        console.log('[Analytics Page] Invalid role or failed profile check, clearing token and redirecting to login')
        clearAuth()
        window.location.href = '/superadmin/login'
        return
      }
    } catch (error) {
      console.error('[Analytics Page] Auth verification error:', error)
      // Only redirect if we have no token
      const authHeader = getAuthHeader()
      if (!authHeader) {
        clearAuth()
        window.location.href = '/superadmin/login'
      }
    }
  }

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) {
        router.push('/superadmin/login')
        return
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      }

      // Fetch overview
      const overviewRes = await fetch(`${apiBaseUrl}/superadmin/analytics/overview`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json()
        if (overviewData.success) {
          setOverview(overviewData.data)
        }
      }

      // Fetch college statistics
      const collegesRes = await fetch(`${apiBaseUrl}/superadmin/analytics/colleges`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })
      if (collegesRes.ok) {
        const collegesData = await collegesRes.json()
        if (collegesData.success && collegesData.data) {
          // Backend returns { data: { colleges: [...] } }
          const colleges = Array.isArray(collegesData.data.colleges)
            ? collegesData.data.colleges
            : Array.isArray(collegesData.data)
            ? collegesData.data
            : []
          setCollegeStats(colleges)
        } else {
          setCollegeStats([])
        }
      } else {
        setCollegeStats([])
      }

      // Fetch student analytics
      const studentsRes = await fetch(`${apiBaseUrl}/superadmin/analytics/students`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ collegeId: selectedCollege !== 'all' ? selectedCollege : undefined }),
      })
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        if (studentsData.success) {
          setStudentAnalytics(studentsData.data)
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchData()
  }

  const handleExport = () => {
    try {
      if (!overview && (!collegeStats || collegeStats.length === 0) && (!studentAnalytics || studentAnalytics.length === 0)) {
        showToast('No data available to export', 'warning')
        return
      }
      exportAnalyticsData(overview, collegeStats, studentAnalytics, selectedCollege)
      showToast('Analytics data exported successfully', 'success')
    } catch (error: any) {
      showToast(error.message || 'Failed to export data', 'error')
    }
  }

  if (isLoading && !overview) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/superadmin/dashboard')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-neutral">Platform Analytics</h1>
              <p className="text-neutral-light mt-1">Comprehensive platform-wide statistics and insights</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={handleExport}
              className="px-4"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs text-neutral-light">Colleges</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-neutral">{overview.colleges.total}</p>
                <p className="text-sm text-neutral-light mt-1">
                  {overview.colleges.active} active
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs text-neutral-light">Students</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-neutral">{overview.students.total}</p>
                <p className="text-sm text-neutral-light mt-1">
                  {overview.students.active} active • {overview.students.engagementRate}% engaged
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-xs text-neutral-light">Progress</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-neutral">{overview.progress.totalDaysCompleted}</p>
                <p className="text-sm text-neutral-light mt-1">
                  Days completed
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-xs text-neutral-light">Average Score</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-neutral">{overview.progress.averageScore}%</p>
                <p className="text-sm text-neutral-light mt-1">
                  Across all tests
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* College Statistics */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral">College Performance</h2>
            <Select
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              className="w-48"
            >
              <option value="all">All Colleges</option>
              {Array.isArray(collegeStats) && collegeStats.map((college) => (
                <option key={college.collegeId} value={college.collegeId}>
                  {college.collegeName}
                </option>
              ))}
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-light/20">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">College</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">Students</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">Active</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">With Progress</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">Days Completed</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(collegeStats) && collegeStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-light">
                      No college data available
                    </td>
                  </tr>
                ) : (
                  Array.isArray(collegeStats) && collegeStats.map((college) => (
                    <tr key={college.collegeId} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                      <td className="py-3 px-4 text-sm text-neutral">{college.collegeName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          college.status === 'active' 
                            ? 'bg-green-500/10 text-green-600' 
                            : 'bg-red-500/10 text-red-600'
                        }`}>
                          {college.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral text-right">{college.students?.total || 0}</td>
                      <td className="py-3 px-4 text-sm text-neutral text-right">{college.students?.active || 0}</td>
                      <td className="py-3 px-4 text-sm text-neutral text-right">{college.students?.withProgress || 0}</td>
                      <td className="py-3 px-4 text-sm text-neutral text-right">{college.progress?.totalDaysCompleted || 0}</td>
                      <td className="py-3 px-4 text-sm text-neutral text-right">{college.progress?.averageScore || 0}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Students */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral mb-6">Top Performing Students</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-light/20">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Rank</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Email</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">Days Completed</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">Practice Tests</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">Coding Problems</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(studentAnalytics) && studentAnalytics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-light">
                      No student data available
                    </td>
                  </tr>
                ) : (
                  Array.isArray(studentAnalytics) && studentAnalytics.slice(0, 20).map((student, index) => (
                    <tr key={student.studentId || index} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                      <td className="py-3 px-4 text-sm text-neutral">
                        <span className="font-semibold">#{index + 1}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral">{student.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-neutral-light">{student.email || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-neutral text-right">{student.progress?.totalDaysCompleted || 0}</td>
                      <td className="py-3 px-4 text-sm text-neutral text-right">{student.progress?.totalPracticeTests || 0}</td>
                      <td className="py-3 px-4 text-sm text-neutral text-right">{student.progress?.totalCodingProblems || 0}</td>
                      <td className="py-3 px-4 text-sm text-neutral text-right">
                        <span className="font-semibold">{student.progress?.averageScore || 0}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
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
