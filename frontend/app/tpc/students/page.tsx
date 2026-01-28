'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TPCLayout } from '@/components/layouts/TPCLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'
import { Users, Search, Filter, RefreshCw, TrendingUp, Award, AlertCircle } from 'lucide-react'

/**
 * TPC Students Page
 * Manage and view all students in the college
 * Route: /tpc/students
 */
function TPCStudentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>(() => searchParams.get('department') || searchParams.get('department_id') || 'all')
  const [departments, setDepartments] = useState<any[]>([])
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    checkAuth()
    fetchDepartments()
    fetchStudents()
  }, [statusFilter, departmentFilter])

  const checkAuth = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()
      if (!authHeader) {
        router.push('/auth/login')
        return
      }

      const profileRes = await fetch(`${apiBaseUrl}/profile/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      })

      // Only redirect on 401/403 (authentication errors)
      if (profileRes.status === 401 || profileRes.status === 403) {
        router.push('/auth/login')
        return
      }

      if (!profileRes.ok) {
        // Profile fetch failed, allow retry
        // Don't redirect on other errors
        return
      }

      const profileResult = await profileRes.json()
      const userRole = profileResult.data?.role || profileResult.data?.person_role
      // Only allow TPC to access this page
      if (!profileResult.success || userRole?.toLowerCase() !== 'tpc') {
        if (userRole?.toLowerCase() === 'depttpc') {
          router.push('/dept-tpc/dashboard')
        } else {
          router.push('/auth/login')
        }
        return
      }

      setUserInfo(profileResult.data)
    } catch (error) {
      console.error('[TPC Students] Auth verification error:', error)
      // Only redirect if we have no token
      const authHeader = getAuthHeader()
      if (!authHeader) {
        router.push('/auth/login')
      }
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
          'Authorization': authHeader,
        },
      })

      const data = await response.json()
      if (data.success) {
        setDepartments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()
      if (!authHeader) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${apiBaseUrl}/tpc-college/students/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          search: searchTerm,
          status: statusFilter,
          department: departmentFilter !== 'all' ? departmentFilter : undefined,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setStudents(Array.isArray(data.data) ? data.data : [])
      } else {
        showToast(data.message || 'Failed to load students', 'error')
        setStudents([])
      }
    } catch (error: any) {
      console.error('Error fetching students:', error)
      showToast('Failed to load students', 'error')
      setStudents([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleSearch = () => {
    setIsRefreshing(true)
    fetchStudents()
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setSearchTerm('')
    setStatusFilter('all')
    setDepartmentFilter('all')
    fetchStudents()
  }

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    const name = (student.person_name || '').toLowerCase()
    const email = (student.person_email || '').toLowerCase()
    const enrollment = (student.enrollment_number || '').toLowerCase()
    return name.includes(searchLower) || email.includes(searchLower) || enrollment.includes(searchLower)
  })

  if (isLoading && students.length === 0) {
    return (
      <TPCLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-neutral-light">Loading students...</p>
          </div>
        </div>
      </TPCLayout>
    )
  }

  return (
    <TPCLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2">
              Students Management
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              View and manage all students in your college
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-background-surface border border-neutral-light/20 hover:bg-background-elevated transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-light ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-light" />
              <Input
                type="text"
                placeholder="Search students by name, email, or enrollment number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                className="pl-10"
              />
            </div>
            {departments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-neutral-light/30 rounded-lg bg-background text-neutral text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[150px]"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
            >
              Search
            </button>
          </div>

          {filteredStudents.length > 0 ? (
            <div className="space-y-3">
              {filteredStudents.map((student, index) => (
                <div
                  key={student._id || student.person_id || index}
                  className="p-4 rounded-lg border border-neutral-light/20 bg-background-elevated hover:bg-background-surface transition-all duration-300 hover:shadow-md hover:scale-[1.01] animate-stagger-fade"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-neutral text-base">
                          {student.person_name || 'Unknown'}
                        </h3>
                        <Badge
                          variant={student.person_status === 'active' ? 'primary' : 'accent'}
                          className="text-xs"
                        >
                          {student.person_status || 'unknown'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-light">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {student.person_email || 'No email'}
                        </span>
                        {student.enrollment_number && (
                          <span>Enrollment: {student.enrollment_number}</span>
                        )}
                        {student.department && (
                          <span>Dept: {student.department}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-secondary" />
                          <span className="text-sm font-semibold text-neutral">
                            {student.progress?.average_score || 0}%
                          </span>
                        </div>
                        <div className="text-xs text-neutral-light space-y-1">
                          <p>Days: {student.progress?.total_days_completed || 0}</p>
                          <p>Tests: {student.progress?.total_practice_tests || 0}</p>
                        </div>
                      </div>
                      {student.progress?.average_score >= 85 && (
                        <Award className="w-5 h-5 text-primary" />
                      )}
                      {student.progress && student.progress.average_score < 50 && (
                        <AlertCircle className="w-5 h-5 text-accent" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-neutral-light mx-auto mb-4" />
              <p className="text-neutral-light">
                {searchTerm ? 'No students found matching your search' : 'No students found'}
              </p>
            </div>
          )}
        </Card>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </TPCLayout>
  )
}

export default function TPCStudentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>}>
      <TPCStudentsContent />
    </Suspense>
  )
}
