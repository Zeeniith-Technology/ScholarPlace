'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Modal } from '@/components/ui/Modal'
import { getAuthHeader } from '@/utils/auth'
import { exportToCSV } from '@/utils/exportUtils'
import { ClipboardList, RefreshCw, Search, Download, Eye, CheckCircle2, XCircle, Building2, Layers, CalendarDays, ChevronDown, ChevronRight } from 'lucide-react'

interface Row {
  studentId: string
  student_name: string
  student_email: string
  college: string
  department: string
  tests: number
  avgScore: number
  bestScore: number
  lastActive: string | null
}

interface StudentAttempt {
  _id: string
  week: number | null
  day: string | null
  score: number
  attempt: number
  correct: number
  total: number
  completed_at: string | null
}

interface QDetail {
  question_id: string
  question: string
  selected_answer: string
  correct_answer: string
  is_correct: boolean
  question_type: string
  time_spent: number
}

const WEEKS = ['1', '2', '3', '4', '5', '6']

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

const DAY_RANK = (d: string | null) => {
  if (d === 'pre-week') return -1
  const m = /^day-(\d+)$/.exec(d || '')
  if (m) return parseInt(m[1])
  if (d === 'capstone') return 90
  return 99
}
const dayLabel = (d: string | null) => {
  if (!d) return 'Other'
  if (d === 'pre-week') return 'Pre-Week'
  if (d === 'capstone') return 'Capstone'
  const m = /^day-(\d+)$/.exec(d)
  return m ? `Day ${m[1]}` : d
}

