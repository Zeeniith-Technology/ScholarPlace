import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  hover?: boolean
}

export function Card({ children, hover = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-background-surface border border-neutral-light/20',
        'p-6 transition-all duration-300',
        hover && 'hover:scale-105 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/20',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}














