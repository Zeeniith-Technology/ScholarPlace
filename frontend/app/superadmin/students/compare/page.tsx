'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Toast, useToast } from '@/components/ui/Toast'
import { exportStudentComparison } from '@/utils/exportUtils'
import { getAuthHeader, clearAuth } from '@/utils/auth'
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  BookOpen,
  Code,
  Award,
  Clock,
  Download,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react'

/**
 * Student Comparison Dashboard
 * Route: /superadmin/students/compare
 */
export default function StudentComparePage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [students, setStudents] = useState<any[]>([])
  const [colleges, setColleges] = useState<any[]>([])
  const [selectedCollege, setSelectedCollege] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchColleges()
    fetchStudents()
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
        console.log('[Compare Page] Authentication failed, clearing token and redirecting to login')
        clearAuth()
        window.location.href = '/superadmin/login'
        return
      }

      if (!profileRes.ok) {
        console.error('[Compare Page] Profile fetch failed with status:', profileRes.status)
        // Don't redirect on other errors
        return
      }

      const profileResult = await profileRes.json()
      const userRole = profileResult.data?.role || profileResult.data?.person_role
      if (!profileResult.success || userRole !== 'superadmin') {
        console.log('[Compare Page] Invalid role or failed profile check, clearing token and redirecting to login')
        clearAuth()
        window.location.href = '/superadmin/login'
        return
      }
    } catch (error) {
      console.error('[Compare Page] Auth verification error:', error)
      // Only redirect if we have no token
      const authHeader = getAuthHeader()
      if (!authHeader) {
        clearAuth()
        window.location.href = '/superadmin/login'
      }
    }
  }

  const fetchColleges = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) {
        console.error('No auth token for colleges fetch')
        return
      }

      const response = await fetch(`${apiBaseUrl}/collage/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          filter: { deleted: false },
          projection: { collage_id: 1, collage_name: 1 },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setColleges(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching colleges:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) {
        console.error('No auth token for students fetch')
        setIsLoading(false)
        return
      }

      const response = await fetch(`${apiBaseUrl}/superadmin/analytics/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ 
          limit: 500,
          collegeId: selectedCollege !== 'all' ? selectedCollege : undefined
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const studentsData = Array.isArray(data.data.students) 
            ? data.data.students 
            : Array.isArray(data.data) 
            ? data.data 
            : []
          setStudents(studentsData) // Show all students
        } else {
          setStudents([])
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch students:', errorData.message || response.statusText)
        setStudents([])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchStudents()
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/superadmin/students')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-neutral">Student Comparison</h1>
              <p className="text-neutral-light mt-1">Compare performance across students</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              options={[
                { value: 'all', label: 'All Colleges' },
                ...(Array.isArray(colleges) ? colleges.map((college) => ({
                  value: college.collage_id || '',
                  label: college.collage_name || 'Unknown'
                })) : [])
              ]}
            />
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
              onClick={() => {
                try {
                  if (!students || students.length === 0) {
                    showToast('No students to export', 'warning')
                    return
                  }
                  const timestamp = new Date().toISOString().split('T')[0]
                  const filename = `student_comparison_${timestamp}.csv`
                  exportStudentComparison(students, filename)
                  showToast(`Exported ${students.length} students comparison successfully`, 'success')
                } catch (error: any) {
                  showToast(error.message || 'Failed to export comparison', 'error')
                }
              }}
              className="px-4"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : students.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 text-neutral-light mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral mb-2">No Students Found</h3>
            <p className="text-neutral-light">No students available for comparison</p>
          </Card>
        ) : (
          <>
            {/* Comparison Grid */}
            <div className={`grid grid-cols-1 ${students.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
              {students.map((student, index) => (
                <Card key={student.studentId || index} className="p-6 hover:shadow-xl transition-all">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-neutral mb-1">{student.name || 'N/A'}</h3>
                    <p className="text-sm text-neutral-light">{student.email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                      student.status === 'active'
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-neutral-light/30 text-neutral-light'
                    }`}>
                      {student.status || 'inactive'}
                    </span>
                  </div>

                  {/* Performance Metrics */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-light flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Days Completed
                        </span>
                        <span className="font-semibold text-neutral">
                          {student.progress?.totalDaysCompleted || 0}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-light/20 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getProgressBgColor(student.progress?.totalDaysCompleted || 0)}`}
                          style={{ width: `${Math.min((student.progress?.totalDaysCompleted || 0) / 30 * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-light flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Average Score
                        </span>
                        <span className={`font-bold ${getProgressColor(student.progress?.averageScore || 0)}`}>
                          {student.progress?.averageScore || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-light/20 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getProgressBgColor(student.progress?.averageScore || 0)}`}
                          style={{ width: `${student.progress?.averageScore || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-light/20">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-neutral-light" />
                        </div>
                        <p className="text-2xl font-bold text-neutral">
                          {student.progress?.totalPracticeTests || 0}
                        </p>
                        <p className="text-xs text-neutral-light">Practice Tests</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Code className="w-4 h-4 text-neutral-light" />
                        </div>
                        <p className="text-2xl font-bold text-neutral">
                          {student.progress?.totalCodingProblems || 0}
                        </p>
                        <p className="text-xs text-neutral-light">Coding Problems</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Comparison Table */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-neutral mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Detailed Comparison
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-light/20">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Metric</th>
                      {students.map((student, index) => (
                        <th key={index} className="text-center py-3 px-4 text-sm font-semibold text-neutral">
                          {student.name || `Student ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-light/10">
                      <td className="py-3 px-4 text-sm text-neutral-light">Days Completed</td>
                      {students.map((student, index) => (
                        <td key={index} className="py-3 px-4 text-sm text-neutral text-center">
                          {student.progress?.totalDaysCompleted || 0}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-neutral-light/10">
                      <td className="py-3 px-4 text-sm text-neutral-light">Average Score</td>
                      {students.map((student, index) => (
                        <td key={index} className={`py-3 px-4 text-sm text-center font-semibold ${getProgressColor(student.progress?.averageScore || 0)}`}>
                          {student.progress?.averageScore || 0}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-neutral-light/10">
                      <td className="py-3 px-4 text-sm text-neutral-light">Practice Tests</td>
                      {students.map((student, index) => (
                        <td key={index} className="py-3 px-4 text-sm text-neutral text-center">
                          {student.progress?.totalPracticeTests || 0}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-neutral-light/10">
                      <td className="py-3 px-4 text-sm text-neutral-light">Coding Problems</td>
                      {students.map((student, index) => (
                        <td key={index} className="py-3 px-4 text-sm text-neutral text-center">
                          {student.progress?.totalCodingProblems || 0}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-sm text-neutral-light">Status</td>
                      {students.map((student, index) => (
                        <td key={index} className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            student.status === 'active'
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-neutral-light/30 text-neutral-light'
                          }`}>
                            {student.status === 'active' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {student.status || 'inactive'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
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
