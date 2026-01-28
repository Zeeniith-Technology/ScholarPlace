import React from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const semesters = [
  {
    sem: '3rd Semester',
    focus: 'Aptitude Basics, DSA Fundamentals',
    topics: ['Quantitative Aptitude', 'Logical Reasoning', 'Arrays & Strings', 'Basic Algorithms'],
  },
  {
    sem: '4th Semester',
    focus: 'Advanced DSA, Problem Solving',
    topics: ['Trees & Graphs', 'Dynamic Programming Basics', 'Time Complexity', 'Pattern Recognition'],
  },
  {
    sem: '5th Semester',
    focus: 'System Design Basics, Mock Tests',
    topics: ['System Design Concepts', 'Database Design', 'API Design', 'Regular Assessments'],
  },
  {
    sem: '6th Semester',
    focus: 'Interview Preparation, Advanced Topics',
    topics: ['Behavioral Questions', 'Technical Deep Dives', 'Case Studies', 'Mock Interviews'],
  },
  {
    sem: '7th Semester',
    focus: 'Final Preparation, Placement Ready',
    topics: ['Company-specific Prep', 'Resume Review', 'Final Mock Rounds', 'Offer Negotiation'],
  },
]

export function Roadmap() {
  return (
    <section id="roadmap" className="py-20 px-4 sm:px-6 lg:px-8 bg-background-surface">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral mb-4">
            Your 5-Semester Journey
          </h2>
          <p className="text-xl text-neutral-dark max-w-2xl mx-auto">
            A clear roadmap from 3rd semester to placement success
          </p>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent"></div>

          <div className="space-y-8">
            {semesters.map((semester, index) => (
              <div key={index} className="relative animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                {/* Timeline Dot */}
                <div className="hidden md:flex absolute left-0 w-16 h-16 items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-primary border-4 border-background-surface z-10"></div>
                </div>

                <div className="md:ml-24">
                  <Card hover>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="primary">{semester.sem}</Badge>
                        </div>
                        <h3 className="text-2xl font-heading font-semibold text-neutral mb-2">
                          {semester.focus}
                        </h3>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {semester.topics.map((topic, topicIndex) => (
                        <li key={topicIndex} className="flex items-center gap-2 text-neutral-dark">
                          <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}














