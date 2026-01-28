/**
 * Navigation Utilities
 * Handles navigation with proper authentication state management
 */

import { useRouter } from 'next/navigation'

/**
 * Navigate to a route
 * Uses router.push() for better UX, but can force full reload when needed
 * @param path - Route path to navigate to
 * @param forceReload - Force full page reload (use for auth state changes)
 */
export function navigate(path: string, forceReload: boolean = false) {
  if (forceReload || typeof window === 'undefined') {
    // Force full reload for:
    // - Authentication state changes (login/logout)
    // - Server-side rendering
    window.location.href = path
  } else {
    // Use client-side navigation for better UX
    const router = require('next/navigation').useRouter()
    router.push(path)
  }
}

/**
 * Navigate after login - ensures clean state
 * Always uses full reload to guarantee fresh authentication state
 */
export function navigateAfterLogin(path: string) {
  if (typeof window !== 'undefined') {
    window.location.href = path
  }
}

/**
 * Navigate after logout - ensures complete state clear
 * Always uses full reload to guarantee all state is cleared
 */
export function navigateAfterLogout(path: string = '/auth/login') {
  if (typeof window !== 'undefined') {
    window.location.href = path
  }
}

/**
 * Navigate on auth failure - ensures clean state
 * Always uses full reload to guarantee authentication state is reset
 */
export function navigateOnAuthFailure(path: string = '/auth/login') {
  if (typeof window !== 'undefined') {
    window.location.href = path
  }
}
