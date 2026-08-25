'use client'

import React, { useState, useEffect } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { useRouter } from 'next/navigation'
import { getAuthHeader, clearAuth, startImpersonation } from '@/utils/auth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Toast, useToast } from '@/components/ui/Toast'
import { exportStudentData } from '@/utils/exportUtils'
import * as XLSX from 'xlsx'
import {
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Building2,
  Layers,
  TrendingUp,
  Clock,
  BarChart3,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'

type SortField = 'name' | 'email' | 'college' | 'status' | 'registered' | 'lastActive'

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
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
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
  // Server-side pagination + department filter
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
  const PAGE_SIZE = 50
  // Inactive-student radar: '' = everyone, otherwise days since last login
  const [inactiveFilter, setInactiveFilter] = useState<string>('')
  // Account-control actions (suspend/activate, reset password, move college)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [actionStudent, setActionStudent] = useState<any>(null)
  const [actionType, setActionType] = useState<'suspend' | 'activate' | 'reset' | 'move' | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [moveCollege, setMoveCollege] = useState('')
  const [moveDepartment, setMoveDepartment] = useState('')
  const [isActing, setIsActing] = useState(false)

  // Auth is enforced by SuperadminLayout. Reference data loads once; students
  // reload on any filter/page change. Filter changes reset to page 1.
  useEffect(() => {
    fetchColleges()
    fetchDepartments()
    // Deep link from the dashboard's "Add Student" quick action
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('create') === '1') {
      setShowCreateModal(true)
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [selectedCollege, selectedDepartment, statusFilter, inactiveFilter])

  // Changing college invalidates a department picked under the previous college
  useEffect(() => {
    setSelectedDepartment('all')
  }, [selectedCollege])

  useEffect(() => {
    fetchStudents()
  }, [selectedCollege, selectedDepartment, statusFilter, inactiveFilter, page])

  const fetchDepartments = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const response = await fetch(`${apiBaseUrl}/department/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          filter: { deleted: false },
          projection: { department_name: 1, department_code: 1, collage_id: 1, department_college_id: 1 },
          options: { sort: { department_name: 1 } },
        }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) setDepartments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
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
          // tblCollage has no collage_id field — the id IS _id
          projection: { collage_name: 1 },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setColleges((data.data || []).map((c: any) => ({
            ...c,
            collage_id: String(c._id), // normalize for dropdown + name lookups
          })))
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

      const body: Record<string, unknown> = { limit: PAGE_SIZE, page }
      if (searchTerm.trim()) body.search = searchTerm.trim()
      if (selectedCollege !== 'all') body.collegeId = selectedCollege
      if (selectedDepartment !== 'all') body.departmentId = selectedDepartment
      if (statusFilter !== 'all') body.status = statusFilter
      if (inactiveFilter) body.inactiveDays = parseInt(inactiveFilter)

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
          // API returns { data: { students: [...], pagination } } or { data: [...] }
          const studentsData = Array.isArray(data.data.students)
            ? data.data.students
            : Array.isArray(data.data)
            ? data.data
            : []
          setStudents(studentsData)
          setPagination(data.data.pagination || null)
        } else {
          setStudents([])
          setPagination(null)
        }
      } else {
        setStudents([])
        setPagination(null)
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

  const handleSearch = () => {
    // New search always starts at page 1; if already there, refetch directly
    if (page !== 1) setPage(1)
    else fetchStudents()
  }

  /** Build and download a full Excel report (Summary + Aptitude + Coding, week/day-wise) for one student */
  const handleDownloadReport = async (student: any) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
    const authHeader = getAuthHeader()
    if (!authHeader) {
      showToast('No auth token found', 'error')
      return
    }
    const headers = { 'Content-Type': 'application/json', 'Authorization': authHeader }
    const studentId = student.studentId || student.person_id

    try {
      setDownloadingReportId(studentId)

      const [practiceRes, codingRes] = await Promise.all([
        fetch(`${apiBaseUrl}/superadmin/monitoring/practice-student`, {
          method: 'POST', headers, body: JSON.stringify({ studentId }),
        }),
        fetch(`${apiBaseUrl}/superadmin/monitoring/coding-detail`, {
          method: 'POST', headers, body: JSON.stringify({ studentId }),
        }),
      ])
      const practiceData = practiceRes.ok ? await practiceRes.json() : { data: { attempts: [] } }
      const codingData = codingRes.ok ? await codingRes.json() : { data: { submissions: [] } }
      const attempts: any[] = practiceData.data?.attempts || []
      const submissions: any[] = codingData.data?.submissions || []

      const collegeName = colleges.find(c => String(c.collage_id) === String(student.collegeId))?.collage_name || 'N/A'
      const codingSolved = new Set(submissions.filter(s => s.status === 'passed').map(s => s.problem_id)).size
      const aptAvg = attempts.length ? Math.round(attempts.reduce((a, t) => a + (t.score || 0), 0) / attempts.length) : 0

      const workbook = XLSX.utils.book_new()

      const summarySheet = XLSX.utils.json_to_sheet([{
        'Name': student.name || 'N/A',
        'Email': student.email || '',
        'College': collegeName,
        'Department': student.department || 'N/A',
        'Status': student.status || '',
        'Registered On': student.registeredAt ? new Date(student.registeredAt).toLocaleDateString() : 'N/A',
        'Last Active': student.lastLogin ? new Date(student.lastLogin).toLocaleString() : 'Never',
        'Days Completed': student.progress?.totalDaysCompleted ?? 0,
        'Overall Avg Score (%)': student.progress?.averageScore ?? 0,
        'Aptitude Tests Taken': attempts.length,
        'Aptitude Avg Score (%)': aptAvg,
        'Coding Problems Solved': codingSolved,
        'Coding Submissions': submissions.length,
      }])
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

      const aptitudeRows = attempts
        .slice()
        .sort((a, b) => (a.week - b.week) || String(a.day).localeCompare(String(b.day)) || (a.attempt - b.attempt))
        .map(a => ({
          'Week': a.week ?? '', 'Day': a.day ?? '', 'Attempt': a.attempt ?? 1,
          'Score (%)': a.score ?? 0, 'Correct': a.correct ?? 0, 'Total Questions': a.total ?? 0,
          'Completed At': a.completed_at ? new Date(a.completed_at).toLocaleString() : '',
        }))
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(aptitudeRows.length ? aptitudeRows : [{ 'Note': 'No aptitude attempts' }]), 'Aptitude (Week-Day wise)')

      const codingRows = submissions
        .slice()
        .sort((a, b) => (a.week - b.week) || String(a.day).localeCompare(String(b.day)))
        .map(s => ({
          'Week': s.week ?? '', 'Day': s.day ?? '', 'Problem': s.problem_title || s.problem_id,
          'Status': s.status || '', 'Language': s.language || '', 'Score (%)': s.score ?? '',
          'Submitted At': s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '',
        }))
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(codingRows.length ? codingRows : [{ 'Note': 'No coding submissions' }]), 'Coding (Week-Day wise)')

      const safeName = (student.name || 'student').replace(/[^a-z0-9]+/gi, '_')
      XLSX.writeFile(workbook, `student_report_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
      showToast('Report downloaded', 'success')
    } catch (error) {
      console.error('Error generating student report:', error)
      showToast('Failed to generate report', 'error')
    } finally {
      setDownloadingReportId(null)
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

  /** "3d ago" / "2h ago" / "Never" from an ISO last_login timestamp */
  const formatLastActive = (iso: string | null | undefined) => {
    if (!iso) return 'Never'
    const ms = Date.now() - new Date(iso).getTime()
    if (isNaN(ms)) return 'Never'
    const mins = Math.floor(ms / 60000)
    if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return new Date(iso).toLocaleDateString()
  }

  /** amber past 7 days, red past 14, neutral otherwise */
  const lastActiveColor = (iso: string | null | undefined) => {
    if (!iso) return 'text-red-600'
    const days = (Date.now() - new Date(iso).getTime()) / 86400000
    if (days >= 14) return 'text-red-600'
    if (days >= 7) return 'text-amber-600'
    return 'text-neutral-light'
  }

  const openAction = (student: any, type: 'suspend' | 'activate' | 'reset' | 'move') => {
    setActionStudent(student)
    setActionType(type)
    setOpenMenuId(null)
    setNewPassword('')
    setMoveCollege('')
    setMoveDepartment('')
  }

  const closeAction = () => {
    setActionStudent(null)
    setActionType(null)
  }

  const performAction = async () => {
    if (!actionStudent || !actionType) return
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
    const authHeader = getAuthHeader()
    if (!authHeader) {
      showToast('Authentication required. Please login again.', 'error')
      return
    }

    let endpoint = ''
    let body: Record<string, unknown> = { studentId: actionStudent.studentId }
    if (actionType === 'suspend' || actionType === 'activate') {
      endpoint = '/superadmin/students/update-status'
      body.status = actionType === 'suspend' ? 'suspended' : 'active'
    } else if (actionType === 'reset') {
      if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters', 'warning')
        return
      }
      endpoint = '/superadmin/students/reset-password'
      body.newPassword = newPassword
    } else if (actionType === 'move') {
      if (!moveCollege || !moveDepartment) {
        showToast('Select both a college and a department', 'warning')
        return
      }
      endpoint = '/superadmin/students/move'
      body.collegeId = moveCollege
      body.departmentId = moveDepartment
    }

    try {
      setIsActing(true)
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (data.success) {
        showToast(data.message || 'Done', 'success')
        closeAction()
        fetchStudents()
      } else {
        showToast(data.message || 'Action failed', 'error')
      }
    } catch (error) {
      console.error('Error performing student action:', error)
      showToast('Action failed', 'error')
    } finally {
      setIsActing(false)
    }
  }

  /** Start a read-only "View As" session for this student and open their dashboard */
  const handleViewAs = async (student: any) => {
    setOpenMenuId(null)
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
    const authHeader = getAuthHeader()
    if (!authHeader) {
      showToast('Authentication required. Please login again.', 'error')
      return
    }
    try {
      const res = await fetch(`${apiBaseUrl}/superadmin/impersonate/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ studentId: student.studentId }),
      })
      const data = await res.json()
      if (data.success && data.data?.token) {
        startImpersonation(data.data.token, {
          studentId: data.data.student.id,
          studentName: data.data.student.name,
          studentEmail: data.data.student.email,
        })
        // Full navigation so the student token is picked up cleanly everywhere
        window.location.href = '/student/dashboard'
      } else {
        showToast(data.message || 'Could not start View As', 'error')
      }
    } catch (error) {
      console.error('Error starting impersonation:', error)
      showToast('Could not start View As', 'error')
    }
  }

  const generateResetPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(password)
  }

  const displayStudents = Array.isArray(students) ? students : []

  const getCollegeName = (student: any) =>
    colleges.find(c => String(c.collage_id) === String(student.collegeId))?.collage_name || ''

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sorts the currently loaded page of students (client-side) — matches this
  // table's own pagination scope, not a cross-page global sort.
  const sortedStudents = [...displayStudents].sort((a, b) => {
    if (!sortField) return 0
    const dir = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '') * dir
      case 'email':
        return (a.email || '').localeCompare(b.email || '') * dir
      case 'college':
        return getCollegeName(a).localeCompare(getCollegeName(b)) * dir
      case 'status':
        return (a.status || '').localeCompare(b.status || '') * dir
      case 'registered': {
        const ta = a.registeredAt ? new Date(a.registeredAt).getTime() : 0
        const tb = b.registeredAt ? new Date(b.registeredAt).getTime() : 0
        return (ta - tb) * dir
      }
      case 'lastActive': {
        // "Never" (null) sorts as oldest regardless of direction, so it always
        // lands at the bottom rather than jumping to the top on desc sort.
        const ta = a.lastLogin ? new Date(a.lastLogin).getTime() : -Infinity
        const tb = b.lastLogin ? new Date(b.lastLogin).getTime() : -Infinity
        return (ta - tb) * dir
      }
      default:
        return 0
    }
  })

  const SortHeader = ({ field, label, align = 'left' }: { field: SortField; label: string; align?: 'left' | 'center' | 'right' }) => (
    <th className={`py-3 px-4 text-sm font-semibold text-neutral ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className={`inline-flex items-center gap-1 hover:text-primary transition-colors ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        {sortField === field ? (
          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-light/50" />
        )}
      </button>
    </th>
  )

  return (

    <SuperadminLayout>
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral">Student Management</h1>
            <p className="text-neutral-light mt-1">View and manage all students across the platform</p>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <FilterSelect
              icon={Building2}
              value={selectedCollege}
              onChange={setSelectedCollege}
              options={[
                { value: 'all', label: 'All Colleges' },
                ...(Array.isArray(colleges) ? colleges.map((college) => ({
                  value: college.collage_id || '',
                  label: college.collage_name || 'Unknown'
                })) : [])
              ]}
            />
            <FilterSelect
              icon={Layers}
              value={selectedDepartment}
              onChange={setSelectedDepartment}
              options={[
                { value: 'all', label: 'All Departments' },
                // When a college is chosen, only show its departments
                ...departments
                  .filter((d) => {
                    if (selectedCollege === 'all') return true
                    const deptCollege = String(d.collage_id || d.department_college_id || '')
                    return deptCollege === selectedCollege
                  })
                  .map((d) => ({
                    value: String(d._id),
                    label: d.department_name || d.department_code || 'Unknown'
                  }))
              ]}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
              ]}
            />
          </div>
          {/* Inactive-student radar: last login older than N days (or never) */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-sm text-neutral-light flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Last login:
            </span>
            <div className="flex items-center gap-1 bg-background-elevated rounded-lg p-1">
              {[
                { value: '', label: 'Everyone' },
                { value: '7', label: '7d+ inactive' },
                { value: '14', label: '14d+ inactive' },
                { value: '30', label: '30d+ inactive' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInactiveFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    inactiveFilter === opt.value ? 'bg-white shadow text-neutral' : 'text-neutral-light hover:text-neutral'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {inactiveFilter && (
              <span className="text-xs text-amber-600 font-medium">
                Showing students who haven't logged in for {inactiveFilter}+ days (includes never-logged-in)
              </span>
            )}
          </div>
        </Card>

        {/* Students Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral">
              Students ({pagination ? pagination.total : displayStudents.length})
            </h2>
            {pagination && pagination.totalPages > 1 && (
              <span className="text-sm text-neutral-light">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            )}
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
                    <SortHeader field="name" label="Name" />
                    <SortHeader field="email" label="Email" />
                    <SortHeader field="college" label="College" />
                    <SortHeader field="status" label="Status" align="center" />
                    <SortHeader field="registered" label="Registered" align="right" />
                    <SortHeader field="lastActive" label="Last Active" align="right" />
                    <th className="text-center py-3 px-4 text-sm font-semibold text-neutral">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-light">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    sortedStudents.map((student) => (
                      <tr key={student.studentId} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                        <td className="py-3 px-4 text-sm text-neutral">{student.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-neutral-light">{student.email}</td>
                        <td className="py-3 px-4 text-sm text-neutral-light">
                          {colleges.find(c => String(c.collage_id) === String(student.collegeId))?.collage_name || 'N/A'}
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
                        <td className="py-3 px-4 text-sm text-right whitespace-nowrap text-neutral-light">
                          {student.registeredAt ? new Date(student.registeredAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right whitespace-nowrap ${lastActiveColor(student.lastLogin)}`}>
                          {formatLastActive(student.lastLogin)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="relative">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setOpenMenuId(openMenuId === student.studentId ? null : student.studentId)}
                                className="p-2"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                              {openMenuId === student.studentId && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                  <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-background-surface border border-neutral-light/20 rounded-lg shadow-lg py-1 text-left">
                                    <button
                                      onClick={() => handleViewAs(student)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral hover:bg-background-elevated"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View as (read-only)
                                    </button>
                                    <button
                                      onClick={() => { setOpenMenuId(null); handleDownloadReport(student) }}
                                      disabled={downloadingReportId === student.studentId}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral hover:bg-background-elevated disabled:opacity-50"
                                    >
                                      <Download className="w-4 h-4" />
                                      {downloadingReportId === student.studentId ? 'Preparing report…' : 'Download report'}
                                    </button>
                                    <div className="my-1 border-t border-neutral-light/10" />
                                    {student.status === 'suspended' ? (
                                      <button
                                        onClick={() => openAction(student, 'activate')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-background-elevated"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Activate account
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => openAction(student, 'suspend')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-background-elevated"
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Suspend account
                                      </button>
                                    )}
                                    <button
                                      onClick={() => openAction(student, 'reset')}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral hover:bg-background-elevated"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Reset password
                                    </button>
                                    <button
                                      onClick={() => openAction(student, 'move')}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral hover:bg-background-elevated"
                                    >
                                      <Building2 className="w-4 h-4" />
                                      Move college/dept
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-light/10">
                  <p className="text-sm text-neutral-light">
                    Showing {(pagination.page - 1) * pagination.limit + 1}
                    –{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1 || isLoading}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-neutral px-2">{pagination.page} / {pagination.totalPages}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= pagination.totalPages || isLoading}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Account-control action modal (suspend / activate / reset / move) */}
        {actionStudent && actionType && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl max-w-md w-full">
              <div className="border-b border-neutral-light/20 p-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral">
                  {actionType === 'suspend' && 'Suspend Account'}
                  {actionType === 'activate' && 'Activate Account'}
                  {actionType === 'reset' && 'Reset Password'}
                  {actionType === 'move' && 'Move Student'}
                </h2>
                <Button variant="secondary" size="sm" onClick={closeAction} className="p-2">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-3 rounded-lg bg-background-elevated">
                  <p className="text-sm font-medium text-neutral">{actionStudent.name}</p>
                  <p className="text-xs text-neutral-light">{actionStudent.email}</p>
                </div>

                {actionType === 'suspend' && (
                  <p className="text-sm text-neutral">
                    Suspending blocks this student from logging in until you activate them again.
                    Their progress and test data are kept.
                  </p>
                )}
                {actionType === 'activate' && (
                  <p className="text-sm text-neutral">
                    This restores login access for the student.
                  </p>
                )}

                {actionType === 'reset' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-2">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="flex-1"
                      />
                      <Button variant="secondary" onClick={generateResetPassword} className="px-4">
                        Generate
                      </Button>
                    </div>
                    <p className="text-xs text-neutral-light mt-1">
                      Share this password with the student — it is not emailed automatically.
                    </p>
                  </div>
                )}

                {actionType === 'move' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral mb-2">
                        Target College <span className="text-red-500">*</span>
                      </label>
                      <FilterSelect
                        value={moveCollege}
                        onChange={(v) => { setMoveCollege(v); setMoveDepartment('') }}
                        placeholder="Select College"
                        options={[
                          { value: '', label: 'Select College' },
                          ...colleges.map((c) => ({ value: c.collage_id || '', label: c.collage_name || 'Unknown' })),
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral mb-2">
                        Target Department <span className="text-red-500">*</span>
                      </label>
                      <FilterSelect
                        value={moveDepartment}
                        onChange={setMoveDepartment}
                        disabled={!moveCollege}
                        options={[
                          { value: '', label: moveCollege ? 'Select Department' : 'Pick a college first' },
                          ...departments
                            .filter((d) => String(d.collage_id || d.department_college_id || '') === moveCollege)
                            .map((d) => ({ value: String(d._id), label: d.department_name || d.department_code || 'Unknown' })),
                        ]}
                      />
                    </div>
                    <p className="text-xs text-neutral-light">
                      The server rejects the move if the department doesn't belong to the selected college.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="primary"
                    onClick={performAction}
                    disabled={isActing}
                    className={`flex-1 ${actionType === 'suspend' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  >
                    {isActing
                      ? 'Working...'
                      : actionType === 'suspend'
                      ? 'Suspend'
                      : actionType === 'activate'
                      ? 'Activate'
                      : actionType === 'reset'
                      ? 'Reset Password'
                      : 'Move Student'}
                  </Button>
                  <Button variant="secondary" onClick={closeAction}>
                    Cancel
                  </Button>
                </div>
              </div>
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
                  <FilterSelect
                    value={newStudent.person_collage_id}
                    onChange={(v) => setNewStudent({ ...newStudent, person_collage_id: v })}
                    placeholder="Select College"
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
    </SuperadminLayout>
  )
}
