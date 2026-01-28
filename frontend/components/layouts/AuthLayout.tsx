'use client'

import React from 'react'
import Image from 'next/image'
import { GraduationCap } from 'lucide-react'
import Link from 'next/link'

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  heroImage: string
}

export function AuthLayout({ children, title, subtitle, heroImage }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Hero Image */}
      <div className="hidden lg:flex lg:flex-1 relative bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10">
          <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 group">
            <GraduationCap className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-200" />
            <span className="font-heading font-bold text-xl text-neutral">Scholarplace</span>
          </Link>
          
          {(title || subtitle) && (
            <div className="max-w-md text-center space-y-6">
              {title && (
                <h2 className="text-4xl font-heading font-bold text-neutral leading-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-lg text-neutral-light leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Hero Image */}
        <div className="absolute inset-0 opacity-20">
          <Image
            src={heroImage}
            alt="Scholarplace Hero"
            fill
            className="object-cover"
            priority
            onError={(e) => {
              // Fallback if image doesn't exist
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />
      </div>

      {/* Right side - Form Content */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 py-12">
        {/* Mobile Logo */}
        <Link href="/" className="lg:hidden flex items-center gap-2 mb-8 group">
          <GraduationCap className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-200" />
          <span className="font-heading font-bold text-lg text-neutral">Scholarplace</span>
        </Link>

        {/* Mobile Title */}
        {(title || subtitle) && (
          <div className="lg:hidden mb-8 text-center">
            {title && (
              <h2 className="text-2xl font-heading font-bold text-neutral mb-2">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-base text-neutral-light">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-neutral-light">
            © {new Date().getFullYear()} Scholarplace. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
