'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart3,
  FileBarChart,
  Building2,
  Users,
  GitCompareArrows,
  FileText,
  Library,
  Megaphone,
  Activity,
  Settings2,
  Award,
  ClipboardList,
  Code2,
  Bug,
  AlertCircle,
  MessageSquare,
  MessageSquareHeart,
  ShieldAlert,
  Sparkles,
  Menu,
  X,
  LogOut,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { clearAuth } from '@/utils/auth'
import { useSuperadminAuth } from '@/hooks/useSuperadminAuth'

interface SuperadminLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/superadmin/analytics', icon: BarChart3 },
  { name: 'Colleges', href: '/superadmin/colleges', icon: Building2 },
  { name: 'Students', href: '/superadmin/students', icon: Users },
  { name: 'Compare Students', href: '/superadmin/students/compare', icon: GitCompareArrows },
  { name: 'Syllabus', href: '/superadmin/syllabus', icon: FileText },
  { name: 'Question Bank', href: '/superadmin/questions', icon: Library },
  { name: 'Certificates', href: '/superadmin/certificates', icon: Award },
  { name: 'Feedback / NPS', href: '/superadmin/feedback', icon: MessageSquareHeart },
  { name: 'Aptitude Monitoring', href: '/superadmin/practice-monitoring', icon: ClipboardList },
  { name: 'Coding Monitoring', href: '/superadmin/coding-monitoring', icon: Code2 },
  { name: 'Reports', href: '/superadmin/reports', icon: FileBarChart },
  { name: 'Test Security', href: '/superadmin/security', icon: ShieldAlert },
  { name: 'AI Usage', href: '/superadmin/ai-usage', icon: Sparkles },
  { name: 'Announcements', href: '/superadmin/announcements', icon: Megaphone },
  { name: 'Operations', href: '/superadmin/ops', icon: Activity },
  { name: 'Settings', href: '/superadmin/settings', icon: Settings2 },
  { name: 'Bug Reports', href: '/superadmin/bug-reports', icon: Bug },
  { name: 'Error Logs', href: '/superadmin/error-logs', icon: AlertCircle },
  { name: 'Contact Inquiries', href: '/superadmin/contact-inquiries', icon: MessageSquare },
]

/**
 * Active state = the nav item with the LONGEST href that prefixes the current path.
 * This keeps "Students" inactive on /superadmin/students/compare, where
 * "Compare Students" is the better (longer) match.
 */
function useActiveHref(pathname: string | null): string | null {
  if (!pathname) return null
  let best: string | null = null
  for (const item of navigation) {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (!best || item.href.length > best.length) best = item.href
    }
  }
  return best
}

export function SuperadminLayout({ children }: SuperadminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isVerifying } = useSuperadminAuth()
  const activeHref = useActiveHref(pathname)

  // Close sidebar on route change so the mobile overlay never gets stuck
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Close sidebar when resizing to desktop
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const handler = () => {
      if (mql.matches) setSidebarOpen(false)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Close sidebar on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = () => {
    clearAuth()
    router.push('/superadmin/login')
  }

  // Block content until the role check settles (prevents a flash of admin data
  // for non-superadmin visitors; redirects happen inside the hook)
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    // h-screen + overflow-hidden pins the shell to the viewport so the sidebar
    // stays fixed and only the <main> content area scrolls (was min-h-screen,
    // which let the whole page — sidebar included — grow and scroll together).
    <div className="h-screen bg-background flex overflow-hidden">
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
            <Link href="/superadmin/dashboard" className="flex items-center shrink-0">
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
              const isActive = activeHref === item.href
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

          {/* Footer: role label + logout */}
          <div className="p-4 border-t border-neutral-light/20 space-y-2">
            <div className="px-4 py-1 text-xs text-neutral-light">
              <p className="font-semibold text-neutral mb-0.5">Superadmin</p>
              <p>Platform Control</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
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
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/superadmin/dashboard" className="flex items-center shrink-0">
            <Image
              src="/images/Small_Logo.png"
              alt="Scholarplace"
              width={180}
              height={48}
              className="h-11 w-auto object-contain"
            />
          </Link>
          <div className="w-6" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
