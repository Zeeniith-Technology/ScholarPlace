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
    ChevronDown,
    ChevronRight
} from 'lucide-react'

interface PracticeTest {
    _id: string
    student_id: string
    student_name: string
    student_email: string
    week: number
    day?: string
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

function getDayLabelForTest(test: PracticeTest) {
    if (test.day) {
        const d = test.day.replace(/^day-/, '')
        return /^\d+$/.test(d) ? `Day ${d}` : test.day
    }
    return new Date(test.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PracticeTestDetailsModal({
    tests,
    onClose
}: {
    tests: PracticeTest[],
    onClose: () => void
}) {
    const [expandedDay, setExpandedDay] = useState<string | null>(null)

    if (!tests || tests.length === 0) return null

    const first = tests[0]
    const sorted = [...tests].sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between bg-neutral-50 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-neutral">{first.student_name}&apos;s Test Details</h2>
                        <div className="flex gap-4 mt-1 text-sm text-neutral-light">
                            <span>Week {first.week}</span>
                            <span>•</span>
                            <span>{tests.length} day{tests.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition">
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                </div>

                {/* Content: Day 1, Day 2, ... expandable; on open show questions */}
                <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/30">
                    <div className="space-y-2">
                        {sorted.map((test) => {
                            const dayKey = test.day || test.completed_at || test._id
                            const dayLabel = getDayLabelForTest(test)
                            const isOpen = expandedDay === dayKey
                            const questions = test.questions_attempted || []
                            return (
                                <div key={test._id} className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedDay(isOpen ? null : dayKey)}
                                        className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {isOpen ? (
                                                <ChevronDown className="w-5 h-5 text-neutral-500" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-neutral-500" />
                                            )}
                                            <span className="font-semibold text-neutral">{dayLabel}</span>
                                            <span className={`text-sm px-2 py-0.5 rounded font-medium ${test.score >= 70 ? 'text-green-700 bg-green-50' : 'text-yellow-700 bg-yellow-50'}`}>
                                                {test.score}%
                                            </span>
                                            <span className="text-sm text-neutral-light">
                                                {test.correct_answers}/{test.total_questions} · {test.time_spent}m · {new Date(test.completed_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </button>
                                    {isOpen && (
                                        <div className="border-t border-neutral-200 p-4 bg-neutral-50/50 space-y-4">
                                            {questions.length > 0 ? (
                                                questions.map((q: QuestionAttempt, index: number) => (
                                                    <div key={index} className={`rounded-lg border p-4 ${q.is_correct ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <h3 className="font-medium text-neutral-800 flex-1">
                                                                <span className="text-neutral-400 mr-2">Q{index + 1}.</span>
                                                                {q.question}
                                                            </h3>
                                                            <Badge variant={q.is_correct ? 'success' : 'error'} className={q.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                                                {q.is_correct ? 'Correct' : 'Incorrect'}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-2 mb-3">
                                                            {(q as any).options?.map((option: string, optIdx: number) => (
                                                                <div
                                                                    key={optIdx}
                                                                    className={`p-2 rounded text-sm ${option === q.correct_answer
                                                                        ? 'bg-green-100 text-green-800 font-semibold'
                                                                        : option === q.selected_answer && !q.is_correct
                                                                            ? 'bg-red-100 text-red-800 font-semibold'
                                                                            : 'bg-neutral-light/10 text-neutral-light'
                                                                        }`}
                                                                >
                                                                    {option}
                                                                    {option === q.correct_answer && ' ✓'}
                                                                    {option === q.selected_answer && !q.is_correct && ' ✗'}
                                                                </div>
                                                            ))}
                                                            {!(q as any).options && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-2">
                                                                    <div className={`p-3 rounded-lg ${q.is_correct ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                                                                        <p className="text-xs text-neutral-500 mb-1 font-semibold">Selected Answer</p>
                                                                        <p className="font-medium text-neutral-800">{q.selected_answer || 'Not Attempted'}</p>
                                                                    </div>
                                                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                                                        <p className="text-xs text-neutral-500 mb-1 font-semibold">Correct Answer</p>
                                                                        <p className="font-medium text-neutral-800">{q.correct_answer}</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {q.explanation && (
                                                            <div className="bg-neutral-100/80 p-3 rounded-lg text-sm text-neutral-600 mt-2">
                                                                <p className="font-semibold text-xs text-neutral-500 mb-1">Explanation</p>
                                                                {q.explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-neutral-light text-sm">
                                                    No question data for this day.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
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
                    day: test.day,
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

    // Group by week, then by student: one row per student per week with avg score & avg accuracy
    interface StudentWeekRow {
        student_id: string
        student_name: string
        student_email: string
        week: number
        tests: PracticeTest[]
        avgScore: number
        totalCorrect: number
        totalQuestions: number
        attempts: number
        totalTime: number
        lastCompleted: string
    }
    const testsByWeekAndStudent = React.useMemo(() => {
        const weekMap = new Map<number, PracticeTest[]>()
        for (const test of filteredTests) {
            const w = test.week
            if (!weekMap.has(w)) weekMap.set(w, [])
            weekMap.get(w)!.push(test)
        }
        const result: { weekNum: number; rows: StudentWeekRow[] }[] = []
        for (const [weekNum, tests] of Array.from(weekMap.entries()).sort(([a], [b]) => a - b)) {
            const byStudent = new Map<string, PracticeTest[]>()
            for (const t of tests) {
                const id = t.student_id
                if (!byStudent.has(id)) byStudent.set(id, [])
                byStudent.get(id)!.push(t)
            }
            const rows: StudentWeekRow[] = []
            for (const [student_id, studentTests] of byStudent.entries()) {
                const first = studentTests[0]
                const totalCorrect = studentTests.reduce((s, t) => s + t.correct_answers, 0)
                const totalQuestions = studentTests.reduce((s, t) => s + t.total_questions, 0)
                const avgScore = studentTests.length > 0
                    ? Math.round(studentTests.reduce((s, t) => s + t.score, 0) / studentTests.length)
                    : 0
                const totalTime = studentTests.reduce((s, t) => s + (t.time_spent || 0), 0)
                const lastCompleted = studentTests.reduce((latest, t) =>
                    (new Date(t.completed_at) > new Date(latest) ? t.completed_at : latest), studentTests[0].completed_at)
                rows.push({
                    student_id,
                    student_name: first.student_name,
                    student_email: first.student_email,
                    week: weekNum,
                    tests: studentTests.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()),
                    avgScore,
                    totalCorrect,
                    totalQuestions,
                    attempts: studentTests.length,
                    totalTime,
                    lastCompleted
                })
            }
            rows.sort((a, b) => b.avgScore - a.avgScore)
            result.push({ weekNum, rows })
        }
        return result
    }, [filteredTests])

    const getDayLabel = (test: PracticeTest) => {
        if (test.day) {
            const d = test.day.replace(/^day-/, '')
            return /^\d+$/.test(d) ? `Day ${d}` : test.day
        }
        return new Date(test.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

                    {/* Practice Tests: one card per week, day-wise inside */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-600">{error}</p>
                        </div>
                    ) : testsByWeekAndStudent.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-neutral-light">No practice tests found</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {testsByWeekAndStudent.map(({ weekNum, rows }) => {
                                const totalAttempts = rows.reduce((s, r) => s + r.attempts, 0)
                                const weekAvgScore = rows.length > 0
                                    ? Math.round(rows.reduce((s, r) => s + r.avgScore, 0) / rows.length)
                                    : 0
                                return (
                                    <Card key={weekNum} className="p-6 border-l-4 border-l-primary/50">
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <h2 className="text-xl font-semibold text-neutral flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-primary" />
                                                    Week {weekNum}
                                                </h2>
                                                <div className="flex items-center gap-3 text-sm text-neutral-light">
                                                    <span>{rows.length} student{rows.length !== 1 ? 's' : ''}</span>
                                                    <span>·</span>
                                                    <span>{totalAttempts} attempt{totalAttempts !== 1 ? 's' : ''}</span>
                                                    <span>·</span>
                                                    <span className="font-medium text-neutral">Avg {weekAvgScore}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto rounded-lg border border-neutral-light/20">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-neutral-light/20 bg-neutral-light/5">
                                                        <th className="text-left py-2.5 px-3 font-semibold text-neutral">Student</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-neutral">Avg Score</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-neutral">Avg Accuracy</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-neutral">Attempts</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-neutral">Time</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-neutral">Last completed</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row) => (
                                                        <tr
                                                            key={`${row.student_id}-${row.week}`}
                                                            className="border-b border-neutral-light/10 last:border-0 hover:bg-primary/5 transition-colors cursor-pointer"
                                                            onClick={() => setSelectedTest(row.tests[0])}
                                                        >
                                                            <td className="py-2.5 px-3">
                                                                <div>
                                                                    <p className="font-medium text-neutral">{row.student_name}</p>
                                                                    <p className="text-xs text-neutral-light">{row.student_email}</p>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getScoreColor(row.avgScore)}`}>
                                                                    {row.avgScore}%
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-neutral">
                                                                {row.totalCorrect}/{row.totalQuestions}
                                                                {row.totalQuestions > 0 && (
                                                                    <span className="text-neutral-light ml-1">
                                                                        ({Math.round((row.totalCorrect / row.totalQuestions) * 100)}%)
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-neutral">{row.attempts}</td>
                                                            <td className="py-2.5 px-3 text-neutral">{row.totalTime}m</td>
                                                            <td className="py-2.5 px-3 text-neutral-light">
                                                                {new Date(row.lastCompleted).toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Test Details Modal: all tests for this student in this week, Day 1 / Day 2 expandable → questions */}
            {selectedTest && (
                <PracticeTestDetailsModal
                    tests={filteredTests.filter(t => t.student_id === selectedTest.student_id && t.week === selectedTest.week)}
                    onClose={() => setSelectedTest(null)}
                />
            )}
        </DepartmentTPCLayout>
    )
}
