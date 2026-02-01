
'use client'

import React, { useState, useEffect } from 'react'
import { DepartmentTPCLayout } from '@/components/layouts/DepartmentTPCLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getAuthHeader } from '@/utils/auth'
import {
    Users,
    TrendingUp,
    Clock,
    Award,
    Search,
    Filter,
    Calendar,
    Eye,
    Loader2,
    Code,
    X,
    ChevronRight,
    ChevronDown, // Added ChevronDown for accordion
    Terminal,
    FileText
} from 'lucide-react'

// --- Types ---
interface StudentCodingStats {
    _id: string
    name: string
    email: string
    totalSolved: number
    totalAttempts: number
    accuracy: number
    lastActive: string | null
}

interface CodingSubmissionDetail {
    submission_id: string
    problem_id: string
    title: string
    week: number
    day: number
    statement: any // Can be string or structured object
    example: string
    submitted_at: string
    language: string
    code: string
}

// --- Components ---

function StudentDetailsModal({
    student,
    onClose
}: {
    student: StudentCodingStats | null,
    onClose: () => void
}) {
    const [details, setDetails] = useState<CodingSubmissionDetail[]>([])
    const [selectedProblem, setSelectedProblem] = useState<CodingSubmissionDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (student) {
            fetchDetails(student._id)
        }
    }, [student])

    const fetchDetails = async (studentId: string) => {
        try {
            setIsLoading(true)
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            const response = await fetch(`${apiBaseUrl}/tpc/coding/student-details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || '',
                },
                body: JSON.stringify({ studentId })
            })

            const result = await response.json()
            if (result.success && result.data) {
                setDetails(result.data)
                if (result.data.length > 0) {
                    setSelectedProblem(result.data[0])
                }
            }
        } catch (error) {
            console.error("Error fetching details", error)
        } finally {
            setIsLoading(false)
        }
    }

    if (!student) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-neutral-50">
                    <div>
                        <h2 className="text-xl font-bold text-neutral">{student.name}</h2>
                        <p className="text-sm text-neutral-light">Solved Problems: {details.length}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition">
                        <X className="w-5 h-5 text-neutral" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : details.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-light p-10">
                            <Code className="w-12 h-12 mb-4 opacity-50" />
                            <p>No solved problems found.</p>
                        </div>
                    ) : (
                        <>
                            {/* Sidebar: Problem List (Hierarchical) */}
                            <div className="w-1/3 border-r overflow-y-auto bg-neutral-50/50">
                                {Object.entries(
                                    details.reduce((acc, item) => {
                                        const weekKey = `Week ${item.week}`
                                        if (!acc[weekKey]) acc[weekKey] = {}
                                        const dayKey = `Day ${item.day}`
                                        if (!acc[weekKey][dayKey]) acc[weekKey][dayKey] = []
                                        acc[weekKey][dayKey].push(item)
                                        return acc
                                    }, {} as Record<string, Record<string, CodingSubmissionDetail[]>>)
                                ).sort((a, b) => parseInt(a[0].split(' ')[1]) - parseInt(b[0].split(' ')[1])) // Sort Weeks
                                    .map(([weekName, days]) => (
                                        <div key={weekName} className="border-b border-neutral-200/50">
                                            <details className="group/week" open>
                                                <summary className="p-3 bg-white hover:bg-neutral-50 cursor-pointer list-none flex items-center justify-between font-semibold text-neutral-800 text-sm">
                                                    {weekName}
                                                    <ChevronDown className="w-4 h-4 text-neutral-400 group-open/week:rotate-180 transition-transform" />
                                                </summary>
                                                <div className="bg-neutral-50/30">
                                                    {Object.entries(days)
                                                        .sort((a, b) => parseInt(a[0].split(' ')[1]) - parseInt(b[0].split(' ')[1])) // Sort Days
                                                        .map(([dayName, problems]) => (
                                                            <div key={dayName}>
                                                                <details className="group/day" open>
                                                                    <summary className="px-4 py-2 hover:bg-neutral-100/50 cursor-pointer list-none flex items-center gap-2 text-sm text-neutral-600 font-medium">
                                                                        <ChevronRight className="w-3 h-3 text-neutral-400 group-open/day:rotate-90 transition-transform" />
                                                                        {dayName}
                                                                        <span className="text-xs text-neutral-400 font-normal">({problems.length})</span>
                                                                    </summary>
                                                                    <div className="pl-4">
                                                                        {problems.map((item) => (
                                                                            <button
                                                                                key={item.submission_id}
                                                                                onClick={() => setSelectedProblem(item)}
                                                                                className={`w-full text-left pl-6 pr-4 py-2 text-xs border-l-2 transition-colors flex items-center justify-between group/item ${selectedProblem?.submission_id === item.submission_id
                                                                                    ? 'border-primary bg-primary/5 text-primary font-medium'
                                                                                    : 'border-transparent hover:text-neutral-900 text-neutral-500'
                                                                                    }`}
                                                                            >
                                                                                <span className="truncate">{item.title}</span>
                                                                                {selectedProblem?.submission_id === item.submission_id && (
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                                )}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </details>
                                                            </div>
                                                        ))}
                                                </div>
                                            </details>
                                        </div>
                                    ))}
                            </div>

                            {/* Main: Details */}
                            <div className="w-2/3 flex flex-col overflow-hidden bg-white">
                                {selectedProblem ? (
                                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                        {/* Problem Statement */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
                                                <FileText className="w-4 h-4" />
                                                <h3>Problem Statement</h3>
                                            </div>
                                            <div className="bg-neutral-50 p-4 rounded-lg border text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                                                {typeof selectedProblem.statement === 'object' ? (
                                                    <div className="space-y-4">
                                                        {selectedProblem.statement.description && (
                                                            <div>
                                                                <strong className="block mb-1 text-neutral-900">Description:</strong>
                                                                {selectedProblem.statement.description}
                                                            </div>
                                                        )}
                                                        {selectedProblem.statement.input_format && (
                                                            <div>
                                                                <strong className="block mb-1 text-neutral-900">Input Format:</strong>
                                                                {selectedProblem.statement.input_format}
                                                            </div>
                                                        )}
                                                        {selectedProblem.statement.output_format && (
                                                            <div>
                                                                <strong className="block mb-1 text-neutral-900">Output Format:</strong>
                                                                {selectedProblem.statement.output_format}
                                                            </div>
                                                        )}
                                                        {selectedProblem.statement.constraints && (
                                                            <div>
                                                                <strong className="block mb-1 text-neutral-900">Constraints:</strong>
                                                                {selectedProblem.statement.constraints}
                                                            </div>
                                                        )}
                                                        {selectedProblem.statement.example && (
                                                            <div>
                                                                <strong className="block mb-1 text-neutral-900">Example:</strong>
                                                                <pre className="bg-neutral-100 p-2 rounded text-xs">{JSON.stringify(selectedProblem.statement.example, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    selectedProblem.statement || "No statement available."
                                                )}
                                            </div>
                                        </div>

                                        {/* Code Solution */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-primary font-semibold">
                                                    <Terminal className="w-4 h-4" />
                                                    <h3>Submitted Code</h3>
                                                </div>
                                                <Badge variant="secondary" className="uppercase text-xs">{selectedProblem.language}</Badge>
                                            </div>
                                            <div className="bg-[#1e1e1e] text-white p-4 rounded-lg overflow-x-auto shadow-inner">
                                                <pre className="text-xs font-mono">
                                                    <code>{selectedProblem.code}</code>
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-neutral-light">
                                        Select a problem to view details
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function DeptTPCCodingMonitoringPage() {
    const [students, setStudents] = useState<StudentCodingStats[]>([])
    const [filteredStudents, setFilteredStudents] = useState<StudentCodingStats[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState<StudentCodingStats | null>(null)

    // Summary Stats
    const [summary, setSummary] = useState({
        totalStudents: 0,
        activeStudents: 0,
        totalSolved: 0
    })

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [timeRange, setTimeRange] = useState<'all' | 'week' | 'today'>('all')

    useEffect(() => {
        fetchCodingStats()
    }, [timeRange])

    useEffect(() => {
        filterData()
    }, [searchQuery, students])

    const fetchCodingStats = async () => {
        try {
            setIsLoading(true)
            setError('')

            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) {
                setError('Authentication required')
                return
            }

            const response = await fetch(`${apiBaseUrl}/tpc/coding/stats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                },
                body: JSON.stringify({
                    timeRange: timeRange
                })
            })

            const result = await response.json()

            if (result.success && result.data) {
                setStudents(result.data.students || [])
                setSummary(result.data.summary || { totalStudents: 0, activeStudents: 0, totalSolved: 0 })
            } else {
                setError(result.message || 'Failed to load coding stats')
            }
        } catch (error) {
            console.error('Error fetching coding stats:', error)
            setError('Failed to load coding stats')
        } finally {
            setIsLoading(false)
        }
    }

    const filterData = () => {
        let filtered = [...students]

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(query) ||
                s.email.toLowerCase().includes(query)
            )
        }
        setFilteredStudents(filtered)
    }

    return (
        <DepartmentTPCLayout>
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-neutral mb-2">Coding Monitoring</h1>
                        <p className="text-neutral-light">Track department daily coding problem progress</p>
                    </div>

                    {/* Analytics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">


                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-neutral-light mb-1">Active Students</p>
                                    <p className="text-2xl font-bold text-neutral">{summary.activeStudents} <span className="text-sm text-neutral-light font-normal">/ {summary.totalStudents}</span></p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-neutral-light mb-1">Avg Accuracy</p>
                                    <p className="text-2xl font-bold text-neutral">
                                        {students.length > 0
                                            ? Math.round(students.reduce((acc, s) => acc + s.accuracy, 0) / students.length)
                                            : 0}%
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card className="p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-neutral mb-2">Search Student</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-light" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name or email..."
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-light/20 bg-background-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral mb-2">Time Range</label>
                                <select
                                    value={timeRange}
                                    onChange={(e) => setTimeRange(e.target.value as any)}
                                    className="w-full px-4 py-2 rounded-lg border border-neutral-light/20 bg-background-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="all">All Time</option>
                                    <option value="week">Past 7 Days</option>
                                    <option value="today">Today</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Student List */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-neutral mb-4">Student Performance</h2>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-red-600">{error}</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-neutral-light">No students found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-light/20">
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Student</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Problems Solved</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Accuracy</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Last Active</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map((student) => (
                                            <tr
                                                key={student._id}
                                                className="border-b border-neutral-light/10 hover:bg-background-elevated transition-colors cursor-pointer group"
                                                onClick={() => setSelectedStudent(student)}
                                            >
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <p className="font-medium text-neutral group-hover:text-primary transition-colors">{student.name}</p>
                                                        <p className="text-sm text-neutral-light">{student.email}</p>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-neutral">{student.totalSolved}</span>
                                                        <span className="text-sm text-neutral-light">problems</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="w-full max-w-[100px] bg-neutral-light/20 rounded-full h-2 mb-1">
                                                        <div
                                                            className="bg-primary h-2 rounded-full"
                                                            style={{ width: `${student.accuracy}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-neutral-light">{student.accuracy}% Success Rate</span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-neutral flex items-center justify-between">
                                                    <span>{student.lastActive ? new Date(student.lastActive).toLocaleDateString() : 'Never'}</span>
                                                    <ChevronRight className="w-4 h-4 text-neutral-light opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Drill-down Modal */}
                    {selectedStudent && (
                        <StudentDetailsModal
                            student={selectedStudent}
                            onClose={() => setSelectedStudent(null)}
                        />
                    )}
                </div>
            </div>
        </DepartmentTPCLayout>
    )
}
