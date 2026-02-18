'use client'

import React, { useState, useEffect } from 'react'
import { DepartmentTPCLayout } from '@/components/layouts/DepartmentTPCLayout'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Award, Search, Download, Calendar, User, Eye, X } from 'lucide-react'
import { getAuthHeader } from '@/utils/auth'
import Image from 'next/image'

export default function DeptTPCCertificatesPage() {
    const [loading, setLoading] = useState(true)
    const [certificates, setCertificates] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [previewCert, setPreviewCert] = useState<any>(null)

    useEffect(() => {
        fetchCertificates()
    }, [])

    const fetchCertificates = async () => {
        try {
            setLoading(true)
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) return

            const response = await fetch(`${apiBaseUrl}/dept-tpc/certificates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({})
            })

            if (response.ok) {
                const res = await response.json()
                if (res.success) {
                    setCertificates(res.data)
                }
            }
        } catch (error) {
            console.error('Failed to fetch certificates:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredCertificates = certificates.filter(cert =>
        cert.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.student_email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <DepartmentTPCLayout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-neutral">Issued Certificates</h1>
                        <p className="text-neutral-light mt-1">
                            View students who have completed the 8-week training program and earned their certificate.
                        </p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {loading ? (
                    <Card className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </Card>
                ) : filteredCertificates.length === 0 ? (
                    <Card className="p-12 text-center">
                        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Award className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral">No Certificates Issued Yet</h3>
                        <p className="text-neutral-light mt-2">
                            {searchQuery ? 'No matching students found.' : 'Students will appear here once they complete all 8 weeks.'}
                        </p>
                    </Card>
                ) : (
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-neutral-50 border-b border-neutral-100">
                                        <th className="px-6 py-4 font-semibold text-neutral text-sm">Student</th>
                                        <th className="px-6 py-4 font-semibold text-neutral text-sm">Issued Date</th>
                                        <th className="px-6 py-4 font-semibold text-neutral text-sm">Certificate ID</th>
                                        <th className="px-6 py-4 font-semibold text-neutral text-sm text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {filteredCertificates.map((cert) => (
                                        <tr key={cert._id} className="hover:bg-neutral-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {cert.student_name?.[0] || 'S'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-neutral">{cert.student_name}</p>
                                                        <p className="text-xs text-neutral-light">{cert.student_email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-neutral-light text-sm">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(cert.issued_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <code className="text-xs bg-neutral-100 px-2 py-1 rounded text-neutral-600">
                                                    {cert._id?.substring(0, 8).toUpperCase()}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setPreviewCert(cert)}
                                                    className="hover:text-primary hover:bg-primary/5"
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Certificate Preview Modal */}
                {previewCert && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden relative animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b flex items-center justify-between">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Award className="w-5 h-5 text-primary" />
                                    Certificate Preview
                                </h3>
                                <Button variant="ghost" size="sm" onClick={() => setPreviewCert(null)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="p-8 bg-neutral-100 flex justify-center">
                                <div className="relative w-full aspect-[1.414] shadow-lg rounded-lg overflow-hidden bg-white pointer-events-none select-none">
                                    <Image
                                        src={previewCert.cloudinary_url}
                                        alt="Certificate"
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-white border-t flex justify-end">
                                <Button onClick={() => setPreviewCert(null)}>Close</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DepartmentTPCLayout>
    )
}
