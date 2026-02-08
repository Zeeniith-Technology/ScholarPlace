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
    Filter,
    Search,
    Eye,
    Calendar,
    MessageSquare,
    XCircle,
    Timer,
    Pause,
    User,
    Mail,
    Shield,
    Save,
    Trash2,
    RefreshCw,
    BarChart3,
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
    reported_by: {
        name: string
        email: string
        role: string
    }
}

export default function SuperadminBugReportsPage() {
    const router = useRouter()
    const [reports, setReports] = useState<BugReport[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [selectedPriority, setSelectedPriority] = useState<string>('all')
    const [selectedRole, setSelectedRole] = useState<string>('all')
    const [selectedReport, setSelectedReport] = useState<BugReport | null>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)

    // Edit states
    const [editStatus, setEditStatus] = useState<string>('')
    const [editAdminNotes, setEditAdminNotes] = useState('')
    const [editNotABugReason, setEditNotABugReason] = useState('')

    const [pagination, setPagination] = useState({
        current_page: 1,
        total_pages: 1,
        total_count: 0,
    })

    const [stats, setStats] = useState({
        total: 0,
        new: 0,
        in_progress: 0,
        hold: 0,
        solved: 0,
        not_a_bug: 0,
        critical: 0,
    })

    useEffect(() => {
        fetchReports()
    }, [selectedStatus, selectedPriority, selectedRole, pagination.current_page])

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
                page: pagination.current_page,
                limit: 10,
            }

            if (selectedStatus !== 'all') {
                requestBody.status = selectedStatus
            }
            if (selectedPriority !== 'all') {
                requestBody.priority = selectedPriority
            }
            if (selectedRole !== 'all') {
                requestBody.role = selectedRole
            }

            const response = await fetch(`${apiBaseUrl}/bug-report/all`, {
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
                    setPagination(data.data.pagination)
                }

                // Calculate stats from all reports
                const allReports = data.data.reports || []
                setStats({
                    total: data.data.pagination?.total_count || 0,
                    new: allReports.filter((r: BugReport) => r.status === 'new').length,
                    in_progress: allReports.filter((r: BugReport) => r.status === 'in_progress').length,
                    hold: allReports.filter((r: BugReport) => r.status === 'hold').length,
                    solved: allReports.filter((r: BugReport) => r.status === 'solved').length,
                    not_a_bug: allReports.filter((r: BugReport) => r.status === 'not_a_bug').length,
                    critical: allReports.filter((r: BugReport) => r.priority === 'critical').length,
                })
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
                setEditStatus(data.data.status)
                setEditAdminNotes(data.data.admin_notes || '')
                setEditNotABugReason(data.data.not_a_bug_reason || '')
                setShowDetailModal(true)
            }
        } catch (error) {
            console.error('Failed to fetch report details:', error)
        }
    }

    const updateStatus = async () => {
        if (!selectedReport) return

        try {
            setIsUpdating(true)
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) return

            const updateData: any = {
                report_id: selectedReport._id,
                status: editStatus,
            }

            if (editAdminNotes.trim()) {
                updateData.admin_notes = editAdminNotes.trim()
            }

            if (editStatus === 'not_a_bug' && editNotABugReason.trim()) {
                updateData.not_a_bug_reason = editNotABugReason.trim()
            }

            const response = await fetch(`${apiBaseUrl}/bug-report/update-status`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                },
                body: JSON.stringify(updateData),
            })

            const data = await response.json()

            if (data.success) {
                // Refresh the reports list
                await fetchReports()
                setShowDetailModal(false)
                setSelectedReport(null)
            }
        } catch (error) {
            console.error('Failed to update bug report:', error)
        } finally {
            setIsUpdating(false)
        }
    }

    const deleteReport = async (reportId: string) => {
        if (!confirm('Are you sure you want to delete this bug report?')) return

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) return

            const response = await fetch(`${apiBaseUrl}/bug-report/delete`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                },
                body: JSON.stringify({ report_id: reportId }),
            })

            const data = await response.json()

            if (data.success) {
                await fetchReports()
                setShowDetailModal(false)
                setSelectedReport(null)
            }
        } catch (error) {
            console.error('Failed to delete bug report:', error)
        }
    }

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
            new: {
                color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
                icon: <Clock className="w-4 h-4" />,
                label: 'New',
            },
            in_progress: {
                color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
                icon: <Timer className="w-4 h-4" />,
                label: 'In Progress',
            },
            hold: {
                color: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
                icon: <Pause className="w-4 h-4" />,
                label: 'On Hold',
            },
            solved: {
                color: 'bg-green-500/20 text-green-500 border-green-500/30',
                icon: <CheckCircle2 className="w-4 h-4" />,
                label: 'Solved',
            },
            not_a_bug: {
                color: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
                icon: <XCircle className="w-4 h-4" />,
                label: 'Not a Bug',
            },
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

    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            student: 'bg-blue-500/20 text-blue-500',
            dept_tpc: 'bg-purple-500/20 text-purple-500',
            superadmin: 'bg-red-500/20 text-red-500',
        }

        return (
            <Badge className={`${colors[role] || colors.student} px-2 py-1 text-xs`}>
                {role === 'dept_tpc' ? 'Dept TPC' : role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
        )
    }

    const filteredReports = reports.filter(
        (report) =>
            report.page_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.bug_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.page_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.reported_by.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.reported_by.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-red-500/20">
                            <Bug className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-neutral">Bug Report Management</h1>
                            <p className="text-sm text-neutral-light">Monitor and manage all platform bug reports</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchReports()}
                        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Refresh
                    </button>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                    <Card className="p-4 border-2 border-blue-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">Total</p>
                                <p className="text-2xl font-bold text-neutral">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <Bug className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 border-2 border-blue-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">New</p>
                                <p className="text-2xl font-bold text-neutral">{stats.new}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 border-2 border-yellow-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">In Progress</p>
                                <p className="text-2xl font-bold text-neutral">{stats.in_progress}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                                <Timer className="w-6 h-6 text-yellow-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 border-2 border-orange-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">On Hold</p>
                                <p className="text-2xl font-bold text-neutral">{stats.hold}</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                <Pause className="w-6 h-6 text-orange-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 border-2 border-green-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">Solved</p>
                                <p className="text-2xl font-bold text-neutral">{stats.solved}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 border-2 border-gray-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">Not a Bug</p>
                                <p className="text-2xl font-bold text-neutral">{stats.not_a_bug}</p>
                            </div>
                            <div className="w-12 h-12 bg-gray-500/20 rounded-lg flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-gray-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 border-2 border-red-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-light">Critical</p>
                                <p className="text-2xl font-bold text-neutral">{stats.critical}</p>
                            </div>
                            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6 p-4 border-2 border-neutral-light/10">
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-light" />
                            <input
                                type="text"
                                placeholder="Search by page name, description, reporter..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50"
                            />
                        </div>

                        {/* Filter Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Status Filter */}
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-light" />
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => {
                                        setSelectedStatus(e.target.value)
                                        setPagination((prev) => ({ ...prev, current_page: 1 }))
                                    }}
                                    className="w-full pl-10 pr-8 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral focus:outline-none focus:border-accent/50 appearance-none cursor-pointer"
                                >
                                    <option value="all">All Status</option>
                                    <option value="new">New</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="hold">On Hold</option>
                                    <option value="solved">Solved</option>
                                    <option value="not_a_bug">Not a Bug</option>
                                </select>
                            </div>

                            {/* Priority Filter */}
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-light" />
                                <select
                                    value={selectedPriority}
                                    onChange={(e) => {
                                        setSelectedPriority(e.target.value)
                                        setPagination((prev) => ({ ...prev, current_page: 1 }))
                                    }}
                                    className="w-full pl-10 pr-8 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral focus:outline-none focus:border-accent/50 appearance-none cursor-pointer"
                                >
                                    <option value="all">All Priority</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>

                            {/* Role Filter */}
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-light" />
                                <select
                                    value={selectedRole}
                                    onChange={(e) => {
                                        setSelectedRole(e.target.value)
                                        setPagination((prev) => ({ ...prev, current_page: 1 }))
                                    }}
                                    className="w-full pl-10 pr-8 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral focus:outline-none focus:border-accent/50 appearance-none cursor-pointer"
                                >
                                    <option value="all">All Roles</option>
                                    <option value="student">Student</option>
                                    <option value="dept_tpc">Dept TPC</option>
                                    <option value="superadmin">Superadmin</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </Card>

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
                            {searchQuery ? 'No reports match your search' : 'No bug reports found'}
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredReports.map((report) => (
                            <Card
                                key={report._id}
                                className="p-4 border-2 border-neutral-light/10 hover:border-accent/30 transition-all cursor-pointer"
                                onClick={() => viewReport(report._id)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <h3 className="text-lg font-semibold text-neutral">{report.page_name}</h3>
                                            {getStatusBadge(report.status)}
                                            {getPriorityBadge(report.priority)}
                                            {getRoleBadge(report.reported_by.role)}
                                        </div>
                                        <p className="text-sm text-neutral-light mb-2">{report.page_url}</p>
                                        <p className="text-sm text-neutral-light line-clamp-2">{report.bug_description}</p>
                                    </div>
                                    <button className="ml-4 p-2 hover:bg-background-elevated rounded-lg transition-colors">
                                        <Eye className="w-5 h-5 text-neutral-light" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-neutral-light/10">
                                    <div className="flex items-center gap-4 text-xs text-neutral-light flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <User className="w-4 h-4" />
                                            {report.reported_by.name}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-4 h-4" />
                                            {report.reported_by.email}
                                        </div>
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
                                                Has Response
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
                            onClick={() =>
                                setPagination((prev) => ({ ...prev, current_page: Math.max(1, prev.current_page - 1) }))
                            }
                            disabled={pagination.current_page === 1}
                            className="px-4 py-2 bg-background-elevated text-neutral rounded-lg hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Previous
                        </button>
                        <span className="text-neutral-light">
                            Page {pagination.current_page} of {pagination.total_pages}
                        </span>
                        <button
                            onClick={() =>
                                setPagination((prev) => ({
                                    ...prev,
                                    current_page: Math.min(prev.total_pages, prev.current_page + 1),
                                }))
                            }
                            disabled={pagination.current_page === pagination.total_pages}
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
                    title="Bug Report Details & Management"
                >
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Status & Priority */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(selectedReport.status)}
                            {getPriorityBadge(selectedReport.priority)}
                            {getRoleBadge(selectedReport.reported_by.role)}
                        </div>

                        {/* Reporter Info */}
                        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="w-5 h-5 text-accent" />
                                <h4 className="text-sm font-semibold text-neutral">Reported By</h4>
                            </div>
                            <p className="text-sm text-neutral mb-1">{selectedReport.reported_by.name}</p>
                            <p className="text-xs text-neutral-light">{selectedReport.reported_by.email}</p>
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
                                <p className="text-sm text-neutral-light whitespace-pre-line">
                                    {selectedReport.how_to_reproduce}
                                </p>
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

                        {/* Admin Management Section */}
                        <div className="border-t border-neutral-light/20 pt-4">
                            <h4 className="text-sm font-semibold text-neutral mb-3">Admin Management</h4>

                            {/* Status Update */}
                            <div className="mb-3">
                                <label className="text-sm text-neutral-light mb-1 block">Update Status</label>
                                <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="w-full px-3 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral focus:outline-none focus:border-accent/50"
                                >
                                    <option value="new">New</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="hold">On Hold</option>
                                    <option value="solved">Solved</option>
                                    <option value="not_a_bug">Not a Bug</option>
                                </select>
                            </div>

                            {/* Admin Notes */}
                            <div className="mb-3">
                                <label className="text-sm text-neutral-light mb-1 block">Admin Notes</label>
                                <textarea
                                    value={editAdminNotes}
                                    onChange={(e) => setEditAdminNotes(e.target.value)}
                                    placeholder="Add notes for the reporter..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50 resize-none"
                                />
                            </div>

                            {/* Not a Bug Reason (conditional) */}
                            {editStatus === 'not_a_bug' && (
                                <div className="mb-3">
                                    <label className="text-sm text-neutral-light mb-1 block">Reason for "Not a Bug"</label>
                                    <textarea
                                        value={editNotABugReason}
                                        onChange={(e) => setEditNotABugReason(e.target.value)}
                                        placeholder="Explain why this is not a bug..."
                                        rows={3}
                                        className="w-full px-3 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50 resize-none"
                                    />
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={updateStatus}
                                    disabled={isUpdating}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUpdating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => deleteReport(selectedReport._id)}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg font-semibold transition-all flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>

                        {/* Existing Admin Response (if any) */}
                        {selectedReport.admin_notes && (
                            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="w-5 h-5 text-accent" />
                                    <h4 className="text-sm font-semibold text-neutral">Current Admin Response</h4>
                                </div>
                                <p className="text-sm text-neutral-light">{selectedReport.admin_notes}</p>
                            </div>
                        )}

                        {/* Existing Not a Bug Reason (if any) */}
                        {selectedReport.status === 'not_a_bug' && selectedReport.not_a_bug_reason && (
                            <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-5 h-5 text-gray-500" />
                                    <h4 className="text-sm font-semibold text-neutral">Current "Not a Bug" Reason</h4>
                                </div>
                                <p className="text-sm text-neutral-light">{selectedReport.not_a_bug_reason}</p>
                            </div>
                        )}

                        {/* Dates */}
                        <div className="text-xs text-neutral-light space-y-1 border-t border-neutral-light/10 pt-4">
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
