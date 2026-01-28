'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TPCLayout } from '@/components/layouts/TPCLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader, clearAuth, getToken } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Award,
  RefreshCw,
  Filter,
  Download,
  ChevronRight,
} from 'lucide-react'

/**
 * TPC Analytics Page
 * View college-wide analytics and performance metrics
 * Route: /tpc/analytics
 */
export default function TPCAnalyticsPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [departmentPerformance, setDepartmentPerformance] = useState<any[]>([])
  const [performanceTrends, setPerformanceTrends] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedWeeks, setSelectedWeeks] = useState(8)
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  useEffect(() => {
    checkAuth()
    fetchDepartments()
    fetchAnalyticsData()
  }, [])

  const checkAuth = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl()
      const token = getToken()
      
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
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      })

      if (profileRes.status === 401 || profileRes.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const profileResult = await profileRes.json()
      const userRole = profileResult.data?.role || profileResult.data?.person_role

      if (userRole?.toLowerCase() !== 'tpc') {
        if (userRole?.toLowerCase() === 'depttpc') {
          window.location.href = '/dept-tpc/dashboard'
        } else {
          clearAuth()
          window.location.href = '/auth/login'
        }
        return
      }
    } catch (error) {
      console.error('[Analytics] Auth check error:', error)
      // Don't redirect on network errors, allow retry
    }
  }

  const fetchDepartments = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const response = await fetch(`${apiBaseUrl}/tpc-college/departments/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      })

      const data = await response.json()
      if (data.success) {
        setDepartments(data.data || [])
      }
    } catch (error) {
      console.error('[Analytics] Error fetching departments:', error)
    }
  }

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      // Fetch department performance
      const deptRes = await fetch(`${apiBaseUrl}/tpc-college/analytics/department-performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      })

      if (deptRes.status === 401 || deptRes.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const deptData = await deptRes.json()
      if (deptData.success) {
        setDepartmentPerformance(deptData.data || [])
      }

      // Fetch performance trends
      const trendsRes = await fetch(`${apiBaseUrl}/tpc-college/analytics/trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          weeks: selectedWeeks,
          department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        }),
      })

      if (trendsRes.status === 401 || trendsRes.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const trendsData = await trendsRes.json()
      if (trendsData.success) {
        setPerformanceTrends(trendsData.data || [])
      }
    } catch (error) {
      console.error('[Analytics] Error fetching data:', error)
      showToast('Failed to load analytics data', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchAnalyticsData()
  }

  const handleFilterChange = () => {
    setIsRefreshing(true)
    fetchAnalyticsData()
  }

  // Navigate to students page filtered by this department
  const handleDepartmentClick = (dept: any) => {
    const param = (dept.department_id && /^[0-9a-fA-F]{24}$/.test(String(dept.department_id)))
      ? dept.department_id
      : dept.department
    router.push('/tpc/students?department=' + encodeURIComponent(param))
  }

  // Calculate max score for chart scaling
  const maxScore = Math.max(
    ...departmentPerformance.map(d => d.averageScore),
    ...performanceTrends.map(t => t.averageScore),
    100
  )

  return (
    <TPCLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2">
              College Analytics
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              Comprehensive analytics and performance insights across departments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2 text-neutral-light">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-light">Weeks:</label>
                <select
                  value={selectedWeeks}
                  onChange={(e) => {
                    setSelectedWeeks(Number(e.target.value))
                    handleFilterChange()
                  }}
                  className="px-3 py-1 border border-neutral-light/30 rounded-lg bg-background text-neutral text-sm"
                >
                  <option value={4}>4 Weeks</option>
                  <option value={8}>8 Weeks</option>
                  <option value={12}>12 Weeks</option>
                  <option value={16}>16 Weeks</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-light">Department:</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value)
                    handleFilterChange()
                  }}
                  className="px-3 py-1 border border-neutral-light/30 rounded-lg bg-background text-neutral text-sm"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.value || dept.name} value={dept.value || dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <Card>
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-neutral-light mx-auto mb-4 animate-spin" />
              <p className="text-neutral-light">Loading analytics...</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Department Performance */}
            <Card>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-neutral mb-1">
                      Department Performance Comparison
                    </h2>
                    <p className="text-sm text-neutral-light">
                      Average scores and engagement across departments
                    </p>
                  </div>
                </div>

                {departmentPerformance.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-neutral-light mx-auto mb-4" />
                    <p className="text-neutral-light">No department data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Chart Visualization */}
                    <div className="space-y-3">
                      {departmentPerformance.map((dept, index) => (
                        <div
                          key={dept.department}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleDepartmentClick(dept)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDepartmentClick(dept) } }}
                          className="space-y-2 p-3 -mx-3 rounded-lg cursor-pointer hover:bg-background-elevated/80 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: `hsl(${(index * 360) / departmentPerformance.length}, 70%, 50%)`,
                                }}
                              />
                              <span className="font-medium text-neutral group-hover:text-primary transition-colors">{dept.department}</span>
                              <Badge variant="secondary" className="text-xs cursor-pointer">
                                {dept.totalStudents} students
                              </Badge>
                              <ChevronRight className="w-4 h-4 text-neutral-light opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-neutral-light">Avg Score:</span>
                              <span className="font-semibold text-neutral">{dept.averageScore}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-neutral-light/10 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(dept.averageScore / maxScore) * 100}%`,
                                backgroundColor: `hsl(${(index * 360) / departmentPerformance.length}, 70%, 50%)`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-neutral-light">
                            <span>Engagement: {dept.engagementRate}%</span>
                            <span>Tests: {dept.totalTests}</span>
                            <span>Days: {dept.totalDaysCompleted}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary Table */}
                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-neutral-light/20">
                            <th className="text-left py-2 px-3 text-neutral-light font-medium">Department</th>
                            <th className="text-right py-2 px-3 text-neutral-light font-medium">Students</th>
                            <th className="text-right py-2 px-3 text-neutral-light font-medium">Avg Score</th>
                            <th className="text-right py-2 px-3 text-neutral-light font-medium">Engagement</th>
                            <th className="text-right py-2 px-3 text-neutral-light font-medium">Tests</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departmentPerformance.map((dept) => (
                            <tr
                              key={dept.department}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleDepartmentClick(dept)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDepartmentClick(dept) } }}
                              className="border-b border-neutral-light/10 hover:bg-background-elevated cursor-pointer transition-colors"
                            >
                              <td className="py-2 px-3 font-medium text-neutral">{dept.department}</td>
                              <td className="py-2 px-3 text-right text-neutral-light">{dept.totalStudents}</td>
                              <td className="py-2 px-3 text-right">
                                <span className="font-semibold text-neutral">{dept.averageScore}%</span>
                              </td>
                              <td className="py-2 px-3 text-right text-neutral-light">{dept.engagementRate}%</td>
                              <td className="py-2 px-3 text-right text-neutral-light">{dept.totalTests}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Performance Trends */}
            <Card>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-neutral mb-1">
                      Performance Trends
                    </h2>
                    <p className="text-sm text-neutral-light">
                      Weekly performance progression over time
                    </p>
                  </div>
                </div>

                {performanceTrends.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-neutral-light mx-auto mb-4" />
                    <p className="text-neutral-light">No trend data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Trend Chart */}
                    <div className="space-y-3">
                      {performanceTrends.map((trend, index) => {
                        const prevTrend = performanceTrends[index - 1]
                        const isImproving = !prevTrend || trend.averageScore >= prevTrend.averageScore
                        
                        return (
                          <div key={trend.week} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-neutral w-20">Week {trend.week}</span>
                                {prevTrend && (
                                  <div className="flex items-center gap-1">
                                    {isImproving ? (
                                      <TrendingUp className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <TrendingDown className="w-4 h-4 text-red-500" />
                                    )}
                                    <span className="text-xs text-neutral-light">
                                      {isImproving ? '+' : ''}
                                      {trend.averageScore - prevTrend.averageScore}%
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-neutral-light">
                                  {trend.studentsParticipated} students
                                </span>
                                <span className="font-semibold text-neutral">{trend.averageScore}%</span>
                              </div>
                            </div>
                            <div className="w-full bg-neutral-light/10 rounded-full h-3 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500 bg-primary"
                                style={{
                                  width: `${(trend.averageScore / maxScore) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-neutral-light">
                              <span>Tests: {trend.totalTests}</span>
                              <span>Participants: {trend.studentsParticipated}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                      <div className="p-4 bg-background-elevated rounded-lg">
                        <div className="text-xs text-neutral-light mb-1">Overall Avg</div>
                        <div className="text-2xl font-bold text-neutral">
                          {performanceTrends.length > 0
                            ? Math.round(
                                performanceTrends.reduce((sum, t) => sum + t.averageScore, 0) /
                                  performanceTrends.length
                              )
                            : 0}
                          %
                        </div>
                      </div>
                      <div className="p-4 bg-background-elevated rounded-lg">
                        <div className="text-xs text-neutral-light mb-1">Total Tests</div>
                        <div className="text-2xl font-bold text-neutral">
                          {performanceTrends.reduce((sum, t) => sum + t.totalTests, 0)}
                        </div>
                      </div>
                      <div className="p-4 bg-background-elevated rounded-lg">
                        <div className="text-xs text-neutral-light mb-1">Peak Week</div>
                        <div className="text-2xl font-bold text-neutral">
                          Week{' '}
                          {performanceTrends.length > 0
                            ? performanceTrends.reduce((max, t) =>
                                t.averageScore > max.averageScore ? t : max
                              ).week
                            : '-'}
                        </div>
                      </div>
                      <div className="p-4 bg-background-elevated rounded-lg">
                        <div className="text-xs text-neutral-light mb-1">Growth</div>
                        <div className="text-2xl font-bold text-neutral">
                          {performanceTrends.length > 1
                            ? performanceTrends[performanceTrends.length - 1].averageScore -
                              performanceTrends[0].averageScore > 0
                              ? '+'
                              : ''
                            : ''}
                          {performanceTrends.length > 1
                            ? performanceTrends[performanceTrends.length - 1].averageScore -
                              performanceTrends[0].averageScore
                            : 0}
                          %
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </div>
    </TPCLayout>
  )
}
