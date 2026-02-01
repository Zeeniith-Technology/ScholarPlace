'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BarChart3,
  User,
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
  { name: 'Study Help', href: '/student/study-help', icon: HelpCircle },
  { name: 'Tests', href: '/student/tests', icon: FileText },
  { name: 'Practice Analytics', href: '/student/practice-analytics', icon: BarChart3 },
  { name: 'Analytics', href: '/student/analytics', icon: BarChart3 },
]

export function StudentLayout({ children }: StudentLayoutProps) {
  const pathname = usePathname()

  const isProfile = pathname === '/student/profile'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Premium Student Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-light/15 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Top accent strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary-light to-secondary" aria-hidden />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 lg:gap-8 h-20 sm:h-[5rem]">
            {/* Logo */}
            <Link href="/student/dashboard" className="flex items-center shrink-0 group" suppressHydrationWarning>
              <Image
                src="/images/Small_Logo.png"
                alt="Scholarplace"
                width={200}
                height={52}
                className="h-11 sm:h-12 w-auto object-contain group-hover:opacity-90 transition-opacity"
                priority
              />
            </Link>

            {/* Vertical divider */}
            <div className="hidden lg:block w-px h-10 bg-neutral-light/20 shrink-0" aria-hidden />

            {/* Nav */}
            <nav className="flex-1 min-w-0 flex items-center justify-center lg:justify-start">
              <div className="w-full max-w-3xl rounded-2xl bg-neutral-light/[0.06] px-1.5 py-1.5">
                <Tabs items={navigation} variant="premium" />
              </div>
            </nav>

            {/* Profile */}
            <Link
              href="/student/profile"
              className={cn(
                'group shrink-0 flex items-center gap-3 pl-2 pr-4 py-2 rounded-2xl border transition-all duration-300',
                isProfile
                  ? 'bg-primary/5 border-primary/20 text-primary shadow-sm'
                  : 'border-transparent bg-transparent text-neutral-light hover:text-neutral hover:bg-neutral-light/[0.06] hover:border-neutral-light/10'
              )}
              title="Profile"
              suppressHydrationWarning
            >
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all duration-300',
                  isProfile
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-neutral-light/10 border-neutral-light/20 text-neutral-light group-hover:border-neutral-light/30'
                )}
              >
                <User className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className={cn('text-sm font-semibold leading-tight', isProfile ? 'text-primary' : 'text-neutral')}>
                  My account
                </span>
                <span className="text-[11px] text-neutral-light font-medium">Profile & settings</span>
              </div>
            </Link>
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