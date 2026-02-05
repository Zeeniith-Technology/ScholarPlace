'use client'

import React from 'react'
import { renderMarkdown } from '@/lib/renderMarkdown'
import { FileCode, Code2, Sparkles } from 'lucide-react'

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

interface CodeReviewContentProps {
  review: CodeReviewData
  /** Use two-column layout on large screens (problem+code | AI review) */
  twoColumn?: boolean
}

export function CodeReviewContent({ review, twoColumn = true }: CodeReviewContentProps) {
  const leftColumn = (
    <div className="space-y-5 h-full flex flex-col">
      {/* Problem */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden flex-shrink-0">
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-primary" />
          <span className="font-semibold text-neutral text-sm">Problem</span>
        </div>
        <div className="p-4 max-h-44 overflow-y-auto">
          <p className="font-medium text-neutral">{review.problem_title}</p>
          {review.problem_description && (
            <p className="text-sm text-neutral-600 mt-2 whitespace-pre-wrap leading-relaxed">
              {review.problem_description}
            </p>
          )}
        </div>
      </div>

      {/* Your code */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden flex-1 min-h-[240px] flex flex-col">
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="font-semibold text-neutral text-sm">Your submitted code</span>
          </div>
          <span className="text-xs text-neutral-500">Language: {review.language}</span>
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-4 bg-[#1e1e1e]">
          <pre className="text-sm text-[#d4d4d4] font-mono whitespace-pre">
            <code>{review.submitted_code}</code>
          </pre>
        </div>
      </div>
    </div>
  )

  const rightColumn = (
    <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-white shadow-sm overflow-hidden flex flex-col h-full min-h-0">
      <div className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex items-center gap-2 flex-shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-semibold text-neutral text-sm">AI review</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="prose prose-sm max-w-none text-neutral text-sm leading-relaxed">
          {renderMarkdown(review.ai_review)}
        </div>
      </div>
    </div>
  )

  if (twoColumn) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
        <div className="min-h-0 flex flex-col">{leftColumn}</div>
        <div className="min-h-[400px] lg:min-h-0 lg:h-full flex flex-col">{rightColumn}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {leftColumn}
      {rightColumn}
    </div>
  )
}
