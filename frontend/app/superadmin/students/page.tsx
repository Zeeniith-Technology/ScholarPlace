'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthHeader, clearAuth } from '@/utils/auth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toast, useToast } from '@/components/ui/Toast'
import { exportStudentData } from '@/utils/exportUtils'
import {
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  ArrowLeft,
  Eye,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  User,
  Mail,
  Building2,
  Calendar,
  TrendingUp,
  BookOpen,
  Code,
  Award,
  Clock,
  FileText,
  BarChart3,
} from 'lucide-react'

/**
 * Superadmin Students Management Page
 * Route: /superadmin/students
 */
export default function SuperadminStudentsPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [colleges, setColleges] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCollege, setSelectedCollege] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [showStudentDetail, setShowStudentDetail] = useState(false)
  const [studentDetailData, setStudentDetailData] = useState<any>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newStudent, setNewStudent] = useState({
    person_name: '',
    person_email: '',
    person_collage_id: '',
    person_password: '',
    person_contact: '',
    person_role: 'Student',
    person_status: 'active',
  })
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchColleges()
    fetchStudents()
  }, [selectedCollege, statusFilter])

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
        console.log('[Students Page] Authentication failed, clearing token and redirecting to login')
        clearAuth()
        window.location.href = '/superadmin/login'
        return
      }

      if (!profileRes.ok) {
        console.error('[Students Page] Profile fetch failed with status:', profileRes.status)
        // Don't redirect on other errors
        return
      }

      const profileResult = await profileRes.json()
      const userRole = profileResult.data?.role || profileResult.data?.person_role
      if (!profileResult.success || userRole !== 'superadmin') {
        console.log('[Students Page] Invalid role or failed profile check, clearing token and redirecting to login')
        clearAuth()
        window.location.href = '/superadmin/login'
        return
      }
    } catch (error) {
      console.error('[Students Page] Auth verification error:', error)
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
          filter: {},
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
        return
      }

      const body: Record<string, unknown> = { limit: 500 }
      if (searchTerm.trim()) body.search = searchTerm.trim()
      if (selectedCollege !== 'all') body.collegeId = selectedCollege
      if (statusFilter !== 'all') body.status = statusFilter

      const response = await fetch(`${apiBaseUrl}/superadmin/analytics/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // API returns { data: { students: [...] } } or { data: [...] }
          const studentsData = Array.isArray(data.data.students) 
            ? data.data.students 
            : Array.isArray(data.data) 
            ? data.data 
            : []
          setStudents(studentsData)
        } else {
          setStudents([])
        }
      } else {
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

  const handleSearch = () => fetchStudents()

  const fetchStudentDetail = async (student: any) => {
    try {
      setIsLoadingDetail(true)
      setSelectedStudent(student)
      setShowStudentDetail(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

      const authHeader = getAuthHeader()
      if (!authHeader) {
        console.error('No auth token for student detail fetch')
        return
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      }

      // Fetch student progress
      const progressRes = await fetch(`${apiBaseUrl}/student-progress/admin/list-all`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: { student_id: student.studentId || student.person_id },
        }),
      })

      // Fetch practice tests
      const practiceRes = await fetch(`${apiBaseUrl}/practice-test/list`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: { student_id: student.studentId || student.person_id },
        }),
      })

      const progressData = progressRes.ok ? await progressRes.json() : { data: [] }
      const practiceData = practiceRes.ok ? await practiceRes.json() : { data: [] }

      setStudentDetailData({
        ...student,
        progress: progressData.data || [],
        practiceTests: practiceData.data || [],
      })
    } catch (error) {
      console.error('Error fetching student detail:', error)
      setStudentDetailData(selectedStudent)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleCreateStudent = async () => {
    if (!newStudent.person_name || !newStudent.person_email || !newStudent.person_collage_id || !newStudent.person_password) {
      showToast('Please fill in all required fields', 'warning')
      return
    }

    try {
      setIsCreating(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

      const authHeader = getAuthHeader()
      if (!authHeader) {
        showToast('Authentication required. Please login again.', 'error')
        router.push('/superadmin/login')
        return
      }

      const response = await fetch(`${apiBaseUrl}/profile/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(newStudent),
      })

      const data = await response.json()

      if (data.success) {
        showToast('Student created successfully!', 'success')
        setShowCreateModal(false)
        setNewStudent({
          person_name: '',
          person_email: '',
          person_collage_id: '',
          person_password: '',
          person_contact: '',
          person_role: 'Student',
          person_status: 'active',
        })
        fetchStudents()
      } else {
        showToast(data.message || 'Failed to create student', 'error')
      }
    } catch (error) {
      console.error('Error creating student:', error)
      showToast('Failed to create student', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewStudent({ ...newStudent, person_password: password })
  }

  const displayStudents = Array.isArray(students) ? students : []

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
              <h1 className="text-3xl font-bold text-neutral">Student Management</h1>
              <p className="text-neutral-light mt-1">View and manage all students across the platform</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="px-4"
            >
              <Users className="w-4 h-4 mr-2" />
              Add Student
            </Button>
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
              onClick={() => router.push('/superadmin/students/compare')}
              className="px-4"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Compare
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                try {
                  const toExport = Array.isArray(students) ? students : []
                  if (toExport.length === 0) {
                    showToast('No students to export', 'warning')
                    return
                  }
                  const timestamp = new Date().toISOString().split('T')[0]
                  const filename = `students_${timestamp}.csv`
                  exportStudentData(toExport, filename)
                  showToast(`Exported ${toExport.length} students successfully`, 'success')
                } catch (error: any) {
                  showToast(error.message || 'Failed to export students', 'error')
                }
              }}
              className="px-4"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-light" />
                <Input
                  type="text"
                  placeholder="Search by name, email or enrollment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button variant="primary" onClick={handleSearch}>
                Search
              </Button>
            </div>
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
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
              ]}
            />
          </div>
        </Card>

        {/* Students Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral">
              Students ({displayStudents.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-light/20">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">College</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-neutral">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">Days Completed</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-neutral">Avg Score</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-neutral">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-light">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    displayStudents.map((student) => (
                      <tr key={student.studentId} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                        <td className="py-3 px-4 text-sm text-neutral">{student.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-neutral-light">{student.email}</td>
                        <td className="py-3 px-4 text-sm text-neutral-light">
                          {colleges.find(c => c.collage_id === student.collegeId)?.collage_name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            student.status === 'active'
                              ? 'bg-green-500/10 text-green-600'
                              : student.status === 'suspended'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-neutral-light/30 text-neutral-light'
                          }`}>
                            {student.status === 'active' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : student.status === 'suspended' ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {student.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-neutral text-right">{student.progress.totalDaysCompleted}</td>
                        <td className="py-3 px-4 text-sm text-neutral text-right">
                          <span className="font-semibold">{student.progress.averageScore}%</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchStudentDetail(student)}
                            className="p-2"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Student Detail Modal */}
        {showStudentDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-background border-b border-neutral-light/20 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-neutral">Student Details</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowStudentDetail(false)
                    setSelectedStudent(null)
                    setStudentDetailData(null)
                  }}
                  className="p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {isLoadingDetail ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : studentDetailData ? (
                <div className="p-6 space-y-6">
                  {/* Student Info Card */}
                  <Card className="p-6">
                    <div className="flex items-start gap-6">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-10 h-10 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-neutral mb-2">
                          {studentDetailData.name || 'N/A'}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="flex items-center gap-2 text-neutral-light">
                            <Mail className="w-4 h-4" />
                            <span>{studentDetailData.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-neutral-light">
                            <Building2 className="w-4 h-4" />
                            <span>
                              {colleges.find(c => c.collage_id === studentDetailData.collegeId)?.collage_name || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-neutral-light">
                            <Calendar className="w-4 h-4" />
                            <span>Joined: {new Date(studentDetailData.created_at || Date.now()).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              studentDetailData.status === 'active'
                                ? 'bg-green-500/10 text-green-600'
                                : studentDetailData.status === 'suspended'
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-neutral-light/30 text-neutral-light'
                            }`}>
                              {studentDetailData.status || 'inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Performance Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-neutral-light">Days Completed</p>
                          <p className="text-2xl font-bold text-neutral">
                            {studentDetailData.progress?.totalDaysCompleted || 0}
                          </p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                          <Award className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-neutral-light">Avg Score</p>
                          <p className="text-2xl font-bold text-neutral">
                            {studentDetailData.progress?.averageScore || 0}%
                          </p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                          <FileText className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-neutral-light">Practice Tests</p>
                          <p className="text-2xl font-bold text-neutral">
                            {studentDetailData.practiceTests?.length || 0}
                          </p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-500/10 rounded-lg">
                          <Code className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-neutral-light">Coding Problems</p>
                          <p className="text-2xl font-bold text-neutral">
                            {studentDetailData.progress?.totalCodingProblems || 0}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Progress Timeline */}
                  {studentDetailData.progress && studentDetailData.progress.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-xl font-semibold text-neutral mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Progress Timeline
                      </h3>
                      <div className="space-y-4">
                        {studentDetailData.progress.map((progress: any, index: number) => (
                          <div key={index} className="flex items-center gap-4 p-4 bg-background-elevated rounded-lg">
                            <div className="flex-1">
                              <p className="font-semibold text-neutral">Week {progress.week}</p>
                              <p className="text-sm text-neutral-light">
                                Days: {progress.days_completed?.length || 0} | 
                                Practice Tests: {progress.practice_tests?.length || 0}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-neutral-light">Status</p>
                              <span className={`px-2 py-1 rounded text-xs ${
                                progress.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                                progress.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' :
                                'bg-neutral-light/30 text-neutral-light'
                              }`}>
                                {progress.status || 'not started'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Recent Practice Tests */}
                  {studentDetailData.practiceTests && studentDetailData.practiceTests.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-xl font-semibold text-neutral mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Recent Practice Tests
                      </h3>
                      <div className="space-y-3">
                        {studentDetailData.practiceTests.slice(0, 5).map((test: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-background-elevated rounded-lg">
                            <div>
                              <p className="font-medium text-neutral">Week {test.week} - Day {test.day}</p>
                              <p className="text-sm text-neutral-light">
                                Attempt {test.attempt} | {new Date(test.completed_at || test.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{test.score || 0}%</p>
                              <p className="text-xs text-neutral-light">
                                {test.correct_answers || 0}/{test.total_questions || 0} correct
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={() => {
                        // Generate report - to be implemented
                        showToast('Report generation feature coming soon', 'info')
                      }}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowStudentDetail(false)
                        setSelectedStudent(null)
                        setStudentDetailData(null)
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-neutral-light">
                  No data available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Student Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-background border-b border-neutral-light/20 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-neutral">Create New Student</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewStudent({
                      person_name: '',
                      person_email: '',
                      person_collage_id: '',
                      person_password: '',
                      person_contact: '',
                      person_role: 'Student',
                      person_status: 'active',
                    })
                  }}
                  className="p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={newStudent.person_name}
                    onChange={(e) => setNewStudent({ ...newStudent, person_name: e.target.value })}
                    placeholder="Enter student full name"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={newStudent.person_email}
                    onChange={(e) => setNewStudent({ ...newStudent, person_email: e.target.value })}
                    placeholder="student@example.com"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral mb-2">
                    College <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={newStudent.person_collage_id}
                    onChange={(e) => setNewStudent({ ...newStudent, person_collage_id: e.target.value })}
                    options={[
                      { value: '', label: 'Select College' },
                      ...(Array.isArray(colleges) ? colleges.map((college) => ({
                        value: college.collage_id || '',
                        label: college.collage_name || 'Unknown'
                      })) : [])
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral mb-2">
                    Contact Number
                  </label>
                  <Input
                    type="tel"
                    value={newStudent.person_contact}
                    onChange={(e) => setNewStudent({ ...newStudent, person_contact: e.target.value })}
                    placeholder="+91 1234567890"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newStudent.person_password}
                      onChange={(e) => setNewStudent({ ...newStudent, person_password: e.target.value })}
                      placeholder="Enter password or generate"
                      className="flex-1"
                    />
                    <Button
                      variant="secondary"
                      onClick={generatePassword}
                      className="px-4"
                    >
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-neutral-light mt-1">
                    Password will be sent to the student via email
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="primary"
                    onClick={handleCreateStudent}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    {isCreating ? 'Creating...' : 'Create Student'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewStudent({
                        person_name: '',
                        person_email: '',
                        person_collage_id: '',
                        person_password: '',
                        person_contact: '',
                        person_role: 'Student',
                        person_status: 'active',
                      })
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
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
