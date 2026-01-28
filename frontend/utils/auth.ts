/**
 * Authentication Utility
 * Manages JWT token storage and retrieval
 */

const TOKEN_KEY = 'authToken'
const AUTH_DATA_KEY = 'auth'

export interface AuthData {
  isAuthenticated: boolean
  email?: string
  role?: string
  token?: string
  timestamp?: string
}

/**
 * Get JWT token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const authData = localStorage.getItem(AUTH_DATA_KEY)
    if (authData) {
      const parsed = JSON.parse(authData) as AuthData
      return parsed.token || null
    }
  } catch (error) {
    console.error('Error getting token:', error)
  }
  
  return null
}

/**
 * Store JWT token and auth data
 */
export function setToken(token: string, userData: { email?: string; role?: string }): void {
  if (typeof window === 'undefined') return
  
  const authData: AuthData = {
    isAuthenticated: true,
    token,
    email: userData.email,
    role: userData.role,
    timestamp: new Date().toISOString(),
  }
  
  localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(authData))
}

/**
 * Clear authentication data
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_DATA_KEY)
}

/**
 * Get auth data
 */
export function getAuthData(): AuthData | null {
  if (typeof window === 'undefined') return null
  
  try {
    const authData = localStorage.getItem(AUTH_DATA_KEY)
    return authData ? (JSON.parse(authData) as AuthData) : null
  } catch (error) {
    console.error('Error getting auth data:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const authData = getAuthData()
  return authData?.isAuthenticated === true && !!authData?.token
}

/**
 * Get Authorization header value
 */
export function getAuthHeader(): string | null {
  const token = getToken()
  if (!token) return null
  
  // Check if token is expired (basic check - JWT tokens have 'exp' claim)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp
    if (exp && Date.now() >= exp * 1000) {
      console.warn('[Auth] Token expired, clearing...')
      clearAuth()
      return null
    }
  } catch (error) {
    // If we can't parse the token, it's invalid
    console.error('[Auth] Invalid token format:', error)
    clearAuth()
    return null
  }
  
  return `Bearer ${token}`
}

/**
 * Get current user info from JWT token (for debugging)
 */
export function getCurrentUserFromToken(): { id?: string; email?: string; role?: string } | null {
  const token = getToken()
  if (!token) return null
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      id: payload.id || payload.userId || payload.person_id,
      email: payload.email,
      role: payload.role
    }
  } catch (error) {
    console.error('[Auth] Error decoding token:', error)
    return null
  }
}
