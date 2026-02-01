'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Shield, ArrowLeft, Loader2, RefreshCw } from 'lucide-react'

function VerifyOTPContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''

    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [canResend, setCanResend] = useState(false)
    const [countdown, setCountdown] = useState(60)

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        } else {
            setCanResend(true)
        }
    }, [countdown])

    // Auto-focus first input
    useEffect(() => {
        document.getElementById('otp-0')?.focus()
    }, [])

    const handleOTPChange = (index: number, value: string) => {
        // Only allow numbers
        if (!/^\d*$/.test(value)) return

        const newOtp = [...otp]
        newOtp[index] = value.slice(-1) // Only take last digit

        setOtp(newOtp)

        // Auto-focus next input
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus()
        }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        // Handle backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus()
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6)
        setOtp(newOtp)

        // Focus last filled input
        const lastIndex = Math.min(pastedData.length, 5)
        document.getElementById(`otp-${lastIndex}`)?.focus()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const otpValue = otp.join('')

        if (otpValue.length !== 6) {
            setError('Please enter the complete 6-digit OTP')
            return
        }

        setError('')
        setIsLoading(true)

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const response = await fetch(`${apiBaseUrl}/auth/verify-reset-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp: otpValue }),
            })

            const result = await response.json()

            if (result.success && result.data?.token) {
                // Redirect to reset password page with token
                router.push(`/reset-password?token=${result.data.token}`)
            } else {
                setError(result.message || 'Invalid OTP. Please try again.')
                setOtp(['', '', '', '', '', ''])
                document.getElementById('otp-0')?.focus()
            }
        } catch (error) {
            console.error('Error:', error)
            setError('An error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleResend = async () => {
        if (!canResend) return

        setError('')
        setIsLoading(true)

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const response = await fetch(`${apiBaseUrl}/auth/resend-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            })

            const result = await response.json()

            if (result.success) {
                setCanResend(false)
                setCountdown(60)
                setOtp(['', '', '', '', '', ''])
                document.getElementById('otp-0')?.focus()
            } else {
                setError(result.message || 'Failed to resend OTP')
            }
        } catch (error) {
            console.error('Error:', error)
            setError('Failed to resend OTP. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Back Button */}
                <Link
                    href="/forgot-password"
                    className="flex items-center gap-2 text-neutral-light hover:text-primary transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back</span>
                </Link>

                <Card className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral mb-2">Verify OTP</h1>
                        <p className="text-neutral-light text-sm">
                            Enter the 6-digit code sent to
                        </p>
                        <p className="text-primary font-medium text-sm mt-1">{email}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* OTP Input */}
                        <div>
                            <div className="flex gap-2 justify-center">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOTPChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 border-neutral-light/20 bg-background-surface text-neutral focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                ))}
                            </div>
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
                            disabled={isLoading || otp.join('').length !== 6}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <span>Verify OTP</span>
                            )}
                        </button>

                        {/* Resend OTP */}
                        <div className="text-center">
                            <p className="text-sm text-neutral-light mb-2">
                                Didn&apos;t receive the code?
                            </p>
                            {canResend ? (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={isLoading}
                                    className="text-primary hover:underline font-medium text-sm flex items-center gap-2 mx-auto"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Resend OTP
                                </button>
                            ) : (
                                <p className="text-sm text-neutral-light">
                                    Resend OTP in <span className="font-semibold text-primary">{countdown}s</span>
                                </p>
                            )}
                        </div>
                    </form>

                    {/* Expiration Notice */}
                    <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800 text-center">
                            ⏱️ This OTP will expire in 15 minutes
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    )
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <VerifyOTPContent />
        </Suspense>
    )
}
