'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { DatePicker } from '@/components/ui/DatePicker'
import { Badge } from '@/components/ui/Badge'
import { getAuthHeader, clearAuth } from '@/utils/auth'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Building2, Search, MapPin, Mail, UserCog, Layers, Users2, Pencil } from 'lucide-react'

interface Department {
  _id?: string
  department_name: string
  department_code: string
  department_description?: string
  department_status: number
  department_tpc_name?: string
  department_tpc_id?: string
  department_tpc_password?: string
  department_tpc_contact?: string
  department_college_id?: string
  created_at?: string
  updated_at?: string
  deleted?: boolean
}

interface College {
  _id?: string
  collage_id?: string
  collage_name: string
  collage_address?: string
  collage_city?: string
  collage_state?: string
  collage_country?: string
  collage_pincode?: string
  collage_contact_number?: string
  collage_tpc_person?: string
  collage_tpc_email?: string
  collage_tpc_password?: string
  collage_tpc_contact?: string
  tpc_users?: Array<{ _id?: string; person_id?: string; name?: string }>
  collage_email?: string
  collage_website?: string
  collage_logo?: string
  collage_status: number
  collage_type?: string
  collage_departments?: string[] // Array of department IDs
  collage_subscription_status?: string
  collage_subscription_end_date?: string // ISO date (YYYY-MM-DD); optional — no date means no countdown
  created_at?: string
  updated_at?: string
  deleted?: boolean
  // Analytics fields (from /superadmin/analytics/colleges)
  studentCount?: number
  activeStudents?: number
  studentsWithProgress?: number
}


/**
 * College Management Page
 * Route: /superadmin/colleges
 */
