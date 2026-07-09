'use client'

import React, { useState, useEffect } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAuthHeader } from '@/utils/auth'
import { Sparkles, Cpu, AlertOctagon, RefreshCw, Coins } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface AIUsageData {
  windowDays: number
  ai: {
    totalInWindow: number
    totalAllTime: number
    outOfScope: number
    byType: Record<string, number>
    byDay: Record<string, number>
    topStudents: { student_name: string; student_email: string; calls: number }[]
  }
  codeExecution: {
    submissionsInWindow: number
    estimatedCredits: number
    creditsByDay: Record<string, number>
    note: string
  }
}

const TYPE_LABELS: Record<string, string> = {
  'code-review': 'Code Reviews',
  'hint': 'Hints',
  'question-answer': 'Q&A Tutor',
  'learning-path': 'Learning Paths',
  'performance-analysis': 'Performance Analysis',
  'question-generation': 'Question Generation',
}

/** Build a continuous day series (fills gaps with 0) for the chart */
function daySeries(byDay: Record<string, number>, days: number) {
  const out: { day: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    out.push({
      day: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: byDay[key] || 0,
    })
  }
  return out
}

export default function SuperadminAIUsagePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [data, setData] = useState<AIUsageData | null>(null)
  const [windowDays, setWindowDays] = useState(14)
  const [error, setError] = useState('')

  const fetchData = async (days: number) => {
    try {
      setError('')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const res = await fetch(`${apiBaseUrl}/superadmin/ai-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ days }),
      })
      const result = await res.json()
      if (result.success && result.data) {
        setData(result.data)
      } else {
        setError(result.message || 'Failed to load AI usage')
      }
    } catch (e) {
      console.error('Error fetching AI usage:', e)
      setError('Failed to load AI usage')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    setIsLoading(true)
    fetchData(windowDays)
  }, [windowDays])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchData(windowDays)
  }

  const aiSeries = data ? daySeries(data.ai.byDay, data.windowDays) : []
  const creditSeries = data ? daySeries(data.codeExecution.creditsByDay, data.windowDays) : []

  return (
    <SuperadminLayout>
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              AI & Execution Usage
            </h1>
            <p className="text-neutral-light mt-1">Gemini calls and JDoodle credit consumption — your external service costs</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-background-elevated rounded-lg p-1">
              {[7, 14, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setWindowDays(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    windowDays === d ? 'bg-white shadow text-neutral' : 'text-neutral-light hover:text-neutral'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card className="p-12 text-center"><p className="text-red-600">{error}</p></Card>
        ) : data && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-purple-500/10 rounded-lg"><Sparkles className="w-6 h-6 text-purple-600" /></div>
                  <span className="text-xs text-neutral-light">Last {data.windowDays}d</span>
                </div>
                <p className="text-3xl font-bold text-neutral">{data.ai.totalInWindow}</p>
                <p className="text-sm text-neutral-light mt-1">AI calls (Gemini)</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-blue-500/10 rounded-lg"><Cpu className="w-6 h-6 text-blue-600" /></div>
                  <span className="text-xs text-neutral-light">All time</span>
                </div>
                <p className="text-3xl font-bold text-neutral">{data.ai.totalAllTime}</p>
                <p className="text-sm text-neutral-light mt-1">Total AI interactions</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-green-500/10 rounded-lg"><Coins className="w-6 h-6 text-green-600" /></div>
                  <span className="text-xs text-neutral-light">Last {data.windowDays}d</span>
                </div>
                <p className="text-3xl font-bold text-neutral">{data.codeExecution.estimatedCredits}</p>
                <p className="text-sm text-neutral-light mt-1">JDoodle credits (est., submits only)</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-orange-500/10 rounded-lg"><AlertOctagon className="w-6 h-6 text-orange-500" /></div>
                  <span className="text-xs text-neutral-light">Last {data.windowDays}d</span>
                </div>
                <p className="text-3xl font-bold text-neutral">{data.ai.outOfScope}</p>
                <p className="text-sm text-neutral-light mt-1">Out-of-scope AI attempts</p>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-neutral mb-1">AI Calls per Day</h2>
                <p className="text-sm text-neutral-light mb-4">All Gemini features combined</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aiSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [`${v} calls`, 'AI calls']} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-neutral mb-1">JDoodle Credits per Day</h2>
                <p className="text-sm text-neutral-light mb-4">{data.codeExecution.note}</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={creditSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => [`~${v} credits`, 'Estimated']} />
                      <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Breakdown + top students */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral mb-4">AI Calls by Feature</h3>
                {Object.keys(data.ai.byType).length === 0 ? (
                  <p className="text-sm text-neutral-light py-6 text-center">No AI usage in this window</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(data.ai.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                      const max = Math.max(...Object.values(data.ai.byType))
                      return (
                        <div key={type}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-neutral">{TYPE_LABELS[type] || type}</span>
                            <span className="font-semibold text-neutral">{count}</span>
                          </div>
                          <div className="w-full bg-neutral-light/10 rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral mb-4">Top AI Consumers</h3>
                {data.ai.topStudents.length === 0 ? (
                  <p className="text-sm text-neutral-light py-6 text-center">No AI usage in this window</p>
                ) : (
                  <div className="space-y-3">
                    {data.ai.topStudents.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-neutral truncate">{s.student_name}</p>
                          <p className="text-xs text-neutral-light truncate">{s.student_email}</p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {s.calls} calls
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
    </SuperadminLayout>
  )
}
