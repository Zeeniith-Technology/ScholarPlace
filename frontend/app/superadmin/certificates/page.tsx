'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAuthHeader } from '@/utils/auth'
import { exportToCSV } from '@/utils/exportUtils'
import { Award, RefreshCw, Download, Search, ExternalLink, Building2 } from 'lucide-react'

interface Certificate {
  _id: string
  student_name: string
  student_email: string
  college: string
  cloudinary_url: string | null
  issued_at: string | null
}

interface Overview {
  total: number
  collegesRepresented: number
  byCollege: Record<string, number>
  certificates: Certificate[]
}

export default function SuperadminCertificatesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/superadmin/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      if (result.success && result.data) setData(result.data)
      else setError(result.message || 'Failed to load certificates')
    } catch (e) {
      console.error('Error loading certificates:', e)
      setError('Failed to load certificates')
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl])

  useEffect(() => { load() }, [load])

  const visible = (data?.certificates || []).filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.student_name.toLowerCase().includes(q) ||
      c.student_email.toLowerCase().includes(q) ||
      c.college.toLowerCase().includes(q)
    )
  })

  const handleExport = () => {
    if (!data || data.certificates.length === 0) return
    const rows = data.certificates.map(c => ({
      student_name: c.student_name,
      student_email: c.student_email,
      college: c.college,
      issued_at: c.issued_at || '',
      certificate_url: c.cloudinary_url || '',
    }))
    exportToCSV(rows, `certificates_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const topColleges = data
    ? Object.entries(data.byCollege).sort((a, b) => b[1] - a[1])
    : []

  return (
    <SuperadminLayout>
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral flex items-center gap-3">
                <Award className="w-8 h-8 text-primary" />
                Certificates
              </h1>
              <p className="text-neutral-light mt-1">Completion certificates issued across all colleges (earned after Week 8)</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2 text-sm font-medium">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button variant="secondary" onClick={load} className="flex items-center gap-2 text-sm font-medium">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <Card className="p-12 text-center"><p className="text-red-600">{error}</p></Card>
          ) : !data || data.total === 0 ? (
            <Card className="p-16 text-center">
              <Award className="w-12 h-12 text-neutral-light mx-auto mb-4 opacity-40" />
              <h3 className="text-xl font-semibold text-neutral mb-2">No certificates issued yet</h3>
              <p className="text-neutral-light max-w-md mx-auto">
                A certificate is generated automatically when a student completes Week 8. They&apos;ll appear here as students finish.
              </p>
            </Card>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-primary/10 rounded-lg"><Award className="w-6 h-6 text-primary" /></div>
                  </div>
                  <p className="text-3xl font-bold text-neutral">{data.total}</p>
                  <p className="text-sm text-neutral-light mt-1">Certificates issued</p>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-500/10 rounded-lg"><Building2 className="w-6 h-6 text-blue-600" /></div>
                  </div>
                  <p className="text-3xl font-bold text-neutral">{data.collegesRepresented}</p>
                  <p className="text-sm text-neutral-light mt-1">Colleges with graduates</p>
                </Card>
              </div>

              {/* By college */}
              {topColleges.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-neutral mb-4">By College</h3>
                  <div className="space-y-2">
                    {topColleges.map(([college, count]) => {
                      const max = topColleges[0][1] || 1
                      return (
                        <div key={college}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-neutral truncate pr-2">{college}</span>
                            <span className="font-semibold text-neutral shrink-0">{count}</span>
                          </div>
                          <div className="w-full bg-neutral-light/10 rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}

              {/* List */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-neutral-light/20">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" />
                    <input
                      type="text"
                      placeholder="Search student or college..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-light/30 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-light/20 bg-background-elevated">
                        <th className="text-left py-3 px-4 font-semibold text-neutral">Student</th>
                        <th className="text-left py-3 px-4 font-semibold text-neutral">College</th>
                        <th className="text-left py-3 px-4 font-semibold text-neutral">Issued</th>
                        <th className="text-right py-3 px-4 font-semibold text-neutral">Certificate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.length === 0 ? (
                        <tr><td colSpan={4} className="py-8 text-center text-neutral-light">No certificates match your search</td></tr>
                      ) : (
                        visible.map(c => (
                          <tr key={c._id} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                            <td className="py-3 px-4">
                              <p className="font-medium text-neutral">{c.student_name}</p>
                              <p className="text-xs text-neutral-light">{c.student_email}</p>
                            </td>
                            <td className="py-3 px-4 text-neutral-light">{c.college}</td>
                            <td className="py-3 px-4 text-neutral-light whitespace-nowrap">
                              {c.issued_at ? new Date(c.issued_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {c.cloudinary_url ? (
                                <a
                                  href={c.cloudinary_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
                                >
                                  View <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              ) : (
                                <span className="text-neutral-light text-xs">n/a</span>
                              )}
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
