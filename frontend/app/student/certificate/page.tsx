'use client'

import React, { useState, useEffect } from 'react'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Lock, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { getAuthHeader } from '@/utils/auth'

export default function StudentCertificatePage() {
    const [loading, setLoading] = useState(true)
    const [certificate, setCertificate] = useState<any>(null)
    const [progress, setProgress] = useState<any>(null)

    useEffect(() => {
        fetchCertificate()
    }, [])

    const fetchCertificate = async () => {
        try {
            setLoading(true)
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) {
                setLoading(false)
                return
            }

            const response = await fetch(`${apiBaseUrl}/student/certificate`, {
                method: 'POST', // Backend route is POST
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({})
            })

            if (response.ok) {
                const res = await response.json()
                if (res.success) {
                    if (res.data.earned) {
                        setCertificate(res.data.certificate)
                    } else {
                        setProgress(res.data)
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch certificate:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <StudentLayout>
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-heading font-bold text-neutral">My Certificate</h1>
                    <p className="text-neutral-light mt-1">Track your progress and view your completion certificate</p>
                </div>

                {loading ? (
                    <Card className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-neutral-light">Loading certificate status...</p>
                    </Card>
                ) : certificate ? (
                    <div className="space-y-6 animate-smooth-appear">
                        <Card className="p-1 bg-gradient-to-br from-yellow-500/10 to-blue-500/10 border-yellow-500/20 shadow-xl overflow-hidden relative group">
                            {/* Protection Layer */}
                            <div className="absolute inset-0 z-10 bg-transparent" onContextMenu={(e) => e.preventDefault()} />

                            <div className="relative aspect-[1.414] w-full bg-neutral-900 rounded-lg overflow-hidden select-none pointer-events-none">
                                <Image
                                    src={certificate.cloudinary_url}
                                    alt="Certificate"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        </Card>

                        <div className="flex justify-center gap-4">
                            <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-200">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium">Verified & Issued on {new Date(certificate.issued_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <p className="text-center text-neutral-light text-sm italic mt-4">
                            Note: This certificate is verified by ScholarPlace.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8 animate-smooth-appear">
                        <Card className="p-8 border-dashed border-2 bg-neutral-50/50 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                                <Lock className="w-10 h-10 text-neutral-400" />
                            </div>
                            <h2 className="text-xl font-bold text-neutral mb-2">Certificate Locked</h2>
                            <p className="text-neutral-light max-w-md mx-auto mb-6">
                                Complete all 8 weeks of the training program to unlock your certificate.
                                Keep going, you're doing great!
                            </p>

                            <div className="w-full max-w-2xl bg-white p-6 rounded-xl border shadow-sm">
                                <div className="flex justify-between text-sm font-medium mb-2">
                                    <span>Progress</span>
                                    <span>{progress?.completed_weeks?.length || 0} / 8 Weeks</span>
                                </div>
                                <div className="w-full bg-neutral-100 rounded-full h-3 mb-6 overflow-hidden">
                                    <div
                                        className="bg-primary h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${((progress?.completed_weeks?.length || 0) / 8) * 100}%` }}
                                    />
                                </div>

                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(week => {
                                        const isCompleted = progress?.completed_weeks?.includes(week)
                                        return (
                                            <div key={week} className={`flex flex-col items-center gap-2 p-2 rounded-lg border ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-neutral-50 border-neutral-100 opacity-60'}`}>
                                                <span className="text-xs font-semibold text-neutral-light">Week {week}</span>
                                                {isCompleted ? (
                                                    <CheckCircle className="w-5 h-5 text-green-500 text-opacity-100" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full border-2 border-neutral-200" />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </StudentLayout>
    )
}
