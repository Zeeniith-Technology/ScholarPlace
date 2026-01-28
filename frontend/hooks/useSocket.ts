'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
  onProgressUpdate?: (data: any) => void
}

/**
 * Custom hook for Socket.io real-time communication
 * Provides real-time progress updates for Coursera-like learning experience
 */
export function useSocket(options: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
    const auth = localStorage.getItem('auth')

    if (!auth) {
      console.warn('No auth token found, skipping socket connection')
      return
    }

    try {
      const authData = JSON.parse(auth)
      const token = authData.token

      // Initialize socket connection
      const socketInstance = io(apiBaseUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })

      socketRef.current = socketInstance
      setSocket(socketInstance)

      // Connection events
      socketInstance.on('connect', () => {
        console.log('✅ Socket connected')
        setIsConnected(true)
        options.onConnect?.()
      })

      socketInstance.on('disconnect', () => {
        console.log('❌ Socket disconnected')
        setIsConnected(false)
        options.onDisconnect?.()
      })

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        options.onError?.(error)
      })

      // Progress update events
      socketInstance.on('progress-updated', (data) => {
        console.log('📊 Progress updated:', data)
        options.onProgressUpdate?.(data)
      })

      socketInstance.on('study-progress', (data) => {
        console.log('📚 Study progress:', data)
        options.onProgressUpdate?.(data)
      })

      // Cleanup on unmount
      return () => {
        if (socketInstance) {
          socketInstance.disconnect()
        }
      }
    } catch (error) {
      console.error('Error initializing socket:', error)
      options.onError?.(error as Error)
    }
  }, [])

  // Emit progress tracking
  const trackProgress = (week: number, day: string, action: string, progressData?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('track-progress', {
        week,
        day,
        action,
        progressData
      })
    }
  }

  // Start study session
  const startStudySession = (week: number, day: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('study-session-start', { week, day })
    }
  }

  // Update study session progress
  const updateStudyProgress = (week: number, day: string, timeSpent: number, progress: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('study-session-update', {
        week,
        day,
        timeSpent,
        progress
      })
    }
  }

  return {
    socket,
    isConnected,
    trackProgress,
    startStudySession,
    updateStudyProgress
  }
}

