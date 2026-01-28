'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    XCircle,
    HelpCircle,
    Brain,
    Trophy,
    RotateCcw,
    ChevronRight,
    ChevronLeft,
    BookOpen,
    AlertCircle,
    Target,
    Calculator,
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
    category: string
}

interface AnswerState {
    [questionId: string]: {
        selected: string
        isCorrect: boolean | null
        timeSpent: number
    }
}

/**
 * Aptitude Week 1 Practice Test Page
 * Route: /student/practice/aptitude-week-1?day=day-1|day-2|day-3|day-4|day-5
 */
function AptitudeWeek5PracticeContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [day, setDay] = useState<string>('day-1')
    const [questions, setQuestions] = useState<Question[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<AnswerState>({})
    const [showResults, setShowResults] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [totalTime, setTotalTime] = useState(0)
    const [testStarted, setTestStarted] = useState(false)
    const [questionStartTimes, setQuestionStartTimes] = useState<{ [questionId: string]: number }>({})

    const days = {
        'day-1': { label: 'Day 1', title: 'Integers – Understanding Numbers Above & Below Zero' },
        'day-2': { label: 'Day 2', title: 'Factors – Breaking Numbers Into Building Blocks' },
        'day-3': { label: 'Day 3', title: 'Divisibility – Checking Without Division' },
        'day-4': { label: 'Day 4', title: 'HCF & LCM – Sharing and Grouping' },
        'day-5': { label: 'Day 5', title: 'BODMAS/VBODMAS – Discipline in Calculation' },
    }

    useEffect(() => {
        const dayParam = searchParams.get('day') || 'day-1'
        setDay(dayParam)
        fetchQuestions(dayParam)
    }, [searchParams])

    useEffect(() => {
        if (testStarted && startTime) {
            const interval = setInterval(() => {
                setTotalTime(Math.floor((Date.now() - startTime) / 1000))
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [testStarted, startTime])

    const fetchQuestions = async (dayParam: string) => {
        try {
            setIsLoading(true)
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            // Extract day number from 'day-1' format
            const dayNum = dayParam.replace('day-', '')

            const response = await fetch(`${apiBaseUrl}/questions/aptitude-practice`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || '',
                },
                body: JSON.stringify({ week: 5, day: parseInt(dayNum) }),
            })

            if (response.ok) {
                const data = await response.json()
                console.log('[Practice] Aptitude questions response:', data)

                if (data.success && data.data && data.data.questions) {
                    setQuestions(data.data.questions)

                    // Initialize answer state
                    const initialAnswers: AnswerState = {}
                    data.data.questions.forEach((q: Question) => {
                        initialAnswers[q.question_id] = {
                            selected: '',
                            isCorrect: null,
                            timeSpent: 0,
                        }
                    })
                    setAnswers(initialAnswers)
                } else {
                    console.error('[Practice] No questions in response')
                    setQuestions([])
                }
            } else {
                console.error('[Practice] Failed to fetch questions:', response.status)
                setQuestions([])
            }
        } catch (error) {
            console.error('Error fetching aptitude questions:', error)
            setQuestions([])
        } finally {
            setIsLoading(false)
        }
    }

    const startTest = () => {
        setTestStarted(true)
        const now = Date.now()
        setStartTime(now)

        if (questions.length > 0) {
            setQuestionStartTimes({
                [questions[0].question_id]: now
            })
        }
    }

    const handleAnswerSelect = (questionId: string, selectedAnswer: string) => {
        const question = questions.find(q => q.question_id === questionId)
        if (!question) return

        const isCorrect = selectedAnswer === question.correct_answer
        const questionStartTime = questionStartTimes[questionId] || Date.now()
        const timeSpentOnQuestion = Math.floor((Date.now() - questionStartTime) / 1000)
        const previousTimeSpent = answers[questionId]?.timeSpent || 0
        const totalTimeSpent = previousTimeSpent + timeSpentOnQuestion

        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                selected: selectedAnswer,
                isCorrect,
                timeSpent: totalTimeSpent,
            },
        }))
    }

    const goToNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1
            setCurrentQuestionIndex(nextIndex)

            const nextQuestion = questions[nextIndex]
            if (nextQuestion && testStarted) {
                setQuestionStartTimes(prev => ({
                    ...prev,
                    [nextQuestion.question_id]: Date.now()
                }))
            }
        }
    }

    const goToPreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            const prevIndex = currentQuestionIndex - 1
            setCurrentQuestionIndex(prevIndex)

            const prevQuestion = questions[prevIndex]
            if (prevQuestion && testStarted) {
                setQuestionStartTimes(prev => ({
                    ...prev,
                    [prevQuestion.question_id]: Date.now()
                }))
            }
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

                const optionText = q.options?.find(opt => opt.key === answerState?.selected)?.text || ''

                return {
                    question_id: q.question_id,
                    question: q.question_text,
                    selected_answer: optionText,
                    correct_answer: q.correct_answer,
                    is_correct: isCorrect,
                    time_spent: answerState?.timeSpent || 0,
                    question_type: q.difficulty || 'medium',
                    question_topic: [q.topic || 'Aptitude'],
                    question_subtopic: q.topic || 'General',
                    explanation: q.explanation || '',
                    options: q.options?.map(opt => opt.text) || []
                }
            })

            // Save practice test
            await fetch(`${apiBaseUrl}/practice-test/save`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || '',
                },
                body: JSON.stringify({
                    week: 1,
                    day: day,
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
            console.error('Error saving practice test:', error)
        }
    }

    const resetTest = () => {
        setShowResults(false)
        setCurrentQuestionIndex(0)
        setTestStarted(false)
        setStartTime(null)
        setTotalTime(0)
        const initialAnswers: AnswerState = {}
        questions.forEach(q => {
            initialAnswers[q.question_id] = {
                selected: '',
                isCorrect: null,
                timeSpent: 0,
            }
        })
        setAnswers(initialAnswers)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getScore = () => {
        const correct = Object.values(answers).filter(a => a.isCorrect === true).length
        const total = questions.length
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
        return { correct, total, percentage }
    }

    const getDifficultyColor = (difficulty: string) => {
        const lowerDiff = difficulty?.toLowerCase() || 'medium'
        switch (lowerDiff) {
            case 'easy':
                return 'bg-green-500/20 text-green-600 border-green-500/30'
            case 'medium':
                return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
            case 'hard':
            case 'expert':
                return 'bg-red-500/20 text-red-600 border-red-500/30'
            default:
                return 'bg-neutral-light/20 text-neutral-light'
        }
    }

    if (isLoading) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                    <Card className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                        <p className="text-neutral-light">Loading aptitude questions...</p>
                    </Card>
                </div>
            </StudentLayout>
        )
    }

    if (questions.length === 0) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                    <Card className="p-12 text-center max-w-md">
                        <Calculator className="w-16 h-16 text-neutral-light mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-neutral mb-2">No Questions Available</h2>
                        <p className="text-neutral-light mb-4">
                            Aptitude questions for {days[day as keyof typeof days]?.title} are not available yet.
                        </p>
                        <button
                            onClick={() => router.push(`/student/study/aptitude-week-1?day=${day}`)}
                            className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
                        >
                            Back to Study
                        </button>
                    </Card>
                </div>
            </StudentLayout>
        )
    }

    // Results View
    if (showResults) {
        const { correct, total, percentage } = getScore()

        return (
            <StudentLayout>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Card className="mb-6 bg-gradient-to-r from-accent/10 to-secondary/10 border-accent/30">
                        <div className="p-8 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/20 mb-4">
                                <Trophy className="w-10 h-10 text-accent" />
                            </div>
                            <h1 className="text-3xl font-bold text-neutral mb-2">Test Completed!</h1>
                            <p className="text-lg text-neutral-light mb-6">
                                {days[day as keyof typeof days]?.title}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                                <div className="bg-background-surface rounded-lg p-4 border border-neutral-light/20">
                                    <div className="text-3xl font-bold text-accent mb-1">{correct}/{total}</div>
                                    <div className="text-sm text-neutral-light">Correct Answers</div>
                                </div>
                                <div className="bg-background-surface rounded-lg p-4 border border-neutral-light/20">
                                    <div className="text-3xl font-bold text-secondary mb-1">{percentage}%</div>
                                    <div className="text-sm text-neutral-light">Score</div>
                                </div>
                                <div className="bg-background-surface rounded-lg p-4 border border-neutral-light/20">
                                    <div className="text-3xl font-bold text-neutral mb-1">{formatTime(totalTime)}</div>
                                    <div className="text-sm text-neutral-light">Time Taken</div>
                                </div>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={resetTest}
                                    className="px-6 py-3 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    Retake Test
                                </button>
                                <button
                                    onClick={() => router.push(`/student/study/aptitude-week-1?day=${day}`)}
                                    className="px-6 py-3 bg-background-elevated hover:bg-background-elevated/80 text-neutral rounded-lg font-semibold transition-all flex items-center gap-2"
                                >
                                    <BookOpen className="w-5 h-5" />
                                    Review Study Material
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            </StudentLayout>
        )
    }

    // Test View
    if (!testStarted) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                    <Card className="p-8 max-w-2xl w-full">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 rounded-lg bg-accent/20">
                                <Calculator className="w-12 h-12 text-accent" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-neutral">Aptitude Practice Test</h1>
                                <p className="text-neutral-light">{days[day as keyof typeof days]?.title}</p>
                            </div>
                        </div>

                        <div className="mb-6 p-4 bg-background-surface rounded-lg border border-neutral-light/20">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-neutral-light">Total Questions</p>
                                    <p className="text-2xl font-bold text-neutral">{questions.length}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-light">Category</p>
                                    <p className="text-2xl font-bold text-accent">Aptitude</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={startTest}
                            className="w-full px-6 py-4 bg-accent hover:bg-accent/80 text-white rounded-lg font-bold text-lg transition-all"
                        >
                            Start Practice Test
                        </button>

                        <button
                            onClick={() => router.push(`/student/study/aptitude-week-1?day=${day}`)}
                            className="w-full mt-3 px-6 py-3 bg-background-elevated hover:bg-background-elevated/80 text-neutral rounded-lg font-semibold transition-all"
                        >
                            Back to Study
                        </button>
                    </Card>
                </div>
            </StudentLayout>
        )
    }

    // Question View
    const currentQuestion = questions[currentQuestionIndex]
    const currentAnswer = answers[currentQuestion?.question_id]

    return (
        <StudentLayout>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-accent/20">
                            <Calculator className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-neutral">Aptitude Practice</h1>
                            <p className="text-sm text-neutral-light">{days[day as keyof typeof days]?.title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-background-surface rounded-lg">
                            <Clock className="w-5 h-5 text-accent" />
                            <span className="font-mono font-semibold text-neutral">{formatTime(totalTime)}</span>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-neutral-light">
                            Question {currentQuestionIndex + 1} of {questions.length}
                        </span>
                        <span className="text-sm font-medium text-neutral-light">
                            {Object.values(answers).filter(a => a.selected).length} Answered
                        </span>
                    </div>
                    <div className="h-2 bg-background-surface rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Question Card */}
                <Card className="mb-6">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-accent text-white">
                                {currentQuestionIndex + 1}
                            </div>
                            <Badge className={getDifficultyColor(currentQuestion?.difficulty)}>
                                {currentQuestion?.difficulty || 'Medium'}
                            </Badge>
                            {currentQuestion?.topic && (
                                <Badge className="bg-background-surface text-neutral-light">
                                    {currentQuestion.topic}
                                </Badge>
                            )}
                        </div>

                        <p className="text-xl font-semibold text-neutral mb-6">
                            {currentQuestion?.question_text}
                        </p>

                        <div className="space-y-3">
                            {currentQuestion?.options?.map((option, idx) => {
                                const isSelected = currentAnswer?.selected === option.key

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswerSelect(currentQuestion.question_id, option.key)}
                                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${isSelected
                                            ? 'bg-accent/20 border-accent text-neutral'
                                            : 'bg-background-elevated border-neutral-light/20 hover:border-accent/50 text-neutral-light'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${isSelected
                                                ? 'bg-accent text-white'
                                                : 'bg-neutral-light/30 text-neutral-light'
                                                }`}>
                                                {option.key}
                                            </div>
                                            <span className="flex-1">{option.text}</span>
                                            {isSelected && <CheckCircle2 className="w-5 h-5 text-accent" />}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={goToPreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        className="flex items-center gap-2 px-6 py-3 bg-background-elevated hover:bg-background-elevated/80 text-neutral rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Previous
                    </button>

                    {currentQuestionIndex === questions.length - 1 ? (
                        <button
                            onClick={submitTest}
                            className="px-8 py-3 bg-accent hover:bg-accent/80 text-white rounded-lg font-bold transition-all"
                        >
                            Submit Test
                        </button>
                    ) : (
                        <button
                            onClick={goToNextQuestion}
                            className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all"
                        >
                            Next
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </StudentLayout>
    )
}

export default function AptitudeWeek5PracticePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>}>
            <AptitudeWeek5PracticeContent />
        </Suspense>
    )
}
