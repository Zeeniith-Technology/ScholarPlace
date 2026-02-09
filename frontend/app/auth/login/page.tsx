'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/components/layouts/AuthLayout'
import { Toast, useToast } from '@/components/ui/Toast'
import { setToken, getToken } from '@/utils/auth'

/**
 * Login Page
 * Authentication page for existing users to log in
 * Route: /auth/login
 */
export default function LoginPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError('')

    if (!validate()) {
      return
    }

    setIsLoading(true)

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from server')
      }

      const data = await response.json()

      console.log('[Login] Response data:', {
        success: data.success,
        hasUser: !!data.data?.user,
        hasToken: !!data.data?.token,
        role: data.data?.user?.role,
        message: data.message
      })

      if (!response.ok || !data.success) {
        const errorMsg = data.message || data.error || `Login failed (Status: ${response.status})`
        console.error('[Login] Login failed:', { status: response.status, data })
        setGeneralError(errorMsg)
        showToast(errorMsg, 'error')
        setIsLoading(false)
        return
      }

      if (data.success && data.data?.user) {
        // Get JWT token from response
        const token = data.data?.token
        if (!token) {
          setGeneralError('No authentication token received from server')
          showToast('Login failed: No token received', 'error')
          return
        }

        // Store JWT token and user info using auth utility
        const userRole = data.data.user?.role || 'Student'
        console.log('[Login] Storing token for role:', userRole)

        setToken(token, {
          email: data.data.user.email,
          role: userRole,
        })

        // Verify token was stored
        const storedToken = getToken()
        console.log('[Login] Token stored:', {
          hasStoredToken: !!storedToken,
          tokenLength: token.length,
          role: userRole
        })

        if (!storedToken) {
          setGeneralError('Failed to store authentication token. Please try again.')
          showToast('Login failed: Token storage error', 'error')
          setIsLoading(false)
          return
        }

        // Force localStorage to be written (localStorage is synchronous, but ensure it's flushed)
        // Use requestAnimationFrame to ensure DOM updates complete before redirect
        requestAnimationFrame(() => {
          // Double-check token is still there
          const verifyToken = getToken()
          if (!verifyToken) {
            setGeneralError('Token verification failed. Please try again.')
            showToast('Login failed: Token verification error', 'error')
            setIsLoading(false)
            return
          }

          showToast('Login successful! Redirecting...', 'success')

          // Redirect based on role (handle exact role names from backend)
          const normalizedRole = userRole.toLowerCase()

          // After login, use full reload to ensure clean state
          // This is acceptable UX trade-off for guaranteed authentication state
          // Handle exact role names: Student, TPC, DeptTPC, Superadmin
          if (normalizedRole === 'student') {
            window.location.href = '/student/dashboard'
          } else if (normalizedRole === 'depttpc' || normalizedRole === 'dept-tpc') {
            console.log('[Login] Redirecting DeptTPC user to dashboard')
            window.location.href = '/dept-tpc/dashboard'
          } else if (normalizedRole === 'tpc') {
            console.log('[Login] Redirecting TPC user to dashboard')
            window.location.href = '/tpc/dashboard'
          } else if (normalizedRole === 'superadmin') {
            window.location.href = '/superadmin/dashboard'
          } else {
            // Default fallback
            console.warn('Unknown role:', userRole, '- redirecting to student dashboard')
            window.location.href = '/student/dashboard'
          }
        })
      } else {
        const errorMsg = data.message || data.error || 'Login failed. Please check your credentials.'
        setGeneralError(errorMsg)
        showToast(errorMsg, 'error')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setGeneralError(error.message || 'Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      heroImage="/images/Login_heroSection.jpg"
    >
      <div className="w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral">
            Login to Scholarplace
          </h1>
          <p className="text-sm sm:text-base text-neutral-dark">
            Enter your credentials to access your dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="your.email@college.edu"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                if (errors.email) {
                  setErrors({ ...errors, email: '' })
                }
              }}
              error={errors.email}
              autoComplete="email"
              aria-required="true"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value })
                  if (errors.password) {
                    setErrors({ ...errors, password: '' })
                  }
                }}
                error={errors.password}
                autoComplete="current-password"
                aria-required="true"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-neutral-light hover:text-neutral transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.973 9.973 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {generalError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{generalError}</p>
            </div>
          )}

          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 text-base font-medium"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-light/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-neutral-dark">
                Don&apos;t have an account?
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-neutral-dark">
            <Link
              href="/auth/signup"
              className="text-primary hover:underline font-medium transition-colors"
            >
              Create an account
            </Link>
          </p>
        </form>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </AuthLayout>
  )
}









