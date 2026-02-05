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
  BookOpen,
  Download,
  FileText,
  RefreshCw,
  Calendar,
  Users,
  TrendingUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Department TPC Reports Page
 * Generate and export reports for department
 * Route: /dept-tpc/reports
 */
export default function DepartmentTPCReportsPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [reportType, setReportType] = useState<'performance' | 'test-results'>('performance')
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })
  const [departmentName, setDepartmentName] = useState('')
  const [expandedTestKeys, setExpandedTestKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    checkAuth()
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
      console.error('[Reports] Auth check error:', error)
    }
  }

  const generateReport = async () => {
    try {
      setIsGenerating(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const res = await fetch(`${apiBaseUrl}/tpc-dept/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          reportType,
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
      if (data.success && data.data) {
        setReportData(data.data)
        showToast('Report generated successfully', 'success')
      } else {
        setReportData(null)
        showToast(data.message || 'Failed to generate report', 'error')
      }
    } catch (error) {
      console.error('[Reports] Error generating report:', error)
      setReportData(null)
      showToast('Failed to generate report', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData) return

    let csvContent = ''
    
    if (reportType === 'performance' && reportData.students) {
      csvContent = 'Name,Email,Department,Enrollment Number,Average Score,Days Completed,Tests Completed,Status\n'
      reportData.students.forEach((student: any) => {
        csvContent += `"${(student.name || '').replace(/"/g, '""')}","${(student.email || '').replace(/"/g, '""')}","${(student.department || '').replace(/"/g, '""')}","${(student.enrollmentNumber || '').replace(/"/g, '""')}",${student.averageScore},${student.daysCompleted},${student.testsCompleted},"${(student.status || '').replace(/"/g, '""')}"\n`
      })
    } else if (reportType === 'test-results' && reportData.tests) {
      // Full report with student details: one row per student per test
      csvContent = 'Test Name,Week,Day,Student Name,Email,Enrollment Number,Score,Total Questions,Correct Answers,Completed At\n'
      reportData.tests.forEach((test: any) => {
        (test.results || []).forEach((r: any) => {
          const dateStr = r.completedAt ? new Date(r.completedAt).toLocaleString() : ''
          csvContent += `"${(test.testName || '').replace(/"/g, '""')}",${test.week},${test.day},"${(r.studentName || '').replace(/"/g, '""')}","${(r.studentEmail || '').replace(/"/g, '""')}","${(r.enrollmentNumber || '').replace(/"/g, '""')}",${r.score},${r.totalQuestions || ''},${r.correctAnswers || ''},"${dateStr}"\n`
        })
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `dept-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Report exported successfully', 'success')
  }

  const downloadStudentReport = (student: any) => {
    if (!student) return
    let csvContent = 'Student Name,Email,Enrollment Number,Test Name,Week,Day,Score,Total Questions,Correct Answers,Completed At\n'
    const name = (student.studentName || '').replace(/"/g, '""')
    const email = (student.studentEmail || '').replace(/"/g, '""')
    const enrollment = (student.enrollmentNumber || '').replace(/"/g, '""')
    ;(student.tests || []).forEach((t: any) => {
      const dateStr = t.completedAt ? new Date(t.completedAt).toLocaleString() : ''
      csvContent += `"${name}","${email}","${enrollment}","${(t.testName || '').replace(/"/g, '""')}",${t.week},${t.day},${t.score},${t.totalQuestions || ''},${t.correctAnswers || ''},"${dateStr}"\n`
    })
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `student-report-${(student.studentName || 'student').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(`Downloaded report for ${student.studentName}`, 'success')
  }

  const downloadBatch = () => {
    if (reportType === 'test-results' && reportData?.studentWiseReport?.length) {
      let csvContent = 'Student Name,Email,Enrollment Number,Tests Count,Test Name,Week,Day,Score,Completed At\n'
      reportData.studentWiseReport.forEach((student: any) => {
        const name = (student.studentName || '').replace(/"/g, '""')
        const email = (student.studentEmail || '').replace(/"/g, '""')
        const enrollment = (student.enrollmentNumber || '').replace(/"/g, '""')
        ;(student.tests || []).forEach((t: any) => {
          const dateStr = t.completedAt ? new Date(t.completedAt).toLocaleString() : ''
          csvContent += `"${name}","${email}","${enrollment}",${student.testsCount},"${(t.testName || '').replace(/"/g, '""')}",${t.week},${t.day},${t.score},"${dateStr}"\n`
        })
      })
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `dept-test-results-batch-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showToast('Batch report downloaded', 'success')
    } else {
      exportToCSV()
    }
  }

  const exportToJSON = () => {
    if (!reportData) return

    const jsonContent = JSON.stringify(reportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `dept-report-${reportType}-${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    showToast('Report exported successfully', 'success')
  }

  return (
    <DepartmentTPCLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2">
              Reports
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              {departmentName && (
                <span className="inline-flex items-center gap-2">
                  <span>Generate reports for</span>
                  <Badge variant="primary">{departmentName}</Badge>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Report Configuration */}
        <Card>
          <div className="p-4 sm:p-6">
            <h2 className="text-lg font-heading font-bold text-neutral mb-4">Report Configuration</h2>
            
            <div className="space-y-4">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-light mb-2">
                  Report Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reportType"
                      value="performance"
                      checked={reportType === 'performance'}
                      onChange={(e) => setReportType(e.target.value as 'performance' | 'test-results')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-neutral">Performance Summary</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reportType"
                      value="test-results"
                      checked={reportType === 'test-results'}
                      onChange={(e) => setReportType(e.target.value as 'performance' | 'test-results')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-neutral">Test Results</span>
                  </label>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-light mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-light/30 rounded-lg bg-background text-neutral"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-light mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-light/30 rounded-lg bg-background text-neutral"
                  />
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateReport}
                disabled={isGenerating}
                className="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* Report Results */}
        {reportData && (
          <Card>
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-heading font-bold text-neutral mb-1">
                    {reportType === 'performance' ? 'Performance Summary Report' : 'Test Results Report'}
                  </h2>
                  <p className="text-sm text-neutral-light">
                    {reportData.generatedAt
                      ? `Generated on ${new Date(reportData.generatedAt).toLocaleString()}`
                      : 'Report generated'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-background-elevated text-neutral rounded-lg hover:bg-background-surface transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  {reportType === 'test-results' && reportData?.studentWiseReport?.length > 0 && (
                    <button
                      onClick={downloadBatch}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download batch
                    </button>
                  )}
                  <button
                    onClick={exportToJSON}
                    className="px-4 py-2 bg-background-elevated text-neutral rounded-lg hover:bg-background-surface transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export JSON
                  </button>
                </div>
              </div>

              {reportType === 'performance' && Array.isArray(reportData.students) ? (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Total Students</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary?.totalStudents ?? 0}</div>
                    </div>
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Active Students</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary?.activeStudents ?? 0}</div>
                    </div>
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Average Score</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary?.averageScore ?? 0}%</div>
                    </div>
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Total Tests</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary?.totalTests ?? 0}</div>
                    </div>
                  </div>

                  {/* Students Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-light/20">
                          <th className="text-left py-2 px-3 text-neutral-light font-medium">Name</th>
                          <th className="text-left py-2 px-3 text-neutral-light font-medium">Email</th>
                          <th className="text-left py-2 px-3 text-neutral-light font-medium">Department</th>
                          <th className="text-right py-2 px-3 text-neutral-light font-medium">Avg Score</th>
                          <th className="text-right py-2 px-3 text-neutral-light font-medium">Days</th>
                          <th className="text-right py-2 px-3 text-neutral-light font-medium">Tests</th>
                          <th className="text-left py-2 px-3 text-neutral-light font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.students.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-neutral-light">
                              No students in your department for this report.
                            </td>
                          </tr>
                        ) : reportData.students.map((student: any, index: number) => (
                          <tr
                            key={index}
                            className="border-b border-neutral-light/10 hover:bg-background-elevated"
                          >
                            <td className="py-2 px-3 font-medium text-neutral">{student.name}</td>
                            <td className="py-2 px-3 text-neutral-light">{student.email}</td>
                            <td className="py-2 px-3 text-neutral-light">{student.department || '-'}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`font-semibold ${
                                student.averageScore >= 70 ? 'text-green-500' :
                                student.averageScore >= 50 ? 'text-yellow-500' : 'text-red-500'
                              }`}>
                                {student.averageScore}%
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-neutral-light">{student.daysCompleted}</td>
                            <td className="py-2 px-3 text-right text-neutral-light">{student.testsCompleted}</td>
                            <td className="py-2 px-3">
                              <Badge
                                variant={student.status === 'active' ? 'success' : 'secondary'}
                                className="text-xs"
                              >
                                {student.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : reportType === 'test-results' && Array.isArray(reportData.tests) ? (
                <>
                  {/* Summary Stats - Total Students = all in department; Students with test activity = who took tests */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Total Tests</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary?.totalTests ?? 0}</div>
                    </div>
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Unique Tests</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary?.uniqueTests ?? 0}</div>
                    </div>
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Total Students (Dept)</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary?.totalStudents ?? 0}</div>
                      <div className="text-xs text-neutral-light mt-0.5">in your department</div>
                    </div>
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Students with test activity</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary?.studentsWithTestActivity ?? 0}</div>
                      <div className="text-xs text-neutral-light mt-0.5">took at least one test</div>
                    </div>
                  </div>

                  {/* Tests Table with expandable student details */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-light/20">
                          <th className="w-8 py-2 px-1" />
                          <th className="text-left py-2 px-3 text-neutral-light font-medium">Test Name</th>
                          <th className="text-center py-2 px-3 text-neutral-light font-medium">Week</th>
                          <th className="text-center py-2 px-3 text-neutral-light font-medium">Day</th>
                          <th className="text-right py-2 px-3 text-neutral-light font-medium">Attempts</th>
                          <th className="text-right py-2 px-3 text-neutral-light font-medium">Avg Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.tests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center">
                              <p className="text-neutral-light">No test results in your department for this date range.</p>
                              {(dateFilter.from || dateFilter.to) && (
                                <p className="text-sm text-primary/80 mt-2">Try clearing the date range and generate again to include all results.</p>
                              )}
                            </td>
                          </tr>
                        ) : reportData.tests.map((test: any, index: number) => {
                          const testKey = `${test.week}-${test.day}`
                          const isExpanded = expandedTestKeys.has(testKey)
                          const results = test.results || []
                          return (
                            <React.Fragment key={index}>
                              <tr
                                className="border-b border-neutral-light/10 hover:bg-background-elevated cursor-pointer"
                                onClick={() => setExpandedTestKeys((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(testKey)) next.delete(testKey)
                                  else next.add(testKey)
                                  return next
                                })}
                              >
                                <td className="py-2 px-1 text-neutral-light">
                                  {results.length > 0 ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : null}
                                </td>
                                <td className="py-2 px-3 font-medium text-neutral">{test.testName}</td>
                                <td className="py-2 px-3 text-center text-neutral-light">{test.week}</td>
                                <td className="py-2 px-3 text-center text-neutral-light">{test.day}</td>
                                <td className="py-2 px-3 text-right text-neutral-light">{test.totalAttempts}</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={cn(
                                    'font-semibold',
                                    test.averageScore >= 70 ? 'text-green-500' : test.averageScore >= 50 ? 'text-yellow-500' : 'text-red-500'
                                  )}>
                                    {test.averageScore}%
                                  </span>
                                </td>
                              </tr>
                              {isExpanded && results.length > 0 && (
                                <tr className="bg-neutral-50/80">
                                  <td colSpan={6} className="py-3 px-4">
                                    <div className="text-xs font-medium text-neutral-light mb-2 px-2">Students</div>
                                    <table className="w-full text-sm border border-neutral-light/20 rounded-lg overflow-hidden">
                                      <thead>
                                        <tr className="bg-neutral-light/10">
                                          <th className="text-left py-2 px-3 font-medium">Name</th>
                                          <th className="text-left py-2 px-3 font-medium">Email</th>
                                          <th className="text-left py-2 px-3 font-medium">Enrollment</th>
                                          <th className="text-right py-2 px-3 font-medium">Score</th>
                                          <th className="text-right py-2 px-3 font-medium">Date</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {results.map((r: any, i: number) => (
                                          <tr key={i} className="border-t border-neutral-light/10">
                                            <td className="py-2 px-3 font-medium text-neutral">{r.studentName || '-'}</td>
                                            <td className="py-2 px-3 text-neutral-light">{r.studentEmail || '-'}</td>
                                            <td className="py-2 px-3 text-neutral-light">{r.enrollmentNumber || '-'}</td>
                                            <td className="py-2 px-3 text-right font-semibold">{r.score}%</td>
                                            <td className="py-2 px-3 text-right text-neutral-light">
                                              {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '-'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Students with test activity - download per student */}
                  {reportData.studentWiseReport?.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-neutral-light/20">
                      <h3 className="text-base font-heading font-bold text-neutral mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Students with test activity
                      </h3>
                      <p className="text-sm text-neutral-light mb-4">Download an individual student&apos;s test report.</p>
                      <div className="flex flex-wrap gap-2">
                        {reportData.studentWiseReport.map((student: any, idx: number) => (
                          <div
                            key={student.studentId || idx}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background-elevated border border-neutral-light/10"
                          >
                            <div>
                              <p className="font-medium text-neutral text-sm">{student.studentName}</p>
                              <p className="text-xs text-neutral-light">{student.studentEmail || student.enrollmentNumber || '—'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadStudentReport(student)}
                              className="shrink-0 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:opacity-90 transition-colors flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
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
