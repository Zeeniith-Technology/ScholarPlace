'use client'

import React, { useState, useEffect } from 'react'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getAuthHeader, getCurrentUserFromToken, clearAuth } from '@/utils/auth'
import {
  User,
  Mail,
  GraduationCap,
  Calendar,
  Phone,
  BookOpen,
  LogOut,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Hash,
  X,
} from 'lucide-react'

interface ProfileData {
  id: string
  name: string
  email: string
  role: string
  status: string
  contact_number: string
  department: string
  semester: number | null
  enrollment_number: string
  college_name: string
  last_login: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Student Profile Page
 * User profile information and settings
 * Route: /student/profile
 */
export default function StudentProfilePage() {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false)
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [profileData, setProfileData] = useState<ProfileData | null>(null)

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    setIsMounted(true)
    // Debug: Log current user from token
    const currentUser = getCurrentUserFromToken()
    console.log('[Profile] Current user from token:', currentUser)

    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error('[Profile] No auth token found')
        setError('Authentication required. Please login again.')
        setIsLoading(false)
        return
      }

      const response = await fetch(`${apiBaseUrl}/profile/get`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setProfileData(data.data)
        } else {
          setError(data.message || 'Failed to load profile')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to load profile')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetPasswordSection = () => {
    setShowPasswordChange(false)
    setCurrentPasswordVerified(false)
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setError(null)
  }

  const handleVerifyCurrentPassword = async () => {
    if (!passwordData.currentPassword.trim()) {
      setError('Enter your current password to continue')
      return
    }
    try {
      setIsVerifyingPassword(true)
      setError(null)
      setSuccess(null)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) {
        setError('Authentication required. Please login again.')
        return
      }
      const response = await fetch(`${apiBaseUrl}/profile/verify-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ currentPassword: passwordData.currentPassword }),
      })
      const data = await response.json()
      const errorMessage =
        data?.message ||
        (typeof data?.error === 'string' ? data.error : data?.error?.message) ||
        'Current password is incorrect'
      if (response.ok && data.success) {
        setCurrentPasswordVerified(true)
        setError(null)
      } else {
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Error verifying password:', error)
      setError('Failed to verify password. Please try again.')
    } finally {
      setIsVerifyingPassword(false)
    }
  }

  const handlePasswordChange = async () => {
    try {
      setIsChangingPassword(true)
      setError(null)
      setSuccess(null)

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match')
        return
      }

      if (passwordData.newPassword.length < 6) {
        setError('Password must be at least 6 characters long')
        return
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        setError('Authentication required. Please login again.')
        return
      }

      const response = await fetch(`${apiBaseUrl}/profile/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccess('Password changed successfully!')
          resetPasswordSection()
          setTimeout(() => setSuccess(null), 3000)
        } else {
          setError(data.message || 'Failed to change password')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setError('Failed to change password. Please try again.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-neutral-light">Loading profile...</p>
          </Card>
        </div>
      </StudentLayout>
    )
  }

  if (!profileData) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="p-12 text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-neutral-light mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral mb-2">Profile Not Found</h2>
            <p className="text-neutral-light mb-4">{error || 'Unable to load your profile'}</p>
            <Button variant="primary" onClick={fetchProfile}>
              Try Again
            </Button>
          </Card>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast-like success/error messages */}
        {success && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 shadow-lg flex items-center justify-between gap-4 p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-emerald-800 font-medium">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-700"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-500/15 border border-red-500/30 shadow-lg flex items-center justify-between gap-4 p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 rounded-lg hover:bg-red-500/20 text-red-700"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Debug (dev only) */}
        {process.env.NODE_ENV === 'development' && isMounted && (
          <Card className="bg-amber-50/80 border-amber-200/60">
            <div className="p-4">
              <p className="text-xs font-semibold text-amber-800 mb-2">🔍 Debug (Development)</p>
              <div className="text-xs text-amber-700 space-y-1">
                <p>User ID: <strong>{getCurrentUserFromToken()?.id || '—'}</strong></p>
                <p>Email: <strong>{getCurrentUserFromToken()?.email || '—'}</strong></p>
                <p>Role: <strong>{getCurrentUserFromToken()?.role || '—'}</strong></p>
                <p className="text-amber-600 mt-2">Log out and sign in again if data looks stale.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Hero / Profile header with quick stats */}
        <Card className="overflow-hidden p-0 border-0 shadow-xl bg-gradient-to-br from-primary/10 via-background-surface to-secondary/10">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 ring-4 ring-white/80">
                  <span className="text-3xl sm:text-4xl font-heading font-bold text-white">
                    {profileData.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-heading font-bold text-neutral mb-1">
                  {profileData.name}
                </h1>
                <p className="text-neutral-light mb-2">
                  {profileData.semester ? `${profileData.semester} Semester` : 'Student'}
                  {profileData.department && ` · ${profileData.department}`}
                </p>
                <Badge variant="secondary" className="mb-4">
                  {profileData.role}
                </Badge>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Change Password
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      clearAuth()
                      window.location.href = '/auth/login'
                    }}
                    className="gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Collapsible password change */}
        <Card className={showPasswordChange ? 'border-2 border-primary/25' : ''}>
          <button
            type="button"
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="w-full flex items-center justify-between gap-4 p-2 -m-2 rounded-xl hover:bg-neutral-light/5 transition-colors text-left"
          >
            <h2 className="text-lg font-heading font-bold text-neutral flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Change Password
            </h2>
            {showPasswordChange ? (
              <ChevronUp className="w-5 h-5 text-neutral-light" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-light" />
            )}
          </button>
          {showPasswordChange && (
            <div className="mt-6 pt-6 border-t border-neutral-light/20 space-y-4 animate-fade-in">
              {error && (
                <div className="rounded-lg bg-red-500/15 border border-red-500/30 flex items-center gap-3 p-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-sm font-medium text-red-800 flex-1">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-700"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {!currentPasswordVerified ? (
                <>
                  <p className="text-sm text-neutral-light mb-2">
                    Enter your current password to continue. You can only change your password after verifying it.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1.5">Current password</label>
                    <Input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter your current password"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={handleVerifyCurrentPassword}
                      disabled={isVerifyingPassword || !passwordData.currentPassword.trim()}
                      className="gap-2"
                    >
                      {isVerifyingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying…
                        </>
                      ) : (
                        'Verify & continue'
                      )}
                    </Button>
                    <Button variant="ghost" onClick={resetPasswordSection}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-secondary font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Current password verified. Enter your new password below.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1.5">New password (min 6 characters)</label>
                    <Input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1.5">Confirm new password</label>
                    <Input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword}
                      className="gap-2"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Changing…
                        </>
                      ) : (
                        'Update password'
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCurrentPasswordVerified(false)
                        setPasswordData({ ...passwordData, newPassword: '', confirmPassword: '' })
                      }}
                    >
                      Back
                    </Button>
                    <Button variant="ghost" onClick={resetPasswordSection}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Personal information – icon-led rows */}
        <Card>
          <h2 className="text-xl font-heading font-bold text-neutral mb-5">Personal information</h2>
          <div className="space-y-0 divide-y divide-neutral-light/15">
            <InfoRow icon={User} label="Full name" value={profileData.name} />
            <InfoRow icon={Mail} label="Email" value={profileData.email} sub="Email cannot be changed" />
            <InfoRow icon={GraduationCap} label="College" value={profileData.college_name || 'Not set'} />
            <InfoRow icon={Calendar} label="Semester" value={profileData.semester ? `${profileData.semester} Semester` : 'Not set'} />
            <InfoRow icon={Hash} label="Enrollment number" value={profileData.enrollment_number || 'Not set'} />
            <InfoRow icon={Phone} label="Phone" value={profileData.contact_number || 'Not set'} />
            <InfoRow icon={BookOpen} label="Department" value={profileData.department || 'Not set'} />
          </div>
        </Card>
      </div>
    </StudentLayout>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-light">{label}</p>
        <p className="text-neutral font-medium mt-0.5">{value}</p>
        {sub && <p className="text-xs text-neutral-light mt-1">{sub}</p>}
      </div>
    </div>
  )
}

