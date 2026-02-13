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
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

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
  const [searchTerm, setSearchTerm] = useState('')

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

  const exportToExcel = () => {
    if (!reportData) return

    const workbook = XLSX.utils.book_new()
    const dateStr = new Date().toISOString().split('T')[0]

    if (reportType === 'performance' && reportData.students) {
      // Performance Report: Single Summary Sheet

      // Calculate max tests for completion rate
      const maxTests = Math.max(...reportData.students.map((s: any) => s.testsCompleted || 0))

      const summaryData = reportData.students.map((student: any) => {
        const completionRate = maxTests > 0
          ? Math.round(((student.testsCompleted || 0) / maxTests) * 100)
          : 0

        return {
          'Name': student.name || '',
          'Email': student.email || '',
          'Department': student.department || '',
          'Enrollment Number': student.enrollmentNumber || '',
          'Average Score (%)': student.averageScore || 0,
          'Score Trend': student.scoreTrend || 'Stable',
          'DSA Avg (%)': student.dsaAverage || '-',
          'Aptitude Avg (%)': student.aptitudeAverage || '-',
          'Weeks Completed': student.weeksCompleted || 0,
          'Tests Completed': student.testsCompleted || 0,
          'Completion Rate (%)': completionRate,
          'Last Activity': student.lastActivityDate ? new Date(student.lastActivityDate).toLocaleDateString() : 'Never',
          'Status': student.status || ''
        }
      })
      const ws1 = XLSX.utils.json_to_sheet(summaryData)

      // Auto-size columns
      const colWidths = [
        { wch: 20 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Department
        { wch: 18 }, // Enrollment
        { wch: 15 }, // Avg Score
        { wch: 12 }, // Trend
        { wch: 12 }, // DSA
        { wch: 12 }, // Aptitude
        { wch: 15 }, // Weeks
        { wch: 15 }, // Tests
        { wch: 18 }, // Completion Rate
        { wch: 15 }, // Last Activity
        { wch: 10 }  // Status
      ]
      ws1['!cols'] = colWidths

      XLSX.utils.book_append_sheet(workbook, ws1, 'Summary')

    } else if (reportType === 'test-results' && reportData.tests) {
      // Test Results Report: 3 Sheets

      // Build student map from test results
      const studentMap = new Map<string, any>()
      const weekSet = new Set<number>() // Track unique weeks

      reportData.tests.forEach((test: any) => {
        if (test.week && typeof test.week === 'number') {
          weekSet.add(test.week)
        }

        (test.results || []).forEach((r: any) => {
          const key = r.studentEmail || r.studentName || r.enrollmentNumber
          if (!studentMap.has(key)) {
            studentMap.set(key, {
              name: r.studentName || '',
              email: r.studentEmail || '',
              enrollment: r.enrollmentNumber || '',
              scores: [],
              testScores: {}, // Map of test name to score
              weekScores: {}  // Map of week number to scores array
            })
          }
          const student = studentMap.get(key)
          student.scores.push(r.score || 0)
          student.testScores[test.testName] = r.score

          // Track scores by week
          if (test.week) {
            if (!student.weekScores[test.week]) {
              student.weekScores[test.week] = []
            }
            student.weekScores[test.week].push(r.score || 0)
          }
        })
      })

      const weeks = Array.from(weekSet).sort((a, b) => a - b)

      // Sheet 1: Student Summary with week-wise breakdown
      const summaryData = Array.from(studentMap.values()).map((s: any) => {
        const avgScore = s.scores.length > 0
          ? Math.round(s.scores.reduce((a: number, b: number) => a + b, 0) / s.scores.length)
          : 0

        const row: any = {
          'Name': s.name,
          'Email': s.email,
          'Enrollment Number': s.enrollment,
          'Tests Taken': s.scores.length,
          'Average Score (%)': avgScore,
          'Highest Score (%)': Math.max(...s.scores, 0),
          'Lowest Score (%)': Math.min(...s.scores, 100)
        }

        // Add week-wise averages
        weeks.forEach(week => {
          const weekScores = s.weekScores[week] || []
          const weekAvg = weekScores.length > 0
            ? Math.round(weekScores.reduce((a: number, b: number) => a + b, 0) / weekScores.length)
            : '-'
          row[`Week ${week} Avg (%)`] = weekAvg
        })

        return row
      })
      const ws1 = XLSX.utils.json_to_sheet(summaryData)

      // Column widths: base columns + week columns
      const baseColWidths = [
        { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ]
      const weekColWidths = weeks.map(() => ({ wch: 14 }))
      ws1['!cols'] = [...baseColWidths, ...weekColWidths]

      XLSX.utils.book_append_sheet(workbook, ws1, 'Summary')

      // Sheet 2: Test Matrix (Students × Tests)
      const matrixData: any[] = []

      studentMap.forEach((studentData: any, key: string) => {
        const row: any = {
          'Student Name': studentData.name,
          'Email': studentData.email
        }

        // Add column for each test
        reportData.tests.forEach((test: any) => {
          const testLabel = `${test.testName}`
          row[testLabel] = studentData.testScores[test.testName] !== undefined
            ? `${studentData.testScores[test.testName]}%`
            : '-'
        })

        matrixData.push(row)
      })

      const ws2 = XLSX.utils.json_to_sheet(matrixData)
      const matrixColWidths = [
        { wch: 20 }, // Student Name
        { wch: 30 }, // Email
        ...reportData.tests.map(() => ({ wch: 12 })) // Test columns
      ]
      ws2['!cols'] = matrixColWidths
      XLSX.utils.book_append_sheet(workbook, ws2, 'Test Matrix')

      // Sheet 3: Detailed Data (All test results)
      const detailedData: any[] = []
      reportData.tests.forEach((test: any) => {
        (test.results || []).forEach((r: any) => {
          detailedData.push({
            'Test Name': test.testName || '',
            'Week': test.week || '-',
            'Day': test.day || '-',
            'Student Name': r.studentName || '',
            'Email': r.studentEmail || '',
            'Enrollment Number': r.enrollmentNumber || '',
            'Score (%)': r.score || 0,
            'Total Questions': r.totalQuestions || 0,
            'Correct Answers': r.correctAnswers || 0,
            'Incorrect Answers': (r.totalQuestions || 0) - (r.correctAnswers || 0),
            'Completed At': r.completedAt ? new Date(r.completedAt).toLocaleString() : ''
          })
        })
      })
      const ws3 = XLSX.utils.json_to_sheet(detailedData)
      ws3['!cols'] = [
        { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 30 },
        { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
      ]
      XLSX.utils.book_append_sheet(workbook, ws3, 'Detailed Data')
    }

    XLSX.writeFile(workbook, `dept-report-${reportType}-${dateStr}.xlsx`)
    showToast('Excel report exported successfully', 'success')
  }

  const downloadStudentReport = (student: any) => {
    if (!student) return

    // 1. Calculate Metrics
    const tests = student.tests || []
    const totalTests = tests.length
    const scores = tests.map((t: any) => t.score || 0)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
    const highScore = scores.length > 0 ? Math.max(...scores) : 0
    const lowScore = scores.length > 0 ? Math.min(...scores) : 0

    // Sort tests by week/day
    const sortedTests = [...tests].sort((a: any, b: any) => {
      if (a.week !== b.week) return (a.week || 0) - (b.week || 0)
      if (a.day !== b.day) return (a.day === 'weekly-test' ? 1 : 0) - (b.day === 'weekly-test' ? 1 : 0) || (parseInt(a.day) || 0) - (parseInt(b.day) || 0)
      return 0
    })

    const uniqueWeeks = new Set(tests.map((t: any) => t.week))
    const weeksActive = uniqueWeeks.size

    // 2. Prepare Data for Excel
    const sheetData: any[][] = []

    // --- Header Section ---
    sheetData.push(['STUDENT PERFORMANCE REPORT'])
    sheetData.push([''])
    sheetData.push(['Student Name', student.studentName || ''])
    sheetData.push(['Email', student.studentEmail || ''])
    sheetData.push(['Enrollment Number', student.enrollmentNumber || ''])
    sheetData.push(['Report Date', new Date().toLocaleDateString()])
    sheetData.push([''])

    // --- Performance Summary Section ---
    sheetData.push(['PERFORMANCE SUMMARY'])
    sheetData.push([''])
    sheetData.push(['Total Tests Taken', 'Average Score', 'Highest Score', 'Lowest Score', 'Weeks Active'])
    sheetData.push([totalTests, `${avgScore}%`, `${highScore}%`, `${lowScore}%`, weeksActive])
    sheetData.push([''])
    sheetData.push([''])

    // --- Detailed History Section ---
    sheetData.push(['DETAILED TEST HISTORY'])
    sheetData.push([''])
    sheetData.push(['Test Name', 'Week', 'Day', 'Score', 'Status', 'Date Taken', 'Total Qs', 'Correct', 'Incorrect'])

    sortedTests.forEach((t: any) => {
      let status = 'Needs Improvement'
      if (t.score >= 90) status = 'Excellent'
      else if (t.score >= 75) status = 'Good'
      else if (t.score >= 60) status = 'Average'
      else if (t.score >= 40) status = 'Below Average'
      else status = 'Fail'

      sheetData.push([
        t.testName || '-',
        t.week || '-',
        t.day || '-',
        `${t.score || 0}%`,
        status,
        t.completedAt ? new Date(t.completedAt).toLocaleDateString() + ' ' + new Date(t.completedAt).toLocaleTimeString() : '-',
        t.totalQuestions || 0,
        t.correctAnswers || 0,
        (t.totalQuestions || 0) - (t.correctAnswers || 0)
      ])
    })

    // 3. Create Workbook
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

    // 4. Formatting
    worksheet['!cols'] = [
      { wch: 30 }, // A: Test Name / Label
      { wch: 25 }, // B: Week / Value
      { wch: 10 }, // C: Day
      { wch: 15 }, // D: Score
      { wch: 15 }, // E: Status
      { wch: 22 }, // F: Date
      { wch: 10 }, // G: Total Qs
      { wch: 10 }, // H: Correct
      { wch: 10 }  // I: Incorrect
    ]

    // 5. Export
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Report')
    const safeName = (student.studentName || 'student').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    XLSX.writeFile(workbook, `student_report_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast(`Downloaded detailed report for ${student.studentName}`, 'success')
  }

  const generateStudentSheet = (workbook: any, student: any) => {
    // 1. Calculate Metrics
    const tests = student.tests || []
    const totalTests = tests.length
    const scores = tests.map((t: any) => t.score || 0)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
    const highScore = scores.length > 0 ? Math.max(...scores) : 0
    const lowScore = scores.length > 0 ? Math.min(...scores) : 0

    // Sort tests by week/day
    const sortedTests = [...tests].sort((a: any, b: any) => {
      if (a.week !== b.week) return (a.week || 0) - (b.week || 0)
      if (a.day !== b.day) return (a.day === 'weekly-test' ? 1 : 0) - (b.day === 'weekly-test' ? 1 : 0) || (parseInt(a.day) || 0) - (parseInt(b.day) || 0)
      return 0
    })

    const uniqueWeeks = new Set(tests.map((t: any) => t.week))
    const weeksActive = uniqueWeeks.size

    // 2. Prepare Data for Excel
    const sheetData: any[][] = []

    // --- Header Section ---
    sheetData.push(['STUDENT PERFORMANCE REPORT'])
    sheetData.push([''])
    sheetData.push(['Student Name', student.studentName || ''])
    sheetData.push(['Email', student.studentEmail || ''])
    sheetData.push(['Enrollment Number', student.enrollmentNumber || ''])
    sheetData.push(['Report Date', new Date().toLocaleDateString()])
    sheetData.push([''])

    // --- Performance Summary Section ---
    sheetData.push(['PERFORMANCE SUMMARY'])
    sheetData.push([''])
    sheetData.push(['Total Tests Taken', 'Average Score', 'Highest Score', 'Lowest Score', 'Weeks Active'])
    sheetData.push([totalTests, `${avgScore}%`, `${highScore}%`, `${lowScore}%`, weeksActive])
    sheetData.push([''])
    sheetData.push([''])

    // --- Detailed History Section ---
    sheetData.push(['DETAILED TEST HISTORY'])
    sheetData.push([''])
    sheetData.push(['Test Name', 'Week', 'Day', 'Score', 'Status', 'Date Taken', 'Total Qs', 'Correct', 'Incorrect'])

    sortedTests.forEach((t: any) => {
      let status = 'Needs Improvement'
      if (t.score >= 90) status = 'Excellent'
      else if (t.score >= 75) status = 'Good'
      else if (t.score >= 60) status = 'Average'
      else if (t.score >= 40) status = 'Below Average'
      else status = 'Fail'

      sheetData.push([
        t.testName || '-',
        t.week || '-',
        t.day || '-',
        `${t.score || 0}%`,
        status,
        t.completedAt ? new Date(t.completedAt).toLocaleDateString() + ' ' + new Date(t.completedAt).toLocaleTimeString() : '-',
        t.totalQuestions || 0,
        t.correctAnswers || 0,
        (t.totalQuestions || 0) - (t.correctAnswers || 0)
      ])
    })

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

    // Formatting
    worksheet['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 10 }, { wch: 15 },
      { wch: 15 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ]

    // Append sheet (Handle name length limit 30 chars)
    let sheetName = (student.studentName || 'Student').replace(/[:\/?*\[\]\\]/g, '') // Remove invalid chars
    if (sheetName.length > 25) sheetName = sheetName.substring(0, 25)

    // Ensure unique sheet name
    let uniqueName = sheetName
    let counter = 1
    while (workbook.SheetNames.includes(uniqueName)) {
      uniqueName = `${sheetName} (${counter})`
      counter++
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, uniqueName)
    return uniqueName
  }

  const downloadBatch = () => {
    if (reportType === 'test-results' && reportData?.studentWiseReport?.length) {
      const workbook = XLSX.utils.book_new()

      const indexRows: any[] = []
      indexRows.push(['MASTER INDEX'])
      indexRows.push(['Click on any Student Name to jump to their detailed report.'])
      indexRows.push([''])
      indexRows.push(['#', 'Student Name', 'Email', 'Enrollment', 'Tests Taken', 'Avg Score', 'Status'])

      const sheetNames: string[] = []

      reportData.studentWiseReport.forEach((student: any, i: number) => {
        const sheetName = generateStudentSheet(workbook, student)
        sheetNames.push(sheetName)

        const tests = student.tests || []
        const scores = tests.map((t: any) => t.score || 0)
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0

        let status = 'Needs Focus'
        if (avgScore >= 90) status = 'Excellent'
        else if (avgScore >= 75) status = 'Good'
        else if (avgScore >= 60) status = 'Average'

        indexRows.push([
          i + 1,
          student.studentName || '-',
          student.studentEmail || '-',
          student.enrollmentNumber || '-',
          tests.length,
          `${avgScore}%`,
          status
        ])
      })

      const indexSheet = XLSX.utils.aoa_to_sheet(indexRows)

      indexSheet['!cols'] = [
        { wch: 5 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 15 }
      ]

      // Add Hyperlinks
      sheetNames.forEach((name, i) => {
        const cellRef = `B${5 + i}` // Student Name Column (B), starts Row 5
        if (indexSheet[cellRef]) {
          indexSheet[cellRef].l = { Target: `#'${name}'!A1`, Tooltip: "Go to Report" }
        }
      })

      XLSX.utils.book_append_sheet(workbook, indexSheet, 'Master Index')

      // Move Master Index to front
      const sheetList = workbook.SheetNames
      const indexName = 'Master Index'
      if (sheetList.includes(indexName)) {
        workbook.SheetNames = [indexName, ...sheetList.filter((n: string) => n !== indexName)]
      }

      XLSX.writeFile(workbook, `batch_student_reports_${new Date().toISOString().split('T')[0]}.xlsx`)
      showToast('Batch report downloaded successfully', 'success')
    } else {
      exportToExcel()
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

              {/* Quick Select */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-light mb-2">Quick Filter</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Last 7 Days', days: 7 },
                    { label: 'Last 30 Days', days: 30 },
                    { label: 'This Month', type: 'month' },
                    { label: 'All Time', type: 'all' }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        const today = new Date()
                        const formatDate = (d: Date) => {
                          const year = d.getFullYear()
                          const month = String(d.getMonth() + 1).padStart(2, '0')
                          const day = String(d.getDate()).padStart(2, '0')
                          return `${year}-${month}-${day}`
                        }

                        let from = ''
                        let to = formatDate(today)

                        if (opt.type === 'all') {
                          from = ''
                          to = ''
                        } else if (opt.type === 'month') {
                          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                          from = formatDate(firstDay)
                        } else {
                          const past = new Date(today)
                          past.setDate(today.getDate() - (opt.days || 0))
                          from = formatDate(past)
                        }
                        setDateFilter({ from, to })
                      }}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-background-elevated hover:bg-primary hover:text-white transition-colors border border-neutral-light/20 text-neutral"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-light mb-2">
                    From Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFilter.from}
                      onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-light/30 rounded-lg bg-background text-neutral"
                    />
                    {dateFilter.from && (
                      <button
                        onClick={() => setDateFilter({ ...dateFilter, from: '' })}
                        className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-light/10 rounded-full text-neutral-light hover:text-red-500 transition-colors"
                        title="Clear Date"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-light mb-2">
                    To Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFilter.to}
                      onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-light/30 rounded-lg bg-background text-neutral"
                    />
                    {dateFilter.to && (
                      <button
                        onClick={() => setDateFilter({ ...dateFilter, to: '' })}
                        className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-light/10 rounded-full text-neutral-light hover:text-red-500 transition-colors"
                        title="Clear Date"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
                    onClick={exportToExcel}
                    className="px-4 py-2 bg-background-elevated text-neutral rounded-lg hover:bg-background-surface transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Excel
                  </button>
                  {reportType === 'test-results' && reportData?.studentWiseReport?.length > 0 && (
                    <button
                      onClick={downloadBatch}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2"
                      title="Download individual reports for all students in one file"
                    >
                      <Download className="w-4 h-4" />
                      Download All Reports
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

              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Search students by name, email, or enrollment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-neutral-light/30 rounded-lg bg-background text-neutral placeholder:text-neutral-light/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-light hover:text-neutral"
                    >
                      ✕
                    </button>
                  )}
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
                        {(() => {
                          const filteredStudents = reportData.students.filter((student: any) => {
                            if (!searchTerm) return true
                            const search = searchTerm.toLowerCase()
                            return (
                              (student.name || '').toLowerCase().includes(search) ||
                              (student.email || '').toLowerCase().includes(search) ||
                              (student.enrollmentNumber || '').toLowerCase().includes(search)
                            )
                          })

                          if (filteredStudents.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-neutral-light">
                                  {searchTerm
                                    ? `No students found matching "${searchTerm}"`
                                    : 'No students in your department for this report.'
                                  }
                                </td>
                              </tr>
                            )
                          }

                          return (
                            <>
                              {searchTerm && (
                                <tr>
                                  <td colSpan={7} className="py-2 px-3 text-sm text-primary">
                                    Showing {filteredStudents.length} of {reportData.students.length} students
                                  </td>
                                </tr>
                              )}
                              {filteredStudents.map((student: any, index: number) => (
                                <tr
                                  key={index}
                                  className="border-b border-neutral-light/10 hover:bg-background-elevated"
                                >
                                  <td className="py-2 px-3 font-medium text-neutral">{student.name}</td>
                                  <td className="py-2 px-3 text-neutral-light">{student.email}</td>
                                  <td className="py-2 px-3 text-neutral-light">{student.department || '-'}</td>
                                  <td className="py-2 px-3 text-right">
                                    <span className={`font-semibold ${student.averageScore >= 70 ? 'text-green-500' :
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
                            </>
                          )
                        })()}
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
                  {reportData.studentWiseReport?.length > 0 && (() => {
                    const filteredStudents = reportData.studentWiseReport.filter((student: any) => {
                      if (!searchTerm) return true
                      const search = searchTerm.toLowerCase()
                      return (
                        (student.studentName || '').toLowerCase().includes(search) ||
                        (student.studentEmail || '').toLowerCase().includes(search) ||
                        (student.enrollmentNumber || '').toLowerCase().includes(search)
                      )
                    })

                    if (filteredStudents.length === 0 && searchTerm) {
                      return (
                        <div className="mt-6 pt-6 border-t border-neutral-light/20">
                          <h3 className="text-base font-heading font-bold text-neutral mb-3 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Students with test activity
                          </h3>
                          <p className="text-sm text-neutral-light">
                            No students found matching &quot;{searchTerm}&quot;
                          </p>
                        </div>
                      )
                    }

                    return (
                      <div className="mt-6 pt-6 border-t border-neutral-light/20">
                        <h3 className="text-base font-heading font-bold text-neutral mb-3 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Students with test activity
                        </h3>
                        <p className="text-sm text-neutral-light mb-4">
                          Download an individual student&apos;s test report.
                          {searchTerm && ` (Showing ${filteredStudents.length} of ${reportData.studentWiseReport.length})`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {filteredStudents.map((student: any, idx: number) => (
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
                    )
                  })()}
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