export default function CollegesManagementPage() {
  const router = useRouter()
  const [colleges, setColleges] = useState<College[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | '1' | '0'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingCollege, setEditingCollege] = useState<College | null>(null)
  const [deletingCollege, setDeletingCollege] = useState<College | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [showDepartmentModal, setShowDepartmentModal] = useState(false)
  const [createCollegeTpcAccount, setCreateCollegeTpcAccount] = useState(true)
  const [showCollegeTpcPassword, setShowCollegeTpcPassword] = useState(false)
  const [selectedCollegeForDept, setSelectedCollegeForDept] = useState<College | null>(null)
  const [showCollegeTpcModal, setShowCollegeTpcModal] = useState(false)
  const [selectedCollegeForTpc, setSelectedCollegeForTpc] = useState<College | null>(null)
  const [tpcOperationMode, setTpcOperationMode] = useState<'create' | 'update'>('create')
  const [collegeTpcData, setCollegeTpcData] = useState({
    name: '',
    email: '',
    password: '',
    contact: '',
  })
  const [showCreateDeptModal, setShowCreateDeptModal] = useState(false)
  const [newDepartment, setNewDepartment] = useState<Partial<Department>>({
    department_name: '',
    department_code: '',
    department_description: '',
    department_status: 1,
    department_tpc_name: '',
    department_tpc_id: '',
    department_tpc_password: '',
    department_tpc_contact: '',
    department_college_id: '',
  })
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})
  const [createTpcAccount, setCreateTpcAccount] = useState(true)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)

  // Click-away listener for dropdown
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [activeDropdownId])

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const authHeader = getAuthHeader()
    if (!authHeader) {
      return null
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    }
  }

  const [formData, setFormData] = useState<Partial<College>>({
    collage_name: '',
    collage_address: '',
    collage_city: '',
    collage_state: '',
    collage_country: 'India',
    collage_pincode: '',
    collage_contact_number: '',
    collage_tpc_person: '',
    collage_tpc_email: '',
    collage_tpc_password: '',
    collage_tpc_contact: '',
    collage_email: '',
    collage_website: '',
    collage_logo: '',
    collage_status: 1,
    collage_type: '',
  })

  // Fetch colleges with student statistics
  const fetchColleges = async () => {
    try {
      setLoading(true)
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''

      const authHeader = getAuthHeader()
      if (!authHeader) {
        showToast('Authentication required. Please login again.', 'error')
        router.push('/superadmin/login')
        return
      }

      // Step 1: Fetch full college details (address, email, phone, etc.)
      const listRes = await fetch(`${apiBase}/collage/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ status: statusFilter === 'all' ? undefined : parseInt(statusFilter) }),
      })

      const listResult = await listRes.json()
      if (!listResult.success || !listResult.data) {
        showToast(listResult.message || 'Failed to fetch colleges', 'error')
        return
      }

      // Step 2: Fetch analytics for student stats
      const analyticsRes = await fetch(`${apiBase}/superadmin/analytics/colleges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({}),
      })

      const analyticsResult = await analyticsRes.json()

      // Step 3: Merge: Full college data + student stats from analytics
      const collegesWithStats = (listResult.data || []).map((college: any) => {
        // Find matching analytics data
        const analytics = analyticsResult.success && analyticsResult.data
          ? analyticsResult.data.colleges?.find((a: any) => String(a.collegeId) === String(college._id))
          : null

        return {
          ...college,
          // Add real student stats from analytics
          studentCount: analytics?.students?.total || 0,
          activeStudents: analytics?.students?.active || 0,
          studentsWithProgress: analytics?.students?.withProgress || 0,
        }
      })

      setColleges(collegesWithStats)
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch colleges', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch all departments and merge with DeptTPC data
  const fetchAllDepartments = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''

      // Fetch departments
      const authHeader = getAuthHeader()
      if (!authHeader) {
        console.error('No auth token for department fetch')
        return
      }

      const deptRes = await fetch(`${apiBase}/department/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          filter: { deleted: false },
          projection: {},
          options: { sort: { department_name: 1 } },
        }),
      })

      const deptResult = await deptRes.json()
      let departmentsList = deptResult.success ? (deptResult.data || []) : []

      // Fetch all DeptTPC accounts
      const deptTpcRes = await fetch(`${apiBase}/tpc-management/list-dept-tpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          filter: {},
          projection: {},
        }),
      })

      const deptTpcResult = await deptTpcRes.json()
      const deptTpcList = deptTpcResult.success ? (deptTpcResult.data || []) : []

      // Merge DeptTPC data with departments
      departmentsList = departmentsList.map((dept: Department) => {
        // Find matching DeptTPC account by department_id
        const matchingDeptTpc = deptTpcList.find((dtpc: any) =>
          dtpc.department_id === dept._id || dtpc.department_id?.toString() === dept._id?.toString()
        )

        if (matchingDeptTpc) {
          return {
            ...dept,
            department_tpc_name: matchingDeptTpc.dept_tpc_name,
            department_tpc_id: matchingDeptTpc.dept_tpc_email,
            department_tpc_contact: matchingDeptTpc.dept_tpc_contact,
          }
        }
        return dept
      })

      setDepartments(departmentsList)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  useEffect(() => {
    // Verify authentication via API (profile endpoint), not localStorage
    const verifyAuthAndFetchData = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''

        // Verify authentication by fetching profile (requires valid JWT token)
        const authHeader = getAuthHeader()
        if (!authHeader) {
          router.push('/superadmin/login')
          return
        }

        const profileRes = await fetch(`${apiBase}/profile/get`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
        })

        // Only redirect on 401/403 (authentication errors)
        if (profileRes.status === 401 || profileRes.status === 403) {
          console.log('[Colleges Page] Authentication failed, clearing token and redirecting to login')
          clearAuth()
          window.location.href = '/superadmin/login'
          return
        }

        if (!profileRes.ok) {
          console.error('[Colleges Page] Profile fetch failed with status:', profileRes.status)
          // Don't redirect on other errors
          return
        }

        const profileResult = await profileRes.json()
        const userRole = profileResult.data?.role || profileResult.data?.person_role
        if (!profileResult.success || userRole !== 'superadmin') {
          console.log('[Colleges Page] Invalid role or failed profile check, clearing token and redirecting to login')
          clearAuth()
          window.location.href = '/superadmin/login'
          return
        }

        // Authentication verified via database, now fetch all data from database
        await Promise.all([
          fetchColleges(),
          fetchAllDepartments()
        ])
      } catch (error) {
        console.error('[Colleges Page] Auth verification error:', error)
        // Only redirect if we have no token
        const authHeader = getAuthHeader()
        if (!authHeader) {
          clearAuth()
          window.location.href = '/superadmin/login'
        }
      }
    }

    verifyAuthAndFetchData()
  }, [statusFilter])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  /** Countdown pill for the optional subscription end date */
  const subscriptionInfo = (college: College): { label: string; cls: string } | null => {
    if (college.collage_subscription_status === 'inactive') {
      return { label: 'Subscription inactive', cls: 'bg-red-500/10 text-red-600' }
    }
    if (!college.collage_subscription_end_date) return null
    const end = new Date(String(college.collage_subscription_end_date).slice(0, 10) + 'T23:59:59')
    if (isNaN(end.getTime())) return null
    const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000)
    if (daysLeft < 0) return { label: `Subscription expired ${Math.abs(daysLeft)}d ago`, cls: 'bg-red-500/10 text-red-600' }
    if (daysLeft <= 14) return { label: `Subscription expires in ${daysLeft}d`, cls: 'bg-amber-500/10 text-amber-700' }
    return { label: `Subscribed till ${end.toLocaleDateString()}`, cls: 'bg-green-500/10 text-green-600' }
  }

  const handleOpenModal = (college?: College) => {
    if (college) {
      setEditingCollege(college)
      setFormData({
        collage_name: college.collage_name,
        collage_address: college.collage_address,
        collage_city: college.collage_city,
        collage_state: college.collage_state,
        collage_country: college.collage_country,
        collage_pincode: college.collage_pincode,
        collage_contact_number: college.collage_contact_number,
        collage_tpc_person: college.collage_tpc_person,
        collage_email: college.collage_email,
        collage_website: college.collage_website,
        collage_logo: college.collage_logo,
        collage_status: college.collage_status,
        collage_type: college.collage_type,
        collage_subscription_status: college.collage_subscription_status || 'active',
        collage_subscription_end_date: college.collage_subscription_end_date
          ? String(college.collage_subscription_end_date).slice(0, 10)
          : '',
      })
    } else {
      setEditingCollege(null)
      setFormData({
        collage_name: '',
        collage_address: '',
        collage_city: '',
        collage_state: '',
        collage_country: 'India',
        collage_pincode: '',
        collage_contact_number: '',
        collage_tpc_person: '',
        collage_email: '',
        collage_website: '',
        collage_logo: '',
        collage_status: 1,
        collage_type: '',
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCollege(null)
    setFormData({
      collage_name: '',
      collage_address: '',
      collage_city: '',
      collage_state: '',
      collage_country: 'India',
      collage_pincode: '',
      collage_contact_number: '',
      collage_tpc_person: '',
      collage_tpc_email: '',
      collage_tpc_password: '',
      collage_tpc_contact: '',
      collage_email: '',
      collage_website: '',
      collage_logo: '',
      collage_status: 1,
      collage_type: '',
    })
    setCreateCollegeTpcAccount(true)
    setShowCollegeTpcPassword(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''

      if (editingCollege) {
        // Update
        const headers = getAuthHeaders()
        if (!headers) {
          showToast('Authentication required. Please login again.', 'error')
          router.push('/superadmin/login')
          return
        }

        const res = await fetch(`${apiBase}/collage/update`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filter: { _id: editingCollege._id },
            data: formData,
          }),
        })

        const result = await res.json()
        if (result.success) {
          showToast('College updated successfully', 'success')
          handleCloseModal()
          fetchColleges()
        } else {
          showToast(result.message || 'Failed to update college', 'error')
        }
      } else {
        // Insert
        const collegeData = {
          ...formData,
          create_tpc_account: createCollegeTpcAccount,
        }
        const headers = getAuthHeaders()
        if (!headers) {
          showToast('Authentication required. Please login again.', 'error')
          router.push('/superadmin/login')
          return
        }

        const res = await fetch(`${apiBase}/collage/insert`, {
          method: 'POST',
          headers,
          body: JSON.stringify(collegeData),
        })

        const result = await res.json()
        if (result.success) {
          showToast('College added successfully' + (createCollegeTpcAccount ? ' with TPC account' : ''), 'success')
          handleCloseModal()
          fetchColleges()
        } else {
          showToast(result.message || 'Failed to add college', 'error')
        }
      }
    } catch (error: any) {
      showToast(error.message || 'Operation failed', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCollege) return

    setFormLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''

      const headers = getAuthHeaders()
      if (!headers) {
        showToast('Authentication required. Please login again.', 'error')
        router.push('/superadmin/login')
        return
      }

      const res = await fetch(`${apiBase}/collage/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: { _id: deletingCollege._id },
          hardDelete: false, // Soft delete
        }),
      })

      const result = await res.json()
      if (result.success) {
        showToast('College deleted successfully', 'success')
        setDeletingCollege(null)
        fetchColleges()
      } else {
        showToast(result.message || 'Failed to delete college', 'error')
      }
    } catch (error: any) {
      showToast(error.message || 'Delete failed', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  // Toggle department assignment for a college
  const toggleDepartmentAssignment = async (departmentId: string, isAssigned: boolean) => {
    if (!selectedCollegeForDept) return

    setFormLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const currentDepts = selectedCollegeForDept.collage_departments || []
      const updatedDepts = isAssigned
        ? currentDepts.filter(id => id !== departmentId)
        : [...currentDepts, departmentId]

      const headers = getAuthHeaders()
      if (!headers) {
        showToast('Authentication required. Please login again.', 'error')
        router.push('/superadmin/login')
        return
      }

      const res = await fetch(`${apiBase}/collage/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: { _id: selectedCollegeForDept._id },
          data: { collage_departments: updatedDepts },
        }),
      })

      const result = await res.json()
      if (result.success) {
        showToast(
          `Department ${isAssigned ? 'removed' : 'assigned'} successfully`,
          'success'
        )
        // Update local state
        setSelectedCollegeForDept({
          ...selectedCollegeForDept,
          collage_departments: updatedDepts,
        })
        // Refresh colleges list
        fetchColleges()
      } else {
        showToast(result.message || 'Failed to update departments', 'error')
      }
    } catch (error: any) {
      showToast(error.message || 'Operation failed', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  // Create College TPC
  const handleCreateCollegeTpc = async () => {
    if (!selectedCollegeForTpc) return

    setFormLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''

      // Validate required fields
      if (!collegeTpcData.name || !collegeTpcData.email || !collegeTpcData.password) {
        showToast('Please fill in all required fields (Name, Email, Password)', 'error')
        setFormLoading(false)
        return
      }

      // Create TPC account using TPC Management endpoint
      const tpcData = {
        tpc_name: collegeTpcData.name,
        tpc_email: collegeTpcData.email,
        tpc_password: collegeTpcData.password,
        tpc_contact: collegeTpcData.contact || '',
        collage_id: selectedCollegeForTpc._id,
      }

      const headers = getAuthHeaders()
      if (!headers) {
        showToast('Authentication required. Please login again.', 'error')
        router.push('/superadmin/login')
        return
      }

      const res = await fetch(`${apiBase}/tpc-management/create-college-tpc`, {
        method: 'POST',
        headers,
        body: JSON.stringify(tpcData),
      })

      const result = await res.json()
      if (result.success) {
        showToast('College TPC account created successfully', 'success')
        setShowCollegeTpcModal(false)
        setSelectedCollegeForTpc(null)
        setCollegeTpcData({ name: '', email: '', password: '', contact: '' })
        setShowCollegeTpcPassword(false)
        fetchColleges()
      } else {
        showToast(result.message || 'Failed to create College TPC', 'error')
      }
    } catch (error: any) {
      showToast(error.message || 'Operation failed', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  // Update College TPC
  const handleUpdateCollegeTpc = async () => {
    if (!selectedCollegeForTpc) return

    setFormLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''

      // Validate required fields
      if (!collegeTpcData.name || !collegeTpcData.email || !collegeTpcData.password) {
        showToast('Please fill in all required fields (Name, Email, Password)', 'error')
        setFormLoading(false)
        return
      }

      // Update TPC account using TPC Management endpoint
      const tpcData = {
        filter: { collage_id: selectedCollegeForTpc._id },
        tpc_name: collegeTpcData.name,
        tpc_email: collegeTpcData.email,
        tpc_password: collegeTpcData.password,
        tpc_contact: collegeTpcData.contact || '',
      }

      const headers = getAuthHeaders()
      if (!headers) {
        showToast('Authentication required. Please login again.', 'error')
        router.push('/superadmin/login')
        return
      }

      const res = await fetch(`${apiBase}/tpc-management/update-college-tpc`, {
        method: 'POST',
        headers,
        body: JSON.stringify(tpcData),
      })

      const result = await res.json()
      if (result.success) {
        showToast('College TPC account updated successfully', 'success')
        setShowCollegeTpcModal(false)
        setSelectedCollegeForTpc(null)
        setCollegeTpcData({ name: '', email: '', password: '', contact: '' })
        setShowCollegeTpcPassword(false)
        fetchColleges()
      } else {
        showToast(result.message || 'Failed to update College TPC', 'error')
      }
    } catch (error: any) {
      showToast(error.message || 'Operation failed', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  // Delete College TPC
  const handleDeleteCollegeTpc = async () => {
    if (!selectedCollegeForTpc) return

    setFormLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''

      const headers = getAuthHeaders()
      if (!headers) {
        showToast('Authentication required. Please login again.', 'error')
        router.push('/superadmin/login')
        return
      }

      // Delete TPC account using TPC Management endpoint
      const deleteData = {
        collage_id: selectedCollegeForTpc._id,
        tpc_email: selectedCollegeForTpc.collage_tpc_email,
      }

      const res = await fetch(`${apiBase}/tpc-management/delete-college-tpc`, {
        method: 'POST',
        headers,
        body: JSON.stringify(deleteData),
      })

      const result = await res.json()
      if (result.success) {
        showToast('College TPC account deleted successfully', 'success')
        setShowCollegeTpcModal(false)
        setSelectedCollegeForTpc(null)
        setCollegeTpcData({ name: '', email: '', password: '', contact: '' })
        setShowCollegeTpcPassword(false)
        fetchColleges()
      } else {
        showToast(result.message || 'Failed to delete College TPC', 'error')
      }
    } catch (error: any) {
      showToast(error.message || 'Operation failed', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  // Delete Department TPC
  const handleDeleteDeptTpc = async (departmentId: string, deptTpcEmail?: string) => {
    if (!selectedCollegeForDept || !departmentId) return

    if (!confirm('Are you sure you want to delete this Department TPC account? This action cannot be undone.')) {
      return
    }

    setFormLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''

      const headers = getAuthHeaders()
      if (!headers) {
        showToast('Authentication required. Please login again.', 'error')
        router.push('/superadmin/login')
        return
      }

      // Delete DeptTPC account using TPC Management endpoint
      const deleteData: any = {
        department_id: departmentId,
        collage_id: selectedCollegeForDept._id,
      }

      if (deptTpcEmail) {
        deleteData.dept_tpc_email = deptTpcEmail
      }

      const res = await fetch(`${apiBase}/tpc-management/delete-dept-tpc`, {
        method: 'POST',
        headers,
        body: JSON.stringify(deleteData),
      })

      const result = await res.json()
      if (result.success) {
        showToast('Department TPC account deleted successfully', 'success')
        fetchColleges()
        fetchAllDepartments()
      } else {
        showToast(result.message || 'Failed to delete Department TPC', 'error')
      }
    } catch (error: any) {
      showToast(error.message || 'Operation failed', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  // Handle Update / Create Department
  const handleSaveDepartment = async () => {
    setFormLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const headers = getAuthHeaders()
      if (!headers) {
        showToast('Authentication required. Please login again.', 'error')
        router.push('/superadmin/login')
        return
      }

      if (editingDepartment && editingDepartment._id) {
        // UPDATE Existing Department
        // console.log('Updating department:', editingDepartment._id)

        // 1. Update basic details
        const updateData = {
          department_name: newDepartment.department_name,
          department_code: newDepartment.department_code,
          department_description: newDepartment.department_description,
          department_status: newDepartment.department_status,
        }

        const res = await fetch(`${apiBase}/department/update`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filter: { _id: editingDepartment._id },
            data: updateData,
          }),
        })

        const result = await res.json()
        if (!result.success) {
          throw new Error(result.message || 'Failed to update department details')
        }

        // 2. Handle TPC Account (Create or Update)
        if (createTpcAccount) { // If checkbox is checked or logically enabled for update
          if (!newDepartment.department_tpc_name || !newDepartment.department_tpc_id) {
            // If TPC details missing but checked, maybe show error? Or just skip?
            // Assuming validation was done before call or user intends to remove?
            // Actually, if existing TPC exists, we might run update.
          } else {
            const tpcData: any = {
              dept_tpc_name: newDepartment.department_tpc_name,
              dept_tpc_email: newDepartment.department_tpc_id,
              dept_tpc_password: newDepartment.department_tpc_password,
              dept_tpc_contact: newDepartment.department_tpc_contact,
            }

            if (editingDepartment.department_tpc_id) {
              // Update existing TPC
              // We need collage_id and department_id for filter? 
              // tpc-management/update-dept-tpc uses:
              // filter: { department_id, collage_id } or { dept_tpc_email } ?
              // checking tpcManagement.js: updateDeptTpc uses filter from body.
              // It likely expects filter: { department_id: ... }

              await fetch(`${apiBase}/tpc-management/update-dept-tpc`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  filter: { department_id: editingDepartment._id },
                  ...tpcData // This spreads name, email, etc. into root or data?
                  // Checking controller... tpcManagement.updateDeptTpc usually takes specific fields.
                  // Let's assume generic structure or verify.
                  // Controller code for updateDeptTpc not fully visible, but likely follows pattern.
                  // Actually, let's look at `createCollegeTpc` usage in this file (lines 600+).
                  // It sends `filter` and other fields at root level.
                }),
              })
            } else {
              // Create NEW TPC for existing department
              // Requires collage_id and department_id
              await fetch(`${apiBase}/tpc-management/create-dept-tpc`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  ...tpcData,
                  department_id: editingDepartment._id,
                  collage_id: selectedCollegeForDept?._id
                })
              })
            }
          }
        }

        showToast('Department updated successfully', 'success')

      } else {
        // CREATE New Department
        const departmentData = {
          ...newDepartment,
          department_college_id: selectedCollegeForDept?._id || newDepartment.department_college_id,
          create_tpc_account: createTpcAccount,
        }

        const res = await fetch(`${apiBase}/department/insert`, {
          method: 'POST',
          headers,
          body: JSON.stringify(departmentData),
        })

        const result = await res.json()
        if (!result.success) {
          throw new Error(result.message || 'Failed to create department')
        }
        showToast('Department created successfully' + (createTpcAccount ? ' with TPC account' : ''), 'success')
      }

      // Success cleanup
      setShowCreateDeptModal(false)
      setNewDepartment({
        department_name: '',
        department_code: '',
        department_description: '',
        department_status: 1,
        department_tpc_name: '',
        department_tpc_id: '',
        department_tpc_password: '',
        department_tpc_contact: '',
        department_college_id: '',
      })
      setShowPassword({})
      setCreateTpcAccount(true)
      setEditingDepartment(null) // Reset edit state
      fetchAllDepartments()
      if (selectedCollegeForDept) {
        fetchColleges()
      }
    } catch (error: any) {
      showToast(error.message || 'Operation failed', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept)
    setNewDepartment({
      department_name: dept.department_name,
      department_code: dept.department_code,
      department_description: dept.department_description || '',
      department_status: dept.department_status,
      department_tpc_name: dept.department_tpc_name || '',
      department_tpc_id: dept.department_tpc_id || '',
      department_tpc_password: '', // Don't show password on edit, user must set new one if needed
      department_tpc_contact: dept.department_tpc_contact || '',
      department_college_id: dept.department_college_id,
    })
    // If TPC exists, allow editing (checkbox checked). If not, allow creating (checkbox checked by default or unchecked?)
    // Let's set it to true so the form shows up.
    setCreateTpcAccount(!!dept.department_tpc_id || true)
    setShowCreateDeptModal(true)
  }

  const handleToggleStatus = async (college: College) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''

      const newStatus = college.collage_status === 1 ? 0 : 1

      const headers = getAuthHeaders()
      if (!headers) {
        showToast('Authentication required. Please login again.', 'error')
        router.push('/superadmin/login')
        return
      }

      const res = await fetch(`${apiBase}/collage/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: { _id: college._id },
          data: { collage_status: newStatus },
        }),
      })

      const result = await res.json()
      if (result.success) {
        showToast(`College ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`, 'success')
        fetchColleges()
      } else {
        showToast(result.message || 'Failed to update status', 'error')
      }
    } catch (error: any) {
      showToast(error.message || 'Operation failed', 'error')
    }
  }

  const filteredColleges = colleges.filter((college) => {
    const matchesSearch =
      !search ||
      college.collage_name.toLowerCase().includes(search.toLowerCase()) ||
      college.collage_city?.toLowerCase().includes(search.toLowerCase()) ||
      college.collage_state?.toLowerCase().includes(search.toLowerCase()) ||
      college.collage_email?.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const collageTypes = [
    { value: 'Engineering', label: 'Engineering' },
    { value: 'Medical', label: 'Medical' },
    { value: 'Arts', label: 'Arts' },
    { value: 'Commerce', label: 'Commerce' },
    { value: 'Science', label: 'Science' },
    { value: 'Law', label: 'Law' },
    { value: 'Management', label: 'Management' },
    { value: 'Other', label: 'Other' },
  ]

  return (
    <SuperadminLayout>
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Toast ── */}
        {toast && (
          <div className="fixed top-6 right-6 z-[60] animate-fade-in">
            <div className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-secondary text-white' : 'bg-red-600 text-white'
            }`}>
              {toast.type === 'success' ? '✓' : '✕'} {toast.message}
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral">Colleges</h1>
              <p className="text-sm text-neutral-light mt-0.5">
                {colleges.length} total · {colleges.filter(c => c.collage_status === 1).length} active
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={() => handleOpenModal()} className="px-5">
            + Add College
          </Button>
        </div>

        {/* ── Filters ── */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light pointer-events-none z-10" />
              <Input
                placeholder="Search by name, city, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 border-neutral-light/30 focus:border-primary"
              />
            </div>
            {/* Select renders its own w-full wrapper — constrain it from outside,
                otherwise it claims the whole flex row and crushes the search input */}
            <div className="w-full sm:w-48 shrink-0">
              <FilterSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as 'all' | '1' | '0')}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: '1', label: 'Active' },
                  { value: '0', label: 'Inactive' },
                ]}
              />
            </div>
          </div>
        </Card>

        {/* ── College Cards ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-neutral-light/15 bg-background-surface p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-neutral-light/15" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-light/15 rounded w-2/3" />
                    <div className="h-3 bg-neutral-light/10 rounded w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-neutral-light/10 rounded w-full" />
                  <div className="h-3 bg-neutral-light/10 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredColleges.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral font-medium">
              {colleges.length === 0 ? 'No colleges added yet.' : 'No colleges match your search.'}
            </p>
            <p className="text-sm text-neutral-light mt-1">
              {colleges.length === 0 && 'Click "+ Add College" to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredColleges.map((college) => (
              <div
                key={college._id}
                className="rounded-xl border border-neutral-light/15 bg-background-surface hover:border-primary/25 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col relative overflow-hidden"
              >
                {/* Status accent bar */}
                <div className={`h-1 w-full ${college.collage_status === 1 ? 'bg-secondary' : 'bg-neutral-light/40'}`} />

                <div className="p-5 flex flex-col flex-1">
                {/* Card Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white font-heading font-bold text-base shadow-sm ${
                    college.collage_status === 1
                      ? 'bg-gradient-to-br from-primary to-primary-dark'
                      : 'bg-gradient-to-br from-neutral-light to-neutral-light/70'
                  }`}>
                    {college.collage_name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-neutral truncate" title={college.collage_name}>
                      {college.collage_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={college.collage_status === 1 ? 'success' : 'warning'}
                        className="text-xs px-1.5 py-0"
                      >
                        {college.collage_status === 1 ? 'Active' : 'Inactive'}
                      </Badge>
                      {college.collage_type && (
                        <span className="text-sm text-neutral-dark">{college.collage_type}</span>
                      )}
                    </div>
                    {(() => {
                      const sub = subscriptionInfo(college)
                      return sub ? (
                        <span className={`inline-flex mt-1.5 px-1.5 py-0.5 rounded text-xs font-medium ${sub.cls}`}>
                          {sub.label}
                        </span>
                      ) : null
                    })()}
                  </div>

                  {/* 3-dot menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveDropdownId(activeDropdownId === college._id ? null : college._id!)
                      }}
                      className="p-1.5 -mr-1.5 -mt-1 rounded-md hover:bg-background-elevated text-neutral-light hover:text-neutral transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                    </button>

                    {activeDropdownId === college._id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-48 bg-background-surface border border-neutral-light/15 rounded-lg shadow-xl overflow-hidden z-20 animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setActiveDropdownId(null)
                            setSelectedCollegeForTpc(college)
                            setTpcOperationMode('create')
                            setCollegeTpcData({ name: '', email: '', password: '', contact: '' })
                            setShowCollegeTpcModal(true)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-neutral hover:bg-background-elevated transition-colors"
                        >Create TPC</button>
                        <button
                          onClick={() => {
                            setActiveDropdownId(null)
                            setSelectedCollegeForTpc(college)
                            setTpcOperationMode('update')
                            setCollegeTpcData({
                              name: college.tpc_users?.[0]?.name ?? college.collage_tpc_person ?? '',
                              email: college.collage_tpc_email ?? '',
                              password: '',
                              contact: college.collage_tpc_contact ?? '',
                            })
                            setShowCollegeTpcModal(true)
                          }}
                          disabled={!(college.collage_tpc_email || college.tpc_users?.[0])}
                          className="w-full text-left px-3 py-2 text-sm text-neutral hover:bg-background-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >Update TPC</button>
                        <button
                          onClick={async () => {
                            setActiveDropdownId(null)
                            if (confirm(`Delete the TPC account for ${college.collage_name}?`)) {
                              setFormLoading(true)
                              try {
                                const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''
                                const headers = getAuthHeaders()
                                if (!headers) { showToast('Authentication required.', 'error'); router.push('/superadmin/login'); return }
                                const res = await fetch(`${apiBase}/tpc-management/delete-college-tpc`, { method: 'POST', headers, body: JSON.stringify({ collage_id: college._id, tpc_email: college.collage_tpc_email }) })
                                const result = await res.json()
                                result.success ? showToast('TPC deleted.', 'success') : showToast(result.message || 'Failed.', 'error')
                                fetchColleges()
                              } catch (error: any) { showToast(error.message || 'Failed.', 'error') } finally { setFormLoading(false) }
                            }
                          }}
                          disabled={!(college.collage_tpc_email || college.tpc_users?.[0]) || formLoading}
                          className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >Delete TPC</button>
                        <div className="h-px bg-neutral-light/15 my-0.5" />
                        <button
                          onClick={() => { setActiveDropdownId(null); handleToggleStatus(college) }}
                          className="w-full text-left px-3 py-2 text-sm text-neutral hover:bg-background-elevated transition-colors"
                        >{college.collage_status === 1 ? 'Deactivate' : 'Activate'}</button>
                        <button
                          onClick={() => { setActiveDropdownId(null); setDeletingCollege(college) }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >Delete College</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Details */}
                <div className="space-y-2 text-sm text-neutral-dark flex-1">
                  {(college.collage_city || college.collage_state) && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0 text-neutral-light/70" />
                      {[college.collage_city, college.collage_state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {college.collage_email && (
                    <p className="flex items-center gap-2 truncate" title={college.collage_email}>
                      <Mail className="w-4 h-4 shrink-0 text-neutral-light/70" />
                      <span className="truncate">{college.collage_email}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 shrink-0 text-neutral-light/70" />
                    <span>TPC:&nbsp;<span className="text-neutral font-medium">{college.tpc_users?.[0]?.name ?? college.collage_tpc_person ?? '—'}</span></span>
                  </p>
                </div>

                {/* Stats Row */}
                <div className="flex items-center flex-wrap gap-2 mt-4 pt-3.5 border-t border-neutral-light/10">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-sm text-neutral-dark">
                    <Layers className="w-3.5 h-3.5 text-primary/70" />
                    <span className="font-semibold text-neutral">{college.collage_departments?.length || 0}</span>
                    {(college.collage_departments?.length || 0) === 1 ? 'dept' : 'depts'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-sm text-neutral-dark">
                    <Users2 className="w-3.5 h-3.5 text-primary/70" />
                    <span className="font-semibold text-neutral">{college.studentCount || 0}</span>
                    {(college.studentCount || 0) === 1 ? 'student' : 'students'}
                  </span>
                  {(college.activeStudents || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/10 text-sm text-secondary font-medium">
                      {college.activeStudents} active
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 mt-3.5">
                  <button
                    onClick={() => handleOpenModal(college)}
                    className="inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-neutral border border-neutral-light/20 rounded-lg hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => { setSelectedCollegeForDept(college); setShowDepartmentModal(true) }}
                    className="inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    Departments
                  </button>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-neutral">
                    {editingCollege ? 'Edit College' : 'Add New College'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-neutral-dark hover:text-neutral text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="College Name *"
                      value={formData.collage_name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, collage_name: e.target.value })
                      }
                      required
                      placeholder="e.g., ADIT"
                    />
                    <Input
                      label="College Type *"
                      value={formData.collage_type || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, collage_type: e.target.value })
                      }
                      required
                      placeholder="e.g., Engineering"
                    />
                  </div>

                  <Input
                    label="Address *"
                    value={formData.collage_address || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, collage_address: e.target.value })
                    }
                    required
                    placeholder="Street address"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="City *"
                      value={formData.collage_city || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, collage_city: e.target.value })
                      }
                      required
                    />
                    <Input
                      label="State *"
                      value={formData.collage_state || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, collage_state: e.target.value })
                      }
                      required
                    />
                    <Input
                      label="Pincode *"
                      value={formData.collage_pincode || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, collage_pincode: e.target.value })
                      }
                      required
                    />
                  </div>

                  <Input
                    label="Country *"
                    value="India"
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Contact Number *"
                      value={formData.collage_contact_number || ''}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (/^[0-9+]*$/.test(val)) {
                          if (!val.startsWith('+91')) {
                            if (val.length > 0 && !val.startsWith('+')) val = '+91' + val;
                            else if (val === '' || val === '+') val = '+91';
                          }
                          setFormData({ ...formData, collage_contact_number: val })
                        }
                      }}
                      onFocus={() => {
                        if (!formData.collage_contact_number) setFormData({ ...formData, collage_contact_number: '+91' });
                      }}
                      required
                      type="tel"
                    />
                    <Input
                      label="Email *"
                      value={formData.collage_email || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, collage_email: e.target.value })
                      }
                      required
                      type="email"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Website *"
                      value={formData.collage_website || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, collage_website: e.target.value })
                      }
                      required
                      type="url"
                      placeholder="https://example.com"
                    />
                    <Input
                      label="Logo URL *"
                      value={formData.collage_logo || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, collage_logo: e.target.value })
                      }
                      required
                      type="url"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <Input
                    label="TPC Person Name *"
                    value={formData.collage_tpc_person || ''}
                    onChange={(e) => {
                      if (/^[a-zA-Z\s]*$/.test(e.target.value)) {
                        setFormData({ ...formData, collage_tpc_person: e.target.value })
                      }
                    }}
                    required
                    placeholder="Name of TPC contact person"
                  />
                  <p className="text-xs text-neutral-dark mt-1">
                    💡 You can create College TPC account separately using &quot;Manage College TPC&quot; button on the college card.
                  </p>

                  {/* Subscription — only editable on existing colleges */}
                  {editingCollege && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-light/20">
                      <FilterSelect
                        label="Subscription Status"
                        value={formData.collage_subscription_status || 'active'}
                        onChange={(v) =>
                          setFormData({ ...formData, collage_subscription_status: v })
                        }
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                        ]}
                      />
                      <div>
                        <DatePicker
                          label="Subscription End Date"
                          value={formData.collage_subscription_end_date || ''}
                          onChange={(v) =>
                            setFormData({ ...formData, collage_subscription_end_date: v })
                          }
                        />
                        <p className="text-xs text-neutral-dark mt-1">
                          Optional — powers the expiry countdown on cards and the dashboard alert. Leave empty for no expiry.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      className="px-6"
                      isLoading={formLoading}
                      disabled={formLoading}
                    >
                      {editingCollege ? 'Update College' : 'Add College'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCloseModal}
                      className="px-6"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Department Management Modal */}
        {showDepartmentModal && selectedCollegeForDept && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral">
                      Manage Departments
                    </h2>
                    <p className="text-sm text-neutral-dark mt-1">
                      {selectedCollegeForDept.collage_name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowDepartmentModal(false)
                      setSelectedCollegeForDept(null)
                    }}
                    className="text-neutral-dark hover:text-neutral text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="mb-4 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-neutral">Available Departments</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCreateDeptModal(true)}
                    className="px-4 text-sm"
                  >
                    + Create New Department
                  </Button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                  {(() => {
                    // Only show departments that belong to this college or are unassigned (no other college)
                    const collegeId = selectedCollegeForDept._id?.toString?.() || selectedCollegeForDept._id
                    const departmentsForThisCollege = departments.filter((dept) => {
                      const deptCollegeId = dept.department_college_id?.toString?.() || dept.department_college_id
                      return !deptCollegeId || deptCollegeId === collegeId
                    })
                    if (departmentsForThisCollege.length === 0) {
                      return <p className="text-center text-neutral-dark py-8">No departments for this college yet. Create one to get started.</p>
                    }
                    return departmentsForThisCollege.map((dept) => {
                      const isAssigned = selectedCollegeForDept.collage_departments?.includes(dept._id || '')
                      return (
                        <div
                          key={dept._id}
                          className="flex items-center justify-between p-4 border border-neutral-light/20 rounded-xl bg-background-surface/50 hover:bg-background-elevated hover:border-neutral-light/30 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral">{dept.department_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {dept.department_code}
                              </Badge>
                              {dept.department_status === 0 && (
                                <Badge variant="error" className="text-xs">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            {dept.department_description && (
                              <p className="text-sm text-neutral-dark mt-1">{dept.department_description}</p>
                            )}
                            {/* Only show TPC details when this department is assigned to the college we're managing */}
                            {isAssigned && (
                              <>
                                {dept.department_tpc_name && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-neutral-dark">TPC:</span>
                                    <span className="text-xs font-medium text-neutral">{dept.department_tpc_name}</span>
                                  </div>
                                )}
                                {dept.department_tpc_id && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-neutral-dark">TPC Email:</span>
                                    <span className="text-xs font-mono text-neutral">{dept.department_tpc_id}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(dept.department_tpc_id || '')
                                        showToast('TPC Email copied to clipboard', 'success')
                                      }}
                                      className="text-primary hover:text-primary/80 ml-1"
                                      title="Copy TPC Email"
                                    >
                                      📋
                                    </button>
                                  </div>
                                )}
                                {/* Password display removed: passwords are stored hashed and are never
                                    returned by the API. Reset via the Edit DeptTPC flow instead. */}
                                {dept.department_tpc_contact && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-neutral-dark">TPC Contact:</span>
                                    <span className="text-xs text-neutral">{dept.department_tpc_contact}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(dept.department_tpc_contact || '')
                                        showToast('TPC Contact copied to clipboard', 'success')
                                      }}
                                      className="text-primary hover:text-primary/80 ml-1"
                                      title="Copy Contact"
                                    >
                                      📋
                                    </button>
                                  </div>
                                )}
                                {/* Show message if no TPC account exists (only when assigned to this college) */}
                                {!dept.department_tpc_name && !dept.department_tpc_id && (
                                  <div className="mt-2 text-xs text-neutral-dark italic">
                                    No DeptTPC account created yet
                                  </div>
                                )}
                              </>
                            )}
                            {/* Delete DeptTPC button - destructive style for clarity */}
                            {isAssigned && (dept.department_tpc_name || dept.department_tpc_id) && (
                              <div className="mt-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete the DeptTPC account for ${dept.department_name}? This action cannot be undone.`)) {
                                      await handleDeleteDeptTpc(dept._id!, dept.department_tpc_id)
                                    }
                                  }}
                                  className="px-3 text-xs"
                                  disabled={formLoading}
                                >
                                  Delete DeptTPC
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 ml-4 shrink-0">
                            <Button
                              variant={isAssigned ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={async () => {
                                await toggleDepartmentAssignment(dept._id!, !!isAssigned)
                              }}
                              className="px-4 text-sm"
                              disabled={formLoading}
                            >
                              {isAssigned ? 'Remove' : 'Assign'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditDepartment(dept)}
                              className="px-4 text-sm mt-2"
                              disabled={formLoading}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>

                <div className="flex gap-4 pt-4 border-t border-neutral-light/20">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDepartmentModal(false)
                      setSelectedCollegeForDept(null)
                    }}
                    className="px-6"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Create Department Modal */}
        {showCreateDeptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <Card className="w-full max-w-md max-h-[90vh] flex flex-col my-4">
              <div className="flex items-center justify-between p-6 border-b border-neutral-light/20 flex-shrink-0">
                <h2 className="text-2xl font-bold text-neutral">
                  {editingDepartment ? 'Edit Department' : 'Create New Department'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateDeptModal(false)
                    setNewDepartment({
                      department_name: '',
                      department_code: '',
                      department_description: '',
                      department_status: 1,
                      department_tpc_name: '',
                      department_tpc_id: '',
                      department_tpc_password: '',
                      department_tpc_contact: '',
                      department_college_id: '',
                    })
                    setShowPassword({})
                    setCreateTpcAccount(true)
                  }}
                  className="text-neutral-dark hover:text-neutral text-3xl font-light leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-background-elevated transition-colors"
                  aria-label="Close modal"
                  title="Close"
                >
                  ×
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    await handleSaveDepartment()
                  }}
                  className="space-y-4"
                  id="create-dept-form"
                >
                  <Input
                    label="Department Name *"
                    value={newDepartment.department_name || ''}
                    onChange={(e) =>
                      setNewDepartment({ ...newDepartment, department_name: e.target.value })
                    }
                    required
                    placeholder="e.g., Computer Science Engineering"
                  />
                  <Input
                    label="Department Code *"
                    value={newDepartment.department_code || ''}
                    onChange={(e) =>
                      setNewDepartment({ ...newDepartment, department_code: e.target.value.toUpperCase() })
                    }
                    required
                    placeholder="e.g., CSE"
                    maxLength={10}
                  />
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-2">
                      Description
                    </label>
                    <textarea
                      value={newDepartment.department_description || ''}
                      onChange={(e) =>
                        setNewDepartment({ ...newDepartment, department_description: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-background-surface border border-neutral-light/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                      placeholder="Optional description"
                    />
                  </div>
                  <FilterSelect
                    label="Status *"
                    value={newDepartment.department_status?.toString() || '1'}
                    onChange={(v) =>
                      setNewDepartment({ ...newDepartment, department_status: parseInt(v) })
                    }
                    options={[
                      { value: '1', label: 'Active' },
                      { value: '0', label: 'Inactive' },
                    ]}
                  />

                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="create-tpc-account"
                        checked={createTpcAccount}
                        onChange={(e) => setCreateTpcAccount(e.target.checked)}
                        className="w-4 h-4 text-primary border-neutral-light rounded focus:ring-primary"
                      />
                      <label htmlFor="create-tpc-account" className="text-sm font-medium text-neutral cursor-pointer">
                        {editingDepartment ? 'Update/Create TPC Account' : 'Create Department TPC User Account'}
                      </label>
                    </div>

                    {createTpcAccount && (
                      <>
                        <h3 className="text-lg font-semibold text-neutral mb-2">
                          {editingDepartment && editingDepartment.department_tpc_id ? 'Update TPC Details' : 'Department TPC Details'}
                        </h3>
                        <p className="text-sm text-neutral-dark mb-4">
                          Enter Department TPC details to create their user account. Department TPC can only manage their specific department.
                        </p>

                        <Input
                          label="TPC Full Name *"
                          value={newDepartment.department_tpc_name || ''}
                          onChange={(e) =>
                            setNewDepartment({ ...newDepartment, department_tpc_name: e.target.value })
                          }
                          required={createTpcAccount}
                          placeholder="e.g., John Doe"
                        />

                        <Input
                          label="TPC Email *"
                          value={newDepartment.department_tpc_id || ''}
                          onChange={(e) =>
                            setNewDepartment({ ...newDepartment, department_tpc_id: e.target.value })
                          }
                          required={createTpcAccount}
                          type="email"
                          placeholder="tpc@department.example.com"
                        />

                        <Input
                          label="TPC Contact Number"
                          value={newDepartment.department_tpc_contact || ''}
                          onChange={(e) =>
                            setNewDepartment({ ...newDepartment, department_tpc_contact: e.target.value })
                          }
                          type="tel"
                          placeholder="+91 9876543210"
                        />

                        <div className="relative">
                          <Input
                            label="TPC Password *"
                            value={newDepartment.department_tpc_password || ''}
                            onChange={(e) =>
                              setNewDepartment({ ...newDepartment, department_tpc_password: e.target.value })
                            }
                            required={createTpcAccount}
                            type={showPassword['new'] ? 'text' : 'password'}
                            placeholder="Enter password for TPC"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword({ ...showPassword, 'new': !showPassword['new'] })}
                            className="absolute right-3 top-9 text-neutral-dark hover:text-neutral"
                            aria-label="Toggle password visibility"
                          >
                            {showPassword['new'] ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                        <p className="text-xs text-neutral-dark mt-1">
                          Password must contain: 8+ characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
                        </p>
                      </>
                    )}
                  </div>

                </form>
              </div>

              <div className="p-6 border-t border-neutral-light/20 flex gap-4 flex-shrink-0">
                <Button
                  type="submit"
                  form="create-dept-form"
                  variant="primary"
                  className="px-6 flex-1"
                  isLoading={formLoading}
                  disabled={formLoading}
                >
                  {editingDepartment ? 'Update Department' : 'Create Department'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateDeptModal(false)
                    setNewDepartment({
                      department_name: '',
                      department_code: '',
                      department_description: '',
                      department_status: 1,
                      department_tpc_name: '',
                      department_tpc_id: '',
                      department_tpc_password: '',
                      department_tpc_contact: '',
                      department_college_id: '',
                    })
                    setShowPassword({})
                    setCreateTpcAccount(true)
                    setEditingDepartment(null)
                  }}
                  className="px-6"
                  disabled={formLoading}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* College TPC Management Modal */}
        {showCollegeTpcModal && selectedCollegeForTpc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <Card className="w-full max-w-md max-h-[90vh] flex flex-col my-4">
              <div className="flex items-center justify-between p-6 border-b border-neutral-light/20 flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-neutral">
                    {tpcOperationMode === 'create' ? 'Create College TPC' : 'Update College TPC'}
                  </h2>
                  <p className="text-sm text-neutral-dark mt-1">
                    {selectedCollegeForTpc.collage_name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCollegeTpcModal(false)
                    setSelectedCollegeForTpc(null)
                    setCollegeTpcData({ name: '', email: '', password: '', contact: '' })
                    setShowCollegeTpcPassword(false)
                    setTpcOperationMode('create')
                  }}
                  className="text-neutral-dark hover:text-neutral text-3xl font-light leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-background-elevated transition-colors"
                  aria-label="Close modal"
                  title="Close"
                >
                  ×
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (tpcOperationMode === 'create') {
                      await handleCreateCollegeTpc()
                    } else {
                      await handleUpdateCollegeTpc()
                    }
                  }}
                  className="space-y-4"
                  id="college-tpc-form"
                >
                  <div>
                    <p className="text-sm text-neutral-dark mb-4">
                      {tpcOperationMode === 'create'
                        ? 'Create a new College TPC account. This TPC can manage all departments in this college.'
                        : 'Update the existing College TPC account details. This TPC can manage all departments in this college.'}
                    </p>
                    {tpcOperationMode === 'update' && !selectedCollegeForTpc.collage_tpc_email && (
                      <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 mb-4">
                        <p className="text-sm text-yellow-800">
                          ⚠️ No TPC account found for this college. Please use &quot;Create TPC&quot; instead.
                        </p>
                      </div>
                    )}
                  </div>

                  <Input
                    label="TPC Name *"
                    value={collegeTpcData.name}
                    onChange={(e) =>
                      setCollegeTpcData({ ...collegeTpcData, name: e.target.value })
                    }
                    required
                    placeholder="e.g., John Doe"
                  />

                  <Input
                    label="TPC Email *"
                    value={collegeTpcData.email}
                    onChange={(e) =>
                      setCollegeTpcData({ ...collegeTpcData, email: e.target.value })
                    }
                    required
                    type="email"
                    placeholder="tpc@college.example.com"
                  />

                  <Input
                    label="TPC Contact Number"
                    value={collegeTpcData.contact}
                    onChange={(e) =>
                      setCollegeTpcData({ ...collegeTpcData, contact: e.target.value })
                    }
                    type="tel"
                    placeholder="+91 9876543210"
                  />

                  <div className="relative">
                    <Input
                      label="TPC Password *"
                      value={collegeTpcData.password}
                      onChange={(e) =>
                        setCollegeTpcData({ ...collegeTpcData, password: e.target.value })
                      }
                      required
                      type={showCollegeTpcPassword ? 'text' : 'password'}
                      placeholder="Enter password for College TPC"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCollegeTpcPassword(!showCollegeTpcPassword)}
                      className="absolute right-3 top-9 text-neutral-dark hover:text-neutral"
                      aria-label="Toggle password visibility"
                    >
                      {showCollegeTpcPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-dark mt-1">
                    Password must contain: 8+ characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
                  </p>
                </form>
              </div>

              <div className="p-6 border-t border-neutral-light/20 flex gap-4 flex-shrink-0">
                {tpcOperationMode === 'create' ? (
                  <>
                    <Button
                      type="submit"
                      form="college-tpc-form"
                      variant="primary"
                      className="px-6 flex-1"
                      isLoading={formLoading}
                      disabled={formLoading}
                    >
                      Create College TPC
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowCollegeTpcModal(false)
                        setSelectedCollegeForTpc(null)
                        setCollegeTpcData({ name: '', email: '', password: '', contact: '' })
                        setShowCollegeTpcPassword(false)
                        setTpcOperationMode('create')
                      }}
                      className="px-6"
                      disabled={formLoading}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="submit"
                      form="college-tpc-form"
                      variant="primary"
                      className="px-6 flex-1"
                      isLoading={formLoading}
                      disabled={formLoading || !selectedCollegeForTpc.collage_tpc_email}
                    >
                      Update College TPC
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleDeleteCollegeTpc}
                      className="px-6 text-red-600 hover:text-red-700"
                      isLoading={formLoading}
                      disabled={formLoading || !selectedCollegeForTpc.collage_tpc_email}
                    >
                      Delete TPC
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowCollegeTpcModal(false)
                        setSelectedCollegeForTpc(null)
                        setCollegeTpcData({ name: '', email: '', password: '', contact: '' })
                        setShowCollegeTpcPassword(false)
                        setTpcOperationMode('create')
                      }}
                      className="px-6"
                      disabled={formLoading}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingCollege && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold text-neutral mb-4">Delete College</h2>
                <p className="text-neutral-dark mb-6">
                  Are you sure you want to delete <strong>{deletingCollege.collage_name}</strong>?
                  This action cannot be undone.
                </p>
                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    onClick={() => setDeletingCollege(null)}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleDelete}
                    className="px-6 text-red-600 hover:text-red-700"
                    isLoading={formLoading}
                    disabled={formLoading}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
    </div>
    </SuperadminLayout>
  )
}

