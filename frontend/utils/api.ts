/**
 * API Utility
 * Helper functions for making authenticated API requests with JWT tokens
 */

import { getAuthHeader } from './auth'

/**
 * Get API base URL from environment variable or use default
 * In production, NEXT_PUBLIC_API_BASE_URL should be set in .env
 */
export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
}

const API_BASE_URL = getApiBaseUrl()

/**
 * Make authenticated API request with JWT token
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeader = getAuthHeader()
  
  if (!authHeader) {
    throw new Error('No authentication token found. Please login.')
  }

  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Authorization', authHeader)

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })
}

/**
 * Make authenticated API request and parse JSON response
 */
export async function authenticatedRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await authenticatedFetch(endpoint, options)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: `Request failed with status ${response.status}` 
    }))
    throw new Error(error.message || `Request failed with status ${response.status}`)
  }

  return response.json()
}
