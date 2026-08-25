'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { DatePicker } from '@/components/ui/DatePicker'
import { getAuthHeader } from '@/utils/auth'
import * as XLSX from 'xlsx'
import { FileBarChart, RefreshCw, Search, Download, Building2, Layers, Users, Code2, ClipboardList, Activity, CalendarRange, Bug, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface Overall {
  totalStudents: number
  activeStudents: number
  avgAptitude: number
  aptitudeTests: number
  aptitudePassed: number
  aptitudeFailed: number
  aptitudeTimeSpentMinutes: number
  codingSolved: number
  codingAttempts: number
  codingFailed: number
  daysCompleted: number
  bugReportsSubmitted: number
}
interface CollegeRow {
  college: string
  students: number
  active: number
  avgAptitude: number
  codingSolved: number
}
interface DeptRow {
  college: string
  department: string
  students: number
  active: number
  avgAptitude: number
  codingSolved: number
}
interface WeekTrendRow {
  week: number
  avgAptitude: number
  aptitudeTests: number
  codingSolved: number
  codingAttempts: number
  activeStudents: number
}
interface StudentRow {
  studentId: string
  student_name: string
  student_email: string
  enrollment: string
  college: string
  department: string
  status: string
  registeredAt: string | null
  avgAptitude: number
  aptitudeTests: number
  aptitudePassed: number
  aptitudeFailed: number
  aptitudeTimeSpentMinutes: number
  codingSolved: number
  codingAttempts: number
  codingFailed: number
  daysCompleted: number
  weeksCompleted: number
  bugReportsSubmitted: number
  active: boolean
  lastLogin: string | null
  lastActivity: { at: string; type: 'coding' | 'aptitude'; label: string } | null
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
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

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [overall, setOverall] = useState<Overall | null>(null)
  const [byCollege, setByCollege] = useState<CollegeRow[]>([])
  const [byDepartment, setByDepartment] = useState<DeptRow[]>([])
  const [weeklyTrend, setWeeklyTrend] = useState<WeekTrendRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const [colleges, setColleges] = useState<{ _id: string; collage_name: string }[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [collegeFilter, setCollegeFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

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
      if (dateFrom) body.dateFrom = dateFrom
      if (dateTo) body.dateTo = dateTo
      if (debouncedSearch.trim()) body.search = debouncedSearch.trim()
      const res = await fetch(`${apiBaseUrl}/superadmin/reports/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify(body),
      })
      const d = await res.json()
      if (d.success && d.data) {
        setOverall(d.data.summary?.overall || null)
        setByCollege(d.data.summary?.byCollege || [])
        setByDepartment(d.data.summary?.byDepartment || [])
        setWeeklyTrend(d.data.summary?.weeklyTrend || [])
        setStudents(d.data.students || [])
        setGeneratedAt(d.data.generatedAt || null)
      }
    } catch (e) { console.error('report load error', e) }
    finally { setIsLoading(false) }
  }, [apiBaseUrl, collegeFilter, deptFilter, dateFrom, dateTo, debouncedSearch])

  useEffect(() => { load() }, [load])

  const deptOptions = departments.filter(d => collegeFilter === 'all' || String(d.collage_id || d.department_college_id || '') === collegeFilter)

  // Full platform-wide "A to Z" Excel — every college/department in one file.
  // Students sheet has one row per student with everything: registration, login,
  // aptitude (tests/pass/fail/time), coding (solved/attempts/fail), days/weeks
  // completed, and bug reports filed. Summary sheets give the roll-up context.
  const handleExport = () => {
    if (students.length === 0) return
    const workbook = XLSX.utils.book_new()

    const overallSheet = XLSX.utils.json_to_sheet([{
      'Total Students': overall?.totalStudents ?? 0,
      'Active Students': overall?.activeStudents ?? 0,
      'Avg Aptitude (%)': overall?.avgAptitude ?? 0,
      'Aptitude Tests': overall?.aptitudeTests ?? 0,
      'Coding Solved': overall?.codingSolved ?? 0,
      'Coding Attempts': overall?.codingAttempts ?? 0,
      'Generated At': generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString(),
    }])
    XLSX.utils.book_append_sheet(workbook, overallSheet, 'Overall')

    const collegeSheet = XLSX.utils.json_to_sheet(byCollege.map(c => ({
      'College': c.college, 'Students': c.students, 'Active': c.active,
      'Avg Aptitude (%)': c.avgAptitude, 'Coding Solved': c.codingSolved,
    })))
    XLSX.utils.book_append_sheet(workbook, collegeSheet, 'By College')

    const deptSheet = XLSX.utils.json_to_sheet(byDepartment.map(d => ({
      'College': d.college, 'Department': d.department, 'Students': d.students, 'Active': d.active,
      'Avg Aptitude (%)': d.avgAptitude, 'Coding Solved': d.codingSolved,
    })))
    XLSX.utils.book_append_sheet(workbook, deptSheet, 'By Department')

    // Coding Solved (distinct problems) and Coding Failed (submissions) are
    // deliberately different kinds of counts and won't sum to Coding Attempts —
    // Solved dedupes by problem, Failed counts every failed submission including
    // retries. Labeled explicitly below so it doesn't read as a data error.
    const studentsSheet = XLSX.utils.json_to_sheet(students.map(s => ({
      'Name': s.student_name,
      'Email': s.student_email,
      'Enrollment': s.enrollment,
      'College': s.college,
      'Department': s.department,
      'Status': s.status,
      'Registered On': s.registeredAt ? new Date(s.registeredAt).toLocaleDateString() : '',
      'Last Login': s.lastLogin ? new Date(s.lastLogin).toLocaleString() : 'Never',
      'Last Activity': s.lastActivity ? s.lastActivity.label : '',
      'Last Activity At': s.lastActivity ? new Date(s.lastActivity.at).toLocaleString() : '',
      'Actively Participating': s.active ? 'Yes' : 'No',
      'Aptitude Tests Taken': s.aptitudeTests,
      'Aptitude Passed (>=70%)': s.aptitudePassed,
      'Aptitude Failed (<70%)': s.aptitudeFailed,
      'Avg Aptitude Score (%)': s.avgAptitude,
      'Aptitude Time Spent (min)': s.aptitudeTimeSpentMinutes,
      'Coding Attempts (total)': s.codingAttempts,
      'Coding Solved (distinct problems)': s.codingSolved,
      'Coding Failed (submissions)': s.codingFailed,
      'Days Completed': s.daysCompleted,
      'Weeks Completed': s.weeksCompleted,
      'Bug Reports Submitted': s.bugReportsSubmitted,
    })))
    studentsSheet['!cols'] = [
      { wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
      { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 16 },
      { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
      { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 16 },
    ]
    XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Students')

    XLSX.writeFile(workbook, `superadmin_report_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const Stat = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: React.ReactNode; color?: string }) => (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-neutral-light mb-1"><Icon className="w-4 h-4" /><span className="text-xs font-medium">{label}</span></div>
      <p className={`text-3xl font-bold ${color || 'text-neutral'}`}>{value}</p>
    </Card>
  )

  return (
    <SuperadminLayout>
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral flex items-center gap-3">
                <FileBarChart className="w-8 h-8 text-primary" />
                Reports
              </h1>
              <p className="text-neutral-light mt-1">
                Cross-college performance — aptitude &amp; coding{generatedAt ? ` · generated ${new Date(generatedAt).toLocaleString()}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2 text-sm font-medium">
                <Download className="w-4 h-4" /> Export Excel
              </Button>
              <Button variant="secondary" onClick={load} className="flex items-center gap-2 text-sm font-medium">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" />
                <input type="text" placeholder="Search student name / email / enrollment..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-light/30 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <FilterSelect widthClass="w-full lg:w-52 shrink-0" icon={Building2} value={collegeFilter} onChange={setCollegeFilter}
                options={[{ value: 'all', label: 'All Colleges' }, ...colleges.map(c => ({ value: c._id, label: c.collage_name }))]} />
              <FilterSelect widthClass="w-full lg:w-48 shrink-0" icon={Layers} value={deptFilter} onChange={setDeptFilter}
                options={[{ value: 'all', label: 'All Departments' }, ...deptOptions.map(d => ({ value: String(d._id), label: d.department_name || d.department_code || 'Unknown' }))]} />
              <div className="flex items-center gap-2">
                <DatePicker widthClass="w-40" value={dateFrom} onChange={setDateFrom} placeholder="From date" max={dateTo || undefined} />
                <span className="text-neutral-light text-sm">to</span>
                <DatePicker widthClass="w-40" value={dateTo} onChange={setDateTo} placeholder="To date" min={dateFrom || undefined} />
              </div>
            </div>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
          ) : (
            <>
              {/* Summary — overall */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <Stat icon={Users} label="Students" value={overall?.totalStudents ?? 0} />
                <Stat icon={Activity} label="Active" value={overall?.activeStudents ?? 0} color="text-primary" />
                <Stat icon={ClipboardList} label="Avg Aptitude" value={`${overall?.avgAptitude ?? 0}%`} color={scoreColor(overall?.avgAptitude ?? 0)} />
                <Stat icon={ClipboardList} label="Aptitude Tests" value={overall?.aptitudeTests ?? 0} />
                <Stat icon={Code2} label="Coding Solved" value={overall?.codingSolved ?? 0} color="text-green-600" />
                <Stat icon={Code2} label="Coding Attempts" value={overall?.codingAttempts ?? 0} />
                <Stat icon={CheckCircle2} label="Aptitude Passed" value={overall?.aptitudePassed ?? 0} color="text-green-600" />
                <Stat icon={XCircle} label="Aptitude Failed" value={overall?.aptitudeFailed ?? 0} color="text-red-500" />
                <Stat icon={XCircle} label="Coding Failed" value={overall?.codingFailed ?? 0} color="text-red-500" />
                <Stat icon={Clock} label="Aptitude Time Spent" value={`${((overall?.aptitudeTimeSpentMinutes ?? 0) / 60).toFixed(1)}h`} />
                <Stat icon={CalendarRange} label="Days Completed" value={overall?.daysCompleted ?? 0} />
                <Stat icon={Bug} label="Bug Reports" value={overall?.bugReportsSubmitted ?? 0} color="text-amber-600" />
              </div>

              {/* Summary — per college */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-light/20 bg-background-elevated">
                  <h2 className="font-semibold text-neutral flex items-center gap-2"><Building2 className="w-4 h-4" /> By College</h2>
                </div>
                {byCollege.length === 0 ? (
                  <p className="p-8 text-center text-neutral-light text-sm">No data for these filters.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-light/20">
                          <th className="text-left py-3 px-4 font-semibold text-neutral">College</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Students</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Active</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Avg Aptitude</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Coding Solved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byCollege.map((c, i) => (
                          <tr key={i} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                            <td className="py-3 px-4 font-medium text-neutral">{c.college}</td>
                            <td className="py-3 px-4 text-center text-neutral">{c.students}</td>
                            <td className="py-3 px-4 text-center text-neutral-light">{c.active}</td>
                            <td className={`py-3 px-4 text-center font-semibold ${scoreColor(c.avgAptitude)}`}>{c.avgAptitude}%</td>
                            <td className="py-3 px-4 text-center font-semibold text-green-600">{c.codingSolved}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Summary — per department */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-light/20 bg-background-elevated">
                  <h2 className="font-semibold text-neutral flex items-center gap-2"><Layers className="w-4 h-4" /> By Department</h2>
                </div>
                {byDepartment.length === 0 ? (
                  <p className="p-8 text-center text-neutral-light text-sm">No data for these filters.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-light/20">
                          <th className="text-left py-3 px-4 font-semibold text-neutral">College</th>
                          <th className="text-left py-3 px-4 font-semibold text-neutral">Department</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Students</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Active</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Avg Aptitude</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Coding Solved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byDepartment.map((d, i) => (
                          <tr key={i} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                            <td className="py-3 px-4 text-neutral-light">{d.college}</td>
                            <td className="py-3 px-4 font-medium text-neutral">{d.department}</td>
                            <td className="py-3 px-4 text-center text-neutral">{d.students}</td>
                            <td className="py-3 px-4 text-center text-neutral-light">{d.active}</td>
                            <td className={`py-3 px-4 text-center font-semibold ${scoreColor(d.avgAptitude)}`}>{d.avgAptitude}%</td>
                            <td className="py-3 px-4 text-center font-semibold text-green-600">{d.codingSolved}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Weekly completion trend */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-light/20 bg-background-elevated">
                  <h2 className="font-semibold text-neutral flex items-center gap-2"><CalendarRange className="w-4 h-4" /> Weekly Trend</h2>
                  <p className="text-xs text-neutral-light mt-0.5">Pace week over week — are students keeping up, or falling off?</p>
                </div>
                {weeklyTrend.length === 0 ? (
                  <p className="p-8 text-center text-neutral-light text-sm">No week-tagged activity for these filters.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-light/20">
                          <th className="text-left py-3 px-4 font-semibold text-neutral">Week</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Active Students</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Avg Aptitude</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Aptitude Tests</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Coding Solved</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Coding Attempts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyTrend.map(w => (
                          <tr key={w.week} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                            <td className="py-3 px-4 font-medium text-neutral">Week {w.week}</td>
                            <td className="py-3 px-4 text-center text-neutral">{w.activeStudents}</td>
                            <td className={`py-3 px-4 text-center font-semibold ${w.aptitudeTests ? scoreColor(w.avgAptitude) : 'text-neutral-light'}`}>{w.aptitudeTests ? `${w.avgAptitude}%` : '—'}</td>
                            <td className="py-3 px-4 text-center text-neutral-light">{w.aptitudeTests}</td>
                            <td className="py-3 px-4 text-center font-semibold text-green-600">{w.codingSolved}</td>
                            <td className="py-3 px-4 text-center text-neutral-light">{w.codingAttempts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Detail — per student */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-light/20 bg-background-elevated flex items-center justify-between">
                  <h2 className="font-semibold text-neutral flex items-center gap-2"><Users className="w-4 h-4" /> Per Student</h2>
                  <span className="text-xs text-neutral-light">{students.length} student{students.length !== 1 ? 's' : ''}</span>
                </div>
                {students.length === 0 ? (
                  <p className="p-8 text-center text-neutral-light text-sm">No students match these filters.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-light/20">
                          <th className="text-left py-3 px-4 font-semibold text-neutral">Student</th>
                          <th className="text-left py-3 px-4 font-semibold text-neutral">College</th>
                          <th className="text-left py-3 px-4 font-semibold text-neutral">Department</th>
                          <th className="text-right py-3 px-4 font-semibold text-neutral">Registered</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Avg Aptitude</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Apt. P/F</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Coding Solved</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Coding Attempts</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Days</th>
                          <th className="text-center py-3 px-4 font-semibold text-neutral">Bugs</th>
                          <th className="text-right py-3 px-4 font-semibold text-neutral">Last Login</th>
                          <th className="text-left py-3 px-4 font-semibold text-neutral">Last Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(s => (
                          <tr key={s.studentId} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                            <td className="py-3 px-4"><p className="font-medium text-neutral">{s.student_name}</p><p className="text-xs text-neutral-light">{s.student_email}</p></td>
                            <td className="py-3 px-4 text-neutral-light">{s.college}</td>
                            <td className="py-3 px-4 text-neutral-light">{s.department}</td>
                            <td className="py-3 px-4 text-right text-neutral-light whitespace-nowrap">{s.registeredAt ? new Date(s.registeredAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                            <td className={`py-3 px-4 text-center font-semibold ${s.aptitudeTests ? scoreColor(s.avgAptitude) : 'text-neutral-light'}`}>{s.aptitudeTests ? `${s.avgAptitude}%` : '—'}</td>
                            <td className="py-3 px-4 text-center text-xs whitespace-nowrap">
                              {s.aptitudeTests ? (<><span className="text-green-600 font-semibold">{s.aptitudePassed}P</span> <span className="text-neutral-light">/</span> <span className="text-red-500 font-semibold">{s.aptitudeFailed}F</span></>) : <span className="text-neutral-light">—</span>}
                            </td>
                            <td className="py-3 px-4 text-center font-semibold text-green-600">{s.codingSolved}</td>
                            <td className="py-3 px-4 text-center text-neutral">{s.codingAttempts}</td>
                            <td className="py-3 px-4 text-center text-neutral">{s.daysCompleted}</td>
                            <td className="py-3 px-4 text-center">
                              {s.bugReportsSubmitted > 0 ? <span className="text-amber-600 font-semibold">{s.bugReportsSubmitted}</span> : <span className="text-neutral-light">0</span>}
                            </td>
                            <td className="py-3 px-4 text-right text-neutral-light whitespace-nowrap">{relative(s.lastLogin)}</td>
                            <td className="py-3 px-4">
                              {s.lastActivity ? (
                                <div className="min-w-0">
                                  <p className="text-neutral truncate max-w-[220px]" title={s.lastActivity.label}>{s.lastActivity.label}</p>
                                  <p className="text-xs text-neutral-light">{relative(s.lastActivity.at)}</p>
                                </div>
                              ) : (
                                <span className="text-neutral-light">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </SuperadminLayout>
  )
}
