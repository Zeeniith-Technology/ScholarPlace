'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Toast, useToast } from '@/components/ui/Toast'
import { getApiBaseUrl } from '@/utils/api'
import { getAuthHeader } from '@/utils/auth'
import {
    CheckCircle,
    XCircle,
    Clock,
    Trophy,
    BarChart,
    Home,
    FileText
} from 'lucide-react'

export default function TestResultsPage() {
    const router = useRouter()
    const params = useParams()
    const attemptId = params?.attemptId as string
    const { toast, showToast, hideToast } = useToast()

    const [attempt, setAttempt] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchResults()
    }, [attemptId])

    const fetchResults = async () => {
        try {
            const apiBaseUrl = getApiBaseUrl()
            const authHeader = getAuthHeader()

            const res = await fetch(`${apiBaseUrl}/student/dept-test/results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || ''
                },
                body: JSON.stringify({ attempt_id: attemptId })
            })

            const result = await res.json()
            if (result.success) {
                // _id may be an ObjectId object — compare as strings
                const foundAttempt = result.data.find((a: any) =>
                    a._id?.toString() === attemptId || a._id === attemptId
                )
                if (foundAttempt) {
                    setAttempt(foundAttempt)
                } else {
                    showToast('Results not found', 'error')
                    router.push('/student/dept-tests')
                }
            } else {
                showToast(result.message || 'Failed to fetch results', 'error')
                router.push('/student/dept-tests')
            }
        } catch (error) {
            console.error('Fetch Error:', error)
            showToast('Failed to load results', 'error')
            router.push('/student/dept-tests')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Clock className="w-12 h-12 animate-spin text-primary" />
                </div>
            </StudentLayout>
        )
    }

    if (!attempt) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-gray-500">Results not found</p>
                </div>
            </StudentLayout>
        )
    }

    const scorePercentage = attempt.percentage || 0
    const scoreColor = scorePercentage >= 70 ? 'text-green-600' : scorePercentage >= 40 ? 'text-yellow-600' : 'text-red-600'
    const scoreBg = scorePercentage >= 70 ? 'bg-green-50 border-green-200' : scorePercentage >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
    const scoreLabel = scorePercentage >= 70 ? 'Excellent!' : scorePercentage >= 40 ? 'Good Effort!' : 'Needs Improvement'

    return (
        <StudentLayout>
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto">

                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Test Results</h1>
                        <p className="text-gray-500">{attempt.test_title || 'Department Test'}</p>
                    </div>

                    {/* Score Summary Card */}
                    <Card className={`p-8 mb-6 text-center border-2 ${scoreBg}`}>
                        <div className="flex items-center justify-center mb-4">
                            <Trophy className={`w-16 h-16 ${scoreColor}`} />
                        </div>
                        <h2 className={`text-6xl font-bold ${scoreColor} mb-2`}>
                            {scorePercentage}%
                        </h2>
                        <p className="text-2xl font-semibold text-gray-700 mb-6">{scoreLabel}</p>
                        <div className="flex items-center justify-center gap-10 text-sm">
                            <div>
                                <p className="text-gray-500 mb-1">Score</p>
                                <p className="text-xl font-bold text-gray-800">
                                    {attempt.obtained_marks} / {attempt.total_marks}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500 mb-1">Duration</p>
                                <p className="text-xl font-bold text-gray-800">
                                    {attempt.duration_taken_minutes} min
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <Card className="p-4 text-center bg-white border border-gray-200">
                            <BarChart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-800">{attempt.total_questions}</p>
                            <p className="text-sm text-gray-500">Total</p>
                        </Card>
                        <Card className="p-4 text-center bg-white border border-gray-200">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-green-600">{attempt.correct_answers}</p>
                            <p className="text-sm text-gray-500">Correct</p>
                        </Card>
                        <Card className="p-4 text-center bg-white border border-gray-200">
                            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-red-600">{attempt.wrong_answers}</p>
                            <p className="text-sm text-gray-500">Wrong</p>
                        </Card>
                        <Card className="p-4 text-center bg-white border border-gray-200">
                            <FileText className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-yellow-600">{attempt.unanswered || 0}</p>
                            <p className="text-sm text-gray-500">Skipped</p>
                        </Card>
                    </div>

                    {/* Question-by-Question Analysis */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Question Analysis</h2>
                        <div className="space-y-4">
                            {attempt.student_answers?.map((answer: any, idx: number) => {
                                const isAnswered = answer.selected_option !== undefined && answer.selected_option !== null
                                const borderColor = answer.is_correct ? 'border-l-green-500' : isAnswered ? 'border-l-red-500' : 'border-l-yellow-500'

                                return (
                                    <Card key={idx} className={`p-5 bg-white border border-gray-200 border-l-4 ${borderColor}`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-800">Question {idx + 1}</h3>
                                            <Badge variant={answer.is_correct ? 'success' : isAnswered ? 'error' : 'warning'}>
                                                {answer.is_correct ? (
                                                    <><CheckCircle className="w-3 h-3 mr-1 inline" /> Correct</>
                                                ) : isAnswered ? (
                                                    <><XCircle className="w-3 h-3 mr-1 inline" /> Wrong</>
                                                ) : (
                                                    <>⚠️ Skipped</>
                                                )}
                                            </Badge>
                                        </div>

                                        <p className="text-gray-700 mb-4 leading-relaxed">{answer.question_text}</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Your Answer</p>
                                                <div className={`p-2 rounded-lg text-sm font-medium ${!isAnswered
                                                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                    : answer.is_correct
                                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                                        : 'bg-red-50 text-red-700 border border-red-200'
                                                    }`}>
                                                    {isAnswered
                                                        ? (answer.selected_option_text || `Option ${String.fromCharCode(65 + answer.selected_option)}`)
                                                        : 'Not Answered'
                                                    }
                                                </div>
                                            </div>
                                            {!answer.is_correct && (
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Correct Answer</p>
                                                    <div className="p-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                                                        {answer.correct_option_text || `Option ${String.fromCharCode(65 + answer.correct_option)}`}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 text-right">
                                            <span className="text-sm text-gray-400">
                                                Marks: {answer.marks_awarded} / {attempt.total_marks / attempt.total_questions}
                                            </span>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push('/student/dept-tests')}
                            className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Home className="w-5 h-5" />
                            Back to Tests
                        </button>
                    </div>

                </div>
            </div>

            {toast && <Toast {...toast} onClose={hideToast} />}
        </StudentLayout>
    )
}
