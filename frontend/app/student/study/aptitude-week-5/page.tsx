'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  FileText,
  Menu,
  X,
  Calculator,
  Target,
  BookOpen,
  Trophy,
  AlertCircle,
  Lock,
  Play,
  CheckCircle2
} from 'lucide-react'
import { getAuthHeader } from '@/utils/auth'
import { cn } from '@/lib/utils'

interface BookmarkItem {
  day: string
  section: string
  timestamp: string
}

/**
 * Week 5 Aptitude Learning Page
 * Interactive learning experience for Quantitative Aptitude
 * Route: /student/study/aptitude-week-5?day=day-1|day-2|day-3|day-4|day-5
 */
function AptitudeWeek5Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedDay, setSelectedDay] = useState<string>('day-1')
  const [studyContent, setStudyContent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [bookmarks] = useState<BookmarkItem[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<string>('')
  const [weeklyTestEligibility, setWeeklyTestEligibility] = useState<any>(null)

  const days = [
    { id: 'day-1', label: 'Day 1', title: 'TSD Fundamentals - Speed as Rate & Distance', dayNum: 1 },
    { id: 'day-2', label: 'Day 2', title: 'TSD Advanced - Average Speed & Multi-Segment', dayNum: 2 },
    { id: 'day-3', label: 'Day 3', title: 'Trains & Relative Speed - Overtaking & Meeting', dayNum: 3 },
    { id: 'day-4', label: 'Day 4', title: 'Boats & Water Current - Upstream/Downstream', dayNum: 4 },
    { id: 'day-5', label: 'Day 5', title: 'TSD + Trains + Boats Integration', dayNum: 5 },
  ]

  useEffect(() => {
    const dayParam = searchParams.get('day') || 'day-1'
    setSelectedDay(dayParam)
    const dayIdx = days.findIndex(d => d.id === dayParam)
    setCurrentDayIndex(dayIdx >= 0 ? dayIdx : 0)
    fetchStudyContent(dayParam)
    checkWeeklyTestEligibility()
  }, [searchParams])

  const fetchStudyContent = async (day: string) => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const response = await fetch(`${apiBaseUrl}/syllabus/aptitude-week5-content`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ day }),
      })

      if (response.ok) {
        const responseData = await response.json()
        const content = responseData.data || responseData.content
        if (responseData.success && content) {
          const contentText = content.content || ''
          const hasValidContent = contentText.length > 50

          if (hasValidContent) {
            setStudyContent(content)
            extractSections(contentText)
          } else {
            setStudyContent(getPlaceholderContent(day))
          }
        } else {
          setStudyContent(getPlaceholderContent(day))
        }
      } else {
        setStudyContent(getPlaceholderContent(day))
      }
    } catch (error) {
      console.error('Error fetching aptitude content:', error)
      setStudyContent(getPlaceholderContent(day))
    } finally {
      setIsLoading(false)
    }
  }

  const extractSections = (content: string) => {
    const sections: string[] = []
    const lines = content.split('\n')
    lines.forEach(line => {
      if (line.startsWith('## ')) {
        sections.push(line.replace('## ', '').trim())
      }
    })
    if (sections.length > 0 && !activeSection) {
      setActiveSection(sections[0])
    }
  }

  const getPlaceholderContent = (day: string) => {
    const dayInfo = days.find(d => d.id === day) || days[0]
    return {
      day: dayInfo.label,
      title: dayInfo.title,
      learning_outcomes: [],
      topics: [],
      content: `Content for ${dayInfo.title} will be loaded here.`
    }
  }

  const navigateToDay = (dayId: string) => {
    router.push(`/student/study/aptitude-week-5?day=${dayId}`)
  }

  const goToNextDay = () => {
    if (currentDayIndex < days.length - 1) {
      navigateToDay(days[currentDayIndex + 1].id)
    }
  }

  const goToPreviousDay = () => {
    if (currentDayIndex > 0) {
      navigateToDay(days[currentDayIndex - 1].id)
    }
  }

  const checkWeeklyTestEligibility = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const response = await fetch(`${apiBaseUrl}/student-progress/check-weekly-test-eligibility`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ week: 5 }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) setWeeklyTestEligibility(data.data)
      }
    } catch (error) {
      console.error('Error checking weekly test eligibility:', error)
    }
  }

  const handleWeeklyTestClick = () => {
    if (!weeklyTestEligibility?.eligible) {
      // Allow bypass in development mode
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
        console.log('Development mode: Bypassing eligibility check')
      } else {
        alert('You must complete all requirements before taking the weekly test:\n• Score ≥70% on all practice tests')
        return
      }
    }
    window.open('/student/aptitude/weekly/5', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
  }

  const renderContent = (content: string) => {
    if (!content) return <p className="text-neutral-light">No content available</p>

    const lines = content.split('\n')
    const elements: JSX.Element[] = []
    let inCodeBlock = false
    let codeBlock = ''

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="bg-background-elevated p-4 rounded-lg overflow-x-auto my-4 border border-neutral-light/20">
              <code className="text-sm">{codeBlock.trim()}</code>
            </pre>
          )
          codeBlock = ''
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        return
      }

      if (inCodeBlock) {
        codeBlock += line + '\n'
        return
      }

      if (line.startsWith('# ')) {
        const text = line.replace('# ', '').trim()
        elements.push(
          <h1 key={`h1-${index}`} className="text-3xl font-bold text-neutral mt-8 mb-4" id={text.toLowerCase().replace(/\s+/g, '-')}>
            {text}
          </h1>
        )
        return
      }

      if (line.startsWith('## ')) {
        const text = line.replace('## ', '').trim()
        elements.push(
          <h2 key={`h2-${index}`} className="text-2xl font-bold text-neutral mt-6 mb-3" id={text.toLowerCase().replace(/\s+/g, '-')}>
            {text}
          </h2>
        )
        return
      }

      if (line.startsWith('### ')) {
        const text = line.replace('### ', '').trim()
        elements.push(
          <h3 key={`h3-${index}`} className="text-xl font-semibold text-neutral mt-4 mb-2" id={text.toLowerCase().replace(/\s+/g, '-')}>
            {text}
          </h3>
        )
        return
      }

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const text = line.replace(/^[-*]\s*/, '').trim()
        if (text) {
          elements.push(
            <li key={`li-${index}`} className="ml-6 mb-2 text-neutral-light list-disc">
              {text}
            </li>
          )
        }
        return
      }

      let processedLine = line
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-neutral">$1</strong>')
      processedLine = processedLine.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      processedLine = processedLine.replace(/`(.*?)`/g, '<code class="bg-background-elevated px-2 py-1 rounded text-sm">$1</code>')

      if (line.trim()) {
        elements.push(
          <p key={`p-${index}`} className="text-neutral-light mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: processedLine }} />
        )
      } else {
        elements.push(<br key={`br-${index}`} />)
      }
    })

    return <div className="prose prose-invert max-w-none">{elements}</div>
  }

  return (
    <StudentLayout>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <div className={cn(
            'bg-background-surface border-r border-neutral-light/20 transition-all duration-300 overflow-y-auto',
            sidebarOpen ? 'w-64' : 'w-0 hidden'
          )}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-neutral flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-accent" />
                  Week 5 Aptitude
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded hover:bg-background-elevated"
                >
                  <X className="w-5 h-5 text-neutral-light" />
                </button>
              </div>

              {/* Back Button */}
              <button
                onClick={() => router.push('/student/study/week-5-select')}
                className="w-full flex items-center gap-2 px-3 py-2 mb-4 rounded-lg hover:bg-background-elevated text-neutral-light transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>

              <div className="space-y-2">
                {days.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => navigateToDay(day.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-all',
                      selectedDay === day.id
                        ? 'bg-accent/20 text-accent border-2 border-accent/30'
                        : 'hover:bg-background-elevated text-neutral-light'
                    )}
                  >
                    <div className="font-semibold">{day.label}</div>
                    <div className="text-xs mt-1">{day.title}</div>
                  </button>
                ))}
              </div>

              {selectedDay === 'day-5' && (
                <div className="mt-6 pt-6 border-t border-neutral-light/20">
                  <h3 className="text-sm font-semibold text-neutral mb-2">Weekly Test</h3>
                  <button onClick={handleWeeklyTestClick} className={`w-full text-left p-3 rounded-lg transition-all ${weeklyTestEligibility?.eligible ? 'bg-secondary/10 hover:bg-secondary/20 border-2 border-secondary/30 cursor-pointer' : 'bg-neutral-light/10 border-2 border-secondary/30 cursor-pointer'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className={`w-4 h-4 ${weeklyTestEligibility?.eligible ? 'text-secondary' : 'text-neutral-light'}`} />
                          <div className="font-semibold text-sm">Week 5 Aptitude Test</div>
                        </div>
                        <div className="text-xs opacity-80">{weeklyTestEligibility?.eligible ? '50 questions • 60 minutes' : 'Click to check eligibility'}</div>
                        {weeklyTestEligibility && !weeklyTestEligibility.eligible && (
                          <div className="mt-1.5 text-xs opacity-70">
                            {weeklyTestEligibility.practice_tests && !weeklyTestEligibility.practice_tests.eligible && (
                              <div className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /><span>Practice tests required (≥70%)</span></div>
                            )}
                          </div>
                        )}
                      </div>
                      {weeklyTestEligibility?.eligible ? (
                        <Play className="w-4 h-4 text-secondary flex-shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-neutral-light flex-shrink-0" />
                      )}
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!sidebarOpen && (
              <div className="p-4 border-b border-neutral-light/20">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded hover:bg-background-elevated"
                >
                  <Menu className="w-5 h-5 text-neutral-light" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <Card className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                  <p className="text-neutral-light">Loading content...</p>
                </Card>
              ) : studyContent ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  <Card className="border-2 border-neutral-light/10">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-accent/20">
                          <Calculator className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-neutral">{studyContent.title}</h2>
                          <p className="text-sm text-neutral-light">{studyContent.day}</p>
                        </div>
                      </div>

                      {renderContent(studyContent.content)}
                    </div>
                  </Card>

                  <Card className="border-2 border-accent/30 bg-gradient-to-r from-accent/5 to-secondary/5">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-accent/20">
                            <Target className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-neutral">Ready to Practice?</h3>
                            <p className="text-sm text-neutral-light">Test your understanding with practice questions</p>
                            {(() => {
                              const dayStats = weeklyTestEligibility?.practice_tests?.days?.find((d: any) => d.day === selectedDay) ||
                                weeklyTestEligibility?.practice_tests?.failed?.find((d: any) => d.day === selectedDay);
                              const attempts = weeklyTestEligibility?.practice_tests?.attempts_by_day?.[selectedDay] || 0;

                              if (attempts > 0) {
                                return (
                                  <p className="text-xs mt-1 font-semibold text-neutral-light/80">
                                    Attempts: {attempts}/3 • Score: {dayStats?.score || 0}%
                                  </p>
                                )
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                        {(() => {
                          const attempts = weeklyTestEligibility?.practice_tests?.attempts_by_day?.[selectedDay] || 0;
                          const dayStats = weeklyTestEligibility?.practice_tests?.days?.find((d: any) => d.day === selectedDay); // Only in 'days' if passed >= 70
                          const isPassed = !!dayStats;

                          if (isPassed) {
                            return (
                              <button
                                disabled
                                className="px-6 py-3 bg-green-500/20 text-green-600 rounded-lg font-semibold cursor-default flex items-center gap-2 border border-green-500/20"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                                Completed
                              </button>
                            )
                          }

                          if (attempts >= 3) {
                            return (
                              <button
                                disabled
                                className="px-6 py-3 bg-neutral-light/20 text-neutral-light rounded-lg font-semibold cursor-not-allowed flex items-center gap-2"
                              >
                                <Lock className="w-5 h-5" />
                                Max Attempts
                              </button>
                            )
                          }

                          return (
                            <button
                              onClick={() => router.push(`/student/practice/aptitude-week-5?day=${selectedDay}`)}
                              className="px-6 py-3 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                            >
                              <BookOpen className="w-5 h-5" />
                              {attempts > 0 ? "Retake Practice" : "Take Practice Test"}
                            </button>
                          )
                        })()}
                      </div>
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <FileText className="w-16 h-16 text-neutral-light mx-auto mb-4" />
                  <p className="text-neutral-light">No content available</p>
                </Card>
              )}
            </div>

            <div className="bg-background-surface border-t border-neutral-light/20 p-4">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <button
                  onClick={goToPreviousDay}
                  disabled={currentDayIndex === 0}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                    currentDayIndex === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-background-elevated text-neutral-light'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {days.map((day, idx) => (
                    <div
                      key={day.id}
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        idx === currentDayIndex
                          ? 'bg-primary w-8'
                          : 'bg-neutral-light/30 w-2'
                      )}
                    />
                  ))}
                </div>

                <button
                  onClick={goToNextDay}
                  disabled={currentDayIndex === days.length - 1}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                    currentDayIndex === days.length - 1
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-background-elevated text-neutral-light'
                  )}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}

export default function AptitudeWeek5Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>}>
      <AptitudeWeek5Content />
    </Suspense>
  )
}
