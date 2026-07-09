/**
 * Authentication Utility
 * Manages JWT token storage and retrieval
 */

const TOKEN_KEY = 'authToken'
const AUTH_DATA_KEY = 'auth'
// Impersonation ("View As"): while active, AUTH_DATA_KEY holds the student's
// read-only token and IMP_BACKUP_KEY holds the superadmin's real session to
// restore on exit. IMP_META_KEY drives the "viewing as" banner.
const IMP_BACKUP_KEY = 'auth_impersonation_backup'
const IMP_META_KEY = 'auth_impersonation_meta'

export interface ImpersonationMeta {
  studentId: string
  studentName: string
  studentEmail: string
}

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
 * Enter impersonation: back up the current (superadmin) session, then make the
 * student's read-only token the active auth so student pages load as them.
 */
export function startImpersonation(impersonationToken: string, meta: ImpersonationMeta): void {
  if (typeof window === 'undefined') return
  const current = localStorage.getItem(AUTH_DATA_KEY)
  if (current) localStorage.setItem(IMP_BACKUP_KEY, current)
  const authData: AuthData = {
    isAuthenticated: true,
    token: impersonationToken,
    email: meta.studentEmail,
    role: 'Student',
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(authData))
  localStorage.setItem(IMP_META_KEY, JSON.stringify(meta))
}

/**
 * Exit impersonation: restore the superadmin session and clear impersonation state.
 * Returns true if a session was restored.
 */
export function exitImpersonation(): boolean {
  if (typeof window === 'undefined') return false
  const backup = localStorage.getItem(IMP_BACKUP_KEY)
  if (backup) localStorage.setItem(AUTH_DATA_KEY, backup)
  else localStorage.removeItem(AUTH_DATA_KEY)
  localStorage.removeItem(IMP_BACKUP_KEY)
  localStorage.removeItem(IMP_META_KEY)
  return !!backup
}

/** Current impersonation metadata, or null if not impersonating. */
export function getImpersonation(): ImpersonationMeta | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(IMP_META_KEY)
    return raw ? (JSON.parse(raw) as ImpersonationMeta) : null
  } catch {
    return null
  }
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
