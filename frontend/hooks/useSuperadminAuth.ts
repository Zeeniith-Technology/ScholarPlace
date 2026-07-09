'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthHeader, clearAuth } from '@/utils/auth'

/**
 * Single source of truth for superadmin page protection.
 * Verifies the JWT against /profile/get and confirms the superadmin role.
 *
 * - No token            -> redirect to /superadmin/login
 * - 401/403 or bad role -> clearAuth + redirect
 * - Network/5xx errors  -> do NOT redirect (could be a temporary outage);
 *                          page renders and individual fetches will fail visibly.
 */
export function useSuperadminAuth() {
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const verify = async () => {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        clearAuth()
        router.push('/superadmin/login')
        return
      }

      try {
        const res = await fetch(`${apiBaseUrl}/profile/get`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
        })

        if (cancelled) return

        if (res.status === 401 || res.status === 403) {
          clearAuth()
          router.push('/superadmin/login')
          return
        }

        if (!res.ok) {
          // Temporary server issue — let the page render; don't log the user out.
          setIsAuthed(true)
          setIsVerifying(false)
          return
        }

        const result = await res.json()
        const role = result.data?.role || result.data?.person_role

        if (!result.success || role !== 'superadmin') {
          clearAuth()
          router.push('/superadmin/login')
          return
        }

        setIsAuthed(true)
        setIsVerifying(false)
      } catch (err) {
        if (cancelled) return
        // Network error: only force login when there is no token at all.
        if (!getAuthHeader()) {
          clearAuth()
          router.push('/superadmin/login')
        } else {
          setIsAuthed(true)
          setIsVerifying(false)
        }
      }
    }

    verify()
    return () => { cancelled = true }
  }, [router])

  return { isVerifying, isAuthed }
}
