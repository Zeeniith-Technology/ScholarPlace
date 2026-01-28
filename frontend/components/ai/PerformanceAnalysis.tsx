'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AIService } from '@/lib/aiService'
import { 
  BarChart3, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Sparkles
} from 'lucide-react'

interface PerformanceAnalysisProps {
  week?: number
  onClose?: () => void
}

export function PerformanceAnalysis({ week, onClose }: PerformanceAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await AIService.analyzePerformance({ week })
      
      if (response.success && response.data) {
        setAnalysis(response.data)
      } else {
        setError('Failed to analyze performance. Please try again.')
      }
    } catch (err: any) {
      console.error('Performance analysis error:', err)
      setError(err.message || 'Failed to analyze performance. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-2 border-secondary/30 bg-secondary/5">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold text-neutral">AI Performance Analysis</h3>
            <Badge variant="secondary" className="text-xs">
              AI-Powered
            </Badge>
          </div>
        </div>

        {!analysis && !isLoading && (
          <div className="text-center py-6">
            <p className="text-sm text-neutral-light mb-4">
              Get AI-powered insights into your performance!
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="flex items-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Performance
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-secondary" />
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
              onClick={handleAnalyze}
              className="mt-3 text-sm"
              variant="secondary"
            >
              Try Again
            </Button>
          </div>
        )}

        {analysis && !isLoading && (
          <div className="space-y-4">
            {/* Overall Score */}
            {analysis.overall_score && (
              <div className="p-4 bg-background-elevated rounded-lg border border-neutral-light/20 text-center">
                <p className="text-sm text-neutral-light mb-1">Overall Performance</p>
                <p className="text-3xl font-bold text-primary">{analysis.overall_score}</p>
              </div>
            )}

            {/* Strong Areas */}
            {analysis.strong_areas && analysis.strong_areas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <h4 className="font-semibold text-neutral">Strong Areas</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.strong_areas.map((area: string, idx: number) => (
                    <Badge key={idx} variant="success" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Weak Areas */}
            {analysis.weak_areas && analysis.weak_areas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <h4 className="font-semibold text-neutral">Areas for Improvement</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.weak_areas.map((area: string, idx: number) => (
                    <Badge key={idx} variant="error" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-neutral">Recommendations</h4>
                </div>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-neutral-light">
                      <span className="text-primary mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Feedback */}
            {analysis.feedback && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-primary mb-2">💬 Feedback</h4>
                <p className="text-sm text-neutral leading-relaxed whitespace-pre-wrap">
                  {analysis.feedback}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-neutral-light/20">
              <Button
                onClick={handleAnalyze}
                variant="secondary"
                className="text-sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Re-analyze
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
