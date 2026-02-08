import Link from 'next/link'
import Image from 'next/image'

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
            <Link href="/" className="flex items-center mb-4 group w-fit">
              <div className="relative h-12 w-48">
                <Image
                  src="/images/Footer_logo.png"
                  alt="Scholarplace"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
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
            © Scholarplace, 2026. All rights reserved.
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














