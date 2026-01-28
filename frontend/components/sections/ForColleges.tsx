import React from 'react'
import { TrendingUp, AlertCircle, FileText, Users } from 'lucide-react'
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
            <p className="text-lg text-neutral-dark leading-relaxed">
              Scholarplace empowers your Training & Placement Coordinators with powerful tools 
              to guide students through their placement journey. From department-level TPCs 
              tracking their branch performance to central placement cells overseeing campus-wide 
              analytics, everyone gets the insights they need.
            </p>
            <p className="text-lg text-neutral-dark leading-relaxed">
              Our platform integrates seamlessly into your existing training workflows, making 
              it easy to identify students who need extra support and celebrate those who are 
              excelling.
            </p>
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

        {/* Info Badge */}
        <div className="glass rounded-xl p-6 border-l-4 border-primary animate-fade-up">
          <div className="flex items-start gap-4">
            <Users className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-neutral mb-2">
                Subscription Model
              </h4>
              <p className="text-neutral-dark">
                Scholarplace is designed as a subscription for colleges, not individual students. 
                Colleges subscribe and onboard their students, ensuring comprehensive coverage 
                across departments and batches.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}














