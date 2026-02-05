'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CodeReviewContent } from '@/components/coding/CodeReviewContent'
import { Button } from '@/components/ui/Button'
import { getAuthHeader } from '@/utils/auth'
import {
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react'

export interface CodeReviewData {
  _id: string
  submission_id: string
  problem_id: string
  problem_title: string
  problem_description?: string
  submitted_code: string
  language: string
  ai_review: string
  week?: number
  day?: number
  is_capstone?: boolean
  created_at: string
}

interface CodeReviewDisplayProps {
  isOpen: boolean
  onClose: () => void
  submissionId: string | null
}

export function CodeReviewDisplay({
  isOpen,
  onClose,
  submissionId,
}: CodeReviewDisplayProps) {
  const [review, setReview] = useState<CodeReviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedForRef = React.useRef<string | null>(null)

  const fetchReview = useCallback(async () => {
    if (!submissionId) return
    setLoading(true)
    setError(null)
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      const response = await fetch(`${apiBaseUrl}/coding-problems/review/get-by-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader || '',
        },
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
        if (!data.success && data.message) setError(data.message)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load code review')
      setReview(null)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    if (!isOpen || !submissionId) return
    const id = String(submissionId)
    if (fetchedForRef.current === id) return
    fetchedForRef.current = id
    fetchReview()
  }, [isOpen, submissionId, fetchReview])

  useEffect(() => {
    if (!isOpen) fetchedForRef.current = null
  }, [isOpen])

  const handleClose = () => {
    setReview(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-neutral/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel - full viewport with fixed height */}
      <div
        className="fixed inset-4 z-50 lg:inset-8 flex flex-col bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-neutral-200">
          <h2 className="text-lg font-bold text-neutral">Code Review</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - scrollable wrapper */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {loading && !review && (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-neutral-500">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p>Loading code review...</p>
            </div>
          )}

          {!loading && !review && !error && submissionId && (
            <div className="h-64 flex flex-col items-center justify-center gap-4 text-neutral-500">
              <Sparkles className="w-12 h-12 text-primary opacity-60" />
              <p className="text-center font-medium text-neutral">Please wait.</p>
              <p className="text-center text-sm">Your review is being generated. Check again in a moment.</p>
              <Button onClick={fetchReview} variant="secondary" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Check again
              </Button>
            </div>
          )}

          {error && !review && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
              <Button onClick={fetchReview} variant="secondary" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          )}

          {review && (
            <div className="h-full min-h-[500px]">
              <CodeReviewContent review={review} twoColumn={true} />
            </div>
          )}
        </div>

        {review && (
          <div className="flex-shrink-0 flex justify-end px-6 py-4 border-t border-neutral-100 bg-neutral-50/50">
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}
      </div>
    </>
  )
}
