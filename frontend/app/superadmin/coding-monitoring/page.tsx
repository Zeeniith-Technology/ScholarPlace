'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Modal } from '@/components/ui/Modal'
import { getAuthHeader } from '@/utils/auth'
import { exportToCSV } from '@/utils/exportUtils'
import { Code2, RefreshCw, Search, Download, Eye, CheckCircle2, XCircle, Building2, Layers, ChevronDown, ChevronRight } from 'lucide-react'

interface Row {
  studentId: string
  student_name: string
  student_email: string
  college: string
  department: string
  solved: number
  attempts: number
  lastActive: string | null
}

interface Submission {
  problem_id: string
  problem_title: string
  week: number | null
  day: string | null
  status: string
  language: string
  score: number | null
  submitted_at: string | null
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

const DAY_RANK = (d: string | null) => {
  if (d === 'pre-week') return -1
  const m = /^day-(\d+)$/.exec(d || '')
  if (m) return parseInt(m[1])
  if (d === 'capstone') return 90
  return 99
}
const dayLabel = (d: string | null) => {
  if (!d || d === 'other') return 'Other'
  if (d === 'pre-week') return 'Pre-Week'
  if (d === 'capstone') return 'Capstone'
  const m = /^day-(\d+)$/.exec(d)
  return m ? `Day ${m[1]}` : d
}

export default function CodingMonitoringPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [totalSolved, setTotalSolved] = useState(0)

