import { useEffect, useRef, useCallback } from 'react'

interface UseAutoRefreshOptions {
  enabled?: boolean
  interval?: number // in milliseconds
  onRefresh: () => void | Promise<void>
  dependencies?: any[] // Additional dependencies to trigger refresh
}

/**
 * Custom hook for auto-refreshing data
 * @param options Configuration options
 * @returns Object with refresh function and refresh state
 */
export function useAutoRefresh({
  enabled = true,
  interval = 30000, // Default 30 seconds
  onRefresh,
  dependencies = []
}: UseAutoRefreshOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return // Prevent concurrent refreshes

    try {
      isRefreshingRef.current = true
      await onRefresh()
    } catch (error) {
      console.error('Auto-refresh error:', error)
    } finally {
      isRefreshingRef.current = false
    }
  }, [onRefresh])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial refresh
    refresh()

    // Set up interval
    intervalRef.current = setInterval(() => {
      refresh()
    }, interval)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, interval, refresh, ...dependencies])

  return {
    refresh,
    isRefreshing: isRefreshingRef.current
  }
}






