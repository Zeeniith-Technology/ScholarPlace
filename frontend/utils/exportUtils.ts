/**
 * Utility functions for exporting data to CSV
 */

export interface ExportOptions {
  filename?: string
  includeHeaders?: boolean
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return ''
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0])

  // Create CSV rows
  const rows = data.map((row) => {
    return csvHeaders.map((header) => {
      const value = row[header] ?? ''
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
  })

  // Combine headers and rows
  const csvContent = [
    csvHeaders.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')

  return csvContent
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'export.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export array of objects to CSV file
 */
export function exportToCSV(
  data: any[],
  filename: string = 'export.csv',
  headers?: string[]
) {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const csvContent = arrayToCSV(data, headers)
  downloadCSV(csvContent, filename)
}

/**
 * Export analytics data to CSV
 */
export function exportAnalyticsData(
  overview: any,
  collegeStats: any[],
  studentAnalytics: any[],
  selectedCollege: string = 'all'
) {
  const timestamp = new Date().toISOString().split('T')[0]
  const collegeFilter = selectedCollege !== 'all' ? `_${selectedCollege}` : ''
  const filename = `analytics_${timestamp}${collegeFilter}.csv`

  // Prepare data for export
  const exportData: any[] = []

  // Add overview section
  if (overview) {
    exportData.push({ Section: 'Platform Overview', Metric: 'Total Colleges', Value: overview.colleges?.total || 0 })
    exportData.push({ Section: 'Platform Overview', Metric: 'Active Colleges', Value: overview.colleges?.active || 0 })
    exportData.push({ Section: 'Platform Overview', Metric: 'Total Students', Value: overview.students?.total || 0 })
    exportData.push({ Section: 'Platform Overview', Metric: 'Active Students', Value: overview.students?.active || 0 })
    exportData.push({ Section: 'Platform Overview', Metric: 'Engagement Rate', Value: `${overview.students?.engagementRate || 0}%` })
    exportData.push({ Section: 'Platform Overview', Metric: 'Total Days Completed', Value: overview.progress?.totalDaysCompleted || 0 })
    exportData.push({ Section: 'Platform Overview', Metric: 'Average Score', Value: `${overview.progress?.averageScore || 0}%` })
    exportData.push({ Section: '', Metric: '', Value: '' }) // Empty row
  }

  // Add college statistics
  if (collegeStats && collegeStats.length > 0) {
    exportData.push({ Section: 'College Statistics', Metric: '', Value: '' })
    collegeStats.forEach((college) => {
      exportData.push({
        Section: 'College Statistics',
        Metric: 'College Name',
        Value: college.collegeName || 'N/A',
      })
      exportData.push({
        Section: 'College Statistics',
        Metric: 'Status',
        Value: college.status || 'N/A',
      })
      exportData.push({
        Section: 'College Statistics',
        Metric: 'Total Students',
        Value: college.students?.total || 0,
      })
      exportData.push({
        Section: 'College Statistics',
        Metric: 'Active Students',
        Value: college.students?.active || 0,
      })
      exportData.push({
        Section: 'College Statistics',
        Metric: 'Students with Progress',
        Value: college.students?.withProgress || 0,
      })
      exportData.push({
        Section: 'College Statistics',
        Metric: 'Days Completed',
        Value: college.progress?.totalDaysCompleted || 0,
      })
      exportData.push({
        Section: 'College Statistics',
        Metric: 'Average Score',
        Value: `${college.progress?.averageScore || 0}%`,
      })
      exportData.push({ Section: '', Metric: '', Value: '' }) // Empty row
    })
  }

  // Add student analytics
  if (studentAnalytics && studentAnalytics.length > 0) {
    exportData.push({ Section: 'Top Students', Metric: '', Value: '' })
    studentAnalytics.forEach((student, index) => {
      exportData.push({
        Section: 'Top Students',
        Metric: 'Rank',
        Value: index + 1,
      })
      exportData.push({
        Section: 'Top Students',
        Metric: 'Name',
        Value: student.name || 'N/A',
      })
      exportData.push({
        Section: 'Top Students',
        Metric: 'Email',
        Value: student.email || 'N/A',
      })
      exportData.push({
        Section: 'Top Students',
        Metric: 'Days Completed',
        Value: student.progress?.totalDaysCompleted || 0,
      })
      exportData.push({
        Section: 'Top Students',
        Metric: 'Practice Tests',
        Value: student.progress?.totalPracticeTests || 0,
      })
      exportData.push({
        Section: 'Top Students',
        Metric: 'Coding Problems',
        Value: student.progress?.totalCodingProblems || 0,
      })
      exportData.push({
        Section: 'Top Students',
        Metric: 'Average Score',
        Value: `${student.progress?.averageScore || 0}%`,
      })
      exportData.push({ Section: '', Metric: '', Value: '' }) // Empty row
    })
  }

  exportToCSV(exportData, filename, ['Section', 'Metric', 'Value'])
}

/**
 * Export student data to CSV
 */
export function exportStudentData(students: any[], filename: string = 'students_export.csv') {
  if (!students || students.length === 0) {
    throw new Error('No students to export')
  }

  // Flatten student data for CSV
  const exportData = students.map((student) => ({
    'Student ID': student.person_id || student.studentId || 'N/A',
    'Name': student.person_name || student.name || 'N/A',
    'Email': student.person_email || student.email || 'N/A',
    'College': student.college_name || student.collegeName || 'N/A',
    'Department': student.department_name || student.departmentName || 'N/A',
    'Status': student.person_status || student.status || 'N/A',
    'Contact': student.person_contact || student.contact || 'N/A',
    'Days Completed': student.progress?.totalDaysCompleted || 0,
    'Practice Tests': student.progress?.totalPracticeTests || 0,
    'Coding Problems': student.progress?.totalCodingProblems || 0,
    'Average Score': `${student.progress?.averageScore || 0}%`,
    'Last Active': student.lastActive || 'N/A',
  }))

  exportToCSV(exportData, filename)
}

/**
 * Export student comparison data to CSV
 */
export function exportStudentComparison(students: any[], filename: string = 'student_comparison.csv') {
  if (!students || students.length === 0) {
    throw new Error('No students to export')
  }

  const exportData = students.map((student) => ({
    'Name': student.person_name || student.name || 'N/A',
    'Email': student.person_email || student.email || 'N/A',
    'College': student.college_name || student.collegeName || 'N/A',
    'Days Completed': student.progress?.totalDaysCompleted || 0,
    'Practice Tests': student.progress?.totalPracticeTests || 0,
    'Coding Problems': student.progress?.totalCodingProblems || 0,
    'Average Score': `${student.progress?.averageScore || 0}%`,
    'Best Score': `${student.progress?.bestScore || 0}%`,
    'Total Tests': student.progress?.totalTests || 0,
  }))

  exportToCSV(exportData, filename)
}
