import React from 'react'
import { TrendingUp, AlertCircle, FileText, Users, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const benefits = [
  {
    icon: TrendingUp,
    title: 'Batch-wise Performance Overview',
    description: 'Track performance metrics across departments and batches in real-time.',
  },
  {
    icon: AlertCircle,
    title: 'Identify Weak Areas Early',
    description: 'Get alerts when students or batches need additional support or intervention.',
  },
  {
    icon: FileText,
    title: 'Exportable Reports for Recruiters',
    description: 'Generate comprehensive reports showcasing student readiness for placement drives.',
  },
]

export function ForColleges() {
  return (
    <section id="for-colleges" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Left Column - Copy */}
          <div className="space-y-6 animate-fade-up">
            <div>
              <Badge variant="secondary" className="mb-4">For Colleges</Badge>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral mb-4">
                Built for College Administration & TPC Teams
              </h2>
            </div>
            <ul className="space-y-4 pt-2">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-lg text-neutral-dark leading-relaxed">
                  <strong>Empower TPCs</strong> with powerful tools to guide students through their placement journey.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-secondary flex-shrink-0 mt-0.5" />
                <span className="text-lg text-neutral-dark leading-relaxed">
                  <strong>Track Performance</strong> from department-level branches to campus-wide placement cells.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-lg text-neutral-dark leading-relaxed">
                  <strong>Seamless Integration</strong> into your existing workflows to easily identify students needing support.
                </span>
              </li>
            </ul>
          </div>

          {/* Right Column - Benefits Cards */}
          <div className="space-y-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <Card key={index} hover className="animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-semibold text-neutral mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-neutral-dark leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>


      </div>
    </section>
  )
}














