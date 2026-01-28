'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
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

    // Fetch questions on mount
    useEffect(() => {
        if (weekId) {
            fetchQuestions()
        }
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
                    // Shuffle questions for randomness each time? Or keep static?
                    // Let's shuffle slightly to make it feel fresh, or keep order if strict.
                    // For now, use as is.
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
        // Here you would typically save the result to the backend
        // await saveTestResult(...)
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

    if (isLoading) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-neutral-light">Loading Test Questions...</p>
                    </div>
                </div>
            </StudentLayout>
        )
    }

    // Start Screen
    if (!testStarted && !showResults) {
        return (
            <StudentLayout>
                <div className="max-w-2xl mx-auto px-4 py-12">
                    <header className="mb-8">
                        <Link href="/student/aptitude/weekly" className="text-sm text-neutral-light hover:text-primary flex items-center gap-1 mb-4">
                            <ArrowLeft className="w-4 h-4" /> Back to Tests
                        </Link>
                    </header>
                    <Card className="p-8 text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                            <Calculator className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-neutral mb-2">Week {weekId} Aptitude Test</h1>
                        <p className="text-neutral-light mb-8">
                            You are about to start a comprehensive assessment.
                        </p>

                        <div className="grid grid-cols-3 gap-4 mb-8 text-left">
                            <div className="p-4 bg-background-surface rounded-lg border border-neutral-light/10">
                                <p className="text-xs text-neutral-light uppercase tracking-wide">Questions</p>
                                <p className="text-xl font-bold text-neutral">{questions.length}</p>
                            </div>
                            <div className="p-4 bg-background-surface rounded-lg border border-neutral-light/10">
                                <p className="text-xs text-neutral-light uppercase tracking-wide">Duration</p>
                                <p className="text-xl font-bold text-neutral">60 Mins</p>
                            </div>
                            <div className="p-4 bg-background-surface rounded-lg border border-neutral-light/10">
                                <p className="text-xs text-neutral-light uppercase tracking-wide">Passing Score</p>
                                <p className="text-xl font-bold text-neutral">70%</p>
                            </div>
                        </div>

                        <Button onClick={startTest} className="w-full py-6 text-lg" variant="primary">
                            Start Assessment
                        </Button>
                    </Card>
                </div>
            </StudentLayout>
        )
    }

    // Results Screen
    if (showResults) {
        const { correct, total, percentage } = getScore()
        return (
            <StudentLayout>
                <div className="max-w-3xl mx-auto px-4 py-12">
                    <Card className="p-8 text-center">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-neutral mb-2">Test Completed</h1>
                            <p className="text-neutral-light">Here is how you performed on Week {weekId} Test</p>
                        </div>

                        <div className="flex items-center justify-center mb-8">
                            <div className="relative w-40 h-40 flex items-center justify-center">
                                {/* Simple circular progress visualization could go here */}
                                <div className="text-4xl font-bold text-primary">{percentage}%</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                                <p className="text-sm text-green-600 mb-1">Correct</p>
                                <p className="text-2xl font-bold text-green-700">{correct}</p>
                            </div>
                            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                <p className="text-sm text-red-600 mb-1">Incorrect</p>
                                <p className="text-2xl font-bold text-red-700">{total - correct}</p>
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <p className="text-sm text-blue-600 mb-1">Time Taken</p>
                                <p className="text-2xl font-bold text-blue-700">{formatTime(totalTime)}</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Link href="/student/aptitude/weekly" className="flex-1">
                                <Button variant="secondary" className="w-full">
                                    Back to List
                                </Button>
                            </Link>
                            {/* 
                          <Button variant="primary" className="flex-1" onClick={() => window.location.reload()}>
                              Retake Test
                          </Button> 
                          */}
                        </div>
                    </Card>
                </div>
            </StudentLayout>
        )
    }

    // Active Test UI
    const currentQ = questions[currentQuestionIndex]
    const currentAns = answers[currentQ.question_id]

    return (
        <StudentLayout>
            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Top Bar */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-neutral">Week {weekId} Assessment</h2>
                        <div className="text-sm text-neutral-light">Question {currentQuestionIndex + 1} of {questions.length}</div>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold ${totalTime > 3000 ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                        <Clock className="w-4 h-4" />
                        {formatTime(totalTime)}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-neutral-light/10 h-2 rounded-full mb-6 relative">
                    <div
                        className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    ></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Question Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="p-6">
                            <div className="flex gap-2 mb-4">
                                <Badge variant="secondary" className="uppercase text-xs tracking-wider">
                                    {currentQ.difficulty}
                                </Badge>
                                <Badge className="bg-background-elevated text-neutral-light border-transparent">
                                    {currentQ.topic}
                                </Badge>
                            </div>
                            <h3 className="text-lg sm:text-xl font-medium text-neutral mb-8 leading-relaxed">
                                {currentQ.question_text}
                            </h3>

                            <div className="space-y-3">
                                {currentQ.options.map((opt) => (
                                    <div
                                        key={opt.key}
                                        onClick={() => handleAnswerSelect(currentQ.question_id, opt.key)}
                                        className={`
                                    p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-4
                                    ${currentAns?.selected === opt.key
                                                ? 'border-primary bg-primary/5'
                                                : 'border-neutral-light/20 hover:border-primary/50 bg-background-surface'}
                                `}
                                    >
                                        <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                    ${currentAns?.selected === opt.key ? 'bg-primary text-white' : 'bg-neutral-light/20 text-neutral-light'}
                                 `}>
                                            {opt.key}
                                        </div>
                                        <div className="text-neutral">{opt.text}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <div className="flex justify-between items-center">
                            <Button
                                variant="secondary"
                                onClick={goToPreviousQuestion}
                                disabled={currentQuestionIndex === 0}
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                            </Button>

                            {currentQuestionIndex === questions.length - 1 ? (
                                <Button variant="primary" onClick={submitTest}>
                                    Submit Test
                                </Button>
                            ) : (
                                <Button variant="primary" onClick={goToNextQuestion}>
                                    Next Question <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Sidebar / Question Palette */}
                    <div className="hidden lg:block">
                        <Card className="p-4">
                            <h3 className="font-bold text-neutral mb-4 text-sm uppercase tracking-wide">Question Palette</h3>
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((q, idx) => {
                                    const isCurrent = idx === currentQuestionIndex
                                    const isAnswered = !!answers[q.question_id]?.selected
                                    return (
                                        <button
                                            key={q.question_id}
                                            onClick={() => setCurrentQuestionIndex(idx)}
                                            className={`
                                        h-8 w-8 rounded flex items-center justify-center text-xs font-bold transition-all
                                        ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
                                        ${isAnswered ? 'bg-primary text-white' : 'bg-background-elevated text-neutral-light hover:bg-neutral-light/20'}
                                    `}
                                        >
                                            {idx + 1}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="mt-8 pt-6 border-t border-neutral-light/10 space-y-3">
                                <div className="flex items-center gap-3 text-xs text-neutral-light">
                                    <div className="w-4 h-4 rounded bg-primary"></div>
                                    <span>Answered</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-neutral-light">
                                    <div className="w-4 h-4 rounded bg-background-elevated"></div>
                                    <span>Not Answered</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-neutral-light">
                                    <div className="w-4 h-4 rounded ring-2 ring-primary"></div>
                                    <span>Current</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </StudentLayout>
    )
}
