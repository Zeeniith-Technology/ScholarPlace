'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DepartmentTPCLayout } from '@/components/layouts/DepartmentTPCLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { getAuthHeader, clearAuth } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'
import { FileCode, Sparkles, Loader2, Calendar, ChevronDown, ChevronRight, User, Search, RefreshCw } from 'lucide-react'
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
  student_name: string
}

/**
 * Dept TPC AI Code Reviews – department students only.
 * Page shows student names first; click a name → modal opens with week/day-wise details.
 * Route: /dept-tpc/ai-reviews
 */
export default function DeptTPCAIReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<CodeReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalStudent, setModalStudent] = useState<string | null>(null)
  const [modalDayOpen, setModalDayOpen] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')


  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const apiBaseUrl = getApiBaseUrl()
      const authHeader = getAuthHeader()
      if (!authHeader) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }
      const response = await fetch(`${apiBaseUrl}/tpc-dept/coding-reviews/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({}),
      })
      const data = await response.json()

      if (response.status === 401 || response.status === 403) {
        clearAuth()
        window.location.href = '/auth/login'
        return
      }

      if (data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews as CodeReviewItem[])
      } else {
        setReviews([])
      }
    } catch (err) {
      console.error('Error fetching code reviews:', err)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  // Unique students (by name) with their review count
  const studentsWithCount = React.useMemo(() => {
    const byName: Record<string, CodeReviewItem[]> = {}
    reviews.forEach((r) => {
      const name = r.student_name || 'Student'
      if (!byName[name]) byName[name] = []
      byName[name].push(r)
    })
    return Object.entries(byName)
      .map(([name, items]) => ({ name, count: items.length, reviews: items }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [reviews])

  const filteredStudents = React.useMemo(() => {
    if (!searchQuery) return studentsWithCount
    const lowerQuery = searchQuery.toLowerCase()
    return studentsWithCount.filter(({ name }) =>
      name.toLowerCase().includes(lowerQuery)
    )
  }, [studentsWithCount, searchQuery])

  const openModal = (studentName: string) => {
    setModalStudent(studentName)
    const studentReviews = reviews.filter((r) => r.student_name === studentName)
    const grouped = studentReviews.reduce<Record<string, Record<string, CodeReviewItem[]>>>((acc, r) => {
      const w = r.week ?? 0
      const wk = `week-${w}`
      const dk = r.is_capstone ? 'capstone' : toDayKey(r.day)
      if (!acc[wk]) acc[wk] = {}
      if (!acc[wk][dk]) acc[wk][dk] = []
      acc[wk][dk].push(r)
      return acc
    }, {})
    const firstKeys = new Set<string>()
    Object.keys(grouped)
      .sort((a, b) => parseInt(a.replace('week-', ''), 10) - parseInt(b.replace('week-', ''), 10))
      .forEach((wk) => {
        const dks = Object.keys(grouped[wk]).sort(sortDayKey)
        if (dks[0]) firstKeys.add(`${wk}-${dks[0]}`)
      })
    setModalDayOpen(firstKeys)
  }

  const closeModal = () => setModalStudent(null)

  const toggleModalDay = (wk: string, dk: string) => {
    const key = `${wk}-${dk}`
    setModalDayOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const openReview = (submissionId: string) => {
    const id = typeof submissionId === 'string' ? submissionId : String(submissionId)
    closeModal()
    router.push(`/dept-tpc/ai-reviews/view?submissionId=${encodeURIComponent(id)}`)
  }

  const studentReviews = modalStudent ? reviews.filter((r) => r.student_name === modalStudent) : []
  const groupedForModal = studentReviews.reduce<Record<string, Record<string, CodeReviewItem[]>>>((acc, r) => {
    const w = r.week ?? 0
    const wk = `week-${w}`
    const dk = r.is_capstone ? 'capstone' : toDayKey(r.day)
    if (!acc[wk]) acc[wk] = {}
    if (!acc[wk][dk]) acc[wk][dk] = []
    acc[wk][dk].push(r)
    return acc
  }, {})
  const weekKeysModal = Object.keys(groupedForModal).sort(
    (a, b) => parseInt(a.replace('week-', ''), 10) - parseInt(b.replace('week-', ''), 10)
  )

  return (
    <DepartmentTPCLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" />
              AI Code Reviews
            </h1>
            <p className="text-neutral-light mt-1 text-sm">
              Click a student name to see their reviews by week and day
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-light/20 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={fetchReviews} disabled={loading} className="gap-2 shrink-0 h-10">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-20 bg-neutral-light/5 animate-pulse rounded-xl border border-neutral-light/10"></div>
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 bg-transparent shadow-none">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 text-neutral-light mx-auto mb-3 opacity-40" />
                <p className="text-neutral font-medium">No students found</p>
                <p className="text-neutral-light text-sm mt-1">
                  Try searching for a different name
                </p>
              </>
            ) : (
              <>
                <FileCode className="w-12 h-12 text-neutral-light mx-auto mb-3 opacity-40" />
                <p className="text-neutral font-medium">No code reviews yet</p>
                <p className="text-neutral-light text-sm mt-1 max-w-xs mx-auto">
                  Once students in your department complete coding problems, their AI reviews will appear here.
                </p>
              </>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {filteredStudents.map(({ name, count }) => (
              <button
                key={name}
                type="button"
                onClick={() => openModal(name)}
                className="flex items-center gap-4 p-4 rounded-xl border border-neutral-light/10 bg-white hover:border-primary/30 hover:shadow-md transition-all duration-300 text-left group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-500" />

                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-lg font-heading font-bold">{name.charAt(0)}</span>
                </div>

                <div className="flex-1 min-w-0 z-10">
                  <h3 className="font-semibold text-neutral group-hover:text-primary transition-colors truncate">
                    {name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-light/10 text-neutral-light group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {count} Review{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-neutral-light/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!modalStudent}
        onClose={closeModal}
        title={modalStudent ? `${modalStudent} — Reviews by Week & Day` : 'Reviews'}
        size="xl"
      >
        <div className="space-y-4">
          {weekKeysModal.map((wk) => {
            const weekNum = parseInt(wk.replace('week-', ''), 10)
            const daysMap = groupedForModal[wk]
            const dayKeys = Object.keys(daysMap).sort(sortDayKey)
            return (
              <div key={wk} className="rounded-lg border border-neutral-light/20 overflow-hidden">
                <div className="bg-neutral-light/10 px-4 py-2 border-b border-neutral-light/15">
                  <h3 className="font-semibold text-neutral">Week {weekNum}</h3>
                </div>
                <div className="divide-y divide-neutral-light/10 bg-white">
                  {dayKeys.map((dk) => {
                    const isCapstone = dk === 'capstone'
                    const isPreWeek = dk === 'pre-week'
                    const dayNum = (isCapstone || isPreWeek) ? 0 : parseInt(dk.replace('day-', ''), 10)
                    const items = daysMap[dk]
                    const key = `${wk}-${dk}`
                    const open = modalDayOpen.has(key)
                    return (
                      <div key={key} className="border-b border-neutral-light/10 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => toggleModalDay(wk, dk)}
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
                            {isCapstone ? 'Capstone Project' : isPreWeek ? 'Pre-Week' : `Day ${dayNum}`}
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
                                className="w-full text-left pl-12 pr-4 py-3 flex items-center gap-4 hover:bg-primary/5 transition-colors border-t border-neutral-light/5 first:border-t-0 cursor-pointer"
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
              </div>
            )
          })}
        </div>
      </Modal>
    </DepartmentTPCLayout>
  )
}
