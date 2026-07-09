'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAuthHeader } from '@/utils/auth'
import {
  Activity,
  RefreshCw,
  Zap,
  AlertTriangle,
  Coins,
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  ServerCrash,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface OpsHealth {
  errors: {
    last24h: number
    last7d: number
    byDay: { date: string; count: number }[]
    statusSplit: { c4xx: number; c5xx: number; other: number }
    topRoutes: { route: string; count: number }[]
    recent: { route: string; error_code: string; http_status: number | null; error_message: string; timestamp: string }[]
  }
}

interface AIUsage {
  ai: { totalInWindow: number; totalAllTime: number; outOfScope: number }
  codeExecution: { estimatedCredits: number }
}

interface Overview {
  colleges?: { total: number; active: number }
  students?: { total: number; active: number; engagementRate: number }
}

function statusColor(s: number | null) {
  if (s && s >= 500) return 'text-red-600'
  if (s && s >= 400) return 'text-amber-600'
  return 'text-neutral-light'
}

/** Traffic-light health verdict from latency + recent 5xx volume */
function verdict(apiOnline: boolean, latency: number | null, errors24h: number, c5xx: number) {
  if (!apiOnline) return { label: 'API unreachable', cls: 'bg-red-500/10 text-red-600 border-red-500/30', dot: 'bg-red-500' }
  if (c5xx > 0 || (latency !== null && latency > 1500)) return { label: 'Degraded', cls: 'bg-amber-500/10 text-amber-700 border-amber-500/30', dot: 'bg-amber-500' }
  return { label: 'All systems normal', cls: 'bg-green-500/10 text-green-600 border-green-500/30', dot: 'bg-green-500' }
}

export default function SuperadminOpsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [health, setHealth] = useState<OpsHealth | null>(null)
  const [ai, setAI] = useState<AIUsage | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [api, setApi] = useState<{ online: boolean; latencyMs: number | null }>({ online: false, latencyMs: null })
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  const load = useCallback(async () => {
    const authHeader = getAuthHeader()
    if (!authHeader) return
    const headers = { 'Content-Type': 'application/json', 'Authorization': authHeader }

    // 1. API reachability + latency (public health ping)
    let online = false
    let latencyMs: number | null = null
    try {
      const t0 = performance.now()
      const res = await fetch(`${apiBaseUrl}/health`, { cache: 'no-store' })
      latencyMs = Math.round(performance.now() - t0)
      online = res.ok
    } catch {
      online = false
    }
    setApi({ online, latencyMs })

    // 2. Error trend, 3. AI/cost, 4. platform totals — in parallel, each best-effort
    const [opsRes, aiRes, ovRes] = await Promise.allSettled([
      fetch(`${apiBaseUrl}/superadmin/ops/health`, { method: 'POST', headers, body: JSON.stringify({}) }),
      fetch(`${apiBaseUrl}/superadmin/ai-usage`, { method: 'POST', headers, body: JSON.stringify({ days: 7 }) }),
      fetch(`${apiBaseUrl}/superadmin/analytics/overview`, { method: 'POST', headers, body: JSON.stringify({}) }),
    ])

    if (opsRes.status === 'fulfilled' && opsRes.value.ok) {
      const d = await opsRes.value.json()
      if (d.success) setHealth(d.data)
    }
    if (aiRes.status === 'fulfilled' && aiRes.value.ok) {
      const d = await aiRes.value.json()
      if (d.success) setAI(d.data)
    }
    if (ovRes.status === 'fulfilled' && ovRes.value.ok) {
      const d = await ovRes.value.json()
      if (d.success) setOverview(d.data)
    }

    setUpdatedAt(new Date())
    setIsLoading(false)
    setIsRefreshing(false)
  }, [apiBaseUrl])

  useEffect(() => {
    load()
    // Auto-refresh every 60s so this reads like a live status board
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  const handleRefresh = () => {
    setIsRefreshing(true)
    load()
  }

  const errors24h = health?.errors.last24h ?? 0
  const c5xx = health?.errors.statusSplit.c5xx ?? 0
  const v = verdict(api.online, api.latencyMs, errors24h, c5xx)

  const trend = (health?.errors.byDay || []).map(d => ({
    day: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    count: d.count,
  }))

  return (
    <SuperadminLayout>
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral flex items-center gap-3">
                <Activity className="w-8 h-8 text-primary" />
                Operations
              </h1>
              <p className="text-neutral-light mt-1">
                Live system health, error trends and external-service cost
                {updatedAt && <span> · updated {updatedAt.toLocaleTimeString()}</span>}
              </p>
            </div>
            <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Verdict banner */}
              <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${v.cls}`}>
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${v.dot}`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${v.dot}`} />
                </span>
                <span className="font-semibold">{v.label}</span>
                <span className="text-sm opacity-80 ml-auto">
                  {api.online ? `API ${api.latencyMs}ms` : 'API down'} · {errors24h} errors / 24h
                </span>
              </div>

              {/* Top metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-500/10 rounded-lg"><Zap className="w-6 h-6 text-blue-600" /></div>
                    {api.online
                      ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                      : <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                  <p className="text-3xl font-bold text-neutral">{api.latencyMs != null ? `${api.latencyMs}` : '—'}<span className="text-base font-medium text-neutral-light"> ms</span></p>
                  <p className="text-sm text-neutral-light mt-1">API response time</p>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-red-500/10 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
                    <span className="text-xs text-neutral-light">7d: {health?.errors.last7d ?? 0}</span>
                  </div>
                  <p className="text-3xl font-bold text-neutral">{errors24h}</p>
                  <p className="text-sm text-neutral-light mt-1">Errors (last 24h)</p>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-purple-500/10 rounded-lg"><Sparkles className="w-6 h-6 text-purple-600" /></div>
                    <span className="text-xs text-neutral-light">7 days</span>
                  </div>
                  <p className="text-3xl font-bold text-neutral">{ai?.ai.totalInWindow ?? 0}</p>
                  <p className="text-sm text-neutral-light mt-1">Gemini calls</p>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-green-500/10 rounded-lg"><Coins className="w-6 h-6 text-green-600" /></div>
                    <span className="text-xs text-neutral-light">7 days</span>
                  </div>
                  <p className="text-3xl font-bold text-neutral">{ai?.codeExecution.estimatedCredits ?? 0}</p>
                  <p className="text-sm text-neutral-light mt-1">JDoodle credits (est.)</p>
                </Card>
              </div>

              {/* Error trend + status split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 lg:col-span-2">
                  <h2 className="text-xl font-semibold text-neutral mb-1">Errors per Day</h2>
                  <p className="text-sm text-neutral-light mb-4">Last 7 days</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(val: any) => [`${val} errors`, 'Errors']} />
                        <Bar dataKey="count" fill="#ef4444" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-neutral mb-4">Error Types (7d)</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2 text-neutral"><ServerCrash className="w-4 h-4 text-red-600" /> 5xx server faults</span>
                        <span className="font-semibold text-red-600">{health?.errors.statusSplit.c5xx ?? 0}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2 text-neutral"><AlertTriangle className="w-4 h-4 text-amber-600" /> 4xx client/auth</span>
                        <span className="font-semibold text-amber-600">{health?.errors.statusSplit.c4xx ?? 0}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-neutral-light">Other / legacy</span>
                        <span className="font-semibold text-neutral-light">{health?.errors.statusSplit.other ?? 0}</span>
                      </div>
                    </div>
                  </div>
                  {overview && (
                    <div className="mt-6 pt-4 border-t border-neutral-light/20 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-neutral-light"><Users className="w-4 h-4" /> Active students</span>
                        <span className="font-semibold text-neutral">{overview.students?.active ?? 0} / {overview.students?.total ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-light">Engagement</span>
                        <span className="font-semibold text-neutral">{overview.students?.engagementRate ?? 0}%</span>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Noisiest routes + recent errors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-neutral mb-4">Noisiest Routes (7d)</h3>
                  {(!health?.errors.topRoutes || health.errors.topRoutes.length === 0) ? (
                    <p className="text-sm text-neutral-light py-6 text-center">No errors in the last 7 days 🎉</p>
                  ) : (
                    <div className="space-y-2">
                      {health.errors.topRoutes.map((r, i) => {
                        const max = health.errors.topRoutes[0].count || 1
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-neutral font-mono text-xs truncate pr-2" title={r.route}>{r.route}</span>
                              <span className="font-semibold text-neutral shrink-0">{r.count}</span>
                            </div>
                            <div className="w-full bg-neutral-light/10 rounded-full h-1.5">
                              <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-neutral mb-4">Most Recent Errors</h3>
                  {(!health?.errors.recent || health.errors.recent.length === 0) ? (
                    <p className="text-sm text-neutral-light py-6 text-center">Nothing logged yet</p>
                  ) : (
                    <div className="space-y-2.5">
                      {health.errors.recent.map((e, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-neutral truncate" title={e.route}>{e.route || '—'}</p>
                            <p className="text-xs text-neutral-light truncate" title={e.error_message}>{e.error_message || e.error_code}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-semibold ${statusColor(e.http_status)}`}>{e.http_status ?? (e.error_code || 'ERR')}</span>
                            <p className="text-xs text-neutral-light whitespace-nowrap">{new Date(e.timestamp).toLocaleTimeString()}</p>
                          </div>
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
