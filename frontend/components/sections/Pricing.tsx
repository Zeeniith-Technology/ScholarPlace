import React from 'react'
import { Building2, Users, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const featureItemClass = 'flex items-center gap-3 text-neutral-dark'
const checkClass = 'flex-shrink-0 w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center text-secondary'

export function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-background-surface/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral mb-3">
            Simple Subscription per College
          </h2>
          <p className="text-lg text-neutral-light max-w-2xl mx-auto">
            Flexible plans designed for departments and entire colleges
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto items-stretch">
          {/* Department TPC Plan */}
          <Card className="relative flex flex-col animate-fade-up p-6 lg:p-8 border border-neutral-light/20 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-neutral">
                    Department TPC Plan
                  </h3>
                  <p className="text-sm text-neutral-light mt-0.5">For individual departments</p>
                </div>
              </div>
              <Badge variant="accent" className="shrink-0 text-xs font-semibold px-2.5 py-1">
                Coming Soon
              </Badge>
            </div>
            <ul className="space-y-3 flex-1 mt-6">
              <li className={featureItemClass}>
                <span className={checkClass}><Check className="w-3 h-3" strokeWidth={2.5} /></span>
                <span>Department-level analytics</span>
              </li>
              <li className={featureItemClass}>
                <span className={checkClass}><Check className="w-3 h-3" strokeWidth={2.5} /></span>
                <span>Batch performance tracking</span>
              </li>
              <li className={featureItemClass}>
                <span className={checkClass}><Check className="w-3 h-3" strokeWidth={2.5} /></span>
                <span>Student progress reports</span>
              </li>
            </ul>
            <div className="mt-8 pt-6 border-t border-neutral-light/15 text-center">
              <p className="text-sm font-medium text-neutral-light">Coming Soon</p>
            </div>
          </Card>

          {/* Full College Plan */}
          <Card className="flex flex-col animate-fade-up p-6 lg:p-8 border-2 border-primary/30 bg-white shadow-md shadow-primary/5" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold text-neutral">
                  Full College Plan
                </h3>
                <p className="text-sm text-neutral-light mt-0.5">For entire institutions</p>
              </div>
            </div>
            <ul className="space-y-3 flex-1 mt-6">
              <li className={featureItemClass}>
                <span className={checkClass}><Check className="w-3 h-3" strokeWidth={2.5} /></span>
                <span>All department features</span>
              </li>
              <li className={featureItemClass}>
                <span className={checkClass}><Check className="w-3 h-3" strokeWidth={2.5} /></span>
                <span>Central TPC dashboard</span>
              </li>
              <li className={featureItemClass}>
                <span className={checkClass}><Check className="w-3 h-3" strokeWidth={2.5} /></span>
                <span>Cross-department analytics</span>
              </li>
              <li className={featureItemClass}>
                <span className={checkClass}><Check className="w-3 h-3" strokeWidth={2.5} /></span>
                <span>Recruiter-ready reports</span>
              </li>
            </ul>
            <div className="mt-8 pt-6 border-t border-neutral-light/15">
              <Button variant="primary" className="w-full h-12 rounded-xl font-semibold text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-shadow">
                Talk to Our Team for Pricing
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}














