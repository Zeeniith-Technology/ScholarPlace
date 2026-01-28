'use client'

import React, { useState, useEffect } from 'react'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Award,
  ArrowRight,
  Calendar,
} from 'lucide-react'

/**
 * Student Roadmap Page
 * Display semester-wise learning roadmap
 * Route: /student/roadmap
 */
export default function StudentRoadmapPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [selectedSemester, setSelectedSemester] = useState(6)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const semesters = [
    {
      number: 3,
      title: 'Foundation',
      status: 'completed',
      description: 'Build strong fundamentals in programming and problem-solving',
      topics: ['Basic Programming', 'Data Structures Basics', 'Aptitude Basics'],
    },
    {
      number: 4,
      title: 'Intermediate',
      status: 'completed',
      description: 'Advance your skills with complex algorithms and system design basics',
      topics: ['Advanced DSA', 'OOP Concepts', 'Database Basics', 'Web Development'],
    },
    {
      number: 5,
      title: 'Advanced',
      status: 'completed',
      description: 'Master advanced concepts and prepare for technical interviews',
      topics: ['System Design', 'Advanced Algorithms', 'Cloud Basics', 'Interview Prep'],
    },
    {
      number: 6,
      title: 'Placement Prep',
      status: 'current',
      description: 'Final preparation for placements with mock interviews and strategy',
      topics: [
        'Advanced System Design',
        'Cloud & DevOps',
        'Machine Learning Basics',
        'Interview Mastery',
        'Resume & Portfolio',
        'Mock Interviews',
      ],
    },
    {
      number: 7,
      title: 'Placement Season',
      status: 'upcoming',
      description: 'Active placement season with company-specific preparation',
      topics: ['Company Research', 'Interview Practice', 'Offer Negotiation'],
    },
  ]

  const currentSemester = semesters.find((s) => s.number === selectedSemester) || semesters[3]

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-700 ${
            isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral mb-2 leading-tight">
              Learning Roadmap
            </h1>
            <p className="text-sm sm:text-base text-neutral-light">
              Your journey from 3rd semester to placement success
            </p>
          </div>
        </div>

        {/* Semester Selector */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {semesters.map((semester) => (
            <button
              key={semester.number}
              onClick={() => setSelectedSemester(semester.number)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                selectedSemester === semester.number
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                  : 'bg-background-surface text-neutral-light hover:bg-background-elevated hover:text-neutral border border-neutral-light/20 hover:border-primary/30 hover:shadow-md'
              }`}
            >
              {semester.number}th Semester
            </button>
          ))}
        </div>

        {/* Current Semester Overview */}
        <Card className="transition-all duration-700 hover:shadow-xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start gap-4 mb-6">
            <div
              className={`p-4 rounded-lg ${
                currentSemester.status === 'current'
                  ? 'bg-primary/20'
                  : currentSemester.status === 'completed'
                  ? 'bg-secondary/20'
                  : 'bg-neutral-light/20'
              }`}
            >
              <BookOpen
                className={`w-6 h-6 sm:w-8 sm:h-8 ${
                  currentSemester.status === 'current'
                    ? 'text-primary'
                    : currentSemester.status === 'completed'
                    ? 'text-secondary'
                    : 'text-neutral-light'
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl sm:text-2xl font-heading font-bold text-neutral">
                  {currentSemester.number}th Semester - {currentSemester.title}
                </h2>
                {currentSemester.status === 'completed' && (
                  <Badge variant="secondary" className="text-xs sm:text-sm">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
                {currentSemester.status === 'current' && (
                  <Badge variant="primary" className="text-xs sm:text-sm">
                    <Clock className="w-3 h-3 mr-1" />
                    Current
                  </Badge>
                )}
                {currentSemester.status === 'upcoming' && (
                  <Badge variant="default" className="text-xs sm:text-sm">
                    Upcoming
                  </Badge>
                )}
              </div>
              <p className="text-sm sm:text-base text-neutral-light mb-4">
                {currentSemester.description}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {currentSemester.topics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background-elevated"
                  >
                    <Target className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-neutral">{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Timeline View */}
        <Card className="transition-all duration-700 hover:shadow-xl animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-heading font-bold text-neutral mb-4 sm:mb-6">
            Complete Journey Timeline
          </h2>
          <div className="relative">
            {/* Timeline Line */}
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent"></div>

            <div className="space-y-6">
              {semesters.map((semester, index) => (
                <div
                  key={semester.number}
                  className="relative flex items-start gap-4 md:gap-6 animate-fade-in-up"
                  style={{ animationDelay: `${500 + index * 100}ms` }}
                >
                  {/* Timeline Dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-background font-heading font-bold text-lg ${
                        semester.status === 'completed'
                          ? 'bg-secondary text-white'
                          : semester.status === 'current'
                          ? 'bg-primary text-white animate-pulse'
                          : 'bg-neutral-light/20 text-neutral-light'
                      }`}
                    >
                      {semester.status === 'completed' ? (
                        <CheckCircle2 className="w-8 h-8" />
                      ) : (
                        semester.number
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <Card
                    className={`flex-1 transition-all duration-300 hover:shadow-lg ${
                      semester.status === 'current'
                        ? 'border-primary/30 bg-primary/5'
                        : semester.status === 'completed'
                        ? 'border-secondary/30 bg-secondary/5'
                        : 'border-neutral-light/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg sm:text-xl font-heading font-bold text-neutral">
                            {semester.number}th Semester - {semester.title}
                          </h3>
                          {semester.status === 'completed' && (
                            <Badge variant="secondary" className="text-xs">
                              Completed
                            </Badge>
                          )}
                          {semester.status === 'current' && (
                            <Badge variant="primary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-neutral-light mb-3">
                          {semester.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {semester.topics.slice(0, 3).map((topic, idx) => (
                            <Badge key={idx} variant="default" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {semester.topics.length > 3 && (
                            <Badge variant="default" className="text-xs">
                              +{semester.topics.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      {semester.status === 'current' && (
                        <div className="flex items-center gap-2">
                          <Link
                            href="/student/syllabus"
                            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                          >
                            View Syllabus
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Progress Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="transition-all duration-700 hover:shadow-xl animate-fade-in-up" style={{ animationDelay: '900ms' }}>
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-5 h-5 text-secondary" />
              <h3 className="font-semibold text-neutral">Completed Semesters</h3>
            </div>
            <p className="text-3xl font-heading font-bold text-secondary mb-1">
              {semesters.filter((s) => s.status === 'completed').length}
            </p>
            <p className="text-sm text-neutral-light">Out of 5 total</p>
          </Card>

          <Card className="transition-all duration-700 hover:shadow-xl animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-neutral">Current Semester</h3>
            </div>
            <p className="text-3xl font-heading font-bold text-primary mb-1">
              {currentSemester.number}th
            </p>
            <p className="text-sm text-neutral-light">{currentSemester.title}</p>
          </Card>

          <Card className="transition-all duration-700 hover:shadow-xl animate-fade-in-up" style={{ animationDelay: '1100ms' }}>
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-neutral">Overall Progress</h3>
            </div>
            <p className="text-3xl font-heading font-bold text-accent mb-1">
              {Math.round((semesters.filter((s) => s.status === 'completed').length / semesters.length) * 100)}%
            </p>
            <p className="text-sm text-neutral-light">Journey completion</p>
          </Card>
        </div>
      </div>
    </StudentLayout>
  )
}
