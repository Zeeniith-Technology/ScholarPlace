'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import {
  BookOpen,
  Calculator,
  Code,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Week 2 Selection Page
 * Allows students to choose between DSA and Aptitude for Week 2
 * Route: /student/study/week-2-select
 */
export default function Week2SelectionPage() {
  const router = useRouter()
  // Changed state to array to allow independent toggling
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  const options = useMemo(() => ([
    {
      id: 'dsa' as const,
      title: 'Data Structures & Algorithms',
      description: 'Arrays and searching patterns with day-wise practice.',
      icon: Code,
      route: '/student/study/2?day=day-1',
      tone: {
        border: 'border-blue-200',
        ring: 'ring-blue-100',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700',
        chip: 'bg-blue-100 text-blue-700 border-blue-200',
      },
      highlights: ['Array operations', 'Binary search', 'Two-pointer'],
      outline: [
        'Day 1: Array Operations — Update, Search, Reverse',
        'Day 2: Insertion & Deletion with Shifting',
        'Day 3: Binary Search - Divide & Conquer',
        'Day 4: Two-Pointer Patterns & Prefix Sum',
        'Day 5: Comprehensive String Basics',
      ],
    },
    {
      id: 'aptitude' as const,
      title: 'Quantitative Aptitude',
      description: 'Percentages, ratio & proportion with deep practice.',
      icon: Calculator,
      route: '/student/study/aptitude-week-2?day=day-1',
      tone: {
        border: 'border-orange-200',
        ring: 'ring-orange-100',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-600',
        button: 'bg-orange-600 hover:bg-orange-700',
        chip: 'bg-orange-100 text-orange-700 border-orange-200',
      },
      highlights: ['Percentages mastery', 'Ratio & proportion', 'Applications'],
      outline: [
        'Day 1: Percentages – Foundation & Change',
        'Day 2: Successive Percentages & Applications',
        'Day 3: Ratio & Proportion (Beginner)',
        'Day 4: Proportion & Applications (Intermediate)',
        'Day 5: Integrated Aptitude (Advanced)',
      ],
    },
  ]), [])

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/student/study')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Learning</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 shadow-sm">
                <BookOpen className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-heading font-bold text-gray-900 leading-tight">
                  Week 2 Learning
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Choose your track. You can switch anytime.
                </p>
              </div>
            </div>
          </div>

          {/* Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
            {options.map((option) => {
              const Icon = option.icon
              // Check if ID is in the expanded array
              const isExpanded = expandedIds.includes(option.id)
              return (
                <Card
                  key={option.id}
                  className={cn(
                    'group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg',
                    option.tone.border,
                    'bg-white',
                    'p-0',
                    'h-full flex flex-col'
                  )}
                >
                  <div className={cn('p-6 sm:p-7 flex flex-col flex-1', 'ring-1 ring-transparent hover:ring-2', option.tone.ring)}>
                    {/* Top */}
                    <div className="flex items-start gap-4">
                      <div className={cn('p-3 rounded-xl border border-gray-200 shadow-sm', option.tone.iconBg)}>
                        <Icon className={cn('w-7 h-7', option.tone.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                          {option.title}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                          {option.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', option.tone.chip)}>
                            Week 2
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-600 bg-gray-50">
                            5 days
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-600 bg-gray-50">
                            Progress-ready
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Highlights */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {option.highlights.map((h) => (
                        <div key={h} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
                          <CheckCircle2 className={cn('w-4 h-4 flex-shrink-0', option.tone.iconColor)} />
                          <span className="truncate">{h}</span>
                        </div>
                      ))}
                    </div>

                    {/* Outline (collapsible) */}
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setExpandedIds((current) =>
                            current.includes(option.id)
                              ? current.filter(id => id !== option.id)
                              : [...current, option.id]
                          )
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm font-semibold text-gray-900">View outline</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <ul className="space-y-2">
                            {option.outline.map((item) => (
                              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className={cn(
                                  'mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0',
                                  option.id === 'dsa' ? 'bg-blue-500' : 'bg-orange-500'
                                )} />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="mt-auto pt-6 flex items-center gap-3">
                      <button
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-md shadow-sm',
                          option.tone.button
                        )}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          router.push(option.route)
                        }}
                      >
                        <span>Start</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        className="px-4 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setExpandedIds((current) =>
                            current.includes(option.id)
                              ? current.filter(id => id !== option.id)
                              : [...current, option.id]
                          )
                        }}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
