'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AIService, CodeReviewRequest } from '@/lib/aiService'
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Loader2,
  X,
  Code2
} from 'lucide-react'

interface CodeReviewProps {
  code: string
  language: 'javascript' | 'c' | 'cpp' | 'python'
  problemId?: string
  problemDescription?: string
  week?: number
  day?: string
  onClose?: () => void
}

export function CodeReview({
  code,
  language,
  problemId,
  problemDescription,
  week,
  day,
  onClose,
}: CodeReviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [review, setReview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showReview, setShowReview] = useState(false)

  const handleReview = async () => {
    if (!code.trim()) {
      setError('Please write some code before requesting a review.')
      return
    }

    setIsLoading(true)
    setError(null)
    setReview(null)
    setShowReview(true)

    try {
      const request: CodeReviewRequest = {
        code,
        language,
        problem_id: problemId,
        problem_description: problemDescription,
        week,
        day,
      }

      const response = await AIService.reviewCode(request)

      if (response.success && response.data) {
        setReview(response.data.review)
      } else {
        setError('Failed to get code review. Please try again.')
      }
    } catch (err: any) {
      console.error('Code review error:', err)
      setError(err.message || 'Failed to get code review. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!showReview && !review) {
    return (
      <div className="mb-4">
        <Button
          onClick={handleReview}
          disabled={isLoading || !code.trim()}
          className="w-full sm:w-auto flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing Code...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Get AI Code Review
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <Card className="mb-4 border-2 border-primary/30 bg-primary/5">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-neutral">AI Code Review</h3>
            <Badge variant="primary" className="text-xs">
              Powered by AI
            </Badge>
          </div>
          {onClose && (
            <button
              onClick={() => {
                setShowReview(false)
                setReview(null)
                onClose()
              }}
              className="p-1 hover:bg-neutral-light/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-neutral-light" />
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-neutral-light">Analyzing your code...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <Button
              onClick={handleReview}
              className="mt-3 text-sm"
              variant="secondary"
            >
              Try Again
            </Button>
          </div>
        )}

        {review && !isLoading && (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm text-neutral leading-relaxed">
                {review}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-neutral-light/20">
              <Button
                onClick={handleReview}
                variant="secondary"
                className="text-sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Review Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

