'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getAuthHeader } from '@/utils/auth'
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Trophy,
    Clock,
    Target,
    Brain,
    Calendar,
    Award,
    AlertTriangle,
    CheckCircle2,
    BarChart3,
} from 'lucide-react'

interface PracticeHistoryData {
    overview: {
        totalAttempts: number
        averageScore: number
        bestScore: number
        totalTimeSpent: number
        currentStreak: number
        improvementRate: number
    }
    byWeek: Array<{
        week: number
        attempts: number
        averageScore: number
        bestScore: number
        timeSpent: number
    }>
    byDifficulty: {
        easy: { attempted: number; correct: number; accuracy: number }
        medium: { attempted: number; correct: number; accuracy: number }
        hard: { attempted: number; correct: number; accuracy: number }
        expert: { attempted: number; correct: number; accuracy: number }
    }
    weakTopics: Array<{
        topic: string
        attempted: number
        correct: number
        accuracy: number
    }>
    strongTopics: Array<{
        topic: string
        attempted: number
        correct: number
        accuracy: number
    }>
    recentTests: Array<{
        _id: string
        week: number
        day: string
        score: number
        total_questions: number
        correct_answers: number
        time_spent: number
        completed_at: string
    }>
    progressTrend: {
        direction: 'improving' | 'stable' | 'declining'
        percentage: number
        comparison: string
    }
}

