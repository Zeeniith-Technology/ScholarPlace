'use client'

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  placeholder?: string
  /** small lucide icon rendered inside the trigger, before the label */
  icon?: React.ComponentType<{ className?: string }>
  disabled?: boolean
  className?: string
  /** width of the trigger; menu matches it */
  widthClass?: string
  /** field label rendered above the trigger (for form use) */
  label?: string
  /** shows a red asterisk next to the label */
  required?: boolean
  /** error text rendered below the trigger */
  error?: string
}

/**
 * Custom, design-system-matched dropdown — a styled trigger + popover, replacing
 * the plain native <select> (whose open list can't be themed).
 *
 * The menu is rendered in a PORTAL with fixed positioning so it never gets clipped
 * by a parent's overflow (e.g. inside a scrollable Modal). Click-outside and Escape
 * close it; scroll/resize also close it so it can't drift from the trigger.
 */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  icon: Icon,
  disabled = false,
  className,
  widthClass,
  label,
  required,
  error,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState<number>(-1)
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  const position = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setRect({ left: r.left, top: r.bottom + 6, width: r.width })
  }, [])

  // Measure before paint so the menu appears in the right place immediately
  useLayoutEffect(() => {
    if (open) position()
  }, [open, position])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, options.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
      if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); onChange(options[highlight].value); setOpen(false) }
    }
    // Close on scroll/resize so the fixed menu can't drift from its trigger
    const onScrollResize = () => setOpen(false)
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onScrollResize)
    window.addEventListener('scroll', onScrollResize, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onScrollResize)
      window.removeEventListener('scroll', onScrollResize, true)
    }
  }, [open, highlight, options, onChange])

  const toggle = useCallback(() => {
    if (disabled) return
    setOpen(o => {
      const next = !o
      if (next) setHighlight(Math.max(options.findIndex(o2 => o2.value === value), 0))
      return next
    })
  }, [disabled, options, value])

  return (
    <div className={cn('relative', widthClass || 'w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-neutral mb-2">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium bg-background-surface transition-all',
          'focus:outline-none focus:ring-2 focus:ring-primary/40',
          disabled
            ? 'border-neutral-light/20 text-neutral-light cursor-not-allowed opacity-60'
            : open
              ? 'border-primary/60 shadow-sm text-neutral'
              : 'border-neutral-light/30 text-neutral hover:border-primary/40'
        )}
      >
        {Icon && <Icon className="w-4 h-4 text-primary/70 shrink-0" />}
        <span className={cn('flex-1 text-left truncate', !selected && 'text-neutral-light font-normal')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-neutral-light shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}

      {open && rect && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, zIndex: 9999 }}
          className="max-h-72 overflow-y-auto rounded-xl border border-neutral-light/20 bg-background-surface shadow-xl shadow-neutral/10 p-1.5 origin-top animate-dropdown-in"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-neutral-light">No options</p>
          ) : (
            options.map((o, i) => {
              const isSel = o.value === value
              return (
                <button
                  key={o.value}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                    isSel ? 'bg-primary/10 text-primary font-semibold' : 'text-neutral',
                    !isSel && highlight === i && 'bg-background-elevated'
                  )}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {isSel && <Check className="w-4 h-4 shrink-0" />}
                </button>
              )
            })
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
