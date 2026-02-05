'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Code, BookOpen, Trophy, ArrowLeft } from 'lucide-react'

/**
 * DSA has no MCQ test. Assessment is through:
 * - Daily coding problems (in Learning)
 * - Weekly Capstone project (coding)
 * This page explains that and links to Learning / Capstone.
 * Route: /student/tests/weekly/[week] (e.g. /1, /2)
 */
export default function DSAWeeklyInfoPage() {
  const router = useRouter()
  const params = useParams()
  const weekNum = Math.min(6, Math.max(1, parseInt(String(params?.week || '1').replace('week-', ''), 10) || 1))

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <button
          onClick={() => router.push('/student/tests')}
          className="flex items-center gap-2 text-neutral-light hover:text-neutral mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tests
        </button>

        <Card className="p-6 sm:p-8 border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Code className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral">
                DSA – No MCQ Test
              </h1>
              <p className="text-sm text-neutral-light">
                Week {weekNum} • Assessment is coding-only
              </p>
            </div>
          </div>

          <p className="text-neutral-light mb-6">
            In DSA there is no MCQ test. Your progress is assessed through:
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <span><strong className="text-neutral">Daily problems</strong> – Solve coding problems day-wise in Learning.</span>
            </li>
            <li className="flex items-start gap-3">
              <Trophy className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <span><strong className="text-neutral">Weekly Capstone project</strong> – Complete the Capstone (2 coding problems) from your Learning page, Day 5.</span>
            </li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => router.push(weekNum === 1 ? '/student/study/week-1-select' : `/student/study/week-${weekNum}-select`)}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Go to Learning
            </Button>
            <Button
              onClick={() => window.open(`/student/capstone-test/week-${weekNum}`, 'Capstone', 'width=1200,height=800,scrollbars=yes,resizable=yes')}
              variant="secondary"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              Open Capstone Project
            </Button>
          </div>
        </Card>
      </div>
    </StudentLayout>
  )
}
