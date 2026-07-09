'use client'

import React, { useState, useEffect } from 'react'
import { X, Info, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react'
import { getAuthHeader } from '@/utils/auth'

interface Announcement {
  _id: string
  title: string
  message: string
  severity: 'info' | 'success' | 'warning' | 'critical'
}

const SEVERITY_STYLES: Record<string, { wrap: string; icon: any; iconColor: string }> = {
  info: { wrap: 'bg-blue-50 border-blue-200 text-blue-900', icon: Info, iconColor: 'text-blue-500' },
  success: { wrap: 'bg-green-50 border-green-200 text-green-900', icon: CheckCircle2, iconColor: 'text-green-500' },
  warning: { wrap: 'bg-amber-50 border-amber-200 text-amber-900', icon: AlertTriangle, iconColor: 'text-amber-600' },
  critical: { wrap: 'bg-red-50 border-red-200 text-red-900', icon: AlertOctagon, iconColor: 'text-red-600' },
}

const DISMISS_KEY = 'dismissed_announcements'

function getDismissed(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Dismissible banner stack of active announcements for the logged-in student.
 * College scoping happens server-side; dismissals are remembered client-side
 * (localStorage) so we don't need a per-student read-state table.
 */
export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    setDismissed(getDismissed())

    const fetchActive = async () => {
      try {
        const authHeader = getAuthHeader()
        if (!authHeader) return
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
        const res = await fetch(`${apiBaseUrl}/student/announcements/active`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({}),
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.success && Array.isArray(data.data)) setAnnouncements(data.data)
      } catch {
        /* banner is best-effort — never block the app */
      }
    }
    fetchActive()
  }, [])

  const dismiss = (id: string) => {
    const next = Array.from(new Set([...dismissed, id]))
    setDismissed(next)
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
    } catch {
      /* ignore quota/availability errors */
    }
  }

  const visible = announcements.filter(a => !dismissed.includes(a._id))
  if (visible.length === 0) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 space-y-2">
      {visible.map(a => {
        const style = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info
        const Icon = style.icon
        return (
          <div key={a._id} className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${style.wrap}`}>
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-sm opacity-90 whitespace-pre-line">{a.message}</p>
            </div>
            <button
              onClick={() => dismiss(a._id)}
              className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
              aria-label="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
