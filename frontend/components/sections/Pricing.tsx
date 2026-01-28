import React from 'react'
import { Building2, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral mb-4">
            Simple Subscription per College
          </h2>
          <p className="text-xl text-neutral-dark max-w-2xl mx-auto">
            Flexible plans designed for departments and entire colleges
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Department TPC Plan */}
          <Card hover className="relative animate-fade-up">
            <Badge variant="accent" className="absolute top-4 right-4">
              Coming Soon
            </Badge>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-neutral">
                    Department TPC Plan
                  </h3>
                  <p className="text-neutral-dark">For individual departments</p>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-neutral-dark">
                  <span className="text-secondary mt-1">✓</span>
                  <span>Department-level analytics</span>
                </li>
                <li className="flex items-start gap-2 text-neutral-dark">
                  <span className="text-secondary mt-1">✓</span>
                  <span>Batch performance tracking</span>
                </li>
                <li className="flex items-start gap-2 text-neutral-dark">
                  <span className="text-secondary mt-1">✓</span>
                  <span>Student progress reports</span>
                </li>
              </ul>
              <Button variant="ghost" className="w-full" disabled>
                Coming Soon
              </Button>
            </div>
          </Card>

          {/* Full College Plan */}
          <Card hover className="border-2 border-primary animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-neutral">
                    Full College Plan
                  </h3>
                  <p className="text-neutral-dark">For entire institutions</p>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-neutral-dark">
                  <span className="text-secondary mt-1">✓</span>
                  <span>All department features</span>
                </li>
                <li className="flex items-start gap-2 text-neutral-dark">
                  <span className="text-secondary mt-1">✓</span>
                  <span>Central TPC dashboard</span>
                </li>
                <li className="flex items-start gap-2 text-neutral-dark">
                  <span className="text-secondary mt-1">✓</span>
                  <span>Cross-department analytics</span>
                </li>
                <li className="flex items-start gap-2 text-neutral-dark">
                  <span className="text-secondary mt-1">✓</span>
                  <span>Recruiter-ready reports</span>
                </li>
              </ul>
              <Button variant="primary" className="w-full">
                Talk to Our Team for Pricing
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}














