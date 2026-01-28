import React from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options?: { value: string; label: string }[]
}

export function Select({ label, error, options = [], className, id, ...props }: SelectProps) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
  
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-neutral mb-2"
        >
          {label}
          {props['aria-required'] === 'true' && (
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          )}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full px-4 py-3 rounded-lg bg-background-surface border',
          'text-neutral',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'cursor-pointer',
          error && 'border-red-500 focus:ring-red-500',
          !error && 'border-neutral-light/20',
          className
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {options && options.length > 0 ? (
          options.map((option) => (
            <option key={option.value} value={option.value} className="bg-background-surface">
              {option.label}
            </option>
          ))
        ) : (
          <option value="">No options available</option>
        )}
      </select>
      {error && (
        <p 
          id={selectId ? `${selectId}-error` : undefined}
          className="mt-1.5 text-sm text-red-500" 
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}














