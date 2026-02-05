'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Redirects to dynamic DSA weekly test for Week 2.
 * Route: /student/tests/weekly/week-2 → /student/tests/weekly/2
 */
export default function Week2RedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/student/tests/weekly/2')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-neutral-light">Redirecting to Week 2 test...</p>
      </div>
    </div>
  )
}
