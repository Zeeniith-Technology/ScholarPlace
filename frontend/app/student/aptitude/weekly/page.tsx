'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
    Calendar,
    Clock,
    CheckCircle2,
    Lock,
    Play,
    ArrowLeft,
    Calculator,
    Target,
    RotateCcw
} from 'lucide-react'
import { getAuthHeader } from '@/utils/auth'
import { cn } from '@/lib/utils'

export default function WeeklyAptitudeTestsPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [weekEligibility, setWeekEligibility] = useState<{ [key: number]: any }>({})

    // Weekly Test Configuration
    const weeklyTests = [
        {
            id: 1,
            weekNumber: 1,
            title: 'Week 1: Numbers & Operations',
            topics: ['Integers', 'Factors', 'Divisibility', 'HCF/LCM', 'BODMAS'],
            questionCount: 50,
            duration: '60 mins',
            difficulty: 'Medium',
            color: 'primary'
        },
        {
            id: 2,
            weekNumber: 2,
            title: 'Week 2: Advanced Percentages',
            topics: ['Percentages', 'Profit & Loss', 'Discounts', 'Simple Interest'],
            questionCount: 50,
            duration: '60 mins',
            difficulty: 'Medium',
            color: 'secondary'
        },
        {
            id: 3,
            weekNumber: 3,
            title: 'Week 3: Ratios & Mixtures',
            topics: ['Ratio & Proportion', 'Mixtures & Alligation', 'Averages'],
            questionCount: 50,
            duration: '60 mins',
            difficulty: 'Hard',
            color: 'accent'
        },
        {
            id: 4,
            weekNumber: 4,
            title: 'Week 4: Time & Speed',
            topics: ['Time Speed Distance', 'Trains', 'Boats & Streams'],
            questionCount: 50,
            duration: '60 mins',
            difficulty: 'Hard',
            color: 'primary'
        },
        {
            id: 5,
            weekNumber: 5,
            title: 'Week 5: Interest & Work',
            topics: ['Compound Interest', 'Time & Work', 'Pipes & Cisterns'],
            questionCount: 50,
            duration: '60 mins',
            difficulty: 'Medium',
            color: 'secondary'
        },
        {
            id: 6,
            weekNumber: 6,
            title: 'Week 6: Advanced Applications',
            topics: ['Permutations', 'Combinations', 'Probability', 'Data Interpretation'],
            questionCount: 50,
            duration: '60 mins',
            difficulty: 'Expert',
            color: 'accent'
        }
    ]

    // Check eligibility for all weeks
    const checkAllWeekEligibility = async () => {
        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) {
                console.error('[WeeklyTestEligibility] No auth token found')
                setIsLoading(false)
                return
            }

            // Check eligibility for each week
            const eligibilityPromises = weeklyTests.map(async (test) => {
                try {
                    const response = await fetch(`${apiBaseUrl}/student-progress/check-weekly-test-eligibility`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': authHeader,
                        },
                        body: JSON.stringify({ week: test.weekNumber }),
                    })

                    if (response.ok) {
                        const data = await response.json()
                        if (data.success && data.data) {
                            return { weekNumber: test.weekNumber, ...data.data }
                        }
                    }
                    return { weekNumber: test.weekNumber, eligible: false }
                } catch (error) {
                    console.error(`Error checking eligibility for week ${test.weekNumber}:`, error)
                    return { weekNumber: test.weekNumber, eligible: false }
                }
            })

            const results = await Promise.all(eligibilityPromises)
            const eligibilityMap: { [key: number]: any } = {}
            results.forEach(result => {
                eligibilityMap[result.weekNumber] = result
            })

            setWeekEligibility(eligibilityMap)
        } catch (error) {
            console.error('Error checking week eligibility:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        checkAllWeekEligibility()
    }, [])

    return (
        <StudentLayout>
            <div className="max-w-7xl mx-auto space-y-6 px-4 py-6">
                {/* Header */}
                <div>
                    <Link
                        href="/student/dashboard"
                        className="inline-flex items-center text-sm text-neutral-light hover:text-primary mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold font-heading text-neutral">Weekly Aptitude Tests</h1>
                    <p className="text-neutral-light mt-2 max-w-3xl">
                        Comprehensive weekly assessments to track your quantitative aptitude progress.
                        Each test consists of 50 questions to be completed in 60 minutes.
                    </p>
                </div>

                {/* Stats Summary - Placeholder for now */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 flex items-center gap-4 bg-primary/5 border-primary/20">
                        <div className="p-3 bg-primary/20 rounded-full text-primary">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-neutral">6 Tests</h3>
                            <p className="text-sm text-neutral-light">Total Assessments</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4 bg-secondary/5 border-secondary/20">
                        <div className="p-3 bg-secondary/20 rounded-full text-secondary">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-neutral">Weekly</h3>
                            <p className="text-sm text-neutral-light">Schedule</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4 bg-accent/5 border-accent/20">
                        <div className="p-3 bg-accent/20 rounded-full text-accent">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-neutral">300 Qs</h3>
                            <p className="text-sm text-neutral-light">Total Questions</p>
                        </div>
                    </Card>
                </div>

                {/* Tests Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {weeklyTests.map((test) => {
                        const eligibility = weekEligibility[test.weekNumber]
                        const isEligible = eligibility?.eligible || false
                        const isLoaded = !isLoading && eligibility !== undefined

                        // Test mode override for development
                        const testMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true' || process.env.NODE_ENV === 'development'
                        const canStartTest = testMode || isEligible

                        return (
                            <Card key={test.id} className={cn(
                                "flex flex-col h-full transition-all duration-300",
                                canStartTest ? "hover:shadow-lg" : "opacity-75"
                            )}>
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <Badge variant="secondary" className="mb-2 uppercase tracking-wide text-xs">
                                                Week {test.id}
                                            </Badge>
                                            <h3 className="text-xl font-bold text-neutral">{test.title}</h3>
                                        </div>
                                        <div className="flex flex-col gap-2 items-end">
                                            <Badge className={`bg-${test.color}/10 text-${test.color} border-${test.color}/20`}>
                                                {test.difficulty}
                                            </Badge>
                                            {isLoaded && (
                                                <div className="flex flex-col gap-2 items-end">
                                                    {eligibility?.weekly_test_status?.passed ? (
                                                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Completed ({eligibility.weekly_test_status.score}%)
                                                        </Badge>
                                                    ) : eligibility?.weekly_test_status?.attempted ? (
                                                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Score: {eligibility.weekly_test_status.score}%
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant={canStartTest ? "default" : "secondary"} className="flex items-center gap-1">
                                                            {canStartTest ? (
                                                                <>
                                                                    <Play className="w-3 h-3" />
                                                                    Unlocked
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Lock className="w-3 h-3" />
                                                                    Locked
                                                                </>
                                                            )}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div className="flex items-center gap-6 text-sm text-neutral-light border-t border-neutral-light/10 pt-4">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {test.duration}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Target className="w-4 h-4" />
                                                {test.questionCount} Questions
                                            </div>
                                        </div>

                                        {/* Eligibility Requirements (if locked) */}
                                        {isLoaded && !canStartTest && eligibility && (
                                            <div className="mt-4 p-3 bg-background-elevated rounded-lg border border-neutral-light/10">
                                                <div className="flex items-start gap-2">
                                                    <Lock className="w-4 h-4 text-neutral-light mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-neutral mb-2">
                                                            Complete these requirements:
                                                        </p>

                                                        {/* Practice Tests */}
                                                        {eligibility.practice_tests && (
                                                            <div className="mb-2">
                                                                <p className="text-xs text-neutral-light mb-1">
                                                                    Practice Tests (score ≥ 70%):
                                                                </p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {eligibility.practice_tests.missing?.length > 0 && (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            {eligibility.practice_tests.missing.length} missing
                                                                        </Badge>
                                                                    )}
                                                                    {eligibility.practice_tests.failed?.length > 0 && (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            {eligibility.practice_tests.failed.length} need retry
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Coding Problems */}
                                                        {eligibility.coding_problems && eligibility.coding_problems.total > 0 && (
                                                            <div>
                                                                <p className="text-xs text-neutral-light mb-1">
                                                                    Coding Problems:
                                                                </p>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {eligibility.coding_problems.completed} / {eligibility.coding_problems.total} completed
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-background-surface/50 border-t border-neutral-light/10 mt-auto">
                                    {canStartTest ? (
                                        <div className="space-y-2">
                                            {eligibility?.weekly_test_status?.attempted && (
                                                <div className="text-xs text-center text-neutral-light mb-1">
                                                    Attempts: {eligibility.weekly_test_status.attempts}/{eligibility.weekly_test_status.max_attempts || 3}
                                                </div>
                                            )}
                                            {eligibility?.weekly_test_status?.attempts >= 3 ? (
                                                <Button
                                                    className="w-full gap-2 font-semibold"
                                                    variant="secondary"
                                                    disabled
                                                >
                                                    <Lock className="w-4 h-4" />
                                                    Max Attempts Reached
                                                </Button>
                                            ) : (
                                                <Link href={`/student/aptitude/weekly/${test.id}`} className="w-full block" target="_blank">
                                                    <Button
                                                        className="w-full gap-2 font-semibold"
                                                        variant={eligibility?.weekly_test_status?.passed ? "secondary" : "primary"}
                                                    >
                                                        {eligibility?.weekly_test_status?.attempted ? (
                                                            <>
                                                                <RotateCcw className="w-4 h-4" />
                                                                Retake Test
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play className="w-4 h-4" />
                                                                Start Test
                                                            </>
                                                        )}
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    ) : (
                                        <Button
                                            className="w-full gap-2 font-semibold"
                                            variant="secondary"
                                            disabled
                                        >
                                            <Lock className="w-4 h-4" />
                                            Locked
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </StudentLayout>
    )
}
