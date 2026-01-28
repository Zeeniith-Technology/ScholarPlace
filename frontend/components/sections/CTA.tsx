import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function CTA() {
  return (
    <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-2xl p-12 text-center animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral mb-4">
            Ready to Give Your Students a Clear Placement Roadmap?
          </h2>
          <p className="text-xl text-neutral-dark mb-8 max-w-2xl mx-auto">
            Join colleges that are transforming their placement preparation with structured roadmaps and smart analytics.
          </p>
          <Link href="#contact">
            <Button variant="primary" className="px-8 py-4 text-lg group">
              Book a Demo
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}














