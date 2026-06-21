'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthHeader } from '@/utils/auth'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileCode, Sparkles, Loader2, Calendar, Filter, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const toDayKey = (day: unknown): string => {
  if (day == null) return 'pre-week'
  // Strip any number of leading "day-" prefixes (handles "day-2", "day-day-2", "day-pre-week")
  let s = String(day).trim().toLowerCase()
  while (s.startsWith('day-')) s = s.slice(4)
  if (s === '' || s === '0' || s === 'pre-week' || s === 'preweek' || s === 'nan') return 'pre-week'
  const n = parseInt(s, 10)
  return isNaN(n) ? 'pre-week' : `day-${n}`
}
const sortDayKey = (a: string, b: string) => {
  if (a === 'capstone') return 1
  if (b === 'capstone') return -1
  if (a === 'pre-week') return -1
  if (b === 'pre-week') return 1
  return parseInt(a.replace('day-', ''), 10) - parseInt(b.replace('day-', ''), 10)
}

interface CodeReviewItem {
  _id: string
  submission_id: string
  problem_id: string
  problem_title: string
  week?: number
  day?: number
  is_capstone?: boolean
  created_at: string
  language?: string
}

const WEEKS = [1, 2, 3, 4, 5, 6]
const DAYS = [1, 2, 3, 4, 5]