function relative(iso: string | null) {
  if (!iso) return '—'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (isNaN(days)) return '—'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function PracticeMonitoringPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [totalTests, setTotalTests] = useState(0)
  const [avgScore, setAvgScore] = useState(0)

  const [colleges, setColleges] = useState<{ _id: string; collage_name: string }[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [collegeFilter, setCollegeFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [weekFilter, setWeekFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Student → week/day-grouped attempts
  const [studentDetail, setStudentDetail] = useState<{ student_name: string; attempts: StudentAttempt[] } | null>(null)
  const [studentLoading, setStudentLoading] = useState(false)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const toggleWeek = (wk: number) => setExpandedWeeks(prev => { const n = new Set(prev); n.has(wk) ? n.delete(wk) : n.add(wk); return n })
  const toggleDay = (key: string) => setExpandedDays(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  // One attempt → question-level answers
  const [qDetail, setQDetail] = useState<{ student_name: string; week: number; day: string; score: number; correct: number; total: number; questions: QDetail[] } | null>(null)
  const [qLoading, setQLoading] = useState(false)

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setDeptFilter('all') }, [collegeFilter])

  useEffect(() => {
    const authHeader = getAuthHeader()
    if (!authHeader) return
    const headers = { 'Content-Type': 'application/json', 'Authorization': authHeader }
    fetch(`${apiBaseUrl}/collage/list`, { method: 'POST', headers, body: JSON.stringify({ projection: { collage_name: 1 } }) })
      .then(r => r.json()).then(d => { if (d.success) setColleges((d.data || []).map((c: any) => ({ _id: String(c._id), collage_name: c.collage_name }))) }).catch(() => {})
    fetch(`${apiBaseUrl}/department/list`, { method: 'POST', headers, body: JSON.stringify({ filter: { deleted: false }, projection: { department_name: 1, department_code: 1, collage_id: 1, department_college_id: 1 } }) })
      .then(r => r.json()).then(d => { if (d.success) setDepartments(d.data || []) }).catch(() => {})
  }, [apiBaseUrl])

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const body: any = {}
      if (collegeFilter !== 'all') body.collegeId = collegeFilter
      if (deptFilter !== 'all') body.departmentId = deptFilter
      if (weekFilter !== 'all') body.week = weekFilter
      if (debouncedSearch.trim()) body.search = debouncedSearch.trim()
      const res = await fetch(`${apiBaseUrl}/superadmin/monitoring/practice`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify(body),
      })
      const d = await res.json()
      if (d.success && d.data) {
        setRows(d.data.students || [])
        setTotalTests(d.data.summary?.totalTests ?? 0)
        setAvgScore(d.data.summary?.avgScore ?? 0)
      }
    } catch (e) { console.error('practice monitoring load error', e) }
    finally { setIsLoading(false) }
  }, [apiBaseUrl, collegeFilter, deptFilter, weekFilter, debouncedSearch])

  useEffect(() => { load() }, [load])

  const openStudent = async (studentId: string) => {
    try {
      setStudentLoading(true)
      setStudentDetail({ student_name: '', attempts: [] })
      setExpandedWeeks(new Set())
      setExpandedDays(new Set())
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/superadmin/monitoring/practice-student`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify({ studentId }),
      })
      const d = await res.json()
      if (d.success && d.data) setStudentDetail(d.data)
    } catch (e) { console.error('student detail error', e) }
    finally { setStudentLoading(false) }
  }

  const openAnswers = async (attemptId: string) => {
    try {
      setQLoading(true)
      setQDetail({ student_name: '', week: 0, day: '', score: 0, correct: 0, total: 0, questions: [] })
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/superadmin/monitoring/practice-detail`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify({ attemptId }),
      })
      const d = await res.json()
      if (d.success && d.data) setQDetail(d.data)
    } catch (e) { console.error('answers error', e) }
    finally { setQLoading(false) }
  }

  const deptOptions = departments.filter(d => collegeFilter === 'all' || String(d.collage_id || d.department_college_id || '') === collegeFilter)

  const handleExport = () => {
    if (rows.length === 0) return
    exportToCSV(rows.map(r => ({
      student: r.student_name, email: r.student_email, college: r.college, department: r.department,
      tests: r.tests, avg_score: r.avgScore, best_score: r.bestScore,
      last_active: r.lastActive ? new Date(r.lastActive).toLocaleString() : '',
    })), `aptitude_monitoring_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <SuperadminLayout>
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-primary" />
                Aptitude Monitoring
              </h1>
              <p className="text-neutral-light mt-1">Every student's practice performance — click a student to see week &amp; day breakdown</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2 text-sm font-medium">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
              <Button variant="secondary" onClick={load} className="flex items-center gap-2 text-sm font-medium">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" />
                <input type="text" placeholder="Search student name / email / enrollment..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-light/30 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <FilterSelect widthClass="w-full lg:w-56 shrink-0" icon={Building2} value={collegeFilter} onChange={setCollegeFilter}
                options={[{ value: 'all', label: 'All Colleges' }, ...colleges.map(c => ({ value: c._id, label: c.collage_name }))]} />
              <FilterSelect widthClass="w-full lg:w-52 shrink-0" icon={Layers} value={deptFilter} onChange={setDeptFilter}
                options={[{ value: 'all', label: 'All Departments' }, ...deptOptions.map(d => ({ value: String(d._id), label: d.department_name || d.department_code || 'Unknown' }))]} />
              <FilterSelect widthClass="w-full lg:w-40 shrink-0" icon={CalendarDays} value={weekFilter} onChange={setWeekFilter}
                options={[{ value: 'all', label: 'All Weeks' }, ...WEEKS.map(w => ({ value: w, label: `Week ${w}` }))]} />
            </div>
          </Card>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-5"><p className="text-3xl font-bold text-neutral">{rows.length}</p><p className="text-sm text-neutral-light mt-1">Students with attempts</p></Card>
            <Card className="p-5"><p className="text-3xl font-bold text-neutral">{totalTests}</p><p className="text-sm text-neutral-light mt-1">Total attempts</p></Card>
            <Card className="p-5"><p className={`text-3xl font-bold ${scoreColor(avgScore)}`}>{avgScore}%</p><p className="text-sm text-neutral-light mt-1">Average score</p></Card>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
            ) : rows.length === 0 ? (
              <div className="p-16 text-center">
                <ClipboardList className="w-12 h-12 text-neutral-light mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-semibold text-neutral mb-2">No attempts found</h3>
                <p className="text-neutral-light">No students match these filters, or none have taken a practice test yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-light/20 bg-background-elevated">
                      <th className="text-left py-3 px-4 font-semibold text-neutral">Student</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral">College</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral">Department</th>
                      <th className="text-center py-3 px-4 font-semibold text-neutral">Attempts</th>
                      <th className="text-center py-3 px-4 font-semibold text-neutral">Avg</th>
                      <th className="text-center py-3 px-4 font-semibold text-neutral">Best</th>
                      <th className="text-right py-3 px-4 font-semibold text-neutral">Last Active</th>
                      <th className="text-right py-3 px-4 font-semibold text-neutral">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.studentId} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                        <td className="py-3 px-4"><p className="font-medium text-neutral">{r.student_name}</p><p className="text-xs text-neutral-light">{r.student_email}</p></td>
                        <td className="py-3 px-4 text-neutral-light">{r.college}</td>
                        <td className="py-3 px-4 text-neutral-light">{r.department}</td>
                        <td className="py-3 px-4 text-center text-neutral">{r.tests}</td>
                        <td className={`py-3 px-4 text-center font-semibold ${scoreColor(r.avgScore)}`}>{r.avgScore}%</td>
                        <td className={`py-3 px-4 text-center font-medium ${scoreColor(r.bestScore)}`}>{r.bestScore}%</td>
                        <td className="py-3 px-4 text-right text-neutral-light whitespace-nowrap">{relative(r.lastActive)}</td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => openStudent(r.studentId)} className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium">
                            <Eye className="w-4 h-4" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Student → week/day grouped attempts */}
      <Modal isOpen={!!studentDetail} onClose={() => setStudentDetail(null)} title="Aptitude — Week &amp; Day Breakdown" size="lg">
        {studentLoading || !studentDetail ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-background-elevated">
              <p className="font-semibold text-neutral">{studentDetail.student_name}</p>
              <p className="text-xs text-neutral-light">{studentDetail.attempts.length} attempt{studentDetail.attempts.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {studentDetail.attempts.length === 0 ? (
                <p className="text-sm text-neutral-light text-center py-6">No attempts</p>
              ) : (() => {
                const byWeek = new Map<number, Map<string, StudentAttempt[]>>()
                for (const a of studentDetail.attempts) {
                  const wk = a.week ?? 0
                  const day = a.day ?? 'other'
                  if (!byWeek.has(wk)) byWeek.set(wk, new Map())
                  const dm = byWeek.get(wk)!
                  if (!dm.has(day)) dm.set(day, [])
                  dm.get(day)!.push(a)
                }
                const weeks = [...byWeek.keys()].sort((a, b) => (a === 0 ? 999 : a) - (b === 0 ? 999 : b))
                return weeks.map(wk => {
                  const dm = byWeek.get(wk)!
                  const days = [...dm.keys()].sort((a, b) => DAY_RANK(a) - DAY_RANK(b))
                  const weekOpen = expandedWeeks.has(wk)
                  const weekBest = Math.max(...[...dm.values()].flat().map(a => a.score))
                  return (
                    <div key={wk} className="border border-neutral-light/15 rounded-lg overflow-hidden">
                      <button type="button" onClick={() => toggleWeek(wk)} className="w-full px-3 py-2 bg-background-elevated flex items-center justify-between hover:bg-background-elevated/70 transition-colors">
                        <span className="flex items-center gap-1.5 font-semibold text-sm text-neutral">
                          {weekOpen ? <ChevronDown className="w-4 h-4 text-neutral-light" /> : <ChevronRight className="w-4 h-4 text-neutral-light" />}
                          {wk === 0 ? 'Other' : `Week ${wk}`}
                        </span>
                        <span className={`text-xs font-semibold ${scoreColor(weekBest)}`}>Best {weekBest}%</span>
                      </button>
                      {weekOpen && (
                      <div className="divide-y divide-neutral-light/10">
                        {days.map(day => {
                          const items = dm.get(day)!.sort((a, b) => a.attempt - b.attempt)
                          const best = Math.max(...items.map(a => a.score))
                          const dayKey = `${wk}:${day}`
                          const dayOpen = expandedDays.has(dayKey)
                          return (
                            <div key={day}>
                              <button type="button" onClick={() => toggleDay(dayKey)} className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-background-elevated/40 transition-colors">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-light uppercase tracking-wide">
                                  {dayOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  {dayLabel(day)}
                                </span>
                                <span className={`text-xs font-semibold ${scoreColor(best)}`}>Best {best}%</span>
                              </button>
                              {dayOpen && (
                              <div className="space-y-1.5 px-3 pb-2.5">
                                {items.map(a => (
                                  <div key={a._id} className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm text-neutral">Attempt {a.attempt} · <span className="text-neutral-light">{a.correct}/{a.total} correct</span></p>
                                      <p className="text-xs text-neutral-light">{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className={`font-semibold text-sm ${scoreColor(a.score)}`}>{a.score}%</span>
                                      <button onClick={() => openAnswers(a._id)} className="text-primary hover:underline text-xs font-medium">Answers</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        )}
      </Modal>

      {/* One attempt → question-level answers */}
      <Modal isOpen={!!qDetail} onClose={() => setQDetail(null)} title="Attempt — Answers" size="xl">
        {qLoading || !qDetail ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-lg bg-background-elevated">
              <div>
                <p className="font-semibold text-neutral">{qDetail.student_name}</p>
                <p className="text-xs text-neutral-light">Week {qDetail.week} · {qDetail.day}</p>
              </div>
              <span className={`text-lg font-bold ${scoreColor(qDetail.score)}`}>{qDetail.score}% <span className="text-sm text-neutral-light font-medium">({qDetail.correct}/{qDetail.total})</span></span>
            </div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {qDetail.questions.map((q, i) => (
                <div key={i} className={`p-3 rounded-lg border ${q.is_correct ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  <div className="flex items-start gap-2">
                    {q.is_correct ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral">{i + 1}. {q.question}</p>
                      <p className="text-xs mt-1 text-neutral-light">Picked: <span className={q.is_correct ? 'text-green-600' : 'text-red-600'}>{q.selected_answer || '—'}</span></p>
                      {!q.is_correct && <p className="text-xs text-neutral-light">Correct: <span className="text-green-600">{q.correct_answer}</span></p>}
                    </div>
                    {q.question_type && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-light/10 text-neutral-light shrink-0">{q.question_type}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </SuperadminLayout>
  )
}
