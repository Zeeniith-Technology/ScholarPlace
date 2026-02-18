'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  User,
  BookMarked,
  HelpCircle,
  Brain,
  FileCode,
  Bug,
  ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NavDropdown } from '@/components/ui/NavDropdown'

interface StudentLayoutProps {
  children: React.ReactNode
}

// Main navigation structure with grouped items
const navigationGroups = {
  primary: [
    {
      name: 'Dashboard',
      href: '/student/dashboard',
      icon: LayoutDashboard,
      type: 'link' as const
    },
  ],
  dropdowns: [
    {
      label: 'Learn',
      icon: BookOpen,
      items: [
        {
          name: 'Syllabus',
          href: '/student/syllabus',
          icon: BookOpen,
          description: 'View course syllabus'
        },
        {
          name: 'Learning Path',
          href: '/student/study',
          icon: BookMarked,
          description: 'Interactive learning modules'
        },
        {
          name: 'Study Help',
          href: '/student/study-help',
          icon: HelpCircle,
          description: 'Get help with concepts'
        },
      ],
      activeRoutes: ['/student/practice']
    },
    {
      label: 'Practice',
      icon: FileCode,
      items: [
        {
          name: 'Code Review',
          href: '/student/code-review',
          icon: FileCode,
          description: 'Review your code submissions'
        },
        {
          name: 'Weekly Tests',
          href: '/student/tests',
          icon: FileText,
          description: 'Take weekly assessments'
        },
        {
          name: 'Assigned Tests',
          href: '/student/dept-tests',
          icon: ClipboardCheck,
          description: 'TPC assigned tests'
        },
      ],
      activeRoutes: ['/student/tests', '/student/dept-tests']
    },
  ],
  secondary: [
    {
      name: 'AI Analysis',
      href: '/student/analytics',
      icon: Brain,
      type: 'link' as const
    },
    {
      name: 'Certificate',
      href: '/student/certificate',
      icon: ClipboardCheck, // Using ClipboardCheck as Award might not be imported or available in lucide list above, wait, let me check imports
      type: 'link' as const
    },
  ]
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const pathname = usePathname()
  const isProfile = pathname === '/student/profile'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Premium Student Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-light/15 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20 sm:h-[5rem]">
            {/* Left: Logo */}
            <Link href="/student/dashboard" className="flex items-center shrink-0 group mr-8" suppressHydrationWarning>
              <Image
                src="/images/Small_Logo.png"
                alt="Scholarplace"
                width={200}
                height={52}
                className="h-10 sm:h-11 w-auto object-contain group-hover:opacity-90 transition-opacity"
                priority
              />
            </Link>

            {/* Center: Navigation */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {/* Primary Links */}
              {navigationGroups.primary.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-neutral-light hover:text-neutral hover:bg-neutral-light/[0.08]'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}

              {/* Dropdown Menus */}
              {navigationGroups.dropdowns.map((dropdown) => (
                <NavDropdown
                  key={dropdown.label}
                  label={dropdown.label}
                  icon={dropdown.icon}
                  items={dropdown.items}
                  activeRoutes={dropdown.activeRoutes}
                />
              ))}

              {/* Secondary Links */}
              {navigationGroups.secondary.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-neutral-light hover:text-neutral hover:bg-neutral-light/[0.08]'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-3">
              {/* Report Bug - Visible on desktop */}
              <Link
                href="/student/my-bug-reports"
                className={cn(
                  'hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  (pathname === '/student/my-bug-reports' || pathname === '/student/bug-report')
                    ? 'bg-primary/10 text-primary'
                    : 'text-neutral-light hover:text-neutral hover:bg-neutral-light/[0.08]'
                )}
                title="Report Bug"
              >
                <Bug className="w-4 h-4" />
                <span className="hidden 2xl:inline">Report</span>
              </Link>

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