'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DepartmentTPCLayout } from '@/components/layouts/DepartmentTPCLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader, clearAuth, getToken } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  RefreshCw,
  Filter,
  Download,
  PieChart,
} from 'lucide-react'

/**
 * Department TPC Analytics Page
 * View department-wide analytics and performance metrics
 * Route: /dept-tpc/analytics
 */
export default function DepartmentTPCAnalyticsPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [performance, setPerformance] = useState<any>(null)
  const [performanceTrends, setPerformanceTrends] = useState<any[]>([])
  const [distribution, setDistribution] = useState<any>(null)
  const [selectedWeeks, setSelectedWeeks] = useState(8)
  const [departmentName, setDepartmentName] = useState('')

  useEffect(() => {
    checkAuth()
    fetchAnalyticsData()
  }, [])

  useEffect(() => {
    if (selectedWeeks) {
      fetchTrends()
    }
  }, [selectedWeeks])

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

      if (userRole?.toLowerCase() !== 'depttpc') {
        if (userRole?.toLowerCase() === 'tpc') {
          window.location.href = '/tpc/dashboard'
        } else {
          clearAuth()
          window.location.href = '/auth/login'
        }
        return
      }

      // Set department name from profile
      if (profileResult.data?.department || profileResult.data?.department_name) {
        setDepartmentName(profileResult.data.department || profileResult.data.department_name)
      }
    } catch (error) {
      console.error('[Analytics] Auth check error:', error)
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
      const perfRes = await fetch(`${apiBaseUrl}/tpc-dept/analytics/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      })

      if (perfRes.status === 401 || perfRes.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const perfData = await perfRes.json()
      if (perfData.success) {
        setPerformance(perfData.data)
        if (perfData.data?.department) {
          setDepartmentName(perfData.data.department)
        }
      }

      // Fetch score distribution
      const distRes = await fetch(`${apiBaseUrl}/tpc-dept/analytics/distribution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      })

      if (distRes.status === 401 || distRes.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const distData = await distRes.json()
      if (distData.success) {
        setDistribution(distData.data)
      }

      // Fetch trends
      await fetchTrends()
    } catch (error) {
      console.error('[Analytics] Error fetching data:', error)
      showToast('Failed to load analytics data', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const fetchTrends = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const trendsRes = await fetch(`${apiBaseUrl}/tpc-dept/analytics/trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          weeks: selectedWeeks,
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
      console.error('[Analytics] Error fetching trends:', error)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchAnalyticsData()
  }

  // Calculate max score for chart scaling
  const maxScore = Math.max(
    performance?.averageScore || 0,
    ...performanceTrends.map(t => t.averageScore),
    100
  )

  const exportData = () => {
    const data = {
      department: departmentName,
      performance,
      trends: performanceTrends,
      distribution,
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dept-analytics-${departmentName}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Analytics data exported successfully', 'success')
  }

  return (
    <DepartmentTPCLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2">
              Department Analytics
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              {departmentName && (
                <span className="inline-flex items-center gap-2">
                  <span>Analytics for</span>
                  <Badge variant="primary">{departmentName}</Badge>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-background-surface text-neutral hover:bg-background-elevated rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-neutral-light mx-auto mb-4 animate-spin" />
              <p className="text-neutral-light">Loading analytics...</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Performance Overview */}
            {performance && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-light">Total Students</span>
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold text-neutral">{performance.totalStudents || 0}</p>
                    <p className="text-xs text-neutral-light mt-1">
                      {performance.activeStudents || 0} active
                    </p>
                  </div>
                </Card>

                <Card>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-light">Average Score</span>
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold text-neutral">{performance.averageScore || 0}%</p>
                    <p className="text-xs text-neutral-light mt-1">
                      {performance.topPerformers || 0} top performers
                    </p>
                  </div>
                </Card>

                <Card>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-light">Tests Completed</span>
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold text-neutral">{performance.totalTests || 0}</p>
                    <p className="text-xs text-neutral-light mt-1">
                      {performance.totalDaysCompleted || 0} days completed
                    </p>
                  </div>
                </Card>

                <Card>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-light">Engagement Rate</span>
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold text-neutral">{performance.engagementRate || 0}%</p>
                    <p className="text-xs text-neutral-light mt-1">
                      {performance.needsAttention || 0} need attention
                    </p>
                  </div>
                </Card>
              </div>
            )}

            {/* Performance Trends */}
            <Card>
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-neutral mb-1">
                      Performance Trends
                    </h2>
                    <p className="text-sm text-neutral-light">Average scores over time</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-neutral-light">Weeks:</label>
                    <select
                      value={selectedWeeks}
                      onChange={(e) => setSelectedWeeks(Number(e.target.value))}
                      className="px-3 py-1 border border-neutral-light rounded-lg bg-background text-neutral text-sm"
                    >
                      <option value={4}>4 weeks</option>
                      <option value={8}>8 weeks</option>
                      <option value={12}>12 weeks</option>
                      <option value={16}>16 weeks</option>
                    </select>
                  </div>
                </div>

                {performanceTrends.length > 0 ? (
                  <div className="space-y-4">
                    {/* Chart */}
                    <div className="relative h-64 bg-background-surface rounded-lg p-4">
                      <div className="flex items-end justify-between h-full gap-1">
                        {performanceTrends.map((trend, index) => {
                          const height = maxScore > 0 ? (trend.averageScore / maxScore) * 100 : 0
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                              <div className="relative w-full h-full flex items-end">
                                <div
                                  className="w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary-dark"
                                  style={{ height: `${height}%`, minHeight: '4px' }}
                                  title={`Week ${trend.week}: ${trend.averageScore}%`}
                                />
                              </div>
                              <span className="text-xs text-neutral-light">W{trend.week}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Trend Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {performanceTrends.slice(-4).map((trend, index) => (
                        <div key={index} className="p-3 bg-background-surface rounded-lg">
                          <p className="text-xs text-neutral-light mb-1">Week {trend.week}</p>
                          <p className="text-lg font-bold text-neutral">{trend.averageScore}%</p>
                          <p className="text-xs text-neutral-light mt-1">
                            {trend.studentsParticipated} students
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-neutral-light mx-auto mb-4" />
                    <p className="text-neutral-light">No trend data available</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Score Distribution */}
            {distribution && (
              <Card>
                <div className="p-4 sm:p-6">
                  <h2 className="text-xl font-heading font-bold text-neutral mb-1">
                    Score Distribution
                  </h2>
                  <p className="text-sm text-neutral-light mb-6">
                    Distribution of student scores across performance categories
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-background-surface rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-light">Excellent (≥85%)</span>
                        <Award className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-2xl font-bold text-green-500">
                        {distribution.distribution?.excellent || 0}
                      </p>
                    </div>

                    <div className="p-4 bg-background-surface rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-light">Good (70-84%)</span>
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-2xl font-bold text-blue-500">
                        {distribution.distribution?.good || 0}
                      </p>
                    </div>

                    <div className="p-4 bg-background-surface rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-light">Average (50-69%)</span>
                        <BarChart3 className="w-4 h-4 text-yellow-500" />
                      </div>
                      <p className="text-2xl font-bold text-yellow-500">
                        {distribution.distribution?.average || 0}
                      </p>
                    </div>

                    <div className="p-4 bg-background-surface rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-light">Poor (&lt;50%)</span>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      </div>
                      <p className="text-2xl font-bold text-red-500">
                        {distribution.distribution?.poor || 0}
                      </p>
                    </div>
                  </div>

                  {distribution.distribution?.noData > 0 && (
                    <div className="mt-4 p-3 bg-background-surface rounded-lg">
                      <p className="text-sm text-neutral-light">
                        {distribution.distribution.noData} students have no score data yet
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
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
    </DepartmentTPCLayout>
  )
}
