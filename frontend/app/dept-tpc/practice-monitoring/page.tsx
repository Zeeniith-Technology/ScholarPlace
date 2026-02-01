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
    Loader2
} from 'lucide-react'

interface PracticeTest {
    _id: string
    student_id: string
    student_name: string
    student_email: string
    week: number
    category: string
    score: number
    total_questions: number
    correct_answers: number
    time_spent: number
    completed_at: string
    difficulty: string
    accuracy: number
    questions_attempted: any[]
}

interface QuestionAttempt {
    question_id: string
    question: string
    selected_answer: string
    correct_answer: string
    is_correct: boolean
    time_spent: number
    explanation: string
}

function PracticeTestDetailsModal({
    test,
    onClose
}: {
    test: PracticeTest | null,
    onClose: () => void
}) {
    if (!test) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between bg-neutral-50">
                    <div>
                        <h2 className="text-xl font-bold text-neutral">{test.student_name}&apos;s Test Details</h2>
                        <div className="flex gap-4 mt-1 text-sm text-neutral-light">
                            <span>Week {test.week}</span>
                            <span>•</span>
                            <span>{test.category}</span>
                            <span>•</span>
                            <span className={test.score >= 70 ? "text-green-600 font-medium" : "text-yellow-600 font-medium"}>
                                Score: {test.score}%
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition">
                        <Loader2 className="w-5 h-5 text-neutral hidden" /> {/* Dummy loader import usage */}
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/30">
                    <div className="space-y-6">
                        {test.questions_attempted && test.questions_attempted.length > 0 ? (
                            test.questions_attempted.map((q: QuestionAttempt, index: number) => (
                                <div key={index} className={`bg-white rounded-lg border p-4 ${q.is_correct ? 'border-green-200 shadow-sm' : 'border-red-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-medium text-neutral-800 flex-1">
                                            <span className="text-neutral-400 mr-2">Q{index + 1}.</span>
                                            {q.question}
                                        </h3>
                                        <Badge variant={q.is_correct ? 'success' : 'error'} className={q.is_correct ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                                            {q.is_correct ? 'Correct' : 'Incorrect'}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                                        <div className={`p-3 rounded-lg ${q.is_correct ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                                            <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider font-semibold">Selected Answer</p>
                                            <p className="font-medium text-neutral-800">{q.selected_answer || 'Not Attempted'}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                            <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider font-semibold">Correct Answer</p>
                                            <p className="font-medium text-neutral-800">{q.correct_answer}</p>
                                        </div>
                                    </div>

                                    {q.explanation && (
                                        <div className="bg-neutral-100/50 p-3 rounded-lg text-sm text-neutral-600 mt-2">
                                            <p className="font-semibold text-xs text-neutral-500 mb-1 uppercase">Explanation</p>
                                            {q.explanation}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-neutral-light">
                                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No detailed question data available for this test.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function DeptTPCPracticeMonitoringPage() {
    const [practiceTests, setPracticeTests] = useState<PracticeTest[]>([])
    const [filteredTests, setFilteredTests] = useState<PracticeTest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedTest, setSelectedTest] = useState<PracticeTest | null>(null)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [weekFilter, setWeekFilter] = useState<number | 'all'>('all')

    // Analytics
    const [analytics, setAnalytics] = useState({
        totalAttempts: 0,
        averageScore: 0,
        activeStudents: 0,
        recentActivity: 0
    })

    useEffect(() => {
        fetchPracticeData()
    }, [])

    useEffect(() => {
        filterTests()
    }, [searchQuery, weekFilter, practiceTests])

    const fetchPracticeData = async () => {
        try {
            setIsLoading(true)
            setError('')

            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) {
                setError('Authentication required')
                return
            }

            // DeptTPC should only see their department students' practice tests
            const response = await fetch(`${apiBaseUrl}/practice-test/list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                },
                body: JSON.stringify({})
            })

            const result = await response.json()

            if (result.success && result.data) {
                const tests = result.data.map((test: any) => ({
                    _id: test._id,
                    student_id: test.student_id,
                    student_name: test.student_name || 'Unknown',
                    student_email: test.student_email || '',
                    week: test.week || 1,
                    category: test.category || 'Aptitude',
                    score: test.score || 0,
                    total_questions: test.total_questions || 0,
                    correct_answers: test.correct_answers || 0,
                    time_spent: test.time_spent || 0,
                    completed_at: test.completed_at,
                    difficulty: test.difficulty || 'medium',
                    accuracy: test.total_questions > 0
                        ? Math.round((test.correct_answers / test.total_questions) * 100)
                        : 0,
                    questions_attempted: test.questions_attempted || []
                }))


                setPracticeTests(tests)
                calculateAnalytics(tests)
            } else {
                setError(result.message || 'Failed to load practice data')
            }
        } catch (error) {
            console.error('Error fetching practice data:', error)
            setError('Failed to load practice data')
        } finally {
            setIsLoading(false)
        }
    }

    const calculateAnalytics = (tests: PracticeTest[]) => {
        const totalAttempts = tests.length
        const averageScore = tests.length > 0
            ? Math.round(tests.reduce((sum, t) => sum + t.score, 0) / tests.length)
            : 0

        const uniqueStudents = new Set(tests.map(t => t.student_id))
        const activeStudents = uniqueStudents.size

        const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const recentActivity = tests.filter(t => new Date(t.completed_at) > last7Days).length

        setAnalytics({
            totalAttempts,
            averageScore,
            activeStudents,
            recentActivity
        })
    }

    const filterTests = () => {
        let filtered = [...practiceTests]

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(test =>
                test.student_name.toLowerCase().includes(query) ||
                test.student_email.toLowerCase().includes(query)
            )
        }

        // Week filter
        if (weekFilter !== 'all') {
            filtered = filtered.filter(test => test.week === weekFilter)
        }



        // Sort by completion date (newest first)
        filtered.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

        setFilteredTests(filtered)
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
        if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
        return 'text-red-600 bg-red-50 border-red-200'
    }

    const getDifficultyColor = (difficulty: string) => {
        const colors: Record<string, string> = {
            easy: 'text-green-600 bg-green-50',
            medium: 'text-yellow-600 bg-yellow-50',
            hard: 'text-orange-600 bg-orange-50',
            expert: 'text-red-600 bg-red-50'
        }
        return colors[difficulty.toLowerCase()] || 'text-neutral bg-neutral-light/10'
    }

    return (
        <DepartmentTPCLayout>
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-neutral mb-2">Aptitude Monitoring</h1>
                        <p className="text-neutral-light">Monitor department student aptitude test performance</p>
                    </div>

                    {/* Analytics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">


                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-neutral-light mb-1">Average Score</p>
                                    <p className="text-2xl font-bold text-neutral">{analytics.averageScore}%</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-neutral-light mb-1">Active Students</p>
                                    <p className="text-2xl font-bold text-neutral">{analytics.activeStudents}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </Card>


                    </div>

                    {/* Filters */}
                    <Card className="p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Search */}
                            <div>
                                <label className="block text-sm font-medium text-neutral mb-2">
                                    Search Student
                                </label>
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

                            {/* Week Filter */}
                            <div>
                                <label className="block text-sm font-medium text-neutral mb-2">
                                    Week
                                </label>
                                <select
                                    value={weekFilter}
                                    onChange={(e) => setWeekFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                    className="w-full px-4 py-2 rounded-lg border border-neutral-light/20 bg-background-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="all">All Weeks</option>
                                    {[1, 2, 3, 4, 5, 6].map(week => (
                                        <option key={week} value={week}>Week {week}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Practice Tests List */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-neutral">
                                Practice Tests ({filteredTests.length})
                            </h2>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-red-600">{error}</p>
                            </div>
                        ) : filteredTests.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-neutral-light">No practice tests found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-light/20">
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Student</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Week</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Score</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Accuracy</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Difficulty</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Time</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-neutral">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTests.map((test) => (
                                            <tr
                                                key={test._id}
                                                className="border-b border-neutral-light/10 hover:bg-background-elevated transition-colors cursor-pointer"
                                                onClick={() => setSelectedTest(test)}
                                            >
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <p className="font-medium text-neutral">{test.student_name}</p>
                                                        <p className="text-sm text-neutral-light">{test.student_email}</p>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge variant="secondary">Week {test.week}</Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getScoreColor(test.score)}`}>
                                                        {test.score}%
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-sm text-neutral">
                                                        {test.correct_answers}/{test.total_questions}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium capitalize ${getDifficultyColor(test.difficulty)}`}>
                                                        {test.difficulty}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-neutral">
                                                    {test.time_spent}m
                                                </td>
                                                <td className="py-3 px-4 text-sm text-neutral-light">
                                                    {new Date(test.completed_at).toLocaleDateString()}
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

            {/* Test Details Modal */}
            {selectedTest && (
                <PracticeTestDetailsModal
                    test={selectedTest}
                    onClose={() => setSelectedTest(null)}
                />
            )}
        </DepartmentTPCLayout>
    )
}
