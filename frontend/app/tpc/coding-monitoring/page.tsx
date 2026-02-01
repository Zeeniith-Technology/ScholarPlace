
'use client'

import React, { useState, useEffect } from 'react'
import { TPCLayout } from '@/components/layouts/TPCLayout'
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
    Code
} from 'lucide-react'

interface StudentCodingStats {
    _id: string
    name: string
    email: string
    totalSolved: number
    totalAttempts: number
    accuracy: number
    lastActive: string | null
}

export default function TPCCodingMonitoringPage() {
    const [students, setStudents] = useState<StudentCodingStats[]>([])
    const [filteredStudents, setFilteredStudents] = useState<StudentCodingStats[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

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
        <TPCLayout>
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-neutral mb-2">Coding Monitoring</h1>
                        <p className="text-neutral-light">Track college-wide daily coding problem progress</p>
                    </div>

                    {/* Analytics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-neutral-light mb-1">Total Solved</p>
                                    <p className="text-2xl font-bold text-neutral">{summary.totalSolved}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <Code className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </Card>

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
                                            <tr key={student._id} className="border-b border-neutral-light/10 hover:bg-background-elevated transition-colors">
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <p className="font-medium text-neutral">{student.name}</p>
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
                                                <td className="py-3 px-4 text-sm text-neutral">
                                                    {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : 'Never'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </TPCLayout>
    )
}
