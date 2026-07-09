'use client'

import React, { useState, useEffect } from 'react'
import { Eye, X } from 'lucide-react'
import { getImpersonation, exitImpersonation, type ImpersonationMeta } from '@/utils/auth'

/**
 * Global "Viewing as <student>" banner, shown whenever a superadmin is in a
 * read-only impersonation session. Mounted once at the root so it appears on
 * every page the impersonated session lands on. Exiting restores the superadmin
 * session and returns to the students list.
 */
export function ImpersonationBanner() {
  const [meta, setMeta] = useState<ImpersonationMeta | null>(null)

  useEffect(() => {
    setMeta(getImpersonation())
    // Keep in sync if impersonation is toggled in another tab
    const onStorage = () => setMeta(getImpersonation())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!meta) return null

  const handleExit = () => {
    exitImpersonation()
    // Full navigation so all in-memory state is dropped and the superadmin
    // session is picked up fresh.
    window.location.href = '/superadmin/students'
  }

  return (
    <div className="sticky top-0 z-[100] bg-amber-500 text-amber-950">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium truncate">
            Viewing as <span className="font-bold">{meta.studentName}</span>
            <span className="hidden sm:inline"> ({meta.studentEmail})</span> — read-only
          </span>
        </div>
        <button
          onClick={handleExit}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-950/10 hover:bg-amber-950/20 text-sm font-semibold transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Exit View As
        </button>
      </div>
    </div>
  )
}
