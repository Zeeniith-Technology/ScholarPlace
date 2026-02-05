'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getAuthHeader } from '@/utils/auth'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Button } from '@/components/ui/Button'
import { CodeReviewContent } from '@/components/coding/CodeReviewContent'
import { ArrowLeft, Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'

function CodeReviewViewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('submissionId')

  const [review, setReview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReview = useCallback(async () => {
    if (!submissionId) {
      setLoading(false)
      setError('Missing submission ID')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) {
        setError('Authentication required')
        setLoading(false)
        return
      }
      const response = await fetch(`${apiBaseUrl}/coding-problems/review/get-by-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ submissionId }),
      })
      const data = await response.json()
      if (data.success && data.review) {
        setReview(data.review)
        setError(null)
      } else if (data.success && !data.review) {
        setReview(null)
        setError(null)
      } else {
        setReview(null)
        setError(data.message || 'Review not found')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load review')
      setReview(null)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    if (submissionId) fetchReview()
  }, [submissionId, fetchReview])

  if (!submissionId) {
    return (
      <StudentLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-neutral-light mb-4">No review selected.</p>
          <Link href="/student/code-review">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Code Review
            </Button>
          </Link>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="h-[calc(100vh-5rem)] flex flex-col bg-neutral-50/80">
        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-white border-b border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/student/code-review"
              className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral transition-colors"
              title="Back to Code Review"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-neutral">Code Review</h1>
              {review && (
                <p className="text-sm text-neutral-500 truncate max-w-md">{review.problem_title}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content area - full height, scroll only inside panels */}
        <div className="flex-1 min-h-0 p-4 lg:p-6 overflow-hidden">
          {loading && !review && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-neutral-500">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p>Loading code review...</p>
            </div>
          )}

          {!loading && !review && error && (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchReview} variant="secondary" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
                <Link href="/student/code-review">
                  <Button variant="secondary" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to list
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {!loading && !review && !error && (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-neutral-500">
              <Sparkles className="w-12 h-12 text-primary opacity-60" />
              <p className="text-center font-medium text-neutral">Please wait.</p>
              <p className="text-center text-sm">Your review is being generated. Check again in a moment.</p>
              <Button onClick={fetchReview} variant="secondary" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Check again
              </Button>
            </div>
          )}

          {review && (
            <div className="h-full min-h-0">
              <CodeReviewContent review={review} twoColumn={true} />
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  )
}

export default function CodeReviewViewPage() {
  return (
    <Suspense
      fallback={
        <StudentLayout>
          <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center gap-3 text-neutral-500">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p>Loading...</p>
          </div>
        </StudentLayout>
      }
    >
      <CodeReviewViewContent />
    </Suspense>
  )
}
