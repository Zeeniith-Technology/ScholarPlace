'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader, clearAuth } from '@/utils/auth'
import {
    ArrowLeft,
    Loader2,
    Search,
    RefreshCw,
    Trash2,
    Mail,
    CheckCircle,
    Eye,
    MessageSquare
} from 'lucide-react'

interface ContactInquiry {
    _id: string
    name: string
    email: string
    subject: string
    message: string
    status: 'new' | 'read' | 'replied'
    created_at: string
}

export default function ContactInquiriesPage() {
    const router = useRouter()
    const { toast, showToast, hideToast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [inquiries, setInquiries] = useState<ContactInquiry[]>([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null)
    const [isMessageExpanded, setIsMessageExpanded] = useState(false)

    // Reset expansion when inquiry changes
    useEffect(() => {
        setIsMessageExpanded(false)
    }, [selectedInquiry])

    // Fetch inquiries on mount
    useEffect(() => {
        fetchInquiries()
    }, [])

    const fetchInquiries = async () => {
        try {
            setIsLoading(true)
            const authHeader = getAuthHeader()
            if (!authHeader) {
                router.push('/superadmin/login')
                return
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/contact/all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({ status: statusFilter !== 'all' ? statusFilter : undefined })
            })

            const data = await response.json()

            if (data.success) {
                setInquiries(data.data.inquiries || [])
            } else {
                showToast(data.message || 'Failed to fetch inquiries', 'error')
            }
        } catch (error) {
            console.error('Error fetching inquiries:', error)
            showToast('failed to connect to server', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const authHeader = getAuthHeader()
            if (!authHeader) return

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/contact/update-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({ id, status: newStatus })
            })

            const data = await response.json()

            if (data.success) {
                showToast('Status updated successfully', 'success')
                fetchInquiries() // Refresh list
                if (selectedInquiry && selectedInquiry._id === id) {
                    setSelectedInquiry({ ...selectedInquiry, status: newStatus as any })
                }
            } else {
                showToast(data.message || 'Failed to update status', 'error')
            }
        } catch (error) {
            showToast('Error updating status', 'error')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this inquiry? This action cannot be undone.')) return

        try {
            const authHeader = getAuthHeader()
            if (!authHeader) return

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/contact/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({ id })
            })

            const data = await response.json()

            if (data.success) {
                showToast('Inquiry deleted successfully', 'success')
                fetchInquiries() // Refresh list
                if (selectedInquiry && selectedInquiry._id === id) {
                    setSelectedInquiry(null)
                }
            } else {
                showToast(data.message || 'Failed to delete inquiry', 'error')
            }
        } catch (error) {
            showToast('Error deleting inquiry', 'error')
        }
    }

    const filteredInquiries = inquiries.filter(inquiry => {
        if (statusFilter !== 'all' && inquiry.status !== statusFilter) return false
        if (search && !inquiry.name.toLowerCase().includes(search.toLowerCase()) &&
            !inquiry.email.toLowerCase().includes(search.toLowerCase()) &&
            !inquiry.subject.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    return (
        <div className="min-h-screen bg-background-surface p-8">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={hideToast}
                />
            )}

            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.back()} className="p-2">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold font-heading text-neutral">Contact Inquiries</h1>
                            <p className="text-neutral-light">Manage messages from the contact form</p>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={fetchInquiries} disabled={isLoading} className="border border-neutral-light/20">
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* List Column */}
                    <div className="lg:col-span-1 space-y-4">
                        <Card className="p-4 sticky top-4 max-h-[calc(100vh-8rem)] flex flex-col">
                            <div className="mb-4 space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" />
                                    <input
                                        type="text"
                                        placeholder="Search inquiries..."
                                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-light/20 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 text-sm overflow-x-auto pb-2">
                                    {['all', 'new', 'read', 'replied'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setStatusFilter(status)}
                                            className={`px-3 py-1 rounded-full capitalize whitespace-nowrap transition-colors ${statusFilter === status
                                                ? 'bg-primary text-white'
                                                : 'bg-neutral-light/10 text-neutral hover:bg-neutral-light/20'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {filteredInquiries.length === 0 ? (
                                    <div className="text-center py-8 text-neutral-light">
                                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>No inquiries found</p>
                                    </div>
                                ) : (
                                    filteredInquiries.map(inquiry => (
                                        <div
                                            key={inquiry._id}
                                            onClick={() => setSelectedInquiry(inquiry)}
                                            className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedInquiry?._id === inquiry._id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-transparent hover:bg-neutral-light/5'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className={`font-semibold truncate ${inquiry.status === 'new' ? 'text-neutral' : 'text-neutral-dark'}`}>
                                                    {inquiry.name}
                                                </h3>
                                                <span className="text-xs text-neutral-light whitespace-nowrap">
                                                    {new Date(inquiry.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-neutral-dark truncate mb-1">
                                                {inquiry.subject}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <Badge variant={
                                                    inquiry.status === 'new' ? 'default' :
                                                        inquiry.status === 'replied' ? 'success' : 'secondary'
                                                } className="text-[10px] py-0 px-2 h-5">
                                                    {inquiry.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Detail View */}
                    <div className="lg:col-span-2">
                        {selectedInquiry ? (
                            <Card className="p-6 md:p-8 animate-fade-in">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-2xl font-bold text-neutral">{selectedInquiry.subject}</h2>
                                            <Badge variant={
                                                selectedInquiry.status === 'new' ? 'default' :
                                                    selectedInquiry.status === 'replied' ? 'success' : 'secondary'
                                            }>
                                                {selectedInquiry.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-neutral-dark">
                                            <Mail className="w-4 h-4" />
                                            <span className="font-medium">{selectedInquiry.email}</span>
                                            <span className="text-neutral-light">•</span>
                                            <span className="text-sm text-neutral-light">
                                                {new Date(selectedInquiry.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedInquiry.status === 'new' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="border border-neutral-light/20"
                                                onClick={() => handleStatusUpdate(selectedInquiry._id, 'read')}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Mark Read
                                            </Button>
                                        )}
                                        {selectedInquiry.status !== 'replied' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => {
                                                    window.location.href = `mailto:${selectedInquiry.email}?subject=Re: ${selectedInquiry.subject}`;
                                                    handleStatusUpdate(selectedInquiry._id, 'replied');
                                                }}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Reply via Email
                                            </Button>
                                        )}
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-100"
                                            onClick={() => handleDelete(selectedInquiry._id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="prose max-w-none">
                                    <div className={`bg-neutral-light/5 p-6 rounded-xl border border-neutral-light/10 text-neutral whitespace-pre-wrap transition-all duration-300 ${!isMessageExpanded ? 'max-h-[200px] overflow-hidden relative' : ''}`}>
                                        {selectedInquiry.message}
                                        {!isMessageExpanded && selectedInquiry.message.length > 300 && (
                                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background-surface to-transparent" />
                                        )}
                                    </div>
                                    {selectedInquiry.message.length > 300 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsMessageExpanded(!isMessageExpanded)}
                                            className="mt-2 text-primary hover:text-primary-dark w-full"
                                        >
                                            {isMessageExpanded ? 'Show Less' : 'Show More'}
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ) : (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-neutral-light bg-neutral-light/5 rounded-2xl border-2 border-dashed border-neutral-light/20">
                                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                                <p className="text-lg">Select an inquiry to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
