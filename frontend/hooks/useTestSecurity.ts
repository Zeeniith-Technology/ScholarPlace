'use client'

import { useEffect, useRef, useState } from 'react'

interface SecurityViolation {
  type: string
  timestamp: number
  message: string
}

interface UseTestSecurityOptions {
  onViolation?: (violation: SecurityViolation) => void
  onAutoSubmit?: () => void // Callback when test should be auto-submitted
  enforceFullscreen?: boolean
  maxTabSwitches?: number
  autoSubmitOnViolation?: boolean
  autoSubmitOnWindowSwitch?: boolean // NEW: Auto-submit on ANY window switch
  logToServer?: boolean
}

/**
 * Comprehensive test security hook
 * Implements strict validations for online tests
 */
export function useTestSecurity(options: UseTestSecurityOptions = {}) {
  const {
    onViolation,
    onAutoSubmit,
    enforceFullscreen = true,
    maxTabSwitches = 3,
    autoSubmitOnViolation = false,
    autoSubmitOnWindowSwitch = false, // NEW: Auto-submit on window switch
    logToServer = true,
  } = options

  const [violations, setViolations] = useState<SecurityViolation[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [isWindowFocused, setIsWindowFocused] = useState(true)
  const [isVisible, setIsVisible] = useState(true)
  
  const violationCountRef = useRef(0)
  const lastFocusTimeRef = useRef<number>(Date.now())
  const lastBlurTimeRef = useRef<number>(0)
  const mouseActivityRef = useRef<number>(Date.now())
  const keyboardActivityRef = useRef<number>(Date.now())
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const securityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Log violation
  const logViolation = (type: string, message: string) => {
    const violation: SecurityViolation = {
      type,
      timestamp: Date.now(),
      message,
    }

    setViolations(prev => [...prev, violation])
    violationCountRef.current += 1

    // Callback
    if (onViolation) {
      onViolation(violation)
    }

    // Log to server
    if (logToServer) {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
        const auth = localStorage.getItem('auth')
        if (auth) {
          const authData = JSON.parse(auth)
          fetch(`${apiBaseUrl}/student-progress/log-security-violation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authData.token}`,
            },
            body: JSON.stringify({
              violation_type: type,
              message,
              timestamp: violation.timestamp,
              test_type: 'weekly',
              week: 1,
            }),
          }).catch(err => console.error('Failed to log violation:', err))
        }
      } catch (error) {
        console.error('Error logging violation:', error)
      }
    }

    // Auto-submit if too many violations
    if (autoSubmitOnViolation && violationCountRef.current >= 5) {
      console.warn('Too many violations detected. Test should be auto-submitted.')
    }
  }

  // 1. Fullscreen Enforcement
  useEffect(() => {
    if (!enforceFullscreen) return

    const requestFullscreen = async () => {
      try {
        const element = document.documentElement
        if (element.requestFullscreen) {
          await element.requestFullscreen()
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen()
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen()
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen()
        }
        setIsFullscreen(true)
      } catch (error) {
        console.error('Fullscreen request failed:', error)
        logViolation('fullscreen_failed', 'Could not enter fullscreen mode')
      }
    }

    // Request fullscreen when test starts
    requestFullscreen()

    // Monitor fullscreen changes
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )

      setIsFullscreen(isCurrentlyFullscreen)

      if (!isCurrentlyFullscreen) {
        logViolation('fullscreen_exit', 'User exited fullscreen mode')
        // Re-request fullscreen
        requestFullscreen()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [enforceFullscreen])

  // 2. Window Focus/Blur Detection
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true)
      lastFocusTimeRef.current = Date.now()
      
      // Check if user was away too long
      if (lastBlurTimeRef.current > 0) {
        const timeAway = lastFocusTimeRef.current - lastBlurTimeRef.current
        if (timeAway > 5000) { // 5 seconds
          logViolation('window_blur_extended', `Window was unfocused for ${Math.floor(timeAway / 1000)} seconds`)
        }
      }
    }

    const handleBlur = () => {
      setIsWindowFocused(false)
      lastBlurTimeRef.current = Date.now()
      
      // NEW: Auto-submit on ANY window switch if enabled
      if (autoSubmitOnWindowSwitch) {
        console.log('[useTestSecurity] Window blur detected, autoSubmitOnWindowSwitch is true')
        logViolation('window_switch_auto_submit', 'Test auto-submitted due to window switch')
        if (onAutoSubmit) {
          console.log('[useTestSecurity] Calling onAutoSubmit callback...')
          try {
            onAutoSubmit()
          } catch (error) {
            console.error('[useTestSecurity] Error in onAutoSubmit callback:', error)
          }
        } else {
          console.warn('[useTestSecurity] onAutoSubmit callback is not defined!')
        }
        return
      }
      
      setTabSwitchCount(prev => {
        const newCount = prev + 1
        if (newCount > maxTabSwitches) {
          logViolation('tab_switch_limit', `Exceeded maximum tab switches (${maxTabSwitches})`)
        } else if (newCount > 0) {
          logViolation('tab_switch', `Tab/window switched (${newCount}/${maxTabSwitches})`)
        }
        return newCount
      })
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [maxTabSwitches, autoSubmitOnWindowSwitch, onAutoSubmit])

  // 3. Visibility API - Tab Switching Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsVisible(false)
        logViolation('tab_hidden', 'Tab was hidden or minimized')
      } else {
        setIsVisible(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // 4. Prevent Window Resize
  useEffect(() => {
    const handleResize = () => {
      logViolation('window_resize', 'Window was resized during test')
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // 5. Detect Multiple Tabs/Windows (using backend)
  useEffect(() => {
    const checkMultipleTabs = async () => {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const testId = 'weekly-test-week-1'
      const timestamp = Date.now()
      
      try {
        // Get current test state from backend
        const getResponse = await fetch(`${apiBaseUrl}/test-state/${testId}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })

        if (getResponse.ok) {
          const stateData = await getResponse.json()
          if (stateData.success && stateData.data) {
            const existingTimestamp = stateData.data.timestamp
            if (existingTimestamp && existingTimestamp !== timestamp) {
              logViolation('multiple_tabs', 'Multiple tabs/windows detected')
            }
          }
        }

        // Update test state in backend
        await fetch(`${apiBaseUrl}/test-state/update`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testId,
            isActive: true,
            timestamp: timestamp,
            tabCount: 1
          }),
        })
      } catch (error) {
        console.error('Error checking test state:', error)
      }
    }

    checkMultipleTabs()
    const interval = setInterval(checkMultipleTabs, 2000)

    return () => {
      clearInterval(interval)
      // Clear test state when component unmounts
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const testId = 'weekly-test-week-1'
      fetch(`${apiBaseUrl}/test-state/clear`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId }),
      }).catch(() => {}) // Ignore errors on cleanup
    }
  }, [])

  // 6. Mouse Activity Monitoring (Detect inactivity)
  useEffect(() => {
    const handleMouseMove = () => {
      mouseActivityRef.current = Date.now()
    }

    const handleMouseClick = () => {
      mouseActivityRef.current = Date.now()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleMouseClick)

    // Check for inactivity every 30 seconds
    inactivityTimerRef.current = setInterval(() => {
      const timeSinceMouseActivity = Date.now() - mouseActivityRef.current
      const timeSinceKeyboardActivity = Date.now() - keyboardActivityRef.current
      const maxInactivity = 60000 // 1 minute

      if (timeSinceMouseActivity > maxInactivity && timeSinceKeyboardActivity > maxInactivity) {
        logViolation('inactivity', 'No mouse or keyboard activity detected for extended period')
      }
    }, 30000)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleMouseClick)
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current)
      }
    }
  }, [])

  // 7. Keyboard Activity Monitoring
  useEffect(() => {
    const handleKeyPress = () => {
      keyboardActivityRef.current = Date.now()
    }

    document.addEventListener('keydown', handleKeyPress)
    document.addEventListener('keyup', handleKeyPress)

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      document.removeEventListener('keyup', handleKeyPress)
    }
  }, [])

  // 8. Prevent Right-Click (already in main component, but log it)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      logViolation('right_click', 'Right-click context menu attempted')
    }

    document.addEventListener('contextmenu', handleContextMenu, true)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true)
    }
  }, [])

  // 9. Detect Browser DevTools
  useEffect(() => {
    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160
      const heightThreshold = window.outerHeight - window.innerHeight > 160

      if (widthThreshold || heightThreshold) {
        logViolation('devtools', 'Browser DevTools may be open')
      }

      // Check console
      let devtools = false
      const element = new Image()
      Object.defineProperty(element, 'id', {
        get: function() {
          devtools = true
          logViolation('devtools_console', 'Console DevTools detected')
        }
      })
      console.log(element)
      console.clear()
    }

    securityCheckIntervalRef.current = setInterval(detectDevTools, 2000)

    return () => {
      if (securityCheckIntervalRef.current) {
        clearInterval(securityCheckIntervalRef.current)
      }
    }
  }, [])

  // 10. Prevent Print
  useEffect(() => {
    const handleBeforePrint = () => {
      logViolation('print_attempt', 'Print dialog was opened')
    }

    window.addEventListener('beforeprint', handleBeforePrint)

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
    }
  }, [])

  // 11. Network Monitoring (Detect if user goes offline/online suspiciously)
  useEffect(() => {
    const handleOnline = () => {
      // Log when coming back online
    }

    const handleOffline = () => {
      logViolation('network_offline', 'Network connection lost during test')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 12. Prevent Page Unload (with warning)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      logViolation('page_unload', 'Attempt to close/refresh page detected')
      e.preventDefault()
      e.returnValue = 'Are you sure you want to leave? Your test progress may be lost.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return {
    violations,
    isFullscreen,
    tabSwitchCount,
    isWindowFocused,
    isVisible,
    violationCount: violationCountRef.current,
  }
}
