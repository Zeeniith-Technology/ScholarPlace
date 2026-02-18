'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropdownItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    description?: string
}

interface NavDropdownProps {
    label: string
    icon: React.ComponentType<{ className?: string }>
    items: DropdownItem[]
    activeRoutes?: string[]
}

export function NavDropdown({ label, icon: Icon, items, activeRoutes = [] }: NavDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const pathname = usePathname()

    // Check if any of the dropdown items are active
    const isActive = items.some(item =>
        pathname === item.href ||
        pathname.startsWith(item.href + '/') ||
        activeRoutes.some(route => pathname.startsWith(route))
    )

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-neutral-light hover:text-neutral hover:bg-neutral-light/[0.08]'
                )}
            >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                <ChevronDown className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    isOpen && 'rotate-180'
                )} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-neutral-light/10 overflow-hidden z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    <div className="py-2">
                        {items.map((item) => {
                            const ItemIcon = item.icon
                            const isItemActive = pathname === item.href || pathname.startsWith(item.href + '/')

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        'flex items-start gap-3 px-4 py-3 transition-colors duration-150',
                                        isItemActive
                                            ? 'bg-primary/5 text-primary'
                                            : 'text-neutral hover:bg-neutral-light/[0.06]'
                                    )}
                                >
                                    <ItemIcon className={cn(
                                        'w-4 h-4 mt-0.5 shrink-0',
                                        isItemActive ? 'text-primary' : 'text-neutral-light'
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <div className={cn(
                                            'text-sm font-medium leading-tight',
                                            isItemActive && 'text-primary'
                                        )}>
                                            {item.name}
                                        </div>
                                        {item.description && (
                                            <div className="text-xs text-neutral-light mt-0.5 leading-snug">
                                                {item.description}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
