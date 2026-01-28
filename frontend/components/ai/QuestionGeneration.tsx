'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { AIService } from '@/lib/aiService'
import {
  FileQuestion,
  Loader2,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react'

interface QuestionGenerationProps {
  onClose?: () => void
  onQuestionsGenerated?: (questions: any[]) => void
}

export function QuestionGeneration({ onClose, onQuestionsGenerated }: QuestionGenerationProps) {
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'intermediate' | 'difficult'>('easy')
  const [count, setCount] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic.')
      return
    }

    setIsLoading(true)
    setError(null)
    setQuestions([])

    try {
      const response = await AIService.generateQuestions({
        topic: topic.trim(),
        difficulty,
        count,
      })

      if (response.success && response.data && response.data.questions) {
        setQuestions(response.data.questions)
        onQuestionsGenerated?.(response.data.questions)
      } else {
        setError('Failed to generate questions. Please try again.')
      }
    } catch (err: any) {
      console.error('Question generation error:', err)
      setError(err.message || 'Failed to generate questions. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setTopic('')
    setDifficulty('easy')
    setCount(5)
    setQuestions([])
    setError(null)
  }

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-neutral">AI Question Generator</h3>
            <Badge variant="primary" className="text-xs">
              AI-Powered
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

        {questions.length === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral mb-2">
                Topic
              </label>
              <Input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Arrays, Functions, Loops"
                disabled={isLoading}
                className="w-full"
              />
              <p className="text-xs text-neutral-light mt-1">
                Enter a programming topic (C, C++, JavaScript, DSA basics)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral mb-2">
                  Difficulty
                </label>
                <Select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  disabled={isLoading}
                  options={[
                    { value: 'easy', label: 'Easy' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'difficult', label: 'Difficult' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral mb-2">
                  Count
                </label>
                <Input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                  min={1}
                  max={10}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isLoading || !topic.trim()}
              className="w-full flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Questions
                </>
              )}
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-neutral-light">Generating questions...</span>
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
              onClick={handleGenerate}
              className="mt-3 text-sm"
              variant="secondary"
            >
              Try Again
            </Button>
          </div>
        )}

        {questions.length > 0 && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral">
                Generated {questions.length} question{questions.length !== 1 ? 's' : ''}
              </p>
              <Button
                onClick={handleReset}
                variant="secondary"
                className="text-sm"
              >
                Generate New
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-background-elevated rounded-lg border border-neutral-light/20"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="primary" className="text-xs">
                      Question {idx + 1}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-neutral mb-3">
                    {q.question}
                  </p>
                  <div className="space-y-1 mb-3">
                    {q.options?.map((option: string, optIdx: number) => (
                      <div
                        key={optIdx}
                        className={`p-2 rounded text-xs ${option === q.correct_answer
                            ? 'bg-green-500/20 border border-green-500/30'
                            : 'bg-background-surface border border-neutral-light/10'
                          }`}
                      >
                        <span className="font-semibold mr-2">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        {option}
                        {option === q.correct_answer && (
                          <Badge variant="success" className="ml-2 text-xs">
                            Correct
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="p-2 bg-primary/5 rounded text-xs text-neutral-light">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
