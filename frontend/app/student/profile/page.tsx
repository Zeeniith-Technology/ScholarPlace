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

interface ProfileStats {
  testsCompleted: number
  overallProgress: number
  dayStreak: number
  currentRank: number
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
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<ProfileStats>({
    testsCompleted: 0,
    overallProgress: 0,
    dayStreak: 7,
    currentRank: 0,
  })

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
    fetchStats()
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

  const fetchStats = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error('[Profile] No auth token found')
        return
      }

      // Fetch progress summary for statistics
      const progressResponse = await fetch(`${apiBaseUrl}/student-progress/summary`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({}),
      })

      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        if (progressData.success && progressData.data) {
          const progress = progressData.data
          setStats({
            testsCompleted: progress.totalPracticeTests || 0,
            overallProgress: progress.totalWeeks > 0
              ? Math.round((progress.weeksCompleted / progress.totalWeeks) * 100)
              : 0,
            dayStreak: 7, // TODO: Calculate from last accessed dates
            currentRank: 0, // TODO: Calculate from all students
          })
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
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
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          })
          setShowPasswordChange(false)
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
        {/* Success/Error Messages */}
        {success && (
          <Card className="bg-green-500/10 border-green-500/30">
            <div className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-green-600 font-medium">{success}</p>
            </div>
          </Card>
        )}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30">
            <div className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          </Card>
        )}

        {/* Debug Info - Show current user from token (client-only to avoid hydration mismatch) */}
        {process.env.NODE_ENV === 'development' && isMounted && (
          <Card className="bg-yellow-50/50 border-yellow-200/50">
            <div className="p-4">
              <p className="text-xs font-semibold text-yellow-800 mb-2">🔍 Debug Info (Development Only)</p>
              <div className="text-xs text-yellow-700 space-y-1">
                <p>Current User ID from Token: <strong>{getCurrentUserFromToken()?.id || 'Not found'}</strong></p>
                <p>Current Email from Token: <strong>{getCurrentUserFromToken()?.email || 'Not found'}</strong></p>
                <p>Current Role from Token: <strong>{getCurrentUserFromToken()?.role || 'Not found'}</strong></p>
                <p className="text-yellow-600 mt-2">
                  💡 If you see old data, click &quot;Logout&quot; and login again with your new account.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
              Profile Settings
            </h1>
            <p className="text-gray-600">
              Manage your profile information and preferences
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="flex items-center justify-center gap-2 min-w-[140px] px-5 py-2.5 h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md shrink-0"
            >
              <Lock className="w-4 h-4 shrink-0" />
              Change Password
            </button>
            <button
              onClick={() => {
                clearAuth()
                window.location.href = '/auth/login'
              }}
              className="flex items-center justify-center gap-2 min-w-[140px] px-5 py-2.5 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md shrink-0"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Logout
            </button>
          </div>
        </div>

        {/* Password Change Section */}
        {showPasswordChange && (
          <Card className="border-2 border-primary/20">
            <div className="p-6">
              <h2 className="text-xl font-heading font-bold text-neutral mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Change Password
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral mb-2">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral mb-2">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral mb-2">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setShowPasswordChange(false)
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    setError(null)
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Profile Picture Section */}
        <Card>
          <div className="flex flex-col items-center text-center py-6">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-4xl font-heading font-bold text-white">
                  {profileData.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-heading font-bold text-neutral mb-1">
              {profileData.name}
            </h2>
            <p className="text-neutral-light">
              {profileData.semester ? `${profileData.semester} Semester` : 'Student'}
              {profileData.department && ` • ${profileData.department}`}
            </p>
            <Badge variant="secondary" className="mt-2">
              {profileData.role}
            </Badge>
          </div>
        </Card>

        {/* Personal Information */}
        <Card>
          <h2 className="text-xl font-heading font-bold text-neutral mb-6">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              <p className="text-neutral">{profileData.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <p className="text-neutral">{profileData.email}</p>
              <p className="text-xs text-neutral-light mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                <GraduationCap className="w-4 h-4 inline mr-2" />
                College Name
              </label>
              <p className="text-neutral">{profileData.college_name || 'Not set'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Semester
              </label>
              <p className="text-neutral">{profileData.semester ? `${profileData.semester} Semester` : 'Not set'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                Enrollment Number
              </label>
              <p className="text-neutral">{profileData.enrollment_number || 'Not set'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number
              </label>
              <p className="text-neutral">{profileData.contact_number || 'Not set'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                Department
              </label>
              <p className="text-neutral">{profileData.department || 'Not set'}</p>
            </div>
          </div>
        </Card>

        {/* Account Statistics */}
        <Card>
          <h2 className="text-xl font-heading font-bold text-neutral mb-6">
            Account Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-background-elevated rounded-lg">
              <p className="text-2xl font-heading font-bold text-primary mb-1">{stats.testsCompleted}</p>
              <p className="text-sm text-neutral-light">Tests Completed</p>
            </div>
            <div className="text-center p-4 bg-background-elevated rounded-lg">
              <p className="text-2xl font-heading font-bold text-secondary mb-1">{stats.overallProgress}%</p>
              <p className="text-sm text-neutral-light">Overall Progress</p>
            </div>
            <div className="text-center p-4 bg-background-elevated rounded-lg">
              <p className="text-2xl font-heading font-bold text-accent mb-1">{stats.dayStreak}</p>
              <p className="text-sm text-neutral-light">Day Streak</p>
            </div>
            <div className="text-center p-4 bg-background-elevated rounded-lg">
              <p className="text-2xl font-heading font-bold text-primary mb-1">
                {stats.currentRank > 0 ? `#${stats.currentRank}` : 'N/A'}
              </p>
              <p className="text-sm text-neutral-light">Current Rank</p>
            </div>
          </div>
        </Card>
      </div>
    </StudentLayout>
  )
}
