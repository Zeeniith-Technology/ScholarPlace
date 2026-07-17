'use client'

import React from 'react'
import { CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

interface ProblemCompletedProps {
    week?: number;
    day?: number;
    onGoBack?: () => void;
    onSolveAgain?: () => void;
    nextProblemId?: string | null;
}

export function ProblemCompleted({ week = 1, day, onGoBack, onSolveAgain, nextProblemId }: ProblemCompletedProps) {
    const router = useRouter()

    const handleGoBack = () => {
        if (onGoBack) {
            onGoBack()
        } else {
            const rawDay: unknown = day
            let dayParam: string
            if (!rawDay || rawDay === 0 || rawDay === '0' || rawDay === 'pre-week') {
                dayParam = 'pre-week'
            } else {
                const s = String(rawDay)
                dayParam = s.startsWith('day-') ? s : `day-${s}`
            }
            const path = week === 1
                ? `/student/study/week-1?day=${dayParam}#daily-coding-problems`
                : `/student/study/week-${week}?day=${dayParam}#daily-coding-problems`
            router.push(path)
        }
    }

    return (
        <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-lg text-center mb-6 animate-in fade-in zoom-in duration-500 flex flex-col items-center justify-center h-full">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
            <h3 className="text-2xl font-bold text-green-400 mb-3">Problem Completed!</h3>
            <p className="text-neutral-light max-w-md mx-auto mb-6">
                You have successfully passed all test cases for this problem.
                Great job! 🚀
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
                {onSolveAgain && (
                    <Button
                        onClick={onSolveAgain}
                        variant="ghost"
                        className="border border-green-500/50 text-green-400 hover:bg-green-500/10"
                    >
                        Solve Again
                    </Button>
                )}
                <Button
                    onClick={handleGoBack}
                    variant={nextProblemId ? 'ghost' : undefined}
                    className={nextProblemId
                        ? 'border border-green-500/50 text-green-400 hover:bg-green-500/10'
                        : 'bg-green-600 hover:bg-green-700 text-white min-w-[150px]'}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Questions
                </Button>
                {nextProblemId && (
                    <Button
                        onClick={() => router.push(`/student/coding-problem/${nextProblemId}`)}
                        className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
                    >
                        Next Problem
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>
            {!nextProblemId && (
                <p className="text-sm text-green-500/80 mt-4">🎉 That was the last problem for this day — nice work!</p>
            )}
        </div>
    )
}
