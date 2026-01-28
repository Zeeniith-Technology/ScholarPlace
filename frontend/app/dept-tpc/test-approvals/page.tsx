'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DepartmentTPCLayout } from '@/components/layouts/DepartmentTPCLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Mail,
  RefreshCw,
  Shield,
  XCircle
} from 'lucide-react'

/**
 * DeptTPC Test Approvals Page
 * Manage blocked students and approve test retakes
 * Route: /dept-tpc/test-approvals
 */
export default function TestApprovalsPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [blockedStudents, setBlockedStudents] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [isBulkApproving, setIsBulkApproving] = useState(false)

  useEffect(() => {
    fetchBlockedStudents()
  }, [])

  const fetchBlockedStudents = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${apiBaseUrl}/tpc-dept/blocked-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setBlockedStudents(data.data)
        }
      } else if (response.status === 401) {
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Error fetching blocked students:', error)
      showToast('Failed to load blocked students', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchBlockedStudents().finally(() => setIsRefreshing(false))
  }

  const handleApprove = async (studentId: string, week: number, testType: string) => {
    try {
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        showToast('Authentication required', 'error')
        return
      }

      const response = await fetch(`${apiBaseUrl}/tpc-dept/approve-test-retake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          student_id: studentId,
          week: week,
          test_type: testType,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          showToast('Test retake approved successfully', 'success')
          fetchBlockedStudents()
        } else {
          showToast(data.message || 'Failed to approve retake', 'error')
        }
      } else {
        showToast('Failed to approve retake', 'error')
      }
    } catch (error) {
      console.error('Error approving retake:', error)
      showToast('Error approving retake', 'error')
    }
  }

  const handleBulkApprove = async () => {
    if (selectedStudents.size === 0) {
      showToast('Please select at least one student', 'error')
      return
    }

    try {
      setIsBulkApproving(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        showToast('Authentication required', 'error')
        return
      }

      const response = await fetch(`${apiBaseUrl}/dept-tpc/bulk-approve-retakes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          student_ids: Array.from(selectedStudents)
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          showToast(`Bulk approval complete: ${data.data.approved} approved, ${data.data.failed} failed`, 'success')
          setSelectedStudents(new Set())
          fetchBlockedStudents()
        } else {
          showToast(data.message || 'Failed to bulk approve', 'error')
        }
      } else {
        showToast('Failed to bulk approve', 'error')
      }
    } catch (error) {
      console.error('Error bulk approving:', error)
      showToast('Error bulk approving retakes', 'error')
    } finally {
      setIsBulkApproving(false)
    }
  }

  const handleToggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const handleToggleAll = () => {
    if (selectedStudents.size === blockedStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(blockedStudents.map(s => s.student_id)))
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading && blockedStudents.length === 0) {
    return (
      <DepartmentTPCLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-neutral-light">Loading blocked students...</p>
              </div>
            </div>
          </div>
        </div>
      </DepartmentTPCLayout>
    )
  }

  return (
    <DepartmentTPCLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2">
              Test Retake Approvals
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              Approve students who were blocked from retaking tests due to violations
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-background-surface border border-neutral-light/20 hover:bg-background-elevated transition-all duration-300 hover:scale-105 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-light ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {blockedStudents.length > 0 && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.size === blockedStudents.length && blockedStudents.length > 0}
                    onChange={handleToggleAll}
                    className="w-4 h-4 rounded border-neutral-light/20 text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-sm font-medium text-neutral">Select All</span>
                </label>
                <span className="text-sm text-neutral-light">
                  {selectedStudents.size} of {blockedStudents.length} selected
                </span>
              </div>
              <Button
                onClick={handleBulkApprove}
                disabled={selectedStudents.size === 0 || isBulkApproving}
                variant="primary"
                className="transition-all duration-300 hover:scale-105"
              >
                {isBulkApproving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Bulk Approve ({selectedStudents.size})
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {blockedStudents.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral mb-2">No Blocked Students</h3>
            <p className="text-neutral-light">All students in your department are eligible to take tests.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {blockedStudents.map((student, index) => (
              <Card key={index} className="p-5 border-l-4 border-l-red-500">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.student_id)}
                    onChange={() => handleToggleStudent(student.student_id)}
                    className="mt-6 w-4 h-4 rounded border-neutral-light/20 text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-red-100">
                            <Shield className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-neutral text-base">
                              {student.student_name || 'Unknown Student'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-light mt-1">
                              {student.student_email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {student.student_email}
                                </span>
                              )}
                              {student.enrollment_number && (
                                <span>Enrollment: {student.enrollment_number}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="accent" className="text-xs">
                              Week {student.week} - {student.test_type === 'weekly' ? 'Weekly Test' : 'Practice Test'}
                            </Badge>
                            <span className="text-neutral-light">•</span>
                            <span className="text-neutral-light">
                              Blocked: {formatDate(student.blocked_at)}
                            </span>
                          </div>
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-red-800">Reason:</p>
                                <p className="text-xs text-red-600 mt-1">
                                  {student.blocked_reason === 'window_switch_violation'
                                    ? 'Window switch detected during test'
                                    : student.blocked_reason || 'Security violation'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          onClick={() => handleApprove(student.student_id, student.week, student.test_type)}
                          variant="primary"
                          className="px-4 py-2 text-sm font-semibold transition-all duration-300 hover:scale-105"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve Retake
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
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
    </DepartmentTPCLayout>
  )
}
