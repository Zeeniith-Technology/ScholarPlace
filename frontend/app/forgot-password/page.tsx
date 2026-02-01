'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const response = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            })

            const result = await response.json()

            if (result.success) {
                setSuccess(true)
                // Redirect to OTP verification page after 2 seconds
                setTimeout(() => {
                    router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
                }, 2000)
            } else {
                setError(result.message || 'Failed to send reset email')
            }
        } catch (error) {
            console.error('Error:', error)
            setError('An error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Back to Login */}
                <Link
                    href="/auth/login"
                    className="flex items-center gap-2 text-neutral-light hover:text-primary transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back to Login</span>
                </Link>

                <Card className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral mb-2">Forgot Password?</h1>
                        <p className="text-neutral-light text-sm">
                            No worries! Enter your email and we&apos;ll send you an OTP to reset your password.
                        </p>
                    </div>

                    {success ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                            <div className="text-green-600 font-semibold mb-2">✓ OTP Sent Successfully!</div>
                            <p className="text-green-700 text-sm">
                                Please check your email for the verification code.
                            </p>
                            <p className="text-green-600 text-xs mt-2">Redirecting to verification page...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email Input */}
                            <div>
                                <label className="block text-sm font-medium text-neutral mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-neutral-light/20 bg-background-surface text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
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
                                disabled={isLoading}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Sending OTP...</span>
                                    </>
                                ) : (
                                    <span>Send OTP</span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-neutral-light">
                            Remember your password?{' '}
                            <Link href="/auth/login" className="text-primary hover:underline font-medium">
                                Login here
                            </Link>
                        </p>
                    </div>
                </Card>

                {/* Security Note */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-neutral-light">
                        🔒 Your security is our priority. The OTP will expire in 15 minutes.
                    </p>
                </div>
            </div>
        </div>
    )
}
