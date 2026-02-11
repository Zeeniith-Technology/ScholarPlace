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
  /** Optional full name for tooltip when label is shortened */
  title?: string
  /** Additional routes that should activate this tab (e.g. ['/student/practice'] for Learning tab) */
  activeRoutes?: string[]
}

interface TabsProps {
  items: TabItem[]
  className?: string
  variant?: 'default' | 'premium'
}

export function Tabs({ items, className, variant = 'default' }: TabsProps) {
  const pathname = usePathname()
  const [activeIndex, setActiveIndex] = useState(0)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, top: 0, height: 0 })
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Find active tab index using "Best Match" strategy
  useEffect(() => {
    let bestMatchIndex = 0;
    let maxMatchLength = -1;

    items.forEach((item, index) => {
      let matchLength = -1;

      // 1. Exact match
      if (pathname === item.href) {
        matchLength = item.href.length + 100; // Boost exact matches
      }
      // 2. Prefix match (only if href is not just "/")
      else if (item.href !== '/' && pathname.startsWith(item.href)) {
        matchLength = item.href.length;
      }
      // 3. Active Routes match
      else if (item.activeRoutes) {
        const matchingRoute = item.activeRoutes.find(route => pathname.startsWith(route));
        if (matchingRoute) {
          matchLength = matchingRoute.length;
        }
      }

      // Special case: /student/study-help vs /student/study
      // If we are at /student/study-help, both match.
      // /student/study length is ~14. /student/study-help is ~19.
      // The longer match logic automatically handles this!

      if (matchLength > maxMatchLength) {
        maxMatchLength = matchLength;
        bestMatchIndex = index;
      }
    });

    setActiveIndex(bestMatchIndex);
  }, [pathname, items])

  // Update indicator position and size (for both default line and premium pill)
  useEffect(() => {
    const updateIndicator = () => {
      const activeTab = tabRefs.current[activeIndex]
      if (activeTab && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const tabRect = activeTab.getBoundingClientRect()

        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
          top: tabRect.top - containerRect.top,
          height: tabRect.height,
        })
      }
    }

    const rafId = requestAnimationFrame(() => {
      updateIndicator()
    })
    const timeoutId = setTimeout(updateIndicator, 50)
    window.addEventListener('resize', updateIndicator)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeIndex, pathname])

  const isPremium = variant === 'premium'

  const transitionClass = 'transition-all duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]'

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center overflow-x-auto scrollbar-hide',
        isPremium ? 'gap-1' : 'gap-0.5',
        className
      )}
    >
      {/* Default: sliding underline */}
      {!isPremium && (
        <div
          className={cn('absolute bottom-0 h-0.5 bg-primary rounded-full will-change-[left,width]', transitionClass)}
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            transform: 'translateZ(0)',
          }}
        />
      )}

      {/* Premium: sliding pill background */}
      {isPremium && (
        <div
          className={cn(
            'absolute rounded-xl bg-white shadow-sm border border-neutral-light/10 will-change-[left,width] pointer-events-none',
            transitionClass
          )}
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            top: `${indicatorStyle.top}px`,
            height: `${indicatorStyle.height}px`,
            transform: 'translateZ(0)',
          }}
        />
      )}

      {items.map((item, index) => {
        const Icon = item.icon
        const isActive = index === activeIndex

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.title ?? item.name}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            className={cn(
              'group relative flex items-center z-10 whitespace-nowrap',
              isPremium
                ? 'gap-2 px-4 py-2.5 rounded-xl text-sm font-medium tracking-tight transition-colors duration-200 ease-out'
                : 'gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ease-out',
              isPremium
                ? isActive
                  ? 'text-primary'
                  : 'text-neutral-light hover:text-neutral hover:bg-white/50'
                : isActive
                  ? 'text-primary bg-primary/5'
                  : 'text-neutral-light hover:text-neutral hover:bg-background-elevated'
            )}
            suppressHydrationWarning
          >
            <Icon
              className={cn(
                'flex-shrink-0 transition-colors duration-200',
                isPremium ? 'w-4 h-4' : 'w-4 h-4',
                isActive ? 'text-primary' : 'text-inherit opacity-80 group-hover:opacity-100'
              )}
            />
            <span className={cn('shrink-0', isPremium ? 'font-semibold' : 'font-medium', isActive && isPremium && 'text-primary')}>
              {item.name}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
