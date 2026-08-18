'use client'

import React, { useState, useEffect } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { getAuthHeader } from '@/utils/auth'
import { ShieldAlert, ShieldCheck, Ban, RefreshCw, AlertTriangle, Building2, Layers } from 'lucide-react'

interface Violation {
  _id: string
  student_name: string
  student_email: string
  college: string
  department: string
  week: string | number
  test_type: string
  reason: string
  blocked: boolean
  blocked_at: string
  approved_at: string | null
}

interface SecurityData {
  totalViolations: number
  currentlyBlocked: number
  resolved: number
  violationsByType: Record<string, number>
  violationsByCollege: Record<string, number>
  topViolators: { student_name: string; student_email: string; college: string; count: number }[]
  recentViolations: Violation[]
}

export default function SuperadminSecurityPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [data, setData] = useState<SecurityData | null>(null)
  const [error, setError] = useState('')
  // 'all' | 'blocked' | 'resolved'
  const [statusFilter, setStatusFilter] = useState<'all' | 'blocked' | 'resolved'>('all')
  const [collegeFilter, setCollegeFilter] = useState<string>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')

  const fetchData = async () => {
    try {
      setError('')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const res = await fetch(`${apiBaseUrl}/superadmin/analytics/security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      if (result.success && result.data) {
        setData(result.data)
      } else {
        setError(result.message || 'Failed to load security data')
      }
    } catch (e) {
      console.error('Error fetching security data:', e)
      setError('Failed to load security data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchData()
  }

  // Production dept/college names can carry stray whitespace — normalize for
  // both the dropdown options and the comparisons.
  const norm = (s: string | number | undefined | null) => String(s ?? '').trim()

  const allViolations = data?.recentViolations || []
  const collegeOptions = Array.from(new Set(allViolations.map(v => norm(v.college)).filter(Boolean))).sort()
  // Departments shown are scoped to the selected college
  const deptOptions = Array.from(new Set(
    allViolations
      .filter(v => collegeFilter === 'all' || norm(v.college) === collegeFilter)
      .map(v => norm(v.department))
      .filter(Boolean)
  )).sort()

  const visibleViolations = allViolations.filter(v => {
    if (statusFilter !== 'all' && (statusFilter === 'blocked' ? !v.blocked : v.blocked)) return false
    if (collegeFilter !== 'all' && norm(v.college) !== collegeFilter) return false
    if (deptFilter !== 'all' && norm(v.department) !== deptFilter) return false
    return true
  })

  // Changing college invalidates a department picked under the previous college
  const handleCollegeFilter = (value: string) => {
    setCollegeFilter(value)
    setDeptFilter('all')
  }

  return (
    <SuperadminLayout>
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              Test Security
            </h1>
            <p className="text-neutral-light mt-1">Proctoring violations and blocked test retakes across all colleges</p>
          </div>
          <Button variant="secondary" onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card className="p-12 text-center"><p className="text-red-600">{error}</p></Card>
        ) : !data || data.totalViolations === 0 ? (
          <Card className="p-16 text-center">
            <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral mb-2">No violations recorded</h3>
            <p className="text-neutral-light max-w-md mx-auto">
              When a student trips the test proctoring (tab switch, window switch), the block
              appears here along with its Dept TPC approval status.
            </p>
          </Card>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-orange-500/10 rounded-lg"><AlertTriangle className="w-6 h-6 text-orange-500" /></div>
                  <span className="text-xs text-neutral-light">All time</span>
                </div>
                <p className="text-3xl font-bold text-neutral">{data.totalViolations}</p>
                <p className="text-sm text-neutral-light mt-1">Total violations</p>
              </Card>
              <Card className="p-6 border-red-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-red-500/10 rounded-lg"><Ban className="w-6 h-6 text-red-600" /></div>
                  <span className="text-xs text-neutral-light">Needs Dept TPC approval</span>
                </div>
                <p className="text-3xl font-bold text-red-600">{data.currentlyBlocked}</p>
                <p className="text-sm text-neutral-light mt-1">Currently blocked</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-green-500/10 rounded-lg"><ShieldCheck className="w-6 h-6 text-green-600" /></div>
                  <span className="text-xs text-neutral-light">Approved for retake</span>
                </div>
                <p className="text-3xl font-bold text-neutral">{data.resolved}</p>
                <p className="text-sm text-neutral-light mt-1">Resolved</p>
              </Card>
            </div>

            {/* Breakdown: type + college + top violators */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral mb-4">By Violation Type</h3>
                <div className="space-y-2">
                  {Object.entries(data.violationsByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-light truncate pr-2" title={type}>{type}</span>
                      <span className="font-semibold text-neutral shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral mb-4">By College</h3>
                <div className="space-y-2">
                  {Object.entries(data.violationsByCollege).sort((a, b) => b[1] - a[1]).map(([college, count]) => (
                    <div key={college} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-light truncate pr-2">{college}</span>
                      <span className="font-semibold text-neutral shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral mb-4">Repeat Violators</h3>
                <div className="space-y-3">
                  {data.topViolators.slice(0, 5).map((v, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-neutral truncate">{v.student_name}</p>
                        <p className="text-xs text-neutral-light truncate">{v.college}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        v.count >= 3 ? 'bg-red-500/10 text-red-600' : 'bg-orange-500/10 text-orange-600'
                      }`}>{v.count}×</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Violations table */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-xl font-semibold text-neutral">Violation Log</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* College filter */}
                  <FilterSelect
                    value={collegeFilter}
                    onChange={handleCollegeFilter}
                    widthClass="w-48"
                    icon={Building2}
                    options={[{ value: 'all', label: 'All Colleges' }, ...collegeOptions.map(c => ({ value: c, label: c }))]}
                  />
                  {/* Department filter (scoped to selected college) */}
                  <FilterSelect
                    value={deptFilter}
                    onChange={setDeptFilter}
                    widthClass="w-52"
                    icon={Layers}
                    disabled={deptOptions.length === 0}
                    options={[{ value: 'all', label: 'All Departments' }, ...deptOptions.map(d => ({ value: d, label: d }))]}
                  />
                  {/* Status tabs */}
                  <div className="flex items-center gap-1 bg-background-elevated rounded-lg p-1">
                    {(['all', 'blocked', 'resolved'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          statusFilter === f ? 'bg-white shadow text-neutral' : 'text-neutral-light hover:text-neutral'
                        }`}
                      >
                        {f === 'all' ? `All (${data.totalViolations})` : f === 'blocked' ? `Blocked (${data.currentlyBlocked})` : `Resolved (${data.resolved})`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-light/20">
                      <th className="text-left py-3 px-4 font-semibold text-neutral">Student</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral">College</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral">Department</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral">Test</th>
                      <th className="text-left py-3 px-4 font-semibold text-neutral">Reason</th>
                      <th className="text-center py-3 px-4 font-semibold text-neutral">Status</th>
                      <th className="text-right py-3 px-4 font-semibold text-neutral">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleViolations.length === 0 ? (
                      <tr><td colSpan={7} className="py-8 text-center text-neutral-light">No violations match this filter</td></tr>
                    ) : (
                      visibleViolations.map(v => (
                        <tr key={v._id} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                          <td className="py-3 px-4">
                            <p className="font-medium text-neutral">{v.student_name}</p>
                            <p className="text-xs text-neutral-light">{v.student_email}</p>
                          </td>
                          <td className="py-3 px-4 text-neutral-light">{v.college}</td>
                          <td className="py-3 px-4 text-neutral-light">{norm(v.department) || '—'}</td>
                          <td className="py-3 px-4 text-neutral">Week {v.week} · {v.test_type}</td>
                          <td className="py-3 px-4 text-neutral-light max-w-[280px]">
                            <span className="line-clamp-2" title={v.reason}>{v.reason}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              v.blocked ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'
                            }`}>
                              {v.blocked ? 'Blocked' : 'Resolved'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-neutral-light whitespace-nowrap">
                            {v.blocked_at ? new Date(v.blocked_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
    </SuperadminLayout>
  )
}
