'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    Play,
    ChevronRight,
    ChevronLeft,
    Target,
    Calculator,
    RotateCcw
} from 'lucide-react'
import { getAuthHeader } from '@/utils/auth'

interface Question {
    _id: string
    question_id: string
    question_text: string
    options: Array<{ key: string; text: string; is_correct: boolean }>
    correct_answer: string
    difficulty: string
    topic: string
    week: number
    day: number
    explanation?: string
}

interface AnswerState {
    [questionId: string]: {
        selected: string
        isCorrect: boolean | null
        timeSpent: number
    }
}

export default function WeeklyAptitudeTestPage({ params }: { params: { weekId: string } }) {
    const router = useRouter()
    // weekId is coming from the URL parameter
    const weekId = parseInt(params.weekId)

    const [questions, setQuestions] = useState<Question[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<AnswerState>({})
    const [showResults, setShowResults] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [totalTime, setTotalTime] = useState(0) // Seconds
    const [testStarted, setTestStarted] = useState(false)
    const [questionStartTimes, setQuestionStartTimes] = useState<{ [questionId: string]: number }>({})
    const [showBlockedModal, setShowBlockedModal] = useState(false)
    const [isBlockedForRetake, setIsBlockedForRetake] = useState(false)
    const [blockCheckDone, setBlockCheckDone] = useState(false)
    const tabSwitchBlockedRef = useRef(false)

    // Check if student is blocked from retaking (must pass before allowing Start)
    const checkBlockedRetake = async (): Promise<boolean> => {
        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()
            if (!authHeader) {
                setBlockCheckDone(true)
                return false
            }
            const response = await fetch(`${apiBaseUrl}/student-progress/check-blocked-retake`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                body: JSON.stringify({ week: weekId, test_type: 'weekly' }),
            })
            if (response.ok) {
                const result = await response.json()
                const data = result.data
                const blocked = !!(data && data.blocked && !data.approved)
                if (blocked) setIsBlockedForRetake(true)
                setBlockCheckDone(true)
                return blocked
            }
        } catch (e) {
            console.error('Error checking blocked retake:', e)
        }
        setBlockCheckDone(true)
        return false
    }

    // On mount: check blocked status first; if not blocked, fetch questions
    useEffect(() => {
        if (!weekId) return
        checkBlockedRetake().then((blocked) => {
            if (!blocked) fetchQuestions()
        })
    }, [weekId])

    // Timer logic
    useEffect(() => {
        if (testStarted && startTime && !showResults) {
            const interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000)
                setTotalTime(elapsed)
                // Auto-submit after 60 mins (3600 seconds)
                if (elapsed >= 3600) {
                    submitTest()
                }
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [testStarted, startTime, showResults])

    // Handle test exit/close
    const handleExit = () => {
        // Stop timer (though component unmount would do it, this is for clarity)
        setTestStarted(false)

        // Attempt to close window
        // This is the primary request: "it should close that window"
        try {
            window.close()
        } catch (e) {
            console.error("Failed to close window", e)
        }

        // Fallback: If window.close() is blocked (not opened by script), 
        // we might check if we are still here and warn or redirect.
        // But user explicitly said redirection is "totally wrong".
        // So we will just try window.close(). 
        // If the user opened this in the same tab, they might be stuck unless they manually close.
        // We'll add a small checking logic to inform them if it fails.
        setTimeout(() => {
            if (!document.hidden) {
                // If we are still here, it means window.close() failed.
                // We'll show a message or redirect as a last resort if they insist?
                // The user said "totally wrong", so we won't auto-redirect.
                // We'll just alert them.
                // alert("Please close this tab to exit the test.")
                // Actually, let's just leave it as window.close().
            }
        }, 500)
    }

    // Block student for retake (limit 1: single tab switch requires Dept TPC approval)
    const blockForRetake = async () => {
        if (tabSwitchBlockedRef.current) return
        tabSwitchBlockedRef.current = true
        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()
            if (!authHeader) return
            await fetch(`${apiBaseUrl}/student-progress/block-test-retake`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                body: JSON.stringify({
                    week: weekId,
                    test_type: 'weekly',
                    reason: 'window_switch_violation',
                }),
            })
        } catch (e) {
            console.error('Error blocking for retake:', e)
        }
    }

    // Strict Mode: Watch for tab switching (limit 1 → block, show modal, then close)
    useEffect(() => {
        if (!testStarted || showResults) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Single tab switch: block, show modal (no alert), then close. Dept TPC Test Approvals.
                blockForRetake().then(() => {
                    setShowBlockedModal(true)
                })
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [testStarted, showResults])


    const fetchQuestions = async () => {
        try {
            setIsLoading(true)
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            // Fetch questions with filter for this week and tag
            const response = await fetch(`${apiBaseUrl}/questions/list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || '',
                },
                body: JSON.stringify({
                    filter: {
                        week: weekId,
                        tags: 'weekly-aptitude-test' // Match the tag used in migration
                    },
                    options: {
                        limit: 50 // Ensure we get all 50 questions
                    }
                }),
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success && result.data) {
                    setQuestions(result.data)

                    // Initial Answer State
                    const initialAnswers: AnswerState = {}
                    result.data.forEach((q: Question) => {
                        initialAnswers[q.question_id] = {
                            selected: '',
                            isCorrect: null,
                            timeSpent: 0
                        }
                    })
                    setAnswers(initialAnswers)

                } else {
                    console.error('No data found')
                }
            }
        } catch (error) {
            console.error('Error fetching questions:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const startTest = () => {
        setTestStarted(true)
        const now = Date.now()
        setStartTime(now)
        setTotalTime(0)
        if (questions.length > 0) {
            setQuestionStartTimes({ [questions[0].question_id]: now })
        }
    }

    const handleAnswerSelect = (questionId: string, key: string) => {
        // Record answer
        const q = questions.find(q => q.question_id === questionId)
        if (!q) return

        const isCorrect = q.correct_answer === key

        // Calculate time spent
        const start = questionStartTimes[questionId] || Date.now()
        const spent = Math.floor((Date.now() - start) / 1000)
        const currentSpent = answers[questionId]?.timeSpent || 0

        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                selected: key,
                isCorrect,
                timeSpent: currentSpent + spent
            }
        }))

        // Reset start time for accurate accumulating if they come back
        setQuestionStartTimes(prev => ({
            ...prev,
            [questionId]: Date.now()
        }))
    }

    const goToNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1
            setCurrentQuestionIndex(nextIndex)

            const nextQ = questions[nextIndex]
            if (nextQ && !questionStartTimes[nextQ.question_id]) {
                setQuestionStartTimes(prev => ({
                    ...prev,
                    [nextQ.question_id]: Date.now()
                }))
            }
        }
    }

    const goToPreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1)
        }
    }

    const submitTest = async () => {
        setShowResults(true)
        setTestStarted(false)

        try {
            const { correct, total, percentage } = getScore()
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()
            const finalTimeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000 / 60) : 0

            // Build questions_attempted array
            const questionsAttempted = questions.map((q) => {
                const answerState = answers[q.question_id]
                const isCorrect = answerState?.isCorrect || false
                const selectedOptionKey = answerState?.selected || ''
                const selectedOptionText = q.options.find(opt => opt.key === selectedOptionKey)?.text || ''

                return {
                    question_id: q.question_id,
                    question: q.question_text,
                    selected_answer: selectedOptionText,
                    correct_answer: q.correct_answer,
                    is_correct: isCorrect,
                    time_spent: answerState?.timeSpent || 0,
                    question_type: q.difficulty || 'medium',
                    question_topic: [q.topic || 'Aptitude'],
                    explanation: q.explanation || '',
                }
            })

            // Save test result
            // Using day: 'weekly-test' so it doesn't conflict with day assignments
            await fetch(`${apiBaseUrl}/practice-test/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || '',
                },
                body: JSON.stringify({
                    week: weekId,
                    day: 'weekly-test',
                    score: percentage,
                    totalQuestions: total,
                    correctAnswers: correct,
                    incorrectAnswers: total - correct,
                    timeSpent: finalTimeSpent,
                    questionsAttempted: questionsAttempted,
                    category: 'aptitude'
                }),
            })
        } catch (error) {
            console.error('Error saving weekly test:', error)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getScore = () => {
        const correct = Object.values(answers).filter(a => a.isCorrect).length
        const total = questions.length
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
        return { correct, total, percentage }
    }

    // Still checking blocked status
    if (!blockCheckDone) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-neutral-light">Checking access...</p>
                    </div>
                </div>
            </div>
        )
    }

    // Blocked: require Dept TPC approval before retake
    if (blockCheckDone && isBlockedForRetake) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <div className="flex-1 flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full p-12 text-center shadow-xl border-neutral-light/20 border-red-200">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                            <AlertCircle className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-bold text-neutral mb-3">Test access blocked</h1>
                        <p className="text-neutral-light text-lg mb-6">
                            You have been blocked from retaking this test due to a tab/window switch during a previous attempt.
                        </p>
                        <p className="text-neutral-dark font-medium mb-10">
                            Please contact your Department TPC to request approval via <strong>Test Approvals</strong>. You cannot start the test until your retake is approved.
                        </p>
                        <Button
                            onClick={handleExit}
                            variant="secondary"
                            className="w-full py-4"
                        >
                            Close and Return
                        </Button>
                    </Card>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-neutral-light">Loading Test Questions...</p>
                    </div>
                </div>
            </div>
        )
    }

    // Start Screen
    if (!testStarted && !showResults) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <div className="flex-1 flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full p-12 text-center shadow-xl border-neutral-light/20">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                            <Calculator className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-bold text-neutral mb-3">Week {weekId} Aptitude Test</h1>
                        <p className="text-neutral-light text-lg mb-10">
                            You are about to start a comprehensive assessment.
                        </p>

                        <div className="grid grid-cols-3 gap-6 mb-10 text-left">
                            <div className="p-4 bg-background-surface rounded-xl border border-neutral-light/10">
                                <p className="text-xs text-neutral-light uppercase tracking-wide font-semibold mb-1">Questions</p>
                                <p className="text-2xl font-bold text-neutral">{questions.length}</p>
                            </div>
                            <div className="p-4 bg-background-surface rounded-xl border border-neutral-light/10">
                                <p className="text-xs text-neutral-light uppercase tracking-wide font-semibold mb-1">Duration</p>
                                <p className="text-2xl font-bold text-neutral">60 Mins</p>
                            </div>
                            <div className="p-4 bg-background-surface rounded-xl border border-neutral-light/10">
                                <p className="text-xs text-neutral-light uppercase tracking-wide font-semibold mb-1">Passing Score</p>
                                <p className="text-2xl font-bold text-neutral">75%</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Button onClick={startTest} className="w-full py-6 text-lg font-bold" variant="primary">
                                Start Assessment
                            </Button>
                            <Button
                                onClick={handleExit}
                                variant="ghost"
                                className="w-full text-neutral-light hover:text-neutral"
                            >
                                Cancel and Return
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    // Results Screen
    if (showResults) {
        const { correct, total, percentage } = getScore()
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <div className="flex-1 flex items-center justify-center p-4">
                    <Card className="max-w-3xl w-full p-10 text-center shadow-xl border-neutral-light/20">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-neutral mb-2">Test Completed</h1>
                            <p className="text-neutral-light">Here is how you performed on Week {weekId} Test</p>
                        </div>

                        <div className="flex items-center justify-center mb-10">
                            <div className={`relative w-48 h-48 flex items-center justify-center rounded-full border-8 ${percentage > 75 ? 'border-primary/20' : 'border-amber-500/30'}`}>
                                <div className={`text-5xl font-bold ${percentage > 75 ? 'text-primary' : 'text-amber-600'}`}>{percentage}%</div>
                            </div>
                        </div>

                        {percentage <= 75 && (
                            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
                                <p className="text-amber-800 font-medium">You need more than 75% to pass.</p>
                                <p className="text-amber-700 text-sm mt-1">Please re-appear for the test from your study page.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-6 mb-10">
                            <div className="p-6 bg-green-500/10 rounded-xl border border-green-500/20">
                                <p className="text-sm font-semibold text-green-600 mb-1">Correct</p>
                                <p className="text-3xl font-bold text-green-700">{correct}</p>
                            </div>
                            <div className="p-6 bg-red-500/10 rounded-xl border border-red-500/20">
                                <p className="text-sm font-semibold text-red-600 mb-1">Incorrect</p>
                                <p className="text-3xl font-bold text-red-700">{total - correct}</p>
                            </div>
                            <div className="p-6 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <p className="text-sm font-semibold text-blue-600 mb-1">Time Taken</p>
                                <p className="text-3xl font-bold text-blue-700">{formatTime(totalTime)}</p>
                            </div>
                        </div>

                        <div className="flex gap-4 max-w-md mx-auto">
                            <Button
                                onClick={handleExit}
                                variant="secondary"
                                className="w-full py-6"
                            >
                                Back to List
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    // Active Test UI
    const currentQ = questions[currentQuestionIndex]
    const currentAns = answers[currentQ.question_id]

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Custom Header */}
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between shadow-lg z-50 sticky top-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary font-bold">
                        W{weekId}
                    </div>
                    <div>
                        <div className="font-bold text-lg">Aptitude Assessment</div>
                        <div className="text-xs text-neutral-400 font-mono">Week {weekId} Weekly Test</div>
                    </div>
                </div>

                <div className={`flex items-center gap-3 px-6 py-2 rounded-full font-mono font-bold text-xl transition-all ${totalTime > 3000 ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-white/10 text-white border border-white/10'
                    }`}>
                    <Clock className="w-5 h-5" />
                    {formatTime(totalTime)}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => {
                        if (confirm("Are you sure you want to exit? Your progress may be lost.")) {
                            handleExit()
                        }
                    }}
                >
                    Exit Test
                </Button>
            </div>

            <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col">
                {/* Progress Bar */}
                <div className="w-full bg-neutral-light/10 h-2 rounded-full mb-8 relative overflow-hidden">
                    <div
                        className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    ></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                    {/* Main Question Area */}
                    <div className="lg:col-span-8 flex flex-col">
                        <Card className="p-8 flex-1 flex flex-col border-neutral-light/20 shadow-md">
                            <div className="flex justify-between items-start mb-6">
                                <div className="text-sm font-medium text-neutral-light">
                                    Question {currentQuestionIndex + 1} of {questions.length}
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="uppercase text-xs tracking-wider">
                                        {currentQ.difficulty}
                                    </Badge>
                                    <Badge className="bg-background-elevated text-neutral-light border-transparent">
                                        {currentQ.topic}
                                    </Badge>
                                </div>
                            </div>

                            <h3 className="text-xl sm:text-2xl font-medium text-neutral mb-8 leading-relaxed">
                                {currentQ.question_text}
                            </h3>

                            <div className="space-y-4">
                                {currentQ.options.map((opt) => (
                                    <div
                                        key={opt.key}
                                        onClick={() => handleAnswerSelect(currentQ.question_id, opt.key)}
                                        className={`
                                            p-5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-5 group
                                            ${currentAns?.selected === opt.key
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-neutral-light/20 hover:border-primary/50 bg-background-surface hover:bg-background-elevated'}
                                        `}
                                    >
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                                            ${currentAns?.selected === opt.key ? 'bg-primary text-white' : 'bg-neutral-light/20 text-neutral-light group-hover:bg-neutral-light/30'}
                                         `}>
                                            {opt.key}
                                        </div>
                                        <div className={`text-lg ${currentAns?.selected === opt.key ? 'text-primary font-medium' : 'text-neutral'}`}>
                                            {opt.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center mt-10 pt-6 border-t border-neutral-light/10">
                                <Button
                                    variant="secondary"
                                    onClick={goToPreviousQuestion}
                                    disabled={currentQuestionIndex === 0}
                                    className="px-6"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                                </Button>

                                {currentQuestionIndex === questions.length - 1 ? (
                                    <Button variant="primary" onClick={submitTest} size="lg" className="px-8 bg-green-600 hover:bg-green-700">
                                        Submit Test
                                    </Button>
                                ) : (
                                    <Button variant="primary" onClick={goToNextQuestion} size="lg" className="px-8">
                                        Next Question <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar / Question Palette */}
                    <div className="lg:col-span-4">
                        <Card className="p-6 sticky top-24 border-neutral-light/20 shadow-md">
                            <h3 className="font-bold text-neutral mb-6 text-sm uppercase tracking-wide flex items-center justify-between">
                                <span>Question Palette</span>
                                <span className="text-neutral-light text-xs normal-case">{Object.values(answers).filter(a => a.selected).length}/{questions.length} Answered</span>
                            </h3>
                            <div className="grid grid-cols-5 gap-2.5">
                                {questions.map((q, idx) => {
                                    const isCurrent = idx === currentQuestionIndex
                                    const isAnswered = !!answers[q.question_id]?.selected
                                    return (
                                        <button
                                            key={q.question_id}
                                            onClick={() => setCurrentQuestionIndex(idx)}
                                            className={`
                                        h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all
                                        ${isCurrent ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''}
                                        ${isAnswered
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'bg-background-elevated text-neutral-light hover:bg-neutral-light/20 hover:text-neutral'}
                                    `}
                                        >
                                            {idx + 1}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="mt-8 pt-6 border-t border-neutral-light/10 space-y-3">
                                <div className="flex items-center gap-3 text-sm text-neutral-light">
                                    <div className="w-4 h-4 rounded bg-primary shadow-sm"></div>
                                    <span>Answered</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-neutral-light">
                                    <div className="w-4 h-4 rounded bg-background-elevated border border-neutral-light/10"></div>
                                    <span>Not Answered</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-neutral-light">
                                    <div className="w-4 h-4 rounded ring-2 ring-primary bg-background-elevated"></div>
                                    <span>Current Question</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Blocked modal: no alert, ask for Dept TPC Test Approvals */}
            <Modal
                isOpen={showBlockedModal}
                onClose={() => {
                    setShowBlockedModal(false)
                    handleExit()
                }}
                title="Test blocked"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-neutral-dark">
                        You have been blocked due to a tab switch. Request retake approval from your Department TPC (Test Approvals).
                    </p>
                    <div className="flex justify-end">
                        <Button
                            onClick={() => {
                                setShowBlockedModal(false)
                                handleExit()
                            }}
                            variant="primary"
                        >
                            OK
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
