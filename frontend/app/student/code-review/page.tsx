'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthHeader } from '@/utils/auth'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileCode, Sparkles, Loader2, Calendar, Filter, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      const dk = r.is_capstone ? 'capstone' : `day-${r.day ?? 0}`
      if (!acc[wk]) acc[wk] = {}
      if (!acc[wk][dk]) acc[wk][dk] = []
      acc[wk][dk].push(r)
      return acc
    }, {})
    const sortDayKey = (a: string, b: string) => {
      if (a === 'capstone') return 1
      if (b === 'capstone') return -1
      return parseInt(a.replace('day-', ''), 10) - parseInt(b.replace('day-', ''), 10)
    }
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
    const dk = r.is_capstone ? 'capstone' : `day-${r.day ?? 0}`
    if (!acc[wk]) acc[wk] = {}
    if (!acc[wk][dk]) acc[wk][dk] = []
    acc[wk][dk].push(r)
    return acc
  }, {})

  const sortDayKey = (a: string, b: string) => {
    if (a === 'capstone') return 1
    if (b === 'capstone') return -1
    return parseInt(a.replace('day-', ''), 10) - parseInt(b.replace('day-', ''), 10)
  }

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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral flex items-center gap-2">
              <FileCode className="w-7 h-7 text-primary" />
              Code Review
            </h1>
            <p className="text-neutral-light mt-1 text-sm">
              View your AI code reviews by week and day
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-light shrink-0" />
            <select
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-lg border border-neutral-light/30 bg-white px-3 py-2 text-sm text-neutral focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All weeks</option>
              {WEEKS.map((w) => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-lg border border-neutral-light/30 bg-white px-3 py-2 text-sm text-neutral focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All days</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={fetchReviews} disabled={loading} className="gap-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-neutral-light">Loading code reviews...</p>
          </Card>
        ) : reviews.length === 0 ? (
          <Card className="p-12 text-center">
            <Sparkles className="w-12 h-12 text-neutral-light mx-auto mb-3 opacity-60" />
            <p className="text-neutral font-medium">No code reviews yet</p>
            <p className="text-neutral-light text-sm mt-1">
              Complete coding problems (daily or capstone) and pass all test cases to get AI code reviews here.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {weekKeys.map((wk) => {
              const weekNum = parseInt(wk.replace('week-', ''), 10)
              const daysMap = grouped[wk]
              const dayKeys = Object.keys(daysMap).sort(sortDayKey)
              return (
                <Card key={wk} className="overflow-hidden">
                  <div className="bg-neutral-light/5 px-4 py-3 border-b border-neutral-light/15">
                    <h2 className="font-semibold text-neutral">Week {weekNum}</h2>
                  </div>
                  <div className="divide-y divide-neutral-light/10">
                    {dayKeys.map((dk) => {
                      const isCapstoneSection = dk === 'capstone'
                      const dayNum = isCapstoneSection ? 0 : parseInt(dk.replace('day-', ''), 10)
                      const items = daysMap[dk]
                      const open = isDayOpen(wk, dk)
                      const dayKey = `${wk}-${dk}`
                      return (
                        <div key={dayKey} className="border-b border-neutral-light/10 last:border-b-0">
                          <button
                            type="button"
                            onClick={() => toggleDay(wk, dk)}
                            className={cn(
                              'w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-neutral-light/5 transition-colors',
                              open && 'bg-neutral-light/5'
                            )}
                          >
                            <span className="flex items-center justify-center w-6 h-6 rounded text-neutral-light">
                              {open ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </span>
                            <Calendar className="w-4 h-4 text-neutral-light shrink-0" />
                            <span className="font-medium text-neutral">
                              {isCapstoneSection ? 'Capstone Project' : `Day ${dayNum}`}
                            </span>
                            <span className="text-neutral-light text-sm">
                              ({items.length} review{items.length !== 1 ? 's' : ''})
                            </span>
                          </button>
                          {open && (
                            <div className="bg-white border-t border-neutral-light/10">
                              {items.map((r) => (
                                <button
                                  key={r._id}
                                  type="button"
                                  onClick={() => openReview(r.submission_id)}
                                  className="w-full text-left pl-12 pr-4 py-3 flex items-center gap-4 hover:bg-primary/5 transition-colors border-t border-neutral-light/5 first:border-t-0"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-neutral truncate">{r.problem_title}</p>
                                    {r.created_at && (
                                      <p className="text-xs text-neutral-light mt-0.5">
                                        {new Date(r.created_at).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded text-xs font-medium shrink-0 min-w-[4.5rem] text-center',
                                        r.is_capstone
                                          ? 'bg-primary/10 text-primary'
                                          : 'bg-neutral-light/10 text-neutral-light'
                                      )}
                                    >
                                      {r.is_capstone ? 'Capstone' : 'Daily'}
                                    </span>
                                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
