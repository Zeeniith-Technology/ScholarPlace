'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface TabItem {
  name: string
  href: string
  icon: LucideIcon
}

interface TabsProps {
  items: TabItem[]
  className?: string
}

export function Tabs({ items, className }: TabsProps) {
  const pathname = usePathname()
  const [activeIndex, setActiveIndex] = useState(0)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Find active tab index
  useEffect(() => {
    const index = items.findIndex(item => {
      if (item.href === pathname) return true
      // Study Help: own section, must not be treated as Learning
      if (item.href === '/student/study-help' && pathname.startsWith('/student/study-help')) return true
      // Learning: /student/study and sub-routes, but NOT /student/study-help
      if (item.href === '/student/study' && pathname.startsWith('/student/study') && !pathname.startsWith('/student/study-help')) return true
      if (item.href === '/student/study' && pathname.startsWith('/student/practice/')) return true
      // Coding: match sub-routes
      if (item.href === '/student/coding' && pathname.startsWith('/student/coding')) return true
      return false
    })
    if (index !== -1) {
      setActiveIndex(index)
    }
  }, [pathname, items])

  // Update indicator position and size
  useEffect(() => {
    const updateIndicator = () => {
      const activeTab = tabRefs.current[activeIndex]
      if (activeTab && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const tabRect = activeTab.getBoundingClientRect()

        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
        })
      }
    }

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(updateIndicator, 10)

    // Also update on resize
    window.addEventListener('resize', updateIndicator)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeIndex, pathname])

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1', className)}
    >
      {/* Animated sliding indicator */}
      <div
        className="absolute bottom-0 h-1 bg-primary rounded-full transition-all duration-500 ease-out"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          transform: 'translateZ(0)', // GPU acceleration
        }}
      />

      {items.map((item, index) => {
        const Icon = item.icon
        // Exact match or nested route
        const isActive = pathname === item.href ||
          (item.href === '/student/study-help' && pathname.startsWith('/student/study-help')) ||
          (item.href === '/student/coding' && pathname.startsWith('/student/coding')) ||
          (item.href === '/student/study' && (
            (pathname.startsWith('/student/study') && !pathname.startsWith('/student/study-help') && !pathname.startsWith('/student/coding')) ||
            pathname.startsWith('/student/practice/')
          ))

        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            className={cn(
              'group relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium z-10',
              'transition-all duration-500 ease-out whitespace-nowrap',
              'transform-gpu will-change-transform',
              isActive
                ? 'text-primary'
                : 'text-neutral-light hover:text-neutral hover:bg-background-elevated'
            )}
            suppressHydrationWarning
          >
            <Icon
              className={cn(
                'w-4 h-4 flex-shrink-0 transition-all duration-300 ease-out',
                isActive
                  ? 'text-primary'
                  : 'group-hover:text-primary'
              )}
            />
            <span
              className={cn(
                'font-medium transition-all duration-300 ease-out',
                isActive && 'font-semibold'
              )}
            >
              {item.name}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
