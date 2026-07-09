'use client'

import React, { useState, useEffect } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAuthHeader } from '@/utils/auth'
import { MessageSquareHeart, Star, TrendingUp, Users, RefreshCw, Quote } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface WeekAnalytics {
  week_number: number
  total_responses: number
  avg_confidence: number
  avg_nps: number
  placement_readiness: Record<string, number>
  difficulty_distribution: Record<string, number>
  industry_relevance: Record<string, number>
  workload_manageable: Record<string, number>
  felt_supported: Record<string, number>
  testimonials: { student_name: string; text: string; week: number }[]
}

interface FeedbackAnalytics {
  total_responses: number
  overall_avg_confidence: number
  overall_avg_nps: number
  weeks: WeekAnalytics[]
}

/** Human labels for the difficulty enum values stored in feedback docs */
const DIFFICULTY_LABELS: Record<string, string> = {
  too_easy: 'Too easy',
  just_right: 'Just right',
  a_little_hard: 'A little hard',
  too_overwhelming: 'Overwhelming',
}

function npsColor(nps: number): string {
  if (nps >= 9) return 'text-green-600'
  if (nps >= 7) return 'text-yellow-600'
  return 'text-red-600'
}

export default function SuperadminFeedbackPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null)
  const [error, setError] = useState('')

  const fetchAnalytics = async () => {
    try {
      setError('')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const res = await fetch(`${apiBaseUrl}/superadmin/feedback/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setAnalytics(data.data)
      } else {
        setError(data.message || 'Failed to load feedback analytics')
      }
    } catch (e) {
      console.error('Error fetching feedback analytics:', e)
      setError('Failed to load feedback analytics')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchAnalytics()
  }

  const npsChartData = (analytics?.weeks || []).map(w => ({
    week: `Week ${w.week_number}`,
    nps: w.avg_nps,
    responses: w.total_responses,
  }))

  const allTestimonials = (analytics?.weeks || []).flatMap(w => w.testimonials || [])

  return (
    <SuperadminLayout>
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral flex items-center gap-3">
              <MessageSquareHeart className="w-8 h-8 text-primary" />
              Student Feedback & NPS
            </h1>
            <p className="text-neutral-light mt-1">Weekly survey results across all colleges</p>
          </div>
          <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card className="p-12 text-center">
            <p className="text-red-600">{error}</p>
          </Card>
        ) : !analytics || analytics.total_responses === 0 ? (
          <Card className="p-16 text-center">
            <MessageSquareHeart className="w-12 h-12 text-neutral-light mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-semibold text-neutral mb-2">No feedback yet</h3>
            <p className="text-neutral-light max-w-md mx-auto">
              Students submit an 8-question survey at the end of each week. Results
              (confidence, difficulty, NPS, testimonials) will appear here.
            </p>
          </Card>
        ) : (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-blue-500/10 rounded-lg"><Users className="w-6 h-6 text-blue-600" /></div>
                  <span className="text-xs text-neutral-light">Responses</span>
                </div>
                <p className="text-3xl font-bold text-neutral">{analytics.total_responses}</p>
                <p className="text-sm text-neutral-light mt-1">across {analytics.weeks.length} week{analytics.weeks.length !== 1 ? 's' : ''}</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-green-500/10 rounded-lg"><TrendingUp className="w-6 h-6 text-green-600" /></div>
                  <span className="text-xs text-neutral-light">Average NPS</span>
                </div>
                <p className={`text-3xl font-bold ${npsColor(analytics.overall_avg_nps)}`}>
                  {analytics.overall_avg_nps} <span className="text-base font-medium text-neutral-light">/ 10</span>
                </p>
                <p className="text-sm text-neutral-light mt-1">"Would you recommend ScholarPlace?"</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-yellow-500/10 rounded-lg"><Star className="w-6 h-6 text-yellow-600" /></div>
                  <span className="text-xs text-neutral-light">Avg Confidence</span>
                </div>
                <p className="text-3xl font-bold text-neutral">
                  {analytics.overall_avg_confidence} <span className="text-base font-medium text-neutral-light">/ 5</span>
                </p>
                <p className="text-sm text-neutral-light mt-1">self-rated placement confidence</p>
              </Card>
            </div>

            {/* NPS trend by week */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-neutral mb-1">NPS by Week</h2>
              <p className="text-sm text-neutral-light mb-4">Average score per weekly survey</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={npsChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any, name: any) => name === 'nps' ? [`${v} / 10`, 'Avg NPS'] : [v, name]} />
                    <Bar dataKey="nps" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Per-week breakdown */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-neutral mb-4">Week-by-Week Detail</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-light/20">
                      <th className="text-left py-3 px-4 font-semibold text-neutral">Week</th>
                      <th className="text-right py-3 px-4 font-semibold text-neutral">Responses</th>
                      <th className="text-right py-3 px-4 font-semibold text-neutral">Avg NPS</th>
                      <th className="text-right py-3 px-4 font-semibold text-neutral">Confidence</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral">Difficulty (most common)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.weeks.map(w => {
                      const topDifficulty = Object.entries(w.difficulty_distribution || {})
                        .sort((a, b) => b[1] - a[1])[0]
                      return (
                        <tr key={w.week_number} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                          <td className="py-3 px-4 font-medium text-neutral">Week {w.week_number}</td>
                          <td className="py-3 px-4 text-right text-neutral">{w.total_responses}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${npsColor(w.avg_nps)}`}>{w.avg_nps}</td>
                          <td className="py-3 px-4 text-right text-neutral">{w.avg_confidence} / 5</td>
                          <td className="py-3 px-4 text-neutral-light">
                            {topDifficulty ? `${DIFFICULTY_LABELS[topDifficulty[0]] || topDifficulty[0]} (${topDifficulty[1]})` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Testimonials */}
            {allTestimonials.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-neutral mb-1">What Students Loved</h2>
                <p className="text-sm text-neutral-light mb-4">Open-text answers from the weekly survey</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allTestimonials.slice(0, 12).map((t, i) => (
                    <div key={i} className="p-4 rounded-lg bg-background-elevated border border-neutral-light/10">
                      <Quote className="w-4 h-4 text-primary/50 mb-2" />
                      <p className="text-sm text-neutral leading-relaxed">{t.text}</p>
                      <p className="text-xs text-neutral-light mt-2">— {t.student_name}, Week {t.week}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
    </SuperadminLayout>
  )
}
