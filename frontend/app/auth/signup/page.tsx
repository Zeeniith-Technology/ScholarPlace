'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { AuthLayout } from '@/components/layouts/AuthLayout'
import { Toast, useToast } from '@/components/ui/Toast'

const roleOptions = [
  { value: 'student', label: 'Student' },
  { value: 'depttpc', label: 'Department TPC' },
  { value: 'tpc', label: 'TPC' },
]

/**
 * Signup Page
 * Registration page for new users to create an account
 * Route: /auth/signup
 */
export default function SignupPage() {
  const { toast, showToast, hideToast } = useToast()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    collegeId: '',
    role: 'student',
    password: '',
    confirmPassword: '',
    department: '',
    semester: '6', // Fixed to 6th semester
    enrollmentNumber: '',
    contactNumber: '',
    agreeToTerms: false,
  })
  const [colleges, setColleges] = useState<Array<{ value: string; label: string }>>([])
  const [departments, setDepartments] = useState<Array<{ value: string; label: string }>>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingColleges, setIsLoadingColleges] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Fetch colleges on mount
  useEffect(() => {
    fetchColleges()
  }, [])

  // Fetch departments when college is selected
  useEffect(() => {
    if (formData.collegeId) {
      fetchDepartments(formData.collegeId)
    } else {
      setDepartments([])
    }
  }, [formData.collegeId])

  const fetchColleges = async () => {
    try {
      setIsLoadingColleges(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const response = await fetch(`${apiBaseUrl}/collage/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()
      console.log('[Signup] Colleges API response:', data)
      
      if (data.success && data.data) {
        const collegeList = Array.isArray(data.data) ? data.data : []
        // Backend already filters active colleges for public access, but double-check
        const collegeOptions = collegeList
          .filter((college: any) => 
            (college.collage_status === 1 || college.collage_status === undefined) && 
            (college.collage_subscription_status === 'active' || college.collage_subscription_status === undefined) &&
            !college.deleted
          )
          .map((college: any) => ({
            value: college._id?.toString() || college.collage_id?.toString() || college._id || college.collage_id, // Ensure string format
            label: college.collage_name,
          }))
        console.log('[Signup] College options:', collegeOptions)
        setColleges(collegeOptions)
      } else {
        console.warn('[Signup] No colleges found:', data.message || data.error)
        setColleges([])
      }
    } catch (error) {
      console.error('[Signup] Error fetching colleges:', error)
      showToast('Failed to load colleges. Please refresh the page.', 'error')
      setColleges([])
    } finally {
      setIsLoadingColleges(false)
    }
  }

  const fetchDepartments = async (collegeId: string) => {
    try {
      if (!collegeId) {
        setDepartments([])
        return
      }
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      console.log('[Signup] Fetching departments for college:', collegeId)
      
      const response = await fetch(`${apiBaseUrl}/department/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collegeId }),
      })

      const data = await response.json()
      console.log('[Signup] Department API response:', data)
      
      if (data.success && data.data) {
        const deptList = Array.isArray(data.data) ? data.data : []
        const deptOptions = deptList
          .filter((dept: any) => dept.department_status === 1 && !dept.deleted)
          .map((dept: any) => ({
            value: dept.department_id || dept._id,
            label: dept.department_name,
          }))
        console.log('[Signup] Department options:', deptOptions)
        setDepartments(deptOptions)
      } else {
        console.warn('[Signup] No departments found or API error:', data.message || data.error)
        setDepartments([])
      }
    } catch (error) {
      console.error('[Signup] Error fetching departments:', error)
      setDepartments([])
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    } else if (!formData.email.includes('@') || !formData.email.endsWith('.edu')) {
      newErrors.email = 'Please use your college email address'
    }

    if (!formData.collegeId) {
      newErrors.collegeId = 'College selection is required'
    }

    // Department required for students and DeptTPC
    if ((formData.role === 'student' || formData.role === 'depttpc') && !formData.department) {
      newErrors.department = 'Department selection is required'
    }

    // Semester is fixed to 6 for students (no validation needed)

    // Enrollment number required for students
    if (formData.role === 'student' && !formData.enrollmentNumber.trim()) {
      newErrors.enrollmentNumber = 'Enrollment number is required'
    }

    // Contact number required for all roles
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required'
    } else {
      // Basic phone number validation (should contain digits and be at least 10 characters)
      const phoneRegex = /^[+]?[\d\s\-()]{10,}$/
      if (!phoneRegex.test(formData.contactNumber.trim())) {
        newErrors.contactNumber = 'Please enter a valid contact number'
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else {
      const passwordErrors: string[] = []
      
      if (formData.password.length < 8) {
        passwordErrors.push('at least 8 characters')
      }
      
      if (!/[A-Z]/.test(formData.password)) {
        passwordErrors.push('one capital letter')
      }
      
      if (!/[a-z]/.test(formData.password)) {
        passwordErrors.push('one lowercase letter')
      }
      
      if (!/[0-9]/.test(formData.password)) {
        passwordErrors.push('one number')
      }
      
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
        passwordErrors.push('one special character')
      }
      
      if (passwordErrors.length > 0) {
        newErrors.password = `Password must contain ${passwordErrors.join(', ')}`
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms & Privacy Policy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    setIsLoading(true)

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      
      const response = await fetch(`${apiBaseUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          collegeId: formData.collegeId,
          role: formData.role,
          password: formData.password,
          department: formData.department || null,
          semester: formData.role === 'student' ? 6 : null, // Always 6th semester for students
          enrollmentNumber: formData.enrollmentNumber ? formData.enrollmentNumber.trim() : null,
          contactNumber: formData.contactNumber ? formData.contactNumber.trim() : null,
        }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from server')
      }

      const data = await response.json()

      if (data.success) {
        showToast('Account created successfully! Redirecting to login...', 'success')
        setTimeout(() => {
          window.location.href = '/auth/login'
        }, 1500)
      } else {
        // Show error message
        const errorMsg = data.message || data.error || 'Signup failed. Please try again.'
        showToast(errorMsg, 'error')
        setErrors({ submit: errorMsg })
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      setErrors({ 
        submit: error.message || 'Network error. Please check your connection and try again.' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Get Started"
      subtitle="From 3rd sem to offer letter – one guided path."
      heroImage="/images/Singup_heroSection.jpg"
    >
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral">
            Create Your Account
          </h1>
          <p className="text-base text-neutral-dark">
            Join Scholarplace and start your placement journey
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) => {
                setFormData({ ...formData, fullName: e.target.value })
                if (errors.fullName) {
                  setErrors({ ...errors, fullName: '' })
                }
              }}
              error={errors.fullName}
              autoComplete="name"
              aria-required="true"
            />

            <Input
              label="College Email"
              type="email"
              placeholder="your.name@college.edu"
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

            <Select
              label="College *"
              options={
                isLoadingColleges
                  ? [{ value: '', label: 'Loading colleges...' }]
                  : colleges.length === 0
                  ? [{ value: '', label: 'No active colleges available' }]
                  : [{ value: '', label: 'Select a college' }, ...colleges]
              }
              value={formData.collegeId}
              onChange={(e) => {
                const selectedCollegeId = e.target.value
                console.log('[Signup] College selected:', selectedCollegeId)
                setFormData({ ...formData, collegeId: selectedCollegeId, department: '' })
                if (errors.collegeId) {
                  setErrors({ ...errors, collegeId: '' })
                }
              }}
              error={errors.collegeId}
              disabled={isLoadingColleges}
              aria-required="true"
            />

            {/* Department field - Required for Students and DeptTPC */}
            {(formData.role === 'student' || formData.role === 'depttpc') && formData.collegeId && (
              <Select
                label="Department *"
                options={
                  departments.length === 0
                    ? [{ value: '', label: 'Loading departments...' }]
                    : [{ value: '', label: 'Select a department' }, ...departments]
                }
                value={formData.department}
                onChange={(e) => {
                  setFormData({ ...formData, department: e.target.value })
                  if (errors.department) {
                    setErrors({ ...errors, department: '' })
                  }
                }}
                error={errors.department}
                aria-required="true"
                disabled={departments.length === 0}
              />
            )}

            {/* Show info message for TPC role about college assignment */}
            {formData.role === 'tpc' && formData.collegeId && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> You will be assigned to manage the selected college. College TPC accounts are typically created by administrators.
                </p>
              </div>
            )}

            {formData.role === 'student' && (
              <>
                <Input
                  label="Enrollment Number"
                  type="text"
                  placeholder="Enter your enrollment number"
                  value={formData.enrollmentNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, enrollmentNumber: e.target.value })
                    if (errors.enrollmentNumber) {
                      setErrors({ ...errors, enrollmentNumber: '' })
                    }
                  }}
                  error={errors.enrollmentNumber}
                  autoComplete="off"
                  aria-required="true"
                />
              </>
            )}

            <Input
              label="Contact Number"
              type="tel"
              placeholder="+91 1234567890"
              value={formData.contactNumber}
              onChange={(e) => {
                setFormData({ ...formData, contactNumber: e.target.value })
                if (errors.contactNumber) {
                  setErrors({ ...errors, contactNumber: '' })
                }
              }}
              error={errors.contactNumber}
              autoComplete="tel"
              aria-required="true"
            />

            <Select
              label="Role"
              options={roleOptions}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              error={errors.role}
              aria-required="true"
            />

            <div className="space-y-5 pt-2">
              <div>
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value })
                      if (errors.password) {
                        setErrors({ ...errors, password: '' })
                      }
                      // Clear confirm password error if passwords now match
                      if (formData.confirmPassword && e.target.value === formData.confirmPassword && errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: '' })
                      }
                    }}
                    error={errors.password}
                    autoComplete="new-password"
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
                {formData.password && (
                  <div className="mt-2 p-3 rounded-lg bg-background-surface border border-neutral-light/20">
                    <p className="text-xs font-medium text-neutral mb-2">Password must contain:</p>
                    <div className="space-y-1.5">
                      <div className={`flex items-center gap-2 text-xs transition-colors ${
                        formData.password.length >= 8 ? 'text-green-600' : 'text-neutral-light'
                      }`}>
                        <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          formData.password.length >= 8 
                            ? 'bg-green-600 border-green-600' 
                            : 'border-neutral-light bg-transparent'
                        }`}>
                          {formData.password.length >= 8 && (
                            <span className="text-white text-[10px] font-bold">✓</span>
                          )}
                        </span>
                        <span>At least 8 characters</span>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-xs transition-colors ${
                        /[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-neutral-light'
                      }`}>
                        <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          /[A-Z]/.test(formData.password)
                            ? 'bg-green-600 border-green-600' 
                            : 'border-neutral-light bg-transparent'
                        }`}>
                          {/[A-Z]/.test(formData.password) && (
                            <span className="text-white text-[10px] font-bold">✓</span>
                          )}
                        </span>
                        <span>One capital letter (A-Z)</span>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-xs transition-colors ${
                        /[a-z]/.test(formData.password) ? 'text-green-600' : 'text-neutral-light'
                      }`}>
                        <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          /[a-z]/.test(formData.password)
                            ? 'bg-green-600 border-green-600' 
                            : 'border-neutral-light bg-transparent'
                        }`}>
                          {/[a-z]/.test(formData.password) && (
                            <span className="text-white text-[10px] font-bold">✓</span>
                          )}
                        </span>
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-xs transition-colors ${
                        /[0-9]/.test(formData.password) ? 'text-green-600' : 'text-neutral-light'
                      }`}>
                        <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          /[0-9]/.test(formData.password)
                            ? 'bg-green-600 border-green-600' 
                            : 'border-neutral-light bg-transparent'
                        }`}>
                          {/[0-9]/.test(formData.password) && (
                            <span className="text-white text-[10px] font-bold">✓</span>
                          )}
                        </span>
                        <span>One number (0-9)</span>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-xs transition-colors ${
                        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-600' : 'text-neutral-light'
                      }`}>
                        <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)
                            ? 'bg-green-600 border-green-600' 
                            : 'border-neutral-light bg-transparent'
                        }`}>
                          {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) && (
                            <span className="text-white text-[10px] font-bold">✓</span>
                          )}
                        </span>
                        <span>One special character (!@#$%^&*)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value })
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: '' })
                    }
                  }}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  aria-required="true"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-[38px] text-neutral-light hover:text-neutral transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
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
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={(e) => {
                  setFormData({ ...formData, agreeToTerms: e.target.checked })
                  if (errors.agreeToTerms) {
                    setErrors({ ...errors, agreeToTerms: '' })
                  }
                }}
                className="mt-0.5 w-4 h-4 rounded border-neutral-light/30 bg-background-surface text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors cursor-pointer"
                aria-required="true"
              />
              <span className="text-sm text-neutral-dark leading-relaxed">
                I agree to the{' '}
                <Link 
                  href="/terms" 
                  className="text-primary hover:underline font-medium transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms & Privacy Policy
                </Link>
              </span>
            </label>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-500 ml-7">{errors.agreeToTerms}</p>
            )}
          </div>

          {errors.submit && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 text-base font-medium"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-light/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-neutral-dark">
                Already have an account?
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-neutral-dark">
            <Link 
              href="/auth/login" 
              className="text-primary hover:underline font-medium transition-colors"
            >
              Login to your account
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














