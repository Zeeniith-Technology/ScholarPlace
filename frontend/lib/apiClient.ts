/**
 * API Client - Centralized API request handler
 * Uses httpOnly cookies for authentication (no localStorage)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

/**
 * Make authenticated API request using cookies
 * Cookies are automatically sent by the browser
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies in request
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Get current user info from backend
 */
export async function getCurrentUser() {
  try {
    // We'll need to create an endpoint that returns current user from cookie
    // For now, this is a placeholder
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      return data.data?.user || null
    }
    return null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}
