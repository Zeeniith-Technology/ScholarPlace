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
  FileText,
  RefreshCw,
  Eye,
  TrendingUp,
  Users,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle2,
  Download,
  X,
  Plus
} from 'lucide-react'
import Link from 'next/link'

/**
 * Department TPC Tests Page
 * Manage and view test results for department students
 * Route: /dept-tpc/tests
 */
export default function DepartmentTPCTestsPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [testsList, setTestsList] = useState<any[]>([])
  const [selectedTest, setSelectedTest] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [showResults, setShowResults] = useState(false)
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })
  const [departmentName, setDepartmentName] = useState('')

  useEffect(() => {
    checkAuth()
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
      console.error('[Tests] Auth check error:', error)
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

      const res = await fetch(`${apiBaseUrl}/tpc-dept/tests/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          status: 'all',
          dateFrom: dateFilter.from || undefined,
          dateTo: dateFilter.to || undefined,
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

  const fetchTestResults = async (week: number, day: number) => {
    try {
      setIsLoading(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const res = await fetch(`${apiBaseUrl}/tpc-dept/tests/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          week,
          day,
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
    fetchTestResults(test.week, test.day)
  }

  const handleCloseResults = () => {
    setShowResults(false)
    setSelectedTest(null)
    setTestResults(null)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchTestsList()
  }

  const handleFilterApply = () => {
    fetchTestsList()
  }

  const exportResults = () => {
    if (!testResults) return

    const csv = [
      ['Student Name', 'Email', 'Enrollment', 'Score', 'Total Questions', 'Correct', 'Incorrect', 'Time Spent', 'Completed At'].join(','),
      ...testResults.results.map((r: any) => [
        r.studentName,
        r.studentEmail,
        r.enrollmentNumber,
        r.score,
        r.totalQuestions,
        r.correctAnswers,
        r.incorrectAnswers,
        r.timeSpent,
        r.completedAt,
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-results-week${testResults.week}-day${testResults.day}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Results exported successfully', 'success')
  }

  return (
    <DepartmentTPCLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2">
              Test Management
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              {departmentName && (
                <span className="inline-flex items-center gap-2">
                  <span>Tests for</span>
                  <Badge variant="primary">{departmentName}</Badge>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dept-tpc/schedule-test">
              <button className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-lg flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Schedule Test</span>
              </button>
            </Link>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-background-surface text-neutral hover:bg-background-elevated rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-neutral-light mb-2">From Date</label>
                <input
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-light rounded-lg bg-background text-neutral"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-light mb-2">To Date</label>
                <input
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-light rounded-lg bg-background text-neutral"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleFilterApply}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Apply Filters
                </button>
              </div>
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
          <Card>
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-heading font-bold text-neutral mb-1">
                    {testResults.testName}
                  </h2>
                  <p className="text-sm text-neutral-light">
                    {testResults.department} • {testResults.totalStudents} students
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportResults}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={handleCloseResults}
                    className="p-2 bg-background-surface text-neutral hover:bg-background-elevated rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Test Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-background-surface rounded-lg">
                  <p className="text-sm text-neutral-light mb-1">Average Score</p>
                  <p className="text-2xl font-bold text-neutral">{testResults.averageScore}%</p>
                </div>
                <div className="p-4 bg-background-surface rounded-lg">
                  <p className="text-sm text-neutral-light mb-1">Pass Rate</p>
                  <p className="text-2xl font-bold text-neutral">{testResults.passRate}%</p>
                </div>
                <div className="p-4 bg-background-surface rounded-lg">
                  <p className="text-sm text-neutral-light mb-1">Total Students</p>
                  <p className="text-2xl font-bold text-neutral">{testResults.totalStudents}</p>
                </div>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-light/20">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Student</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Enrollment</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-neutral">Score</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-neutral">Correct</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-neutral">Incorrect</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-neutral">Time</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-neutral">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.results.map((result: any, index: number) => (
                      <tr key={index} className="border-b border-neutral-light/10 hover:bg-background-surface">
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-neutral">{result.studentName}</p>
                            <p className="text-xs text-neutral-light">{result.studentEmail}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-neutral-light">{result.enrollmentNumber || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={result.score >= 50 ? 'success' : 'error'}>
                            {result.score}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-neutral">{result.correctAnswers}</td>
                        <td className="py-3 px-4 text-center text-sm text-neutral">{result.incorrectAnswers}</td>
                        <td className="py-3 px-4 text-center text-sm text-neutral-light">
                          {result.timeSpent ? `${Math.round(result.timeSpent / 60)}m` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {result.score >= 50 ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        ) : (
          /* Tests List View */
          <Card>
            <div className="p-4 sm:p-6">
              {testsList.length > 0 ? (
                <div className="space-y-4">
                  {testsList.map((test, index) => (
                    <div
                      key={index}
                      className="p-4 bg-background-surface rounded-lg hover:bg-background-elevated transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold text-neutral">{test.testName}</h3>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-neutral-light mb-1">Students</p>
                              <p className="text-sm font-medium text-neutral flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {test.studentsParticipated}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-light mb-1">Attempts</p>
                              <p className="text-sm font-medium text-neutral">{test.totalAttempts}</p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-light mb-1">Average Score</p>
                              <p className="text-sm font-medium text-neutral flex items-center gap-1">
                                <Award className="w-4 h-4" />
                                {test.averageScore}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-light mb-1">Pass Rate</p>
                              <p className="text-sm font-medium text-neutral">{test.passRate}%</p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewResults(test)}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Results
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-neutral-light mx-auto mb-4" />
                  <p className="text-neutral-light">No tests found</p>
                </div>
              )}
            </div>
          </Card>
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
