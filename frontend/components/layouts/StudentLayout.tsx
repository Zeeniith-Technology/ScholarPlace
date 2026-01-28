'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BarChart3,
  User,
  GraduationCap,
  BookMarked,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs } from '@/components/ui/Tabs'

interface StudentLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { name: 'Syllabus', href: '/student/syllabus', icon: BookOpen },
  { name: 'Learning', href: '/student/study', icon: BookMarked },
  { name: 'Coding', href: '/student/coding', icon: FileText },
  { name: 'Study Help', href: '/student/study-help', icon: HelpCircle },
  { name: 'Tests', href: '/student/tests', icon: FileText },
  { name: 'Practice Analytics', href: '/student/practice-analytics', icon: BarChart3 },
  { name: 'Analytics', href: '/student/analytics', icon: BarChart3 },
  { name: 'Profile', href: '/student/profile', icon: User },
]

export function StudentLayout({ children }: StudentLayoutProps) {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header with Logo and Tabs */}
      <header className="sticky top-0 z-50 bg-background-surface/95 backdrop-blur-md border-b border-neutral-light/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logo and User Section */}
          <div className="flex items-center justify-between h-16 border-b border-neutral-light/10">
            <Link
              href="/student/dashboard"
              className="flex items-center gap-2.5 group transition-all duration-300 hover:scale-105"
              suppressHydrationWarning
            >
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300 group-hover:rotate-3">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <span className="font-heading font-bold text-lg text-neutral">
                Scholarplace
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-elevated border border-neutral-light/10">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-neutral-light font-medium" suppressHydrationWarning>
                  {isMounted
                    ? (() => {
                      // Study Help first (path is under /student/study-* so must be before study)
                      if (pathname.startsWith('/student/study-help')) return 'Study Help'
                      // Check for exact navigation matches
                      const matchedNav = navigation.find(item => pathname.startsWith(item.href))
                      if (matchedNav) return matchedNav.name
                      // Coding, practice, study (Learning)
                      if (pathname.startsWith('/student/coding') || pathname.startsWith('/student/practice') || pathname.startsWith('/student/study')) return 'Learning'
                      return 'Dashboard'
                    })()
                    : ''}
                </span>
              </div>
              <Link
                href="/student/profile"
                className={cn(
                  'p-2 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 relative group',
                  pathname === '/student/profile'
                    ? 'bg-primary/10 text-primary'
                    : 'text-neutral-light hover:text-neutral hover:bg-background-elevated'
                )}
                title="Profile"
                suppressHydrationWarning
              >
                <User className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                {pathname === '/student/profile' && (
                  <div className="absolute inset-0 rounded-lg bg-primary/10 animate-pulse" />
                )}
              </Link>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
            <Tabs items={navigation} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="h-full page-transition">
          {children}
        </div>
      </main>
    </div>
  )
}