export default function CodeReviewPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<CodeReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [weekFilter, setWeekFilter] = useState<number | ''>('')
  const [dayFilter, setDayFilter] = useState<number | ''>('')
  const [openDayKeys, setOpenDayKeys] = useState<Set<string>>(new Set())
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())

  // Initialize expandedWeeks with the latest week when reviews load
  useEffect(() => {
    if (reviews.length > 0) {
      const weeks = Array.from(new Set(reviews.map(r => r.week ?? 0))).sort((a, b) => b - a)
      if (weeks.length > 0) {
        setExpandedWeeks(new Set([`week-${weeks[0]}`]))
      }
    }
  }, [reviews])

  const toggleWeek = (wk: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(wk)) next.delete(wk)
      else next.add(wk)
      return next
    })
  }

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) {
        setReviews([])
        return
      }
      const response = await fetch(`${apiBaseUrl}/coding-problems/review/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          ...(weekFilter !== '' && { week: weekFilter }),
          ...(dayFilter !== '' && { day: dayFilter }),
        }),
      })
      const data = await response.json()
      if (data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews)
      } else {
        setReviews([])
      }
    } catch (err) {
      console.error('Error fetching code reviews:', err)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [weekFilter, dayFilter])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  useEffect(() => {
    if (reviews.length === 0) return
    const byWeekDay = reviews.reduce<Record<string, Record<string, CodeReviewItem[]>>>((acc, r) => {
      const w = r.week ?? 0
      const wk = `week-${w}`
      const dk = r.is_capstone ? 'capstone' : toDayKey(r.day)
      if (!acc[wk]) acc[wk] = {}
      if (!acc[wk][dk]) acc[wk][dk] = []
      acc[wk][dk].push(r)
      return acc
    }, {})
    const firstDays = Object.keys(byWeekDay)
      .sort((a, b) => parseInt(a.replace('week-', ''), 10) - parseInt(b.replace('week-', ''), 10))
      .map((wk) => {
        const dayKeys = Object.keys(byWeekDay[wk]).sort(sortDayKey)
        return dayKeys[0] ? `${wk}-${dayKeys[0]}` : null
      })
      .filter(Boolean) as string[]
    setOpenDayKeys((prev) => (prev.size === 0 ? new Set(firstDays) : prev))
  }, [reviews.length])

  const openReview = (submissionId: string) => {
    const id = typeof submissionId === 'string' ? submissionId : String(submissionId)
    router.push(`/student/code-review/view?submissionId=${encodeURIComponent(id)}`)
  }

  // Group by week then day for display; capstone reviews go under "Capstone Project", not Day 0
  const grouped = reviews.reduce<Record<string, Record<string, CodeReviewItem[]>>>((acc, r) => {
    const w = r.week ?? 0
    const wk = `week-${w}`
    const dk = r.is_capstone ? 'capstone' : toDayKey(r.day)
    if (!acc[wk]) acc[wk] = {}
    if (!acc[wk][dk]) acc[wk][dk] = []
    acc[wk][dk].push(r)
    return acc
  }, {})

  const weekKeys = Object.keys(grouped).sort((a, b) => parseInt(a.replace('week-', ''), 10) - parseInt(b.replace('week-', ''), 10))

  const toggleDay = (wk: string, dk: string) => {
    const key = `${wk}-${dk}`
    setOpenDayKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isDayOpen = (wk: string, dk: string) => openDayKeys.has(`${wk}-${dk}`)

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileCode className="w-8 h-8 text-primary" />
              </div>
              AI Code Reviews
            </h1>
            <p className="text-neutral-light mt-2 text-base">
              Track your progress and review AI feedback on your solutions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-neutral-200 p-1 shadow-sm">
              <Filter className="w-4 h-4 text-neutral-400 ml-2" />
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value === '' ? '' : Number(e.target.value))}
                className="bg-transparent border-none text-sm text-neutral focus:ring-0 cursor-pointer py-1.5"
              >
                <option value="">All weeks</option>
                {WEEKS.map((w) => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white rounded-lg border border-neutral-200 p-1 shadow-sm">
              <Calendar className="w-4 h-4 text-neutral-400 ml-2" />
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value === '' ? '' : Number(e.target.value))}
                className="bg-transparent border-none text-sm text-neutral focus:ring-0 cursor-pointer py-1.5"
              >
                <option value="">All days</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>Day {d}</option>
                ))}
              </select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchReviews}
              disabled={loading}
              className="gap-2 h-[38px] ml-2 bg-white border border-neutral-200 text-neutral-600 hover:border-primary hover:text-primary hover:bg-primary/5 shadow-sm transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Loader2 className="w-4 h-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-64 animate-pulse bg-neutral-100/50 border-neutral-200">
                <div />
              </Card>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <Card className="p-16 text-center bg-neutral-50/50 border-dashed">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral mb-2">No reviews yet</h3>
            <p className="text-neutral-light max-w-md mx-auto">
              Submit your coding solutions. Once passed, our AI will review your code and provide feedback here.
            </p>
          </Card>
        ) : (
          <div className="space-y-10">
            {weekKeys.map((wk) => {
              const weekNum = parseInt(wk.replace('week-', ''), 10)
              const daysMap = grouped[wk]
              const dayKeys = Object.keys(daysMap).sort(sortDayKey)


              if (dayKeys.length === 0) return null
              const isExpanded = expandedWeeks.has(wk)

              return (
                <div key={wk} className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
                  <button
                    onClick={() => toggleWeek(wk)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-bold text-neutral">Week {weekNum}</h2>
                        <p className="text-xs text-neutral-light">
                          {Object.values(daysMap).reduce((acc, curr) => acc + curr.length, 0)} reviews • {dayKeys.length} active days
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-neutral-400 transition-transform duration-300", isExpanded && "rotate-180")} />
                  </button>

                  <div className={cn(
                    "grid grid-transition",
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}>
                    <div className="overflow-hidden">
                      <div className="p-6 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 border-t border-neutral-100">
                        {dayKeys.map((dk) => {
                          const isCapstoneSection = dk === 'capstone'
                          const isPreWeek = dk === 'pre-week'
                          const dayNum = (isCapstoneSection || isPreWeek) ? 0 : parseInt(dk.replace('day-', ''), 10)
                          const items = daysMap[dk]

                          return (
                            <Card
                              key={dk}
                              className={cn(
                                "flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full border-t-4",
                                isCapstoneSection ? "border-t-purple-500 bg-purple-50/30" : "border-t-primary bg-white"
                              )}
                            >
                              {/* Card Header */}
                              <div className={cn(
                                "px-5 py-4 flex items-center justify-between border-b",
                                isCapstoneSection ? "border-purple-100 bg-purple-50/50" : "border-neutral-100 bg-neutral-50/50"
                              )}>
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm",
                                    isCapstoneSection ? "bg-purple-100 text-purple-600" : "bg-white border border-neutral-200 text-neutral-600"
                                  )}>
                                    {isCapstoneSection ? <Sparkles className="w-4 h-4" /> : isPreWeek ? 'P' : dayNum}
                                  </div>
                                  <h3 className="font-semibold text-neutral">
                                    {isCapstoneSection ? 'Capstone' : isPreWeek ? 'Pre-Week' : `Day ${dayNum}`}
                                  </h3>
                                </div>
                                <span className={cn(
                                  "text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap shrink-0",
                                  isCapstoneSection ? "bg-purple-100 text-purple-700" : "bg-neutral-100 text-neutral-600"
                                )}>
                                  {items.length} {items.length === 1 ? 'Review' : 'Reviews'}
                                </span>
                              </div>

                              {/* Card Body - List of Problems */}
                              <div className="p-2 flex-1 flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {items.map((r) => (
                                  <button
                                    key={r.submission_id}
                                    onClick={() => openReview(r.submission_id)}
                                    className="w-full text-left p-3 rounded-lg hover:bg-neutral-50 transition-colors group flex items-start gap-3 border border-transparent hover:border-neutral-200"
                                  >
                                    <div className={cn(
                                      "mt-1 w-2 h-2 rounded-full shrink-0",
                                      r.is_capstone ? "bg-purple-400 group-hover:bg-purple-500" : "bg-primary/40 group-hover:bg-primary"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-neutral-700 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                        {r.problem_title}
                                      </p>
                                      <p className="text-[10px] text-neutral-400 mt-1">
                                        {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(r.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                                  </button>
                                ))}
                              </div>

                              {/* Footer Action */}
                              <div className="p-3 border-t border-neutral-100 bg-neutral-50/30">
                                <button
                                  onClick={() => openReview(items[0]?.submission_id)}
                                  className="w-full py-2 text-xs font-medium text-center text-primary hover:text-primary-dark transition-colors flex items-center justify-center gap-1 hover:underline"
                                >
                                  View Detailed Analysis
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
