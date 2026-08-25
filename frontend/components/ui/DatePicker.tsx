'use client'

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  /** ISO date string 'YYYY-MM-DD', or '' for no value — same shape as a native <input type="date"> */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 'YYYY-MM-DD' — days before this are disabled */
  min?: string
  /** 'YYYY-MM-DD' — days after this are disabled */
  max?: string
  disabled?: boolean
  className?: string
  widthClass?: string
  label?: string
  required?: boolean
  error?: string
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

/** Parse 'YYYY-MM-DD' as a LOCAL date (avoids the UTC-midnight off-by-one from `new Date(str)`) */
function parseISO(iso: string | undefined | null): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
  return isNaN(d.getTime()) ? null : d
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * Custom, design-system-matched date picker — a styled trigger + a real calendar
 * popover, replacing the plain native <input type="date"> (whose calendar is pure
 * browser chrome and can't be themed at all). Drop-in replacement: same 'YYYY-MM-DD'
 * value/onChange contract as the native input.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date…',
  min,
  max,
  disabled = false,
  className,
  widthClass,
  label,
  required,
  error,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selected = parseISO(value)
  const minDate = parseISO(min)
  const maxDate = parseISO(max)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const [viewDate, setViewDate] = useState<Date>(selected || today)

  const position = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const margin = 8
    const width = Math.max(r.width, 288)
    const popoverHeight = 360

    // Clamp horizontally so the calendar never runs off either edge of the viewport
    // (a fixed-width popover anchored to a narrow trigger near the screen edge
    // would otherwise overflow, as it did for a "To date" field near the right edge).
    let left = r.left
    if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width
    if (left < margin) left = margin

    // Flip above the trigger if there isn't room below
    let top = r.bottom + 6
    if (top + popoverHeight > window.innerHeight - margin && r.top - popoverHeight - 6 > margin) {
      top = r.top - popoverHeight - 6
    }

    setRect({ left, top, width })
  }, [])

  useLayoutEffect(() => {
    if (open) {
      setViewDate(selected || today)
      position()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
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
  }, [open])

  const toggle = () => { if (!disabled) setOpen(o => !o) }

  const isDisabled = (d: Date) => Boolean((minDate && d < minDate) || (maxDate && d > maxDate))

  // Build the 6-row day grid for the viewed month (leading/trailing days from adjacent months)
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(gridStart.getDate() - monthStart.getDay())
  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  const displayLabel = selected
    ? selected.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : placeholder

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
        <Calendar className="w-4 h-4 text-primary/70 shrink-0" />
        <span className={cn('flex-1 text-left truncate', !selected && 'text-neutral-light font-normal')}>
          {displayLabel}
        </span>
      </button>
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}

      {open && rect && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, zIndex: 9999 }}
          className="max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl border border-neutral-light/20 bg-background-surface shadow-xl shadow-neutral/10 p-3 origin-top animate-dropdown-in"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg text-neutral-light hover:bg-background-elevated hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-neutral">
              {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg text-neutral-light hover:bg-background-elevated hover:text-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(w => (
              <span key={w} className="text-center text-xs font-semibold text-neutral-light py-1">{w}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === viewDate.getMonth()
              const disabledDay = isDisabled(d)
              const isSelected = sameDay(d, selected)
              const isToday = sameDay(d, today)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => { onChange(toISO(d)); setOpen(false) }}
                  className={cn(
                    'h-8 rounded-lg text-sm transition-colors',
                    !inMonth && 'text-neutral-light/40',
                    inMonth && !isSelected && 'text-neutral',
                    disabledDay && 'opacity-30 cursor-not-allowed hover:bg-transparent',
                    isSelected
                      ? 'bg-primary text-white font-semibold'
                      : !disabledDay && 'hover:bg-background-elevated',
                    !isSelected && isToday && 'ring-1 ring-inset ring-primary/50 font-semibold text-primary'
                  )}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-light/10">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="text-xs font-medium text-neutral-light hover:text-red-500 transition-colors px-2 py-1"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => { onChange(toISO(today)); setOpen(false) }}
              className="text-xs font-medium text-primary hover:text-primary-dark transition-colors px-2 py-1"
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
