'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Lock, Check, X, Loader2, Eye, EyeOff } from 'lucide-react'

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token') || ''

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // Password strength validation
    const [passwordStrength, setPasswordStrength] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
    })

    useEffect(() => {
        if (!token) {
            router.push('/forgot-password')
        }
    }, [token, router])

    useEffect(() => {
        setPasswordStrength({
            length: newPassword.length >= 8,
            uppercase: /[A-Z]/.test(newPassword),
            lowercase: /[a-z]/.test(newPassword),
            number: /[0-9]/.test(newPassword),
        })
    }, [newPassword])

    const isPasswordValid = Object.values(passwordStrength).every(Boolean)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!isPasswordValid) {
            setError('Please meet all password requirements')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setIsLoading(true)

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const response = await fetch(`${apiBaseUrl}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword, confirmPassword }),
            })

            const result = await response.json()

            if (result.success) {
                setSuccess(true)
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/login')
                }, 3000)
            } else {
                setError(result.message || 'Failed to reset password')
            }
        } catch (error) {
            console.error('Error:', error)
            setError('An error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-background flex items-center justify-center p-4">
                <Card className="p-8 max-w-md w-full">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral mb-2">Password Reset Successful!</h2>
                        <p className="text-neutral-light mb-6">
                            Your password has been reset successfully. You can now login with your new password.
                        </p>
                        <p className="text-sm text-neutral-light">
                            Redirecting to login page...
                        </p>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral mb-2">Reset Password</h1>
                        <p className="text-neutral-light text-sm">
                            Create a new strong password for your account
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-neutral mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    className="w-full px-4 py-3 pr-12 rounded-lg border border-neutral-light/20 bg-background-surface text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-light hover:text-neutral"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Password Requirements */}
                            <div className="mt-3 space-y-1">
                                <p className="text-xs font-semibold text-neutral-light mb-2">Password must have:</p>
                                <div className="space-y-1">
                                    <PasswordRequirement met={passwordStrength.length}>
                                        At least 8 characters
                                    </PasswordRequirement>
                                    <PasswordRequirement met={passwordStrength.uppercase}>
                                        One uppercase letter
                                    </PasswordRequirement>
                                    <PasswordRequirement met={passwordStrength.lowercase}>
                                        One lowercase letter
                                    </PasswordRequirement>
                                    <PasswordRequirement met={passwordStrength.number}>
                                        One number
                                    </PasswordRequirement>
                                </div>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-neutral mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                    className="w-full px-4 py-3 pr-12 rounded-lg border border-neutral-light/20 bg-background-surface text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-light hover:text-neutral"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {confirmPassword && (
                                <p className={`text-xs mt-2 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !isPasswordValid || newPassword !== confirmPassword}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Resetting Password...</span>
                                </>
                            ) : (
                                <span>Reset Password</span>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <Link href="/login" className="text-sm text-primary hover:underline font-medium">
                            Back to Login
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    )
}

// Helper component for password requirements
function PasswordRequirement({ met, children }: { met: boolean; children: React.ReactNode }) {
    return (
        <div className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-neutral-light'}`}>
            {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            <span>{children}</span>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}
