'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  BarChart3, Star, TrendingUp, Users, MessageSquare,
  ChevronDown, RefreshCw, Download, Filter
} from 'lucide-react'
import { getAuthHeader } from '@/utils/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface Analytics {
  total_responses: number
  overall_avg_confidence: number
  overall_avg_nps: number
  weeks: WeekAnalytics[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const READINESS_LABELS: Record<string, string> = {
  a_lot_more_ready:    '🚀 A lot more ready',
  somewhat_more_ready: '📈 Somewhat more ready',
  about_the_same:      '😐 About the same',
  more_confused:       '😕 More confused'
}
const DIFFICULTY_LABELS: Record<string, string> = {
  too_easy:         '🎯 Too easy',
  just_right:       '✅ Just right',
  a_little_hard:    '💪 A little hard',
  too_overwhelming: '😤 Too overwhelming'
}
const RELEVANCE_LABELS: Record<string, string> = {
  very_relevant:  '🎯 Very relevant',
  mostly_aligned: '👍 Mostly aligned',
  unsure:         '🤔 Unsure',
  not_really:     '📚 Not really'
}

function DistributionBar({ distribution, labels }: { distribution: Record<string, number>; labels: Record<string, string> }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0)
  if (total === 0) return <p className="text-sm text-gray-400">No data yet</p>
  return (
    <div className="space-y-2">
      {Object.entries(distribution).map(([key, count]) => {
        const pct = Math.round((count / total) * 100)
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-600">{labels[key] || key}</span>
              <span className="font-bold text-gray-800">{pct}% ({count})</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MetricCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue:   'from-blue-50 to-white border-blue-100 text-blue-700',
    amber:  'from-amber-50 to-white border-amber-100 text-amber-700',
    emerald:'from-emerald-50 to-white border-emerald-100 text-emerald-700',
    purple: 'from-purple-50 to-white border-purple-100 text-purple-700'
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <div className="text-3xl font-extrabold leading-none">{value}</div>
      <div className="text-sm font-semibold mt-1">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface FeedbackAnalyticsProps {
  /** Role-specific API base: 'tpc-dept' | 'tpc-college' | 'superadmin' */
  apiBase: string
  title?: string
}

export function FeedbackAnalytics({ apiBase, title = 'Student Pulse — Feedback Analytics' }: FeedbackAnalyticsProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all')

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const authHeader = getAuthHeader()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/${apiBase}/feedback/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {})
        },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (data.success) {
        setAnalytics(data.data)
      } else {
        setError(data.message || 'Failed to load analytics')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  const visibleWeeks = analytics?.weeks.filter(
    w => selectedWeek === 'all' || w.week_number === selectedWeek
  ) ?? []

  const allTestimonials = visibleWeeks.flatMap(w => w.testimonials)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={fetchAnalytics} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Weekly feedback from students — {analytics?.total_responses ?? 0} total responses</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Week filter */}
          <div className="relative">
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Weeks</option>
              {analytics?.weeks.map(w => (
                <option key={w.week_number} value={w.week_number}>Week {w.week_number}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={fetchAnalytics} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Overall KPIs */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Responses"
            value={analytics.total_responses}
            sub="Students who completed feedback"
            color="blue"
          />
          <MetricCard
            label="Avg Confidence"
            value={`${analytics.overall_avg_confidence}/5 ⭐`}
            sub="Q1 — Star rating across all weeks"
            color="amber"
          />
          <MetricCard
            label="Avg NPS Score"
            value={`${analytics.overall_avg_nps}/10`}
            sub="Q7 — Recommendation likelihood"
            color="emerald"
          />
          <MetricCard
            label="Weeks Covered"
            value={analytics.weeks.length}
            sub={`Out of 8 program weeks`}
            color="purple"
          />
        </div>
      )}

      {/* Confidence growth chart (simple line simulation) */}
      {analytics && analytics.weeks.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Confidence Growth (Week by Week)
          </h2>
          <div className="flex items-end gap-3 h-32">
            {analytics.weeks.map(wk => {
              const pct = Math.round((wk.avg_confidence / 5) * 100)
              return (
                <div key={wk.week_number} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-blue-600">{wk.avg_confidence}</span>
                  <div className="w-full rounded-t-md bg-blue-500 transition-all" style={{ height: `${pct}%`, minHeight: 4 }} />
                  <span className="text-[10px] text-gray-500">Wk {wk.week_number}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">Average confidence score per week (out of 5)</p>
        </div>
      )}

      {/* Per-week breakdown */}
      {visibleWeeks.map(wk => (
        <div key={wk.week_number} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Week {wk.week_number} — {wk.total_responses} response{wk.total_responses !== 1 ? 's' : ''}
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-bold text-amber-600">⭐ {wk.avg_confidence}/5</span>
              <span className="font-bold text-emerald-600">NPS {wk.avg_nps}/10</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Q2 — Placement Readiness</h3>
              <DistributionBar distribution={wk.placement_readiness} labels={READINESS_LABELS} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Q3 — Difficulty Level</h3>
              <DistributionBar distribution={wk.difficulty_distribution} labels={DIFFICULTY_LABELS} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Q4 — Industry Relevance</h3>
              <DistributionBar distribution={wk.industry_relevance} labels={RELEVANCE_LABELS} />
            </div>
          </div>
        </div>
      ))}

      {/* Testimonials feed */}
      {allTestimonials.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Student Voice — What They Loved
          </h2>
          <div className="space-y-3">
            {allTestimonials.slice(0, 10).map((t, idx) => (
              <blockquote key={idx} className="flex items-start gap-3 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{t.student_name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-700 italic">"{t.text}"</p>
                  <p className="text-xs text-gray-400 mt-1">{t.student_name} · Week {t.week}</p>
                </div>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Responses Table Component */}
      <DetailedResponsesTable apiBase={apiBase} selectedWeek={selectedWeek} />

      {(!analytics || analytics.total_responses === 0) && (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
          <Users className="w-8 h-8 opacity-40" />
          <p className="text-sm">No feedback submitted yet for this period</p>
        </div>
      )}
    </div>
  )
}

function DetailedResponsesTable({ apiBase, selectedWeek }: { apiBase: string, selectedWeek: number | 'all' }) {
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const authHeader = getAuthHeader()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/${apiBase}/feedback/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {})
        },
        body: JSON.stringify(selectedWeek !== 'all' ? { week_number: selectedWeek } : {})
      })
      const data = await res.json()
      if (data.success) {
        setFeedbacks(data.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [apiBase, selectedWeek])

  useEffect(() => {
    if (isOpen) {
      fetchList()
    }
  }, [isOpen, fetchList])

  const groupedStudents = React.useMemo(() => {
    const map = new Map<string, any>()
    feedbacks.forEach(f => {
      const sid = f.student_id || 'unknown'
      if (!map.has(sid)) {
        map.set(sid, {
          student_id: sid,
          student_name: f.student_name || 'Unknown',
          submissions: [],
          total_conf: 0,
          total_nps: 0
        })
      }
      const student = map.get(sid)
      student.submissions.push(f)
      student.total_conf += (f.q1_confidence_score || 0)
      student.total_nps += (f.q7_nps_score || 0)
    })
    
    return Array.from(map.values()).map(s => ({
      ...s,
      avg_confidence: Math.round((s.total_conf / s.submissions.length) * 10) / 10,
      avg_nps: Math.round((s.total_nps / s.submissions.length) * 10) / 10,
      submissions: s.submissions.sort((a: any, b: any) => a.week_number - b.week_number)
    })).sort((a, b) => a.student_name.localeCompare(b.student_name))
  }, [feedbacks])

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-semibold text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
      >
        Show Detailed Student Responses
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          Detailed Student Submissions
        </h2>
        <button onClick={() => setIsOpen(false)} className="text-xs font-semibold text-gray-500 hover:text-gray-800">Hide</button>
      </div>
      
      {loading ? (
        <div className="p-8 flex justify-center"><RefreshCw className="w-5 h-5 text-blue-500 animate-spin" /></div>
      ) : groupedStudents.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">No responses found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 font-semibold w-[30%]">Student Name</th>
                <th className="px-6 py-3 font-semibold text-center">Weeks Submitted</th>
                <th className="px-6 py-3 font-semibold text-center">Avg Confidence</th>
                <th className="px-6 py-3 font-semibold text-center">Avg NPS Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupedStudents.map((student) => {
                const isExpanded = expandedStudentId === student.student_id
                
                return (
                  <React.Fragment key={student.student_id}>
                    {/* Parent Row */}
                    <tr 
                      className={isExpanded ? 'bg-blue-50/30 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'}
                      onClick={() => setExpandedStudentId(isExpanded ? null : student.student_id)}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                        <div className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        {student.student_name}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 font-semibold">{student.submissions.length}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold">
                          {student.avg_confidence} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${student.avg_nps >= 9 ? 'bg-emerald-50 text-emerald-700' : student.avg_nps >= 7 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                          {student.avg_nps}/10
                        </span>
                      </td>
                    </tr>
                    
                    {/* Expanded Child Row */}
                    {isExpanded && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={4} className="p-0 border-t border-blue-100">
                          <div className="px-12 py-4 shadow-inner">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Individual Week Responses</h4>
                            <table className="w-full text-xs text-left bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-2 font-semibold text-gray-600">Week</th>
                                  <th className="px-4 py-2 font-semibold text-gray-600">Confidence</th>
                                  <th className="px-4 py-2 font-semibold text-gray-600">NPS</th>
                                  <th className="px-4 py-2 font-semibold text-gray-600">Date Submitted</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {student.submissions.map((sub: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-blue-50/30">
                                    <td className="px-4 py-2 font-semibold text-gray-700">Week {sub.week_number}</td>
                                    <td className="px-4 py-2">
                                      <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                                        {sub.q1_confidence_score} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                      </span>
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className={`font-bold ${sub.q7_nps_score >= 9 ? 'text-emerald-600' : sub.q7_nps_score >= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {sub.q7_nps_score}/10
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-500">
                                      {new Date(sub.submitted_at).toLocaleDateString()} at {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
