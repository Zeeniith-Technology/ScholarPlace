'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'

/**
 * Practice hub – choose Aptitude or DSA practice by week.
 * Route: /student/practice
 */
export default function PracticeHubPage() {
  const router = useRouter()

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral mb-2">Practice</h1>
          <p className="text-neutral-light">Choose a track and week to start practicing.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/student/study">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20 h-full">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral mb-1">Learning & Practice</h2>
                  <p className="text-sm text-neutral-light">Go to Learning to pick a week and take daily practice tests.</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/student/tests">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20 h-full">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-secondary/10">
                  <BookOpen className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral mb-1">Tests & History</h2>
                  <p className="text-sm text-neutral-light">View tests and practice history.</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        <div className="mt-6">
          <Button variant="secondary" onClick={() => router.push('/student/study')} className="gap-2">
            <BookOpen className="w-4 h-4" />
            Open Learning
          </Button>
        </div>
      </div>
    </StudentLayout>
  )
}
