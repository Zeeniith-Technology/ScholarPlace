'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  Calendar,
  Award,
  BookOpen,
  Shield,
  Code,
  Sparkles,
  Bug,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAuthHeader } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'

interface DepartmentTPCLayoutProps {
  children: React.ReactNode
}

// Component to show badge with count of blocked students
function TestApprovalsBadge() {
  const [count, setCount] = useState<number | null>(null)
  const pathname = usePathname()
  const isActive = pathname === '/dept-tpc/test-approvals' || pathname?.startsWith('/dept-tpc/test-approvals/')

  useEffect(() => {
    const fetchBlockedCount = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl()
        const authHeader = getAuthHeader()

        if (!authHeader) return

        const response = await fetch(`${apiBaseUrl}/tpc-dept/blocked-students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setCount(data.data.length)
          }
        }
      } catch (error) {
        // Silently fail - badge is optional
      }
    }

    fetchBlockedCount()
  }, [])

  if (count === null || count === 0) return null

  return (
    <span
      className={cn(
        'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
        isActive
          ? 'bg-white/20 text-white'
          : 'bg-red-500 text-white'
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

const navigation = [
  { name: 'Dashboard', href: '/dept-tpc/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/dept-tpc/students', icon: Users },
  { name: 'Aptitude Monitoring', href: '/dept-tpc/practice-monitoring', icon: Calendar },
  { name: 'Coding Monitoring', href: '/dept-tpc/coding-monitoring', icon: Code },
  { name: 'AI Reviews', href: '/dept-tpc/ai-reviews', icon: Sparkles },
  { name: 'Tests', href: '/dept-tpc/tests', icon: FileText },
  { name: 'Test Approvals', href: '/dept-tpc/test-approvals', icon: Shield },
  { name: 'Analytics', href: '/dept-tpc/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/dept-tpc/reports', icon: BookOpen },
  { name: 'Settings', href: '/dept-tpc/settings', icon: Settings },
]

export function DepartmentTPCLayout({ children }: DepartmentTPCLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change (e.g. after navigation) so overlay never gets stuck
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Close sidebar when resizing to desktop so overlay never gets stuck
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const handler = () => {
      if (mql.matches) setSidebarOpen(false)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Close sidebar on Escape so overlay can always be dismissed
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          className="fixed inset-0 bg-neutral/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Enter' && setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-background-surface border-r border-neutral-light/20 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-neutral-light/20">
            <Link href="/dept-tpc/dashboard" className="flex items-center shrink-0">
              <Image
                src="/images/Small_Logo.png"
                alt="Scholarplace"
                width={180}
                height={48}
                className="h-11 w-auto object-contain"
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-neutral-light hover:text-neutral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-neutral-light hover:bg-background-elevated hover:text-neutral'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </div>
                  {item.name === 'Test Approvals' && (
                    <TestApprovalsBadge />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-light/20">
            <div className="px-4 py-2 text-xs text-neutral-light">
              <p className="font-semibold text-neutral mb-1">Department TPC</p>
              <p>Admin Dashboard</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between h-20 px-4 bg-background-surface border-b border-neutral-light/20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-light hover:text-neutral"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/dept-tpc/dashboard" className="flex items-center shrink-0">
            <Image
              src="/images/Small_Logo.png"
              alt="Scholarplace"
              width={180}
              height={48}
              className="h-11 w-auto object-contain"
            />
          </Link>
          {/* Bug Report Button - Mobile */}
          <Link
            href="/dept-tpc/my-bug-reports"
            className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all"
            title="Report Bug"
          >
            <Bug className="w-5 h-5" />
          </Link>
        </header>

        {/* Desktop header with bug report */}
        <header className="hidden lg:flex items-center justify-end h-16 px-6 bg-background-surface border-b border-neutral-light/20">
          <Link
            href="/dept-tpc/my-bug-reports"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500 hover:border-red-500 text-red-500 hover:text-white transition-all duration-200"
            title="Report a Bug"
          >
            <Bug className="w-4 h-4" />
            <span className="hidden 2xl:inline text-sm font-medium">Report Bug</span>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

