'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Toast, useToast } from '@/components/ui/Toast'
import { getApiBaseUrl } from '@/utils/api'
import { getAuthHeader } from '@/utils/auth'
import {
    Clock,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    AlertCircle,
    Flag
} from 'lucide-react'

export default function TakeTestPage() {
    const router = useRouter()
    const params = useParams()
    const testId = params?.testId as string
    const { toast, showToast, hideToast } = useToast()

    const [test, setTest] = useState<any>(null)
    const [attemptId, setAttemptId] = useState<string>('')
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<{ [key: number]: number }>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState(0) // in seconds
    const [showSubmitModal, setShowSubmitModal] = useState(false)

    useEffect(() => {
        startTest()
    }, [testId])

    // Timer
    useEffect(() => {
        if (timeRemaining <= 0) return

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    handleAutoSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [timeRemaining])

    const startTest = async () => {
        try {
            const apiBaseUrl = getApiBaseUrl()
            const authHeader = getAuthHeader()

            const res = await fetch(`${apiBaseUrl}/student/dept-test/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || ''
                },
                body: JSON.stringify({ test_id: testId })
            })

            const result = await res.json()
            if (result.success) {
                setTest(result.data.test)
                setAttemptId(result.data.attempt_id)
                setTimeRemaining(result.data.test.duration_minutes * 60)
            } else {
                showToast(result.message || 'Failed to start test', 'error')
                router.push('/student/dept-tests')
            }
        } catch (error) {
            console.error('Start Test Error:', error)
            showToast('Failed to start test', 'error')
            router.push('/student/dept-tests')
        } finally {
            setLoading(false)
        }
    }

    const handleSelectOption = (optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }))
    }

    const handleNext = () => {
        if (currentIndex < test.questions.length - 1) {
            setCurrentIndex(currentIndex + 1)
        }
    }

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1)
        }
    }

    const handleJumpToQuestion = (index: number) => {
        setCurrentIndex(index)
    }

    const handleSubmit = () => {
        setShowSubmitModal(true)
    }

    const handleAutoSubmit = useCallback(() => {
        submitTest(true)
    }, [])

    const submitTest = async (isAutoSubmit = false) => {
        setSubmitting(true)
        setShowSubmitModal(false)

        try {
            const apiBaseUrl = getApiBaseUrl()
            const authHeader = getAuthHeader()

            // Convert answers object to array format
            const answersArray = test.questions.map((_: any, idx: number) => ({
                question_index: idx,
                selected_option: answers[idx] !== undefined ? answers[idx] : null
            }))

            const res = await fetch(`${apiBaseUrl}/student/dept-test/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || ''
                },
                body: JSON.stringify({
                    attempt_id: attemptId,
                    answers: answersArray
                })
            })

            const result = await res.json()
            if (result.success) {
                showToast(isAutoSubmit ? 'Time up! Test auto-submitted' : 'Test submitted successfully', 'success')
                // Redirect to results page
                router.push(`/student/dept-tests/results/${attemptId}`)
            } else {
                showToast(result.message || 'Failed to submit test', 'error')
            }
        } catch (error) {
            console.error('Submit Error:', error)
            showToast('Failed to submit test', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const currentQuestion = test?.questions[currentIndex]
    const answeredCount = Object.keys(answers).length
    const unansweredCount = test?.questions.length - answeredCount || 0

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Clock className="w-12 h-12 animate-spin text-primary" />
                </div>
            </StudentLayout>
        )
    }

    if (!test) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-gray-400">Failed to load test. Redirecting...</p>
                </div>
            </StudentLayout>
        )
    }

    return (
        <StudentLayout>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10 shadow-sm">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{test.title}</h1>
                            <p className="text-sm text-gray-500">{test.module} - {test.topic}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Time Remaining</p>
                                <p className={`text-2xl font-bold ${timeRemaining < 300 ? 'text-red-500' : 'text-primary'}`}>
                                    {formatTime(timeRemaining)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Question Area */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Question Card */}
                        <Card className="p-6 bg-white border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-500">
                                    Question {currentIndex + 1} of {test.questions.length}
                                </h2>
                                <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{currentQuestion?.marks || 1} mark(s)</span>
                            </div>

                            <p className="text-gray-900 text-lg mb-6 leading-relaxed font-medium">
                                {currentQuestion?.text}
                            </p>

                            {/* Options */}
                            <div className="space-y-3">
                                {currentQuestion?.options.map((option: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectOption(idx)}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentIndex] === idx
                                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                                            : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5 text-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answers[currentIndex] === idx
                                                ? 'border-primary bg-primary'
                                                : 'border-gray-300'
                                                }`}>
                                                {answers[currentIndex] === idx && (
                                                    <CheckCircle className="w-4 h-4 text-white" />
                                                )}
                                            </div>
                                            <span className="font-semibold text-gray-500 w-5">{String.fromCharCode(65 + idx)}.</span>
                                            <span className="flex-1">{option}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={handlePrevious}
                                disabled={currentIndex === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                Previous
                            </button>

                            <div className="flex gap-2">
                                {currentIndex < test.questions.length - 1 ? (
                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                                    >
                                        Next
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-sm"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Submit Test
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Question Palette */}
                    <div className="lg:col-span-1">
                        <Card className="p-4 sticky top-24 bg-white border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Questions</h3>

                            {/* Summary */}
                            <div className="mb-4 space-y-2 text-sm bg-gray-50 rounded-lg p-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Answered:</span>
                                    <span className="text-green-600 font-semibold">{answeredCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Not Answered:</span>
                                    <span className="text-red-500 font-semibold">{unansweredCount}</span>
                                </div>
                            </div>

                            {/* Question Grid */}
                            <div className="grid grid-cols-5 gap-2">
                                {test.questions.map((_: any, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleJumpToQuestion(idx)}
                                        className={`aspect-square rounded-lg font-semibold text-sm transition-all ${idx === currentIndex
                                            ? 'bg-primary text-white ring-2 ring-primary/30'
                                            : answers[idx] !== undefined
                                                ? 'bg-green-500 text-white hover:bg-green-600'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                className="w-full mt-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2 shadow-sm"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Submit Test
                            </button>
                        </Card>
                    </div>
                </div>

                {/* Submit Confirmation Modal */}
                {showSubmitModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <Card className="max-w-md w-full p-6 bg-white shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertCircle className="w-8 h-8 text-yellow-500" />
                                <h2 className="text-xl font-bold text-gray-900">Submit Test?</h2>
                            </div>
                            <p className="text-gray-600 mb-6">
                                You have answered {answeredCount} out of {test.questions.length} questions.
                                {unansweredCount > 0 && (
                                    <span className="block mt-2 text-yellow-600 font-medium">
                                        ⚠️ {unansweredCount} question(s) are unanswered!
                                    </span>
                                )}
                                <span className="block mt-2 text-gray-700">Are you sure you want to submit?</span>
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSubmitModal(false)}
                                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => submitTest(false)}
                                    disabled={submitting}
                                    className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {toast && <Toast {...toast} onClose={hideToast} />}
        </StudentLayout>
    )
}
