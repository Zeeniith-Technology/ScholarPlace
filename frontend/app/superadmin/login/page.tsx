'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/components/layouts/AuthLayout'
import { setToken, clearAuth, getToken } from '@/utils/auth'

/**
 * Superadmin Login Page
 * Route: /superadmin/login
 */
export default function SuperadminLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ email: '123@gmail.com', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Check if user is already logged in with valid token
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = getToken()
      if (token) {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''
          const res = await fetch(`${apiBase}/profile/get`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          })
          if (res.ok) {
            const profileResult = await res.json()
            const userRole = profileResult.data?.role || profileResult.data?.person_role
            if (userRole === 'superadmin' && profileResult.success) {
              // Valid token, redirect to dashboard
              window.location.href = '/superadmin/dashboard'
            } else {
              // Invalid role, clear token
              clearAuth()
            }
          } else if (res.status === 401 || res.status === 403) {
            // Token is invalid/expired, clear it
            clearAuth()
          }
        } catch (error) {
          // Network error, clear token to be safe
          clearAuth()
        }
      }
    }
    checkExistingAuth()
  }, [])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email'
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
    if (!validate()) return

    setIsLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      console.log('[Login] Attempting login with:', { email: formData.email, hasPassword: !!formData.password })
      
      const res = await fetch(`${apiBase}/auth/superadmin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      console.log('[Login] Response status:', res.status, res.statusText)

      const contentType = res.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      const result = isJson ? await res.json() : null
      
      if (!isJson) {
        setGeneralError('Unexpected response from server')
        setIsLoading(false)
        return
      }
      
      if (!res.ok || !result.success) {
        const errorMsg = result?.message || result?.error || `Login failed (Status: ${res.status})`
        console.error('Login failed:', { status: res.status, result })
        setGeneralError(errorMsg)
        setIsLoading(false)
        return
      }
      
      // Login successful - store JWT token
      const token = result.data?.token
      if (!token) {
        setGeneralError('No token received from server')
        setIsLoading(false)
        return
      }
      
      // Store token and user data
      const userRole = result.data?.user?.role || 'superadmin'
      console.log('[Superadmin Login] Storing token for role:', userRole)
      
      setToken(token, {
        email: result.data?.user?.email || formData.email,
        role: userRole,
      })
      
      // Verify token was stored (localStorage is synchronous)
      const storedToken = getToken()
      console.log('[Superadmin Login] Token stored:', { 
        hasStoredToken: !!storedToken,
        tokenLength: token.length,
        role: userRole
      })
      
      if (!storedToken) {
        setGeneralError('Failed to store authentication token. Please try again.')
        setIsLoading(false)
        return
      }
      
      // Use requestAnimationFrame to ensure DOM updates complete before redirect
      requestAnimationFrame(() => {
        // Double-check token is still there
        const verifyToken = getToken()
        if (!verifyToken) {
          setGeneralError('Token verification failed. Please try again.')
          setIsLoading(false)
          return
        }
        
        // Use window.location for a hard redirect to ensure clean state
        window.location.href = '/superadmin/dashboard'
      })
    } catch (err: any) {
      setGeneralError(err?.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout heroImage="/images/Login_heroSection.jpg">
      <div className="w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral">
            Superadmin Login
          </h1>
          <p className="text-base text-neutral-dark">
            Sign in to manage colleges, roles, and platform settings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="superadmin@scholarplace.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                if (errors.email) setErrors({ ...errors, email: '' })
              }}
              error={errors.email}
              autoComplete="email"
              aria-required="true"
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value })
                if (errors.password) setErrors({ ...errors, password: '' })
              }}
              error={errors.password}
              autoComplete="current-password"
              aria-required="true"
            />
          </div>

          {generalError && (
            <p className="text-sm text-red-600">{generalError}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 text-base font-medium"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login as Superadmin'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}

