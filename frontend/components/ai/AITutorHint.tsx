'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AIService, HintRequest } from '@/lib/aiService'
import {
  Lightbulb,
  Loader2,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react'

interface AITutorHintProps {
  problemId: string
  problemDescription: string
  studentCode?: string
  language: 'javascript' | 'c' | 'cpp' | 'python'
  week?: number
  day?: string
  onClose?: () => void
}

export function AITutorHint({
  problemId,
  problemDescription,
  studentCode = '',
  language,
  week,
  day,
  onClose,
}: AITutorHintProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [hints, setHints] = useState<Array<{ hint: string; hint_number: number }>>([])
  const [currentHint, setCurrentHint] = useState<{ hint: string; hint_number: number; is_final: boolean; hints_remaining: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const MAX_HINTS = 3

  const handleGetHint = async () => {
    if (hintsUsed >= MAX_HINTS) {
      setError('You have used all 3 hints. Try to solve it step by step!')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const request: HintRequest = {
        problem_id: problemId,
        problem_description: problemDescription,
        student_code: studentCode,
        language,
        week,
        day,
      }

      const response = await AIService.getHint(request)

      if (response.success && response.data) {
        const hintData = response.data
        setCurrentHint(hintData)
        setHintsUsed(hintData.hint_number)

        // Add to hints history
        setHints(prev => [...prev, {
          hint: hintData.hint,
          hint_number: hintData.hint_number,
        }])
      } else {
        setError('Failed to get hint. Please try again.')
      }
    } catch (err: any) {
      console.error('Hint error:', err)
      setError(err.message || 'Failed to get hint. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetHints = () => {
    setHints([])
    setCurrentHint(null)
    setHintsUsed(0)
    setError(null)
  }

  const hintsRemaining = MAX_HINTS - hintsUsed

  return (
    <Card className="mb-4 border border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/20 rounded-lg">
              <Lightbulb className="w-5 h-5 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-neutral">AI Hint</h3>
            <Badge variant="secondary" className="text-xs font-medium">
              {hintsRemaining} {hintsRemaining === 1 ? 'hint' : 'hints'} remaining
            </Badge>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-light/10 rounded-md transition-colors"
              aria-label="Close hint"
            >
              <X className="w-4 h-4 text-neutral-light" />
            </button>
          )}
        </div>

        {hintsUsed === 0 && !currentHint && (
          <div className="text-center py-4">
            <p className="text-sm text-neutral-light mb-4">
              Stuck on this problem? Get a hint from the AI tutor!
            </p>
            <Button
              onClick={handleGetHint}
              disabled={isLoading}
              className="flex items-center gap-2 mx-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting Hint...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  Get Hint #1
                </>
              )}
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-secondary" />
            <span className="ml-3 text-neutral-light">Getting hint...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">Error</span>
            </div>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        )}

        {currentHint && !isLoading && (
          <div className="space-y-4">
            {/* Current Hint */}
            <div className="p-5 bg-white/50 dark:bg-neutral/5 rounded-lg border border-secondary/20 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs font-medium">
                  Hint #{currentHint.hint_number}
                </Badge>
                {currentHint.is_final && (
                  <Badge variant="default" className="text-xs bg-orange-500 text-white">
                    Final Hint
                  </Badge>
                )}
              </div>
              <div className="prose prose-sm max-w-none">
                <div
                  className="text-sm text-neutral leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: currentHint.hint
                      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                        return `<pre class="bg-neutral-light/10 p-3 rounded-md overflow-x-auto my-3 border border-neutral-light/20"><code class="text-xs font-mono">${code.trim()}</code></pre>`
                      })
                      .replace(/`([^`]+)`/g, '<code class="bg-secondary/20 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
                      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-neutral">$1</strong>')
                      .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
                  }}
                />
              </div>
            </div>

            {/* Hints History */}
            {hints.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-light uppercase tracking-wide">
                  Previous Hints
                </p>
                {hints.slice(0, -1).map((hint, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-background-elevated rounded-lg border border-neutral-light/10 text-sm text-neutral-light"
                  >
                    <Badge variant="secondary" className="text-xs mb-2">
                      Hint #{hint.hint_number}
                    </Badge>
                    <p>{hint.hint}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-neutral-light/20">
              {!currentHint.is_final && hintsRemaining > 0 && (
                <Button
                  onClick={handleGetHint}
                  disabled={isLoading}
                  variant="secondary"
                  className="text-sm flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Getting Hint...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Get Hint #{currentHint.hint_number + 1}
                    </>
                  )}
                </Button>
              )}
              {hintsUsed > 0 && (
                <Button
                  onClick={resetHints}
                  variant="ghost"
                  className="text-sm"
                >
                  Reset
                </Button>
              )}
            </div>

            {currentHint.is_final && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-700">
                  <strong>All hints used!</strong> Try to solve it step by step. Review the problem requirements and your code logic.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}


