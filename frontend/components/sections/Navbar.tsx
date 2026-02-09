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

  // Deep navy-blue header: complements logo light blue + white, strong contrast, brand-aligned
  const headerBg = 'bg-[#152238]' // deep navy-blue (blue-950 range)
  const headerBorder = 'border-white/[0.08]'
  const headerScrolled = isScrolled
    ? 'backdrop-blur-xl shadow-xl shadow-black/20 border-white/[0.1]'
    : 'backdrop-blur-lg'

  return (
    <nav
      className={`fixed top-2 sm:top-4 left-2 right-2 sm:left-[5%] sm:right-[5%] lg:left-[10%] lg:right-[10%] z-50 transition-all duration-300 rounded-full ${headerBg} ${headerBorder} ${headerScrolled}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/header_fullName.png"
              alt="Scholarplace"
              width={180}
              height={40}
              className="h-6 sm:h-8 md:h-10 w-auto object-contain group-hover:opacity-90 transition-opacity"
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
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-white/90 hover:text-white px-4 py-2.5 rounded-full transition-all duration-200"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-medium text-white/90 hover:text-white px-4 py-2.5 rounded-full transition-all duration-200"
            >
              Sign Up
            </Link>
            <Link
              href="#contact"
              className="text-sm font-semibold text-[#152238] bg-white hover:bg-blue-50 px-5 py-2.5 rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Book a Demo
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


      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Menu */}
          <div className="md:hidden absolute left-0 right-0 top-full mt-2 mx-2 bg-[#152238] backdrop-blur-xl rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-4 space-y-2 max-h-[calc(100vh-5rem)] overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200 py-3 px-3 rounded-lg text-base"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 space-y-2 border-t border-white/20 mt-2">
                <Link
                  href="/auth/login"
                  className="block text-center text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 py-3 px-4 rounded-xl transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="block text-center text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 py-3 px-4 rounded-xl transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
                <Link
                  href="#contact"
                  className="block text-sm font-semibold text-[#152238] bg-white hover:bg-blue-50 py-3 px-4 rounded-xl text-center transition-colors shadow-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Book a Demo
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  )
}