  const [colleges, setColleges] = useState<{ _id: string; collage_name: string }[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [collegeFilter, setCollegeFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [detail, setDetail] = useState<{ student_name: string; submissions: Submission[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const toggleWeek = (wk: number) => setExpandedWeeks(prev => { const n = new Set(prev); n.has(wk) ? n.delete(wk) : n.add(wk); return n })
  const toggleDay = (key: string) => setExpandedDays(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

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
      if (debouncedSearch.trim()) body.search = debouncedSearch.trim()
      const res = await fetch(`${apiBaseUrl}/superadmin/monitoring/coding`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify(body),
      })
      const d = await res.json()
      if (d.success && d.data) {
        setRows(d.data.students || [])
        setTotalSolved(d.data.summary?.totalSolved ?? 0)
      }
    } catch (e) { console.error('coding monitoring load error', e) }
    finally { setIsLoading(false) }
  }, [apiBaseUrl, collegeFilter, deptFilter, debouncedSearch])

  useEffect(() => { load() }, [load])

  const openDetail = async (studentId: string) => {
    try {
      setDetailLoading(true)
      setDetail({ student_name: '', submissions: [] })
      setExpandedWeeks(new Set())
      setExpandedDays(new Set())
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/superadmin/monitoring/coding-detail`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify({ studentId }),
      })
      const d = await res.json()
      if (d.success && d.data) setDetail(d.data)
    } catch (e) { console.error('detail error', e) }
    finally { setDetailLoading(false) }
  }

  const deptOptions = departments.filter(d => collegeFilter === 'all' || String(d.collage_id || d.department_college_id || '') === collegeFilter)

  const handleExport = () => {
    if (rows.length === 0) return
    exportToCSV(rows.map(r => ({
      student: r.student_name, email: r.student_email, college: r.college, department: r.department,
      solved: r.solved, attempts: r.attempts, last_active: r.lastActive ? new Date(r.lastActive).toLocaleString() : '',
    })), `coding_monitoring_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <SuperadminLayout>
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral flex items-center gap-3">
                <Code2 className="w-8 h-8 text-primary" />
                Coding Monitoring
              </h1>
              <p className="text-neutral-light mt-1">Every student's coding submissions — filter by college and department</p>
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
            </div>
          </Card>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5"><p className="text-3xl font-bold text-neutral">{rows.length}</p><p className="text-sm text-neutral-light mt-1">Students with submissions</p></Card>
            <Card className="p-5"><p className="text-3xl font-bold text-green-600">{totalSolved}</p><p className="text-sm text-neutral-light mt-1">Problems solved (total)</p></Card>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
            ) : rows.length === 0 ? (
              <div className="p-16 text-center">
                <Code2 className="w-12 h-12 text-neutral-light mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-semibold text-neutral mb-2">No submissions found</h3>
                <p className="text-neutral-light">No students match these filters, or none have submitted code yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-light/20 bg-background-elevated">
                      <th className="text-left py-3 px-4 font-semibold text-neutral">Student</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral">College</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral">Department</th>
                      <th className="text-center py-3 px-4 font-semibold text-neutral">Solved</th>
                      <th className="text-center py-3 px-4 font-semibold text-neutral">Attempts</th>
                      <th className="text-right py-3 px-4 font-semibold text-neutral">Last Active</th>
                      <th className="text-right py-3 px-4 font-semibold text-neutral">Submissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.studentId} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                        <td className="py-3 px-4"><p className="font-medium text-neutral">{r.student_name}</p><p className="text-xs text-neutral-light">{r.student_email}</p></td>
                        <td className="py-3 px-4 text-neutral-light">{r.college}</td>
                        <td className="py-3 px-4 text-neutral-light">{r.department}</td>
                        <td className="py-3 px-4 text-center"><span className="font-semibold text-green-600">{r.solved}</span></td>
                        <td className="py-3 px-4 text-center text-neutral">{r.attempts}</td>
                        <td className="py-3 px-4 text-right text-neutral-light whitespace-nowrap">{relative(r.lastActive)}</td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => openDetail(r.studentId)} className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium">
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

      {/* Submissions detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Coding Submissions" size="lg">
        {detailLoading || !detail ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-background-elevated">
              <p className="font-semibold text-neutral">{detail.student_name}</p>
              <p className="text-xs text-neutral-light">{detail.submissions.length} submission{detail.submissions.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {detail.submissions.length === 0 ? (
                <p className="text-sm text-neutral-light text-center py-6">No submissions</p>
              ) : (() => {
                const byWeek = new Map<number, Map<string, Submission[]>>()
                for (const s of detail.submissions) {
                  const wk = s.week ?? 0
                  const day = s.day ?? 'other'
                  if (!byWeek.has(wk)) byWeek.set(wk, new Map())
                  const dm = byWeek.get(wk)!
                  if (!dm.has(day)) dm.set(day, [])
                  dm.get(day)!.push(s)
                }
                const weeks = [...byWeek.keys()].sort((a, b) => (a === 0 ? 999 : a) - (b === 0 ? 999 : b))
                return weeks.map(wk => {
                  const dm = byWeek.get(wk)!
                  const days = [...dm.keys()].sort((a, b) => DAY_RANK(a) - DAY_RANK(b))
                  const weekSolved = [...dm.values()].flat().filter(s => s.status === 'passed').length
                  const weekTotal = [...dm.values()].flat().length
                  const weekOpen = expandedWeeks.has(wk)
                  return (
                    <div key={wk} className="border border-neutral-light/15 rounded-lg overflow-hidden">
                      <button type="button" onClick={() => toggleWeek(wk)} className="w-full px-3 py-2 bg-background-elevated flex items-center justify-between hover:bg-background-elevated/70 transition-colors">
                        <span className="flex items-center gap-1.5 font-semibold text-sm text-neutral">
                          {weekOpen ? <ChevronDown className="w-4 h-4 text-neutral-light" /> : <ChevronRight className="w-4 h-4 text-neutral-light" />}
                          {wk === 0 ? 'Other' : `Week ${wk}`}
                        </span>
                        <span className="text-xs text-green-600 font-medium">{weekSolved}/{weekTotal} solved</span>
                      </button>
                      {weekOpen && (
                      <div className="divide-y divide-neutral-light/10">
                        {days.map(day => {
                          const items = dm.get(day)!
                          const solved = items.filter(s => s.status === 'passed').length
                          const dayKey = `${wk}:${day}`
                          const dayOpen = expandedDays.has(dayKey)
                          return (
                            <div key={day}>
                              <button type="button" onClick={() => toggleDay(dayKey)} className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-background-elevated/40 transition-colors">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-light uppercase tracking-wide">
                                  {dayOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  {dayLabel(day)}
                                </span>
                                <span className="text-xs text-neutral-light">{solved}/{items.length}</span>
                              </button>
                              {dayOpen && (
                              <div className="space-y-1.5 px-3 pb-2.5">
                                {items.map((s, i) => (
                                  <div key={i} className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex items-center gap-2">
                                      {s.status === 'passed' ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-neutral truncate">{s.problem_title}</p>
                                        <p className="text-xs text-neutral-light">{s.language}{s.submitted_at ? ` · ${new Date(s.submitted_at).toLocaleDateString()}` : ''}</p>
                                      </div>
                                    </div>
                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${s.status === 'passed' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>{s.status}</span>
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
    </SuperadminLayout>
  )
}