export default function PracticeAnalyticsPage() {
    const router = useRouter()
    const [data, setData] = useState<PracticeHistoryData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchPracticeHistory()
    }, [])

    const fetchPracticeHistory = async () => {
        try {
            setIsLoading(true)
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

            const authHeader = getAuthHeader()
            const response = await fetch(`${apiBaseUrl}/student/practice-history`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeader ? { Authorization: authHeader } : {}),
                },
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success && result.data) {
                    setData(result.data)
                }
            } else {
                console.error('Failed to fetch practice history:', response.statusText)
            }
        } catch (error) {
            console.error('Error fetching practice history:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${Math.round(minutes)} min`
        const hours = Math.floor(minutes / 60)
        const mins = Math.round(minutes % 60)
        return `${hours}h ${mins}m`
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getAccuracyColor = (accuracy: number) => {
        if (accuracy >= 80) return 'text-green-600'
        if (accuracy >= 60) return 'text-yellow-600'
        return 'text-red-600'
    }

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 'bg-green-100 text-green-800'
            case 'medium': return 'bg-yellow-100 text-yellow-800'
            case 'hard': return 'bg-orange-100 text-orange-800'
            case 'expert': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (isLoading) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                    <Card className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-neutral-light">Loading your practice analytics...</p>
                    </Card>
                </div>
            </StudentLayout>
        )
    }

    if (!data || data.overview.totalAttempts === 0) {
        return (
            <StudentLayout>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Card className="p-12 text-center">
                        <Brain className="w-16 h-16 text-neutral-light/40 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-neutral mb-2">No Practice Data Yet</h3>
                        <p className="text-neutral-light mb-6">Start practicing to see your progress and analytics!</p>
                        <button
                            onClick={() => router.push('/student/practice')}
                            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-all"
                        >
                            Start Practicing
                        </button>
                    </Card>
                </div>
            </StudentLayout>
        )
    }

    const { overview, byWeek, byDifficulty, weakTopics, strongTopics, recentTests, progressTrend } = data

    return (
        <StudentLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-neutral mb-2">Practice Analytics</h1>
                    <p className="text-neutral-light">Track your progress and identify areas for improvement</p>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-neutral-light">Total Attempts</span>
                            <Target className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-3xl font-bold text-neutral">{overview.totalAttempts}</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-neutral-light">Average Score</span>
                            <BarChart3 className="w-5 h-5 text-secondary" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-neutral">{overview.averageScore}%</p>
                            {progressTrend.direction === 'improving' && (
                                <span className="flex items-center gap-1 text-green-600 text-sm">
                                    <TrendingUp className="w-4 h-4" />
                                    +{progressTrend.percentage}%
                                </span>
                            )}
                            {progressTrend.direction === 'declining' && (
                                <span className="flex items-center gap-1 text-red-600 text-sm">
                                    <TrendingDown className="w-4 h-4" />
                                    -{progressTrend.percentage}%
                                </span>
                            )}
                            {progressTrend.direction === 'stable' && (
                                <span className="flex items-center gap-1 text-gray-600 text-sm">
                                    <Minus className="w-4 h-4" />
                                </span>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-neutral-light">Best Score</span>
                            <Trophy className="w-5 h-5 text-yellow-600" />
                        </div>
                        <p className="text-3xl font-bold text-neutral">{overview.bestScore}%</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-neutral-light">Time Spent</span>
                            <Clock className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-3xl font-bold text-neutral">{formatTime(overview.totalTimeSpent)}</p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Progress Trend */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-neutral mb-4 flex items-center gap-2">
                            {progressTrend.direction === 'improving' && <TrendingUp className="w-5 h-5 text-green-600" />}
                            {progressTrend.direction === 'declining' && <TrendingDown className="w-5 h-5 text-red-600" />}
                            {progressTrend.direction === 'stable' && <Minus className="w-5 h-5 text-gray-600" />}
                            Progress Trend
                        </h3>
                        <div className="text-center py-6">
                            <p className={`text-4xl font-bold ${progressTrend.direction === 'improving' ? 'text-green-600' :
                                progressTrend.direction === 'declining' ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                {progressTrend.direction === 'improving' && '+'}
                                {progressTrend.direction === 'declining' && '-'}
                                {progressTrend.percentage}%
                            </p>
                            <p className="text-neutral-light mt-2 capitalize">
                                You are <span className="font-semibold">{progressTrend.direction}</span>
                            </p>
                        </div>
                    </Card>

                    {/* Current Streak */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-neutral mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-orange-600" />
                            Practice Streak
                        </h3>
                        <div className="text-center py-6">
                            <p className="text-4xl font-bold text-orange-600">{overview.currentStreak}</p>
                            <p className="text-neutral-light mt-2">
                                {overview.currentStreak === 1 ? 'Day' : 'Days'} in a row!
                            </p>
                            {overview.currentStreak >= 7 && (
                                <Badge variant="success" className="mt-4">🔥 On Fire!</Badge>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Performance by Difficulty */}
                <Card className="p-6 mb-6">
                    <h3 className="text-lg font-semibold text-neutral mb-4">Performance by Difficulty</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {Object.entries(byDifficulty).map(([difficulty, stats]) => (
                            <div key={difficulty} className="border border-neutral-light/20 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant="default" className={getDifficultyColor(difficulty)}>
                                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                                    </Badge>
                                    <span className={`text-2xl font-bold ${getAccuracyColor(stats.accuracy)}`}>
                                        {stats.accuracy}%
                                    </span>
                                </div>
                                <div className="text-sm text-neutral-light space-y-1">
                                    <p>Attempted: {stats.attempted}</p>
                                    <p>Correct: {stats.correct}</p>
                                </div>
                                <div className="mt-2 bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${stats.accuracy >= 80 ? 'bg-green-600' :
                                            stats.accuracy >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                                            }`}
                                        style={{ width: `${stats.accuracy}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Week-by-Week Progress */}
                <Card className="p-6 mb-6">
                    <h3 className="text-lg font-semibold text-neutral mb-4">Week-by-Week Progress</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-light/20">
                                    <th className="text-left p-3 text-sm font-semibold text-neutral">Week</th>
                                    <th className="text-left p-3 text-sm font-semibold text-neutral">Attempts</th>
                                    <th className="text-left p-3 text-sm font-semibold text-neutral">Avg Score</th>
                                    <th className="text-left p-3 text-sm font-semibold text-neutral">Best Score</th>
                                    <th className="text-left p-3 text-sm font-semibold text-neutral">Time Spent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byWeek.map((week) => (
                                    <tr key={week.week} className="border-b border-neutral-light/10 hover:bg-background-surface">
                                        <td className="p-3 text-sm font-medium text-neutral">Week {week.week}</td>
                                        <td className="p-3 text-sm text-neutral-light">{week.attempts}</td>
                                        <td className="p-3 text-sm">
                                            <Badge variant={week.averageScore >= 80 ? 'success' : week.averageScore >= 60 ? 'warning' : 'error'}>
                                                {week.averageScore}%
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-sm text-neutral-light">{week.bestScore}%</td>
                                        <td className="p-3 text-sm text-neutral-light">{formatTime(week.timeSpent)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Weak Topics */}
                    {weakTopics.length > 0 && (
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-neutral mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                Topics to Focus On
                            </h3>
                            <div className="space-y-3">
                                {weakTopics.map((topic, idx) => (
                                    <div key={idx} className="border border-neutral-light/20 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-neutral">{topic.topic}</span>
                                            <span className="text-lg font-bold text-red-600">{topic.accuracy}%</span>
                                        </div>
                                        <div className="text-xs text-neutral-light mb-2">
                                            {topic.correct} / {topic.attempted} correct
                                        </div>
                                        <div className="bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-red-600 h-2 rounded-full"
                                                style={{ width: `${topic.accuracy}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Strong Topics */}
                    {strongTopics.length > 0 && (
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-neutral mb-4 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                Your Strong Areas
                            </h3>
                            <div className="space-y-3">
                                {strongTopics.map((topic, idx) => (
                                    <div key={idx} className="border-neutral-light/20 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-neutral">{topic.topic}</span>
                                            <span className="text-lg font-bold text-green-600">{topic.accuracy}%</span>
                                        </div>
                                        <div className="text-xs text-neutral-light mb-2">
                                            {topic.correct} / {topic.attempted} correct
                                        </div>
                                        <div className="bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-600 h-2 rounded-full"
                                                style={{ width: `${topic.accuracy}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Recent Practice Tests */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-neutral mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Recent Practice Tests
                    </h3>
                    <div className="space-y-3">
                        {recentTests.map((test) => (
                            <div
                                key={test._id}
                                className="flex items-center justify-between p-4 border border-neutral-light/20 rounded-lg hover:bg-background-surface transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <Badge variant={test.score >= 80 ? 'success' : test.score >= 60 ? 'warning' : 'error'}>
                                        {test.score}%
                                    </Badge>
                                    <div>
                                        <p className="text-sm font-medium text-neutral">
                                            Week {test.week} - {test.day}
                                        </p>
                                        <p className="text-xs text-neutral-light">
                                            {test.correct_answers}/{test.total_questions} correct • {formatTime(test.time_spent)}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-neutral-light">{formatDate(test.completed_at)}</span>
                            </div>
                        ))}
                    </div>

                    {recentTests.length > 0 && (
                        <button
                            onClick={() => router.push('/student/tests/practice-history')}
                            className="mt-4 w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-semibold transition-all"
                        >
                            View All Tests
                        </button>
                    )}
                </Card>
            </div>
        </StudentLayout>
    )
}
