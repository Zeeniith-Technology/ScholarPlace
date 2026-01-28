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
  BookOpen,
  Download,
  FileText,
  RefreshCw,
  Calendar,
  Building2,
  Users,
  TrendingUp,
  Filter,
  CheckCircle2,
} from 'lucide-react'

/**
 * TPC Reports Page
 * Generate and export reports
 * Route: /tpc/reports
 */
export default function TPCReportsPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [reportType, setReportType] = useState<'performance' | 'department'>('performance')
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' })
  const [departmentFilter, setDepartmentFilter] = useState('all')

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

      const res = await fetch(`${apiBaseUrl}/tpc-college/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          reportType,
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
        setReportData(data.data)
        showToast('Report generated successfully', 'success')
      } else {
        showToast(data.message || 'Failed to generate report', 'error')
      }
    } catch (error) {
      console.error('[Reports] Error generating report:', error)
      showToast('Failed to generate report', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData) return

    let csvContent = ''
    
    if (reportType === 'performance' && reportData.students) {
      // CSV header
      csvContent = 'Name,Email,Department,Enrollment Number,Average Score,Days Completed,Tests Completed,Status\n'
      
      // CSV rows
      reportData.students.forEach((student: any) => {
        csvContent += `"${student.name}","${student.email}","${student.department}","${student.enrollmentNumber}",${student.averageScore},${student.daysCompleted},${student.testsCompleted},"${student.status}"\n`
      })
    } else if (reportType === 'department' && reportData.departments) {
      // CSV header
      csvContent = 'Department,Total Students,Average Score\n'
      
      // CSV rows
      reportData.departments.forEach((dept: any) => {
        csvContent += `"${dept.department}",${dept.totalStudents},${dept.averageScore}\n`
      })
    }

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `tpc-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    showToast('Report exported successfully', 'success')
  }

  const exportToJSON = () => {
    if (!reportData) return

    const jsonContent = JSON.stringify(reportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `tpc-report-${reportType}-${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    showToast('Report exported successfully', 'success')
  }

  return (
    <TPCLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2">
              Reports
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              Generate and export performance reports
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
                      onChange={(e) => setReportType(e.target.value as 'performance' | 'department')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-neutral">Performance Summary</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reportType"
                      value="department"
                      checked={reportType === 'department'}
                      onChange={(e) => setReportType(e.target.value as 'performance' | 'department')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-neutral">Department Comparison</span>
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

              {/* Department Filter (for performance reports) */}
              {reportType === 'performance' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-light mb-2">
                    Department (Optional)
                  </label>
                  <input
                    type="text"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    placeholder="Enter department name or 'all' for all departments"
                    className="w-full px-3 py-2 border border-neutral-light/30 rounded-lg bg-background text-neutral"
                  />
                </div>
              )}

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
                    {reportType === 'performance' ? 'Performance Summary Report' : 'Department Comparison Report'}
                  </h2>
                  <p className="text-sm text-neutral-light">
                    Generated on {new Date(reportData.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-background-elevated text-neutral rounded-lg hover:bg-background-surface transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={exportToJSON}
                    className="px-4 py-2 bg-background-elevated text-neutral rounded-lg hover:bg-background-surface transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export JSON
                  </button>
                </div>
              </div>

              {reportType === 'performance' && reportData.students ? (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Total Students</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary.totalStudents}</div>
                    </div>
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Active Students</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary.activeStudents}</div>
                    </div>
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Average Score</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary.averageScore}%</div>
                    </div>
                    <div className="p-4 bg-background-elevated rounded-lg">
                      <div className="text-xs text-neutral-light mb-1">Total Tests</div>
                      <div className="text-2xl font-bold text-neutral">{reportData.summary.totalTests}</div>
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
                        {reportData.students.map((student: any, index: number) => (
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
              ) : reportType === 'department' && reportData.departments ? (
                <>
                  {/* Departments Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-light/20">
                          <th className="text-left py-2 px-3 text-neutral-light font-medium">Department</th>
                          <th className="text-right py-2 px-3 text-neutral-light font-medium">Total Students</th>
                          <th className="text-right py-2 px-3 text-neutral-light font-medium">Average Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.departments.map((dept: any, index: number) => (
                          <tr
                            key={index}
                            className="border-b border-neutral-light/10 hover:bg-background-elevated"
                          >
                            <td className="py-2 px-3 font-medium text-neutral">{dept.department}</td>
                            <td className="py-2 px-3 text-right text-neutral-light">{dept.totalStudents}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`font-semibold ${
                                dept.averageScore >= 70 ? 'text-green-500' :
                                dept.averageScore >= 50 ? 'text-yellow-500' : 'text-red-500'
                              }`}>
                                {dept.averageScore}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
    </TPCLayout>
  )
}
