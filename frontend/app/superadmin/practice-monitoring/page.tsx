'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Modal } from '@/components/ui/Modal'
import { getAuthHeader } from '@/utils/auth'
import { exportToCSV } from '@/utils/exportUtils'
import { ClipboardList, RefreshCw, Search, Download, Eye, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Building2, Layers, CalendarDays } from 'lucide-react'

interface Attempt {
  _id: string
  student_name: string
  student_email: string
  college: string
  department: string
  week: number
  day: string
  category: string
  attempt: number
  score: number
  correct: number
  total: number
  time_spent: number
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

const PAGE_SIZE = 50
const WEEKS = ['1', '2', '3', '4', '5', '6']

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

export default function PracticeMonitoringPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [total, setTotal] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [page, setPage] = useState(1)

  const [colleges, setColleges] = useState<{ _id: string; collage_name: string }[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [collegeFilter, setCollegeFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [weekFilter, setWeekFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [detail, setDetail] = useState<{ student_name: string; week: number; day: string; score: number; correct: number; total: number; questions: QDetail[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [collegeFilter, deptFilter, weekFilter, debouncedSearch])
  useEffect(() => { setDeptFilter('all') }, [collegeFilter])

  // Reference data (colleges + departments) for the dropdowns
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
      const body: any = { page, limit: PAGE_SIZE }
      if (collegeFilter !== 'all') body.collegeId = collegeFilter
      if (deptFilter !== 'all') body.departmentId = deptFilter
      if (weekFilter !== 'all') body.week = weekFilter
      if (debouncedSearch.trim()) body.search = debouncedSearch.trim()
      const res = await fetch(`${apiBaseUrl}/superadmin/monitoring/practice`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify(body),
      })
      const d = await res.json()
      if (d.success && d.data) {
        setAttempts(d.data.attempts || [])
        setTotal(d.data.total || 0)
        setAvgScore(d.data.summary?.avgScore ?? 0)
      }
    } catch (e) { console.error('practice monitoring load error', e) }
    finally { setIsLoading(false) }
  }, [apiBaseUrl, page, collegeFilter, deptFilter, weekFilter, debouncedSearch])

  useEffect(() => { load() }, [load])

  const openDetail = async (attemptId: string) => {
    try {
      setDetailLoading(true)
      setDetail({ student_name: '', week: 0, day: '', score: 0, correct: 0, total: 0, questions: [] })
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/superadmin/monitoring/practice-detail`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify({ attemptId }),
      })
      const d = await res.json()
      if (d.success && d.data) setDetail(d.data)
    } catch (e) { console.error('detail error', e) }
    finally { setDetailLoading(false) }
  }

  const deptOptions = departments.filter(d => collegeFilter === 'all' || String(d.collage_id || d.department_college_id || '') === collegeFilter)

  const handleExport = () => {
    if (attempts.length === 0) return
    exportToCSV(attempts.map(a => ({
      student: a.student_name, email: a.student_email, college: a.college, department: a.department,
      week: a.week, day: a.day, score: a.score, correct: a.correct, total: a.total,
      date: a.completed_at ? new Date(a.completed_at).toLocaleString() : '',
    })), `practice_monitoring_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

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
              <p className="text-neutral-light mt-1">Every student's practice-test attempts — filter by college, department and week</p>
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
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5"><p className="text-3xl font-bold text-neutral">{total}</p><p className="text-sm text-neutral-light mt-1">Attempts (filtered)</p></Card>
            <Card className="p-5"><p className={`text-3xl font-bold ${scoreColor(avgScore)}`}>{avgScore}%</p><p className="text-sm text-neutral-light mt-1">Average score</p></Card>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
            ) : attempts.length === 0 ? (
              <div className="p-16 text-center">
                <ClipboardList className="w-12 h-12 text-neutral-light mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-semibold text-neutral mb-2">No attempts found</h3>
                <p className="text-neutral-light">No practice tests match these filters yet.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-light/20 bg-background-elevated">
                        <th className="text-left py-3 px-4 font-semibold text-neutral">Student</th>
                        <th className="text-left py-3 px-4 font-semibold text-neutral">College</th>
                        <th className="text-left py-3 px-4 font-semibold text-neutral">Department</th>
                        <th className="text-center py-3 px-4 font-semibold text-neutral">Week / Day</th>
                        <th className="text-center py-3 px-4 font-semibold text-neutral">Score</th>
                        <th className="text-center py-3 px-4 font-semibold text-neutral">Correct</th>
                        <th className="text-right py-3 px-4 font-semibold text-neutral">When</th>
                        <th className="text-right py-3 px-4 font-semibold text-neutral">Answers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map(a => (
                        <tr key={a._id} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                          <td className="py-3 px-4"><p className="font-medium text-neutral">{a.student_name}</p><p className="text-xs text-neutral-light">{a.student_email}</p></td>
                          <td className="py-3 px-4 text-neutral-light">{a.college}</td>
                          <td className="py-3 px-4 text-neutral-light">{a.department}</td>
                          <td className="py-3 px-4 text-center text-neutral-light whitespace-nowrap">W{a.week} · {a.day}</td>
                          <td className={`py-3 px-4 text-center font-semibold ${scoreColor(a.score)}`}>{a.score}%</td>
                          <td className="py-3 px-4 text-center text-neutral">{a.correct}/{a.total}</td>
                          <td className="py-3 px-4 text-right text-neutral-light whitespace-nowrap">{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => openDetail(a._id)} className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium">
                              <Eye className="w-4 h-4" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-light/20">
                  <p className="text-sm text-neutral-light">{total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(p - 1, 1))} className="flex items-center gap-1 text-sm font-medium"><ChevronLeft className="w-4 h-4" /> Prev</Button>
                    <span className="text-sm text-neutral px-2">{page} / {totalPages}</span>
                    <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(p + 1, totalPages))} className="flex items-center gap-1 text-sm font-medium">Next <ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Question-level detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Aptitude Attempt — Answers" size="xl">
        {detailLoading || !detail ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-lg bg-background-elevated">
              <div>
                <p className="font-semibold text-neutral">{detail.student_name}</p>
                <p className="text-xs text-neutral-light">Week {detail.week} · {detail.day}</p>
              </div>
              <span className={`text-lg font-bold ${scoreColor(detail.score)}`}>{detail.score}% <span className="text-sm text-neutral-light font-medium">({detail.correct}/{detail.total})</span></span>
            </div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {detail.questions.map((q, i) => (
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
