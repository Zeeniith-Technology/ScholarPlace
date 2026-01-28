'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AIService } from '@/lib/aiService'
import { 
  Map, 
  Loader2, 
  AlertCircle,
  Target,
  BookOpen,
  TrendingUp,
  Sparkles
} from 'lucide-react'

interface LearningPathProps {
  week?: number
  onClose?: () => void
}

export function LearningPath({ week, onClose }: LearningPathProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [learningPath, setLearningPath] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await AIService.generateLearningPath({ week })
      
      if (response.success && response.data) {
        setLearningPath(response.data)
      } else {
        setError('Failed to generate learning path. Please try again.')
      }
    } catch (err: any) {
      console.error('Learning path error:', err)
      setError(err.message || 'Failed to generate learning path. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-neutral">Personalized Learning Path</h3>
            <Badge variant="primary" className="text-xs">
              AI-Powered
            </Badge>
          </div>
        </div>

        {!learningPath && !isLoading && (
          <div className="text-center py-6">
            <p className="text-sm text-neutral-light mb-4">
              Get a personalized learning path based on your performance!
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              Generate Learning Path
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-neutral-light">Analyzing your performance...</span>
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

        {learningPath && !isLoading && (
          <div className="space-y-4">
            {/* Weak Areas */}
            {learningPath.weak_areas && learningPath.weak_areas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-red-500" />
                  <h4 className="font-semibold text-neutral">Areas Needing Improvement</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {learningPath.weak_areas.map((area: string, idx: number) => (
                    <Badge key={idx} variant="error" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Days */}
            {learningPath.recommended_days && learningPath.recommended_days.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-neutral">Recommended Study Days</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {learningPath.recommended_days.map((day: string, idx: number) => (
                    <Badge key={idx} variant="primary" className="text-xs">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Focus Areas */}
            {learningPath.focus_areas && learningPath.focus_areas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  <h4 className="font-semibold text-neutral">Focus Areas</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {learningPath.focus_areas.map((area: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Study Plan */}
            {learningPath.study_plan && (
              <div className="p-4 bg-background-elevated rounded-lg border border-neutral-light/20">
                <h4 className="font-semibold text-neutral mb-2">Study Plan</h4>
                <div className="text-sm text-neutral-light leading-relaxed whitespace-pre-wrap">
                  {learningPath.study_plan}
                </div>
              </div>
            )}

            {/* Motivation */}
            {learningPath.motivation && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-primary mb-2">💪 Keep Going!</h4>
                <div className="text-sm text-neutral leading-relaxed">
                  {learningPath.motivation}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-neutral-light/20">
              <Button
                onClick={handleGenerate}
                variant="secondary"
                className="text-sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
