'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { Loader2, ClipboardCheck } from 'lucide-react'

function stripAsterisks(s: string): string {
  if (typeof s !== 'string') return ''
  return s.replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1').replace(/\*+/g, '').replace(/\*/g, '')
}

export interface QuickCheckQuestion {
  question: string
  options: string[]
}

export interface QuickCheckModalProps {
  isOpen: boolean
  title: string
  questions: QuickCheckQuestion[]
  selections: Record<number, string>
  onSelect: (index: number, value: string) => void
  onSubmit: () => void
  onCancel: () => void
  submitLoading: boolean
  attemptResult: { score: number; correct_answers: number; total_questions: number } | null
  onViewExplanations: () => void
  onCloseAfterSubmit: () => void
}

export function QuickCheckModal({
  isOpen,
  title,
  questions,
  selections,
  onSelect,
  onSubmit,
  onCancel,
  submitLoading,
  attemptResult,
  onViewExplanations,
  onCloseAfterSubmit,
}: QuickCheckModalProps) {
  if (!isOpen) return null

  const answered = Object.keys(selections).filter((i) => selections[Number(i)]).length
  const showProgress = questions.length > 0 && !attemptResult

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-neutral-light/20 bg-background-surface shadow-2xl">
        {/* Header */}
        <header className="shrink-0 px-6 py-5 border-b border-neutral-light/15 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2 text-primary/80 text-xs font-semibold uppercase tracking-wider mb-1">
            <ClipboardCheck className="w-4 h-4" />
            Quick check
          </div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading font-semibold text-neutral text-lg truncate min-w-0">{title}</h2>
            {showProgress && (
              <span className="text-sm text-neutral-light shrink-0">{answered} of {questions.length} answered</span>
            )}
          </div>
          {showProgress && (
            <div className="mt-3 h-2 bg-neutral-light/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(answered / questions.length) * 100}%` }}
              />
            </div>
          )}
        </header>

        {/* Body + footer: unified background */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-background-elevated/30">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-5">
            {attemptResult ? (
              <div className="text-center py-10">
                <p className="font-heading text-4xl font-bold text-primary">{attemptResult.score}%</p>
                <p className="text-neutral-light mt-2">{attemptResult.correct_answers} of {attemptResult.total_questions} correct</p>
                <div className="flex gap-3 justify-center mt-8">
                  <Button variant="secondary" onClick={onViewExplanations} className="rounded-xl">View explanations</Button>
                  <Button onClick={onCloseAfterSubmit} className="rounded-xl">Close</Button>
                </div>
              </div>
            ) : questions.length === 0 ? (
              <div className="py-16 text-center text-neutral-light">
                <Loader2 className="w-10 h-10 animate-spin mx-auto" /> Loading…
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, i) => (
                  <article key={i} className="p-5 rounded-2xl border border-neutral-light/20 bg-background-surface shadow-sm">
                    <p className="font-medium text-neutral mb-4 text-[15px] leading-relaxed break-words">
                      {i + 1}. {stripAsterisks(q.question || '')}
                    </p>
                    <div className="flex flex-col gap-2.5 w-full">
                      {(q.options || []).map((opt: string, j: number) => (
                        <label
                          key={j}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer hover:bg-background-elevated/50 w-full min-w-0 transition-all ${
                            (selections[i] || '') === opt ? 'border-primary/40 bg-primary/5' : 'border-neutral-light/15'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${i}`}
                            checked={(selections[i] || '') === opt}
                            onChange={() => onSelect(i, opt)}
                            className="mt-0.5 shrink-0"
                          />
                          <span className="text-[15px] text-neutral flex-1 min-w-0 break-words leading-snug">{stripAsterisks(opt)}</span>
                        </label>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {!attemptResult && questions.length > 0 && (
            <footer className="shrink-0 px-6 py-4 border-t border-neutral-light/15 bg-background-elevated/30 flex gap-3">
              <Button onClick={onSubmit} disabled={submitLoading} className="rounded-xl">
                {submitLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Submit
              </Button>
              <Button variant="secondary" onClick={onCancel} className="rounded-xl">Cancel</Button>
            </footer>
          )}
        </div>
      </div>
    </div>
  )
}
