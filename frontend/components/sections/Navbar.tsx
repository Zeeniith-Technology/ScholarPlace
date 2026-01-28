'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#roadmap', label: 'Roadmap' },
    { href: '#for-colleges', label: 'For Colleges' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#contact', label: 'Contact' },
  ]

  return (
    <nav
      className={`fixed top-4 left-[10%] right-[10%] z-50 transition-all duration-300 rounded-full ${
        isScrolled
          ? 'bg-[rgb(30,41,59)]/95 backdrop-blur-xl border border-[rgb(30,41,59)]/40 shadow-lg shadow-[rgb(30,41,59)]/20'
          : 'bg-[rgb(30,41,59)]/85 backdrop-blur-lg border border-[rgb(30,41,59)]/30'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/header_fullName.png"
              alt="Scholarplace"
              width={180}
              height={40}
              className="h-8 md:h-10 w-auto object-contain group-hover:opacity-90 transition-opacity"
              priority
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/90 hover:text-white transition-all duration-300 text-sm font-medium relative group py-2"
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300 ease-out"></span>
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center space-x-2">
            <Link 
              href="/auth/login"
              className="text-sm font-medium text-white/90 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 relative group"
            >
              <span className="relative z-10">Login</span>
              <span className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
            </Link>
            <Link 
              href="/auth/signup"
              className="text-sm font-medium text-white/90 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 relative group"
            >
              <span className="relative z-10">Sign Up</span>
              <span className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
            </Link>
            <Link 
              href="#contact"
              className="text-sm font-medium text-white/90 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 relative group"
            >
              <span className="relative z-10">Book a Demo</span>
              <span className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Open menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[rgb(30,41,59)]/95 backdrop-blur-xl border-t border-[rgb(30,41,59)]/40 rounded-b-3xl">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-white/90 hover:text-white transition-all duration-300 py-2 relative group"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute bottom-2 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300 ease-out"></span>
              </Link>
            ))}
            <div className="pt-4 space-y-2 border-t border-white/20">
              <Link 
                href="/auth/login" 
                className="block text-sm font-medium text-white/90 hover:text-white py-2 px-4 rounded-lg transition-all duration-200 relative group -mx-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="relative z-10">Login</span>
                <span className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
              </Link>
              <Link 
                href="/auth/signup" 
                className="block text-sm font-medium text-white/90 hover:text-white py-2 px-4 rounded-lg transition-all duration-200 relative group -mx-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="relative z-10">Sign Up</span>
                <span className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
              </Link>
              <Link 
                href="#contact" 
                className="block text-sm font-medium text-white/90 hover:text-white py-2 px-4 rounded-lg transition-all duration-200 relative group -mx-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="relative z-10">Book a Demo</span>
                <span className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}























