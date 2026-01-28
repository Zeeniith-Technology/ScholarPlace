import React from 'react'
import { CheckCircle2, Calendar, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const experiences = [
  {
    icon: CheckCircle2,
    title: 'Clear What-to-Study Next',
    description: 'No more confusion about what to learn. Your personalized roadmap shows exactly which topics to tackle next, aligned with your semester.',
  },
  {
    icon: Calendar,
    title: 'Regular Tests Keep You On Track',
    description: 'Weekly, biweekly, and monthly assessments ensure you stay consistent. Get instant feedback and know where you stand.',
  },
  {
    icon: Trophy,
    title: 'Visual Progress & Rank Among Peers',
    description: 'See your growth over time with beautiful analytics. Understand how you compare with your batch while maintaining privacy.',
  },
]

export function StudentExperience() {
  return (
    <section id="student-experience" className="py-20 px-4 sm:px-6 lg:px-8 bg-background-surface">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral mb-4">
            Student Experience
          </h2>
          <p className="text-xl text-neutral-dark max-w-2xl mx-auto">
            A guided path that makes placement preparation manageable and motivating
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {experiences.map((experience, index) => {
            const Icon = experience.icon
            return (
              <Card key={index} hover className="animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-neutral mb-3">
                    {experience.title}
                  </h3>
                  <p className="text-neutral-dark leading-relaxed">
                    {experience.description}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}














