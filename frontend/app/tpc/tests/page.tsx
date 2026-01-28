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
  FileText,
  RefreshCw,
  Eye,
  TrendingUp,
  Users,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle2,
  Filter,
  Download,
} from 'lucide-react'

/**
 * TPC Tests Page
 * Manage and view test results
 * Route: /tpc/tests
 */
export default function TPCTestsPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [testsList, setTestsList] = useState<any[]>([])
  const [selectedTest, setSelectedTest] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [showResults, setShowResults] = useState(false)
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [departments, setDepartments] = useState<any[]>([])

  useEffect(() => {
    checkAuth()
    fetchDepartments()
    fetchTestsList()
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
      console.error('[Tests] Auth check error:', error)
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
      console.error('[Tests] Error fetching departments:', error)
    }
  }

  const fetchTestsList = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const res = await fetch(`${apiBaseUrl}/tpc-college/tests/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          status: 'all',
          dateFrom: dateFilter.from || undefined,
          dateTo: dateFilter.to || undefined,
          department: departmentFilter !== 'all' ? departmentFilter : undefined,
        }),
      })

      if (res.status === 401 || res.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const data = await res.json()
      if (data.success) {
        setTestsList(data.data || [])
      } else {
        showToast(data.message || 'Failed to fetch tests', 'error')
      }
    } catch (error) {
      console.error('[Tests] Error fetching tests:', error)
      showToast('Failed to load tests', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const fetchTestResults = async (week: number, day: number, department?: string) => {
    try {
      setIsLoading(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const res = await fetch(`${apiBaseUrl}/tpc-college/tests/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          week,
          day,
          department: department !== 'all' ? department : undefined,
        }),
      })

      if (res.status === 401 || res.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const data = await res.json()
      if (data.success) {
        setTestResults(data.data)
        setShowResults(true)
      } else {
        showToast(data.message || 'Failed to fetch test results', 'error')
      }
    } catch (error) {
      console.error('[Tests] Error fetching results:', error)
      showToast('Failed to load test results', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewResults = (test: any) => {
    setSelectedTest(test)
    fetchTestResults(test.week, test.day, departmentFilter !== 'all' ? departmentFilter : undefined)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchTestsList()
  }

  const handleFilterApply = () => {
    setIsRefreshing(true)
    fetchTestsList()
  }

  useEffect(() => {
    if (departmentFilter) {
      fetchTestsList()
    }
  }, [departmentFilter])

  const getPassRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-500'
    if (rate >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500'
    if (score >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <TPCLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2">
              Test Management
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              View and analyze test results across your college
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2 text-neutral-light">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {departments.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-neutral-light">Department:</label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => {
                      setDepartmentFilter(e.target.value)
                      handleFilterApply()
                    }}
                    className="px-3 py-1 border border-neutral-light/30 rounded-lg bg-background text-neutral text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.value || dept.name} value={dept.value || dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-light">From:</label>
                <input
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                  className="px-3 py-1 border border-neutral-light/30 rounded-lg bg-background text-neutral text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-light">To:</label>
                <input
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                  className="px-3 py-1 border border-neutral-light/30 rounded-lg bg-background text-neutral text-sm"
                />
              </div>
              <button
                onClick={handleFilterApply}
                className="px-4 py-1 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </Card>

        {isLoading && !showResults ? (
          <Card>
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-neutral-light mx-auto mb-4 animate-spin" />
              <p className="text-neutral-light">Loading tests...</p>
            </div>
          </Card>
        ) : showResults && testResults ? (
          /* Test Results View */
          <div className="space-y-4">
            <Card>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-neutral mb-1">
                      {testResults.testName}
                    </h2>
                    <p className="text-sm text-neutral-light">
                      Detailed results for all students
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowResults(false)
                      setTestResults(null)
                      setSelectedTest(null)
                    }}
                    className="px-4 py-2 bg-background-elevated text-neutral rounded-lg hover:bg-background-surface transition-colors"
                  >
                    Back to Tests
                  </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-background-elevated rounded-lg">
                    <div className="text-xs text-neutral-light mb-1">Total Students</div>
                    <div className="text-2xl font-bold text-neutral">{testResults.totalStudents}</div>
                  </div>
                  <div className="p-4 bg-background-elevated rounded-lg">
                    <div className="text-xs text-neutral-light mb-1">Average Score</div>
                    <div className={`text-2xl font-bold ${getScoreColor(testResults.averageScore)}`}>
                      {testResults.averageScore}%
                    </div>
                  </div>
                  <div className="p-4 bg-background-elevated rounded-lg">
                    <div className="text-xs text-neutral-light mb-1">Pass Rate</div>
                    <div className={`text-2xl font-bold ${getPassRateColor(testResults.passRate)}`}>
                      {testResults.passRate}%
                    </div>
                  </div>
                  <div className="p-4 bg-background-elevated rounded-lg">
                    <div className="text-xs text-neutral-light mb-1">Week {testResults.week} - Day {testResults.day}</div>
                    <div className="text-2xl font-bold text-neutral">Test</div>
                  </div>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-light/20">
                        <th className="text-left py-2 px-3 text-neutral-light font-medium">Student</th>
                        <th className="text-left py-2 px-3 text-neutral-light font-medium">Department</th>
                        <th className="text-right py-2 px-3 text-neutral-light font-medium">Score</th>
                        <th className="text-right py-2 px-3 text-neutral-light font-medium">Correct</th>
                        <th className="text-right py-2 px-3 text-neutral-light font-medium">Incorrect</th>
                        <th className="text-right py-2 px-3 text-neutral-light font-medium">Time</th>
                        <th className="text-right py-2 px-3 text-neutral-light font-medium">Attempt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.results.map((result: any, index: number) => (
                        <tr
                          key={index}
                          className="border-b border-neutral-light/10 hover:bg-background-elevated"
                        >
                          <td className="py-2 px-3">
                            <div>
                              <div className="font-medium text-neutral">{result.studentName}</div>
                              <div className="text-xs text-neutral-light">{result.studentEmail}</div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-neutral-light">{result.department || '-'}</td>
                          <td className="py-2 px-3 text-right">
                            <span className={`font-semibold ${getScoreColor(result.score)}`}>
                              {result.score}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-green-500">
                            {result.correctAnswers}
                          </td>
                          <td className="py-2 px-3 text-right text-red-500">
                            {result.incorrectAnswers}
                          </td>
                          <td className="py-2 px-3 text-right text-neutral-light">
                            {result.timeSpent} min
                          </td>
                          <td className="py-2 px-3 text-right text-neutral-light">
                            #{result.attempt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          /* Tests List View */
          <div className="space-y-4">
            {testsList.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-neutral-light mx-auto mb-4" />
                  <p className="text-neutral-light">No tests found</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testsList.map((test, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-heading font-bold text-neutral mb-1">
                            {test.testName}
                          </h3>
                          <p className="text-xs text-neutral-light">
                            Week {test.week} • Day {test.day}
                          </p>
                        </div>
                        <Badge
                          variant={test.passRate >= 70 ? 'success' : test.passRate >= 50 ? 'warning' : 'error'}
                          className="text-xs"
                        >
                          {test.passRate}% Pass
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-light">Average Score</span>
                          <span className={`font-semibold ${getScoreColor(test.averageScore)}`}>
                            {test.averageScore}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-light">Total Attempts</span>
                          <span className="font-semibold text-neutral">{test.totalAttempts}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-light">Students</span>
                          <span className="font-semibold text-neutral">{test.studentsParticipated}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-light">Highest Score</span>
                          <span className="font-semibold text-green-500">{test.highestScore}%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-light">Lowest Score</span>
                          <span className="font-semibold text-red-500">{test.lowestScore}%</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleViewResults(test)}
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Results
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
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
