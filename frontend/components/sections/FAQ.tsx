'use client'

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const faqs = [
  {
    question: 'How does Scholarplace integrate with our existing college systems?',
    answer: 'Scholarplace is designed to work alongside your existing training and placement processes. We provide APIs and export capabilities that allow you to integrate with your college management systems. Our team works with your IT department to ensure smooth integration.',
  },
  {
    question: 'Can we onboard only specific branches?',
    answer: 'Yes, absolutely. You can start with specific departments or branches and expand gradually. Our flexible subscription model allows you to add departments as needed. This is especially useful for pilot programs or phased rollouts.',
  },
  {
    question: 'How are tests scheduled?',
    answer: 'Tests are automatically scheduled based on your preferences. You can set up weekly, biweekly, or monthly assessments. The system sends reminders to students and TPCs, and results are available immediately after completion. TPCs can also manually schedule additional tests as needed.',
  },
  {
    question: 'What kind of analytics do TPCs get?',
    answer: 'TPCs get comprehensive analytics including individual student performance, batch-level trends, topic-wise strengths and weaknesses, progress over time, and comparative analysis. Department TPCs see their branch data, while central TPCs get campus-wide insights with the ability to drill down by department.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background-surface">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-neutral-dark">
            Everything you need to know about Scholarplace
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card
              key={index}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <button
                className="w-full text-left flex items-center justify-between gap-4"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <h3 className="text-lg font-heading font-semibold text-neutral pr-4">
                  {faq.question}
                </h3>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-neutral-dark flex-shrink-0 transition-transform duration-200',
                    openIndex === index && 'transform rotate-180'
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="mt-4 pt-4 border-t border-neutral-light/20 animate-fade-up">
                  <p className="text-neutral-dark leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}














