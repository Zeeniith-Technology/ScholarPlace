'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getAuthHeader, clearAuth } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'
import { DepartmentTPCLayout } from '@/components/layouts/DepartmentTPCLayout'
import { Button } from '@/components/ui/Button'
import { CodeReviewContent } from '@/components/coding/CodeReviewContent'
import { ArrowLeft, Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

/**
 * Dept TPC view a single AI code review (department students only).
 * Route: /dept-tpc/ai-reviews/view?submissionId=...
 */
export default function DeptTPCAIReviewViewPage() {
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
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()
      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }
      const response = await fetch(`${apiBaseUrl}/coding-problems/review/get-by-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ submissionId }),
      })
      const data = await response.json()

      if (response.status === 401 || response.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

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
      <DepartmentTPCLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-neutral-light mb-4">No review selected.</p>
          <Link href="/dept-tpc/ai-reviews">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to AI Reviews
            </Button>
          </Link>
        </div>
      </DepartmentTPCLayout>
    )
  }

  return (
    <DepartmentTPCLayout>
      <div className="h-[calc(100vh-5rem)] flex flex-col bg-neutral-50/80">
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-white border-b border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/dept-tpc/ai-reviews"
              className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral transition-colors"
              title="Back to AI Reviews"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-neutral">AI Code Review</h1>
              {review && (
                <p className="text-sm text-neutral-500 truncate max-w-md">{review.problem_title}</p>
              )}
            </div>
          </div>
        </div>

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
                <Link href="/dept-tpc/ai-reviews">
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
              <p className="text-center text-sm">Review may still be generating. Check again in a moment.</p>
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
    </DepartmentTPCLayout>
  )
}
