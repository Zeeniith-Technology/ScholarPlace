'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { getAuthHeader } from '@/utils/auth'
import {
    Bug,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    Image as ImageIcon,
    Video as VideoIcon,
    Plus,
    Filter,
    Search,
    Eye,
    Calendar,
    MessageSquare,
    XCircle,
    Timer,
    Pause,
    ArrowLeft,
} from 'lucide-react'

interface BugReport {
    _id: string
    page_url: string
    page_name: string
    bug_description: string
    how_to_reproduce?: string
    status: 'new' | 'in_progress' | 'hold' | 'solved' | 'not_a_bug'
    priority: 'low' | 'medium' | 'high' | 'critical'
    media_files: Array<{
        url: string
        resource_type: string
    }>
    admin_notes?: string
    not_a_bug_reason?: string
    created_at: string
    updated_at: string
    resolved_at?: string
}

export default function MyBugReportsPage() {
    const router = useRouter()
    const [reports, setReports] = useState<BugReport[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [selectedReport, setSelectedReport] = useState<BugReport | null>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState({
        total_pages: 1,
        total_count: 0,
    })

    useEffect(() => {
        fetchReports()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStatus, currentPage])

    const fetchReports = async () => {
        try {
            setIsLoading(true)
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) {
                console.error('No auth token found')
                return
            }

            const requestBody: any = {
                page: currentPage,
                limit: 10,
            }

            if (selectedStatus !== 'all') {
                requestBody.status = selectedStatus
            }

            const response = await fetch(`${apiBaseUrl}/bug-report/my-reports`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                },
                body: JSON.stringify(requestBody),
            })

            const data = await response.json()

            if (data.success && data.data) {
                setReports(data.data.reports || [])
                if (data.data.pagination) {
                    setPagination({
                        total_pages: data.data.pagination.total_pages,
                        total_count: data.data.pagination.total_count,
                    })
                }
            }
        } catch (error) {
            console.error('Failed to fetch bug reports:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const viewReport = async (reportId: string) => {
        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) return

            const response = await fetch(`${apiBaseUrl}/bug-report/view`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                },
                body: JSON.stringify({ report_id: reportId }),
            })

            const data = await response.json()

            if (data.success && data.data) {
                setSelectedReport(data.data)
                setShowDetailModal(true)
            }
        } catch (error) {
            console.error('Failed to fetch report details:', error)
        }
    }

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
            new: { color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', icon: <Clock className="w-4 h-4" />, label: 'New' },
            in_progress: { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: <Timer className="w-4 h-4" />, label: 'In Progress' },
            hold: { color: 'bg-orange-500/20 text-orange-500 border-orange-500/30', icon: <Pause className="w-4 h-4" />, label: 'On Hold' },
            solved: { color: 'bg-green-500/20 text-green-500 border-green-500/30', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Solved' },
            not_a_bug: { color: 'bg-gray-500/20 text-gray-500 border-gray-500/30', icon: <XCircle className="w-4 h-4" />, label: 'Not a Bug' },
        }

        const config = statusConfig[status] || statusConfig.new

        return (
            <Badge className={`${config.color} border flex items-center gap-1.5 px-2 py-1`}>
                {config.icon}
                <span>{config.label}</span>
            </Badge>
        )
    }

    const getPriorityBadge = (priority: string) => {
        const colors: Record<string, string> = {
            low: 'bg-green-500/20 text-green-500',
            medium: 'bg-yellow-500/20 text-yellow-500',
            high: 'bg-orange-500/20 text-orange-500',
            critical: 'bg-red-500/20 text-red-500',
        }

        return (
            <Badge className={`${colors[priority] || colors.medium} px-2 py-1 text-xs`}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Badge>
        )
    }

    const filteredReports = reports.filter(report =>
        report.page_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.bug_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.page_url.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dept-tpc/dashboard')}
                            className="p-2 mr-2 hover:bg-neutral-100/50 rounded-full transition-colors group"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="w-6 h-6 text-neutral/70 group-hover:text-primary transition-colors" />
                        </button>
                        <div className="p-3 rounded-lg bg-red-500/20">
                            <Bug className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-neutral">My Bug Reports</h1>
                            <p className="text-sm text-neutral-light">Track the status of your reported bugs</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/dept-tpc/bug-report')}
                        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Report New Bug
                    </button>
                </div>

                {/* Filters */}
                <Card className="mb-6 p-4 border-2 border-neutral-light/10">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-light" />
                            <input
                                type="text"
                                placeholder="Search by page name, description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-light" />
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="pl-10 pr-8 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral focus:outline-none focus:border-accent/50 appearance-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="new">New</option>
                                <option value="in_progress">In Progress</option>
                                <option value="hold">On Hold</option>
                                <option value="solved">Solved</option>
                                <option value="not_a_bug">Not a Bug</option>
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4 border-2 border-blue-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">Total Reports</p>
                                <p className="text-2xl font-bold text-neutral">{pagination.total_count}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <Bug className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 border-2 border-yellow-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">In Progress</p>
                                <p className="text-2xl font-bold text-neutral">
                                    {reports.filter(r => r.status === 'in_progress').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                                <Timer className="w-6 h-6 text-yellow-500" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 border-2 border-green-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">Solved</p>
                                <p className="text-2xl font-bold text-neutral">
                                    {reports.filter(r => r.status === 'solved').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 border-2 border-blue-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">Pending</p>
                                <p className="text-2xl font-bold text-neutral">
                                    {reports.filter(r => r.status === 'new').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Reports List */}
                {isLoading ? (
                    <Card className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
                        <p className="text-neutral-light">Loading reports...</p>
                    </Card>
                ) : filteredReports.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Bug className="w-16 h-16 text-neutral-light mx-auto mb-4 opacity-50" />
                        <p className="text-neutral-light mb-4">
                            {searchQuery ? 'No reports match your search' : 'No bug reports yet'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => router.push('/dept-tpc/bug-report')}
                                className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all"
                            >
                                Report Your First Bug
                            </button>
                        )}
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredReports.map(report => (
                            <Card
                                key={report._id}
                                className="p-4 border-2 border-neutral-light/10 hover:border-accent/30 transition-all cursor-pointer"
                                onClick={() => viewReport(report._id)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold text-neutral">{report.page_name}</h3>
                                            {getStatusBadge(report.status)}
                                            {getPriorityBadge(report.priority)}
                                        </div>
                                        <p className="text-sm text-neutral-light mb-2">{report.page_url}</p>
                                        <p className="text-sm text-neutral-light line-clamp-2">{report.bug_description}</p>
                                    </div>
                                    <button className="ml-4 p-2 hover:bg-background-elevated rounded-lg transition-colors">
                                        <Eye className="w-5 h-5 text-neutral-light" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-neutral-light/10">
                                    <div className="flex items-center gap-4 text-xs text-neutral-light">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(report.created_at).toLocaleDateString()}
                                        </div>
                                        {report.media_files && report.media_files.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                <ImageIcon className="w-4 h-4" />
                                                {report.media_files.length} file(s)
                                            </div>
                                        )}
                                        {report.admin_notes && (
                                            <div className="flex items-center gap-1">
                                                <MessageSquare className="w-4 h-4" />
                                                Admin Response
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-background-elevated text-neutral rounded-lg hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Previous
                        </button>
                        <span className="text-neutral-light">
                            Page {currentPage} of {pagination.total_pages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
                            disabled={currentPage === pagination.total_pages}
                            className="px-4 py-2 bg-background-elevated text-neutral rounded-lg hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedReport && (
                <Modal
                    isOpen={showDetailModal}
                    onClose={() => {
                        setShowDetailModal(false)
                        setSelectedReport(null)
                    }}
                    title="Bug Report Details"
                >
                    <div className="space-y-4">
                        {/* Status & Priority */}
                        <div className="flex items-center gap-2">
                            {getStatusBadge(selectedReport.status)}
                            {getPriorityBadge(selectedReport.priority)}
                        </div>

                        {/* Page Info */}
                        <div>
                            <h4 className="text-sm font-semibold text-neutral mb-1">Page</h4>
                            <p className="text-neutral">{selectedReport.page_name}</p>
                            <p className="text-xs text-neutral-light">{selectedReport.page_url}</p>
                        </div>

                        {/* Bug Description */}
                        <div>
                            <h4 className="text-sm font-semibold text-neutral mb-1">Description</h4>
                            <p className="text-sm text-neutral-light">{selectedReport.bug_description}</p>
                        </div>

                        {/* How to Reproduce */}
                        {selectedReport.how_to_reproduce && (
                            <div>
                                <h4 className="text-sm font-semibold text-neutral mb-1">How to Reproduce</h4>
                                <p className="text-sm text-neutral-light whitespace-pre-line">{selectedReport.how_to_reproduce}</p>
                            </div>
                        )}

                        {/* Media Files */}
                        {selectedReport.media_files && selectedReport.media_files.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-neutral mb-2">Attachments</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedReport.media_files.map((file, idx) => (
                                        <a
                                            key={idx}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block aspect-video bg-background-elevated rounded-lg overflow-hidden border border-neutral-light/20 hover:border-accent/50 transition-colors"
                                        >
                                            {file.resource_type === 'image' ? (
                                                <img src={file.url} alt="Attachment" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <VideoIcon className="w-8 h-8 text-neutral-light" />
                                                </div>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Admin Response */}
                        {selectedReport.admin_notes && (
                            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="w-5 h-5 text-accent" />
                                    <h4 className="text-sm font-semibold text-neutral">Admin Response</h4>
                                </div>
                                <p className="text-sm text-neutral-light">{selectedReport.admin_notes}</p>
                            </div>
                        )}

                        {/* Not a Bug Reason */}
                        {selectedReport.status === 'not_a_bug' && selectedReport.not_a_bug_reason && (
                            <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-5 h-5 text-gray-500" />
                                    <h4 className="text-sm font-semibold text-neutral">Reason for "Not a Bug"</h4>
                                </div>
                                <p className="text-sm text-neutral-light">{selectedReport.not_a_bug_reason}</p>
                            </div>
                        )}

                        {/* Dates */}
                        <div className="text-xs text-neutral-light space-y-1">
                            <p>Reported: {new Date(selectedReport.created_at).toLocaleString()}</p>
                            <p>Last Updated: {new Date(selectedReport.updated_at).toLocaleString()}</p>
                            {selectedReport.resolved_at && (
                                <p>Resolved: {new Date(selectedReport.resolved_at).toLocaleString()}</p>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
