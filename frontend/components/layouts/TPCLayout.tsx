'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  Building2,
  Calendar,
  Award,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TPCLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/tpc/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/tpc/students', icon: Users },
  { name: 'Practice Monitoring', href: '/tpc/practice-monitoring', icon: Calendar },
  { name: 'Tests', href: '/tpc/tests', icon: FileText },
  { name: 'Analytics', href: '/tpc/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/tpc/reports', icon: BookOpen },
  { name: 'Settings', href: '/tpc/settings', icon: Settings },
]

export function TPCLayout({ children }: TPCLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
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
          <div className="flex items-center justify-between h-16 px-6 border-b border-neutral-light/20">
            <Link href="/tpc/dashboard" className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              <span className="font-heading font-bold text-lg text-neutral">Scholarplace</span>
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
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-neutral-light hover:bg-background-elevated hover:text-neutral'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-light/20">
            <div className="px-4 py-2 text-xs text-neutral-light">
              <p className="font-semibold text-neutral mb-1">College TPC</p>
              <p>Admin Dashboard</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-background-surface border-b border-neutral-light/20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-light hover:text-neutral"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/tpc/dashboard" className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            <span className="font-heading font-bold text-lg text-neutral">Scholarplace</span>
          </Link>
          <div className="w-6" /> {/* Spacer for centering */}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
