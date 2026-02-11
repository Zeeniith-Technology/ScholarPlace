'use client'

import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  // Debug log to trace unwanted modal rendering
  if (isOpen) console.log('[Modal] Rendering:', { title, size })

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content - fixed height so inner scroll works */}
      <div
        className={cn(
          'relative bg-background-surface rounded-xl shadow-2xl border-2 border-neutral-light/20',
          'transform transition-all duration-300',
          'w-full flex flex-col',
          sizeClasses[size],
          'h-[85vh] max-h-[900px]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - shrink-0 */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-neutral-light/20 bg-gradient-to-r from-background-surface to-background-elevated">
          <h2 className="text-xl font-heading font-bold text-neutral">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-light hover:text-neutral hover:bg-background-elevated transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - flex-1 min-h-0 overflow-y-auto for one scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

