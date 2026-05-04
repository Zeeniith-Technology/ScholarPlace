'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

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
    { href: '#features',    label: 'Features' },
    { href: '#roadmap',     label: 'Roadmap' },
    { href: '#for-colleges',label: 'For Colleges' },
    { href: '#pricing',     label: 'Pricing' },
    { href: '#contact',     label: 'Contact' },
  ]

  return (
    <nav
      className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-500
        w-[calc(100%-24px)] max-w-6xl rounded-2xl
        ${isScrolled
          ? 'bg-[#060a14]/90 backdrop-blur-2xl border border-[rgba(56,139,253,0.18)] shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(56,139,253,0.08)]'
          : 'bg-[#060a14]/60 backdrop-blur-xl border border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
        }`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24">

          {/* Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0">
            <Image
              src="/images/white_text_logo.png"
              alt="Scholarplace"
              width={240}
              height={60}
              className="h-14 sm:h-16 md:h-[72px] w-auto object-contain transition-opacity duration-200 group-hover:opacity-85"
              priority
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium text-white/60 hover:text-white/95 transition-colors duration-200 rounded-lg hover:bg-white/[0.05] group"
              >
                {link.label}
                <span className="absolute bottom-1 left-4 right-4 h-px bg-gradient-to-r from-blue-400/0 via-blue-400/70 to-blue-400/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-5 py-2.5 text-sm font-semibold text-white/90 hover:text-white rounded-xl
                border border-white/10 hover:border-blue-400/40
                bg-white/[0.04] hover:bg-white/[0.08]
                transition-all duration-200"
            >
              Log in
            </Link>
            <Link
              href="#contact"
              className="btn-premium px-5 py-2.5 text-sm font-semibold text-white rounded-xl"
            >
              Book a Demo
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Open menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isMobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="md:hidden absolute left-0 right-0 top-full mt-2 mx-2 bg-[#0b1120] border border-white/[0.08] backdrop-blur-xl rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200 py-3 px-3 rounded-xl text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 space-y-2 border-t border-white/[0.07] mt-2">
                <Link
                  href="/auth/login"
                  className="block text-center text-sm font-semibold text-white/80 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] py-3 px-4 rounded-xl transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="#contact"
                  className="btn-premium block text-center text-sm font-semibold text-white py-3 px-4 rounded-xl"
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
