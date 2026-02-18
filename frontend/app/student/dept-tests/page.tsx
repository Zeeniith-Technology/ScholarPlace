'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Toast, useToast } from '@/components/ui/Toast'
import { getApiBaseUrl } from '@/utils/api'
import { getAuthHeader } from '@/utils/auth'
import {
    Calendar,
    Clock,
    FileText,
    PlayCircle,
    CheckCircle,
    AlertCircle,
    BookOpen
} from 'lucide-react'

export default function DeptTestsPage() {
    const router = useRouter()
    const { toast, showToast, hideToast } = useToast()
    const [tests, setTests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, active, upcoming, completed, missed

    useEffect(() => {
        fetchTests()
    }, [])

    const fetchTests = async () => {
        try {
            const apiBaseUrl = getApiBaseUrl()
            const authHeader = getAuthHeader()

            const res = await fetch(`${apiBaseUrl}/student/tests/scheduled`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || ''
                }
            })

            const result = await res.json()
            if (result.success) {
                setTests(result.data || [])
            } else {
                showToast(result.message || 'Failed to fetch tests', 'error')
            }
        } catch (error) {
            console.error('Fetch Error:', error)
            showToast('Failed to load tests', 'error')
        } finally {
            setLoading(false)
        }
    }

    const getTestStatus = (test: any) => {
        if (test.attempt_status === 'submitted') return 'completed'
        if (test.attempt_status === 'in_progress') return 'active' // Or 'resumable'

        const now = new Date()
        const start = new Date(test.scheduled_start)
        const end = new Date(test.scheduled_end)

        if (now < start) return 'upcoming'
        if (now > end) return 'missed'
        return 'active'
    }

    const filteredTests = tests.filter(test => {
        if (filter === 'all') return true
        const status = getTestStatus(test)
        if (filter === status) return true
        return false
    })

    const handleStartTest = (testId: string) => {
        router.push(`/student/dept-tests/${testId}`)
    }

    const handleViewResults = (attemptId: string) => {
        router.push(`/student/dept-tests/results/${attemptId}`)
    }

    return (
        <StudentLayout>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Assigned Tests</h1>
                    <p className="text-gray-400">Tests assigned by your Department TPC</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['all', 'active', 'upcoming', 'missed', 'completed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize whitespace-nowrap ${filter === f
                                ? 'bg-primary text-white'
                                : 'bg-surface-main text-gray-400 hover:bg-surface-highlight'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <Clock className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
                        <p className="text-gray-400">Loading tests...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredTests.length === 0 && (
                    <Card className="text-center py-12">
                        <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Tests Available</h3>
                        <p className="text-gray-400">
                            {filter === 'all'
                                ? 'You have no assigned tests yet.'
                                : `No ${filter} tests found.`}
                        </p>
                    </Card>
                )}

                {/* Test Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTests.map(test => {
                        const status = getTestStatus(test)
                        const start = new Date(test.scheduled_start)
                        const end = new Date(test.scheduled_end)

                        return (
                            <Card key={test._id} className="p-5 hover:shadow-lg transition-shadow">
                                {/* Status Badge */}
                                <div className="flex items-start justify-between mb-3">
                                    <Badge variant={
                                        status === 'active' ? 'success' :
                                            status === 'upcoming' ? 'warning' :
                                                status === 'completed' ? 'success' :
                                                    'error' // missed/expired
                                    }>
                                        {status === 'active' && <><PlayCircle className="w-3 h-3 mr-1" /> Active</>}
                                        {status === 'upcoming' && <><Clock className="w-3 h-3 mr-1" /> Upcoming</>}
                                        {status === 'missed' && <><AlertCircle className="w-3 h-3 mr-1" /> Missed</>}
                                        {status === 'completed' && <><CheckCircle className="w-3 h-3 mr-1" /> Completed</>}
                                    </Badge>
                                    {test.module && (
                                        <Badge variant="primary">{test.module}</Badge>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                                    {test.title}
                                </h3>

                                {/* Details */}
                                <div className="space-y-2 mb-4 text-sm text-gray-400">
                                    {test.topic && (
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            <span>{test.topic}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        <span>{test.question_count} Questions</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <span>{test.duration_minutes} Minutes</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs">
                                            {status === 'missed'
                                                ? `Ended ${end.toLocaleDateString()}`
                                                : `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                            }
                                        </span>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => {
                                        if (status === 'completed' && test.attempt_id) {
                                            handleViewResults(test.attempt_id)
                                        } else if (status === 'active') {
                                            handleStartTest(test._id)
                                        }
                                    }}
                                    disabled={status !== 'active' && status !== 'completed'}
                                    className={`w-full py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${status === 'active'
                                        ? 'bg-primary hover:bg-primary-dark text-white'
                                        : status === 'completed'
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    {status === 'active' ? (
                                        <>
                                            <PlayCircle className="w-5 h-5" />
                                            Start Test
                                        </>
                                    ) : status === 'upcoming' ? (
                                        `Starts ${start.toLocaleDateString()}`
                                    ) : status === 'completed' ? (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            View Results
                                        </>
                                    ) : (
                                        'Missed'
                                    )}
                                </button>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {toast && <Toast {...toast} onClose={hideToast} />}
        </StudentLayout>
    )
}
