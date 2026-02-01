import React from 'react'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'

const footerLinks = {
  company: [
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-neutral-light/20 bg-background-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-heading font-bold text-neutral">
                Scholarplace
              </span>
            </Link>
            <p className="text-neutral-dark max-w-md">
              Placement preparation platform for engineering colleges. 
              Structured roadmaps, assessments, and analytics from 3rd to 7th semester.
            </p>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-neutral mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-neutral-dark hover:text-neutral transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-neutral mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-neutral-dark hover:text-neutral transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral/10 text-center space-y-2">
          <p className="text-neutral-dark text-sm">
            © Scholarplace, 2025. All rights reserved.
          </p>
          <p className="text-neutral-dark text-sm">
            Powered by{' '}
            <a
              href="https://www.zeeniith.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:text-secondary transition-colors underline underline-offset-2"
            >
              Zeeniith Technology
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}














