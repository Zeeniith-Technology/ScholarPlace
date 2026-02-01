import React from 'react'
import { BookOpen, Calendar, BarChart3, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const features = [
  {
    icon: BookOpen,
    title: 'Semester-wise Aptitude & DSA Roadmaps',
    description: 'Structured learning paths from 5th to 7th semester, covering all essential topics for placement preparation.',
  },
  {
    icon: Calendar,
    title: 'Weekly / Biweekly / Monthly Tests',
    description: 'Automated assessment scheduling keeps students on track and helps TPCs monitor progress consistently.',
  },
  {
    icon: BarChart3,
    title: 'Personalized Analytics per Student',
    description: 'Deep analysis of each student\'s performance and learning patterns to adapt focus areas automatically.',
  },
  {
    icon: Users,
    title: 'TPC Dashboards & Reports',
    description: 'Comprehensive analytics for department and central TPC teams to track batch performance and identify areas for improvement.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral mb-4">
            Everything Your Students Need
          </h2>
          <p className="text-xl text-neutral-dark max-w-2xl mx-auto">
            A complete placement preparation platform built for colleges
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} hover className="animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-semibold text-neutral mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-neutral-dark leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}














