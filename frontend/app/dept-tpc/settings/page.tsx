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
  Settings,
  User,
  Mail,
  Building2,
  Save,
  RefreshCw,
  Lock,
  LogOut,
} from 'lucide-react'

/**
 * Department TPC Settings Page
 * Department and account settings
 * Route: /dept-tpc/settings
 */
export default function DepartmentTPCSettingsPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    college: '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    checkAuth()
    fetchProfile()
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
    } catch (error) {
      console.error('[Settings] Auth check error:', error)
    }
  }

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const res = await fetch(`${apiBaseUrl}/profile/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      })

      if (res.status === 401 || res.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const data = await res.json()
      if (data.success && data.data) {
        setProfile(data.data)
        setFormData({
          name: data.data.name || data.data.person_name || data.data.dept_tpc_name || '',
          email: data.data.email || data.data.person_email || data.data.dept_tpc_email || '',
          phone: data.data.phone || data.data.person_phone || data.data.contact_number || data.data.dept_tpc_contact || '',
          department: data.data.department || data.data.department_name || '',
          college: data.data.college || data.data.college_name || '',
        })
      }
    } catch (error) {
      console.error('[Settings] Error fetching profile:', error)
      showToast('Failed to load profile', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const res = await fetch(`${apiBaseUrl}/profile/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(formData),
      })

      if (res.status === 401 || res.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const data = await res.json()
      if (data.success) {
        showToast('Profile updated successfully', 'success')
        // Update form data with the response data immediately
        if (data.data) {
          setFormData({
            name: data.data.name || data.data.person_name || data.data.dept_tpc_name || formData.name,
            email: data.data.email || data.data.person_email || data.data.dept_tpc_email || formData.email,
            phone: data.data.phone || data.data.person_phone || data.data.contact_number || data.data.dept_tpc_contact || formData.phone,
            department: data.data.department || data.data.department_name || formData.department,
            college: data.data.college || data.data.college_name || formData.college,
          })
          setProfile(data.data)
        }
        // Also refresh profile data to ensure consistency
        fetchProfile()
      } else {
        showToast(data.message || 'Failed to update profile', 'error')
      }
    } catch (error) {
      console.error('[Settings] Error updating profile:', error)
      showToast('Failed to update profile', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error')
      return
    }

    if (passwordData.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    try {
      setIsSaving(true)
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()

      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const res = await fetch(`${apiBaseUrl}/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (res.status === 401 || res.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      const data = await res.json()
      if (data.success) {
        showToast('Password changed successfully', 'success')
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        showToast(data.message || 'Failed to change password', 'error')
      }
    } catch (error) {
      console.error('[Settings] Error changing password:', error)
      showToast('Failed to change password', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/auth/login'
  }

  return (
    <DepartmentTPCLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-gray-900 mb-2">
              Profile Settings
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage your profile information and preferences
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                const passwordCard = document.getElementById('password-card')
                if (passwordCard) {
                  passwordCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading settings...</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Profile Information */}
            <Card>
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-heading font-bold text-gray-900">Profile Information</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      disabled
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Department information cannot be changed
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      College
                    </label>
                    <input
                      type="text"
                      value={formData.college}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      disabled
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      College information cannot be changed
                    </p>
                  </div>

                  {profile && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Role:</span>
                        <Badge variant="primary" className="text-xs">
                          {profile.role || profile.person_role || 'DeptTPC'}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Card>

            {/* Change Password */}
            <Card id="password-card">
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-heading font-bold text-gray-900">Change Password</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="Enter new password"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Password must be at least 6 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Card>

          </>
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
