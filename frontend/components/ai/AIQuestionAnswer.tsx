'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { AIService } from '@/lib/aiService'
import { 
  MessageCircle, 
  Loader2, 
  AlertCircle,
  Send,
  Sparkles,
  X
} from 'lucide-react'

interface AIQuestionAnswerProps {
  currentDay?: string
  currentWeek?: number
  currentTopic?: string
  onClose?: () => void
}

export function AIQuestionAnswer({
  currentDay,
  currentWeek,
  currentTopic,
  onClose,
}: AIQuestionAnswerProps) {
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOutOfScope, setIsOutOfScope] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!question.trim()) {
      setError('Please enter a question.')
      return
    }

    setIsLoading(true)
    setError(null)
    setAnswer(null)
    setIsOutOfScope(false)

    try {
      const response = await AIService.answerQuestion({
        question: question.trim(),
        context: {
          current_day: currentDay,
          current_week: currentWeek,
          current_topic: currentTopic,
        },
      })
      
      if (response.success && response.data) {
        setAnswer(response.data.answer)
        setIsOutOfScope(response.data.out_of_scope || false)
      } else {
        setError('Failed to get answer. Please try again.')
      }
    } catch (err: any) {
      console.error('Q&A error:', err)
      setError(err.message || 'Failed to get answer. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setQuestion('')
    setAnswer(null)
    setError(null)
    setIsOutOfScope(false)
  }

  return (
    <Card className="border-2 border-accent/30 bg-accent/5">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold text-neutral">AI Tutor Q&A</h3>
            <Badge variant="accent" className="text-xs">
              Scope-Restricted
            </Badge>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-light/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-neutral-light" />
            </button>
          )}
        </div>

        {!answer && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                Ask a question about programming (C, C++, JavaScript, DSA basics)
              </label>
              <Input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What is the difference between an array and a linked list?"
                disabled={isLoading}
                className="w-full"
              />
              <p className="text-xs text-neutral-light mt-1">
                I can only answer questions related to C, C++, JavaScript, Data Types, Variables, Operators, Loops, Arrays, Functions, and DSA basics.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting Answer...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Ask Question
                </>
              )}
            </Button>
          </form>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-neutral-light">Thinking...</span>
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
              onClick={handleSubmit}
              className="mt-3 text-sm"
              variant="secondary"
            >
              Try Again
            </Button>
          </div>
        )}

        {answer && !isLoading && (
          <div className="space-y-4">
            {isOutOfScope && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">Out of Scope</span>
                </div>
              </div>
            )}

            <div className="p-4 bg-background-elevated rounded-lg border border-neutral-light/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <h4 className="font-semibold text-neutral">Answer</h4>
              </div>
              <div className="text-sm text-neutral-light leading-relaxed whitespace-pre-wrap">
                {answer}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-neutral-light/20">
              <Button
                onClick={handleReset}
                variant="secondary"
                className="text-sm"
              >
                Ask Another Question
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}



import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { AIService } from '@/lib/aiService'
import { 
  MessageCircle, 
  Loader2, 
  AlertCircle,
  Send,
  Sparkles,
  X
} from 'lucide-react'

interface AIQuestionAnswerProps {
  currentDay?: string
  currentWeek?: number
  currentTopic?: string
  onClose?: () => void
}

export function AIQuestionAnswer({
  currentDay,
  currentWeek,
  currentTopic,
  onClose,
}: AIQuestionAnswerProps) {
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOutOfScope, setIsOutOfScope] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!question.trim()) {
      setError('Please enter a question.')
      return
    }

    setIsLoading(true)
    setError(null)
    setAnswer(null)
    setIsOutOfScope(false)

    try {
      const response = await AIService.answerQuestion({
        question: question.trim(),
        context: {
          current_day: currentDay,
          current_week: currentWeek,
          current_topic: currentTopic,
        },
      })
      
      if (response.success && response.data) {
        setAnswer(response.data.answer)
        setIsOutOfScope(response.data.out_of_scope || false)
      } else {
        setError('Failed to get answer. Please try again.')
      }
    } catch (err: any) {
      console.error('Q&A error:', err)
      setError(err.message || 'Failed to get answer. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setQuestion('')
    setAnswer(null)
    setError(null)
    setIsOutOfScope(false)
  }

  return (
    <Card className="border-2 border-accent/30 bg-accent/5">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold text-neutral">AI Tutor Q&A</h3>
            <Badge variant="accent" className="text-xs">
              Scope-Restricted
            </Badge>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-light/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-neutral-light" />
            </button>
          )}
        </div>

        {!answer && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                Ask a question about programming (C, C++, JavaScript, DSA basics)
              </label>
              <Input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What is the difference between an array and a linked list?"
                disabled={isLoading}
                className="w-full"
              />
              <p className="text-xs text-neutral-light mt-1">
                I can only answer questions related to C, C++, JavaScript, Data Types, Variables, Operators, Loops, Arrays, Functions, and DSA basics.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting Answer...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Ask Question
                </>
              )}
            </Button>
          </form>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-neutral-light">Thinking...</span>
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
              onClick={handleSubmit}
              className="mt-3 text-sm"
              variant="secondary"
            >
              Try Again
            </Button>
          </div>
        )}

        {answer && !isLoading && (
          <div className="space-y-4">
            {isOutOfScope && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">Out of Scope</span>
                </div>
              </div>
            )}

            <div className="p-4 bg-background-elevated rounded-lg border border-neutral-light/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <h4 className="font-semibold text-neutral">Answer</h4>
              </div>
              <div className="text-sm text-neutral-light leading-relaxed whitespace-pre-wrap">
                {answer}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-neutral-light/20">
              <Button
                onClick={handleReset}
                variant="secondary"
                className="text-sm"
              >
                Ask Another Question
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}


