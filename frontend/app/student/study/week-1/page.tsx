'use client'

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useSocket } from '@/hooks/useSocket'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  CheckCircle2,
  ArrowLeft,
  Code,
  Lightbulb,
  FileText,
  Zap,
  Bookmark,
  BookmarkCheck,
  TrendingUp,
  Copy,
  Check,
  Menu,
  X,
  Play,
  HelpCircle,
  Brain,
  RotateCcw,
  Trophy,
  AlertCircle,
  Lock,
} from 'lucide-react'
import { CodeEditor } from '@/components/ui/CodeEditor'
import { AIQuestionAnswer } from '@/components/ai/AIQuestionAnswer'
import { getAuthHeader, getCurrentUserFromToken } from '@/utils/auth'
import { cn } from '@/lib/utils'

interface BookmarkItem {
  day: string
  section: string
  timestamp: string
}

/**
 * Week 1 DSA Learning Page - W3Schools Style
 * Interactive learning experience similar to W3Schools
 * Route: /student/study/week-1?day=pre-week|day-1|day-2|day-3|day-4|day-5
 */
function Week1StudyContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  // Week 1 is always week 1
  const weekNum = 1

  // Week 1 has pre-week, Week 2+ starts from day-1
  const defaultDay = weekNum === 1 ? 'pre-week' : 'day-1'
  const [selectedDay, setSelectedDay] = useState<string>(defaultDay)
  const [studyContent, setStudyContent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<string>('')
  const [dbProgress, setDbProgress] = useState<any>(null)
  const [codingProblems, setCodingProblems] = useState<any[]>([]) // Capstone coding problems for Day 5
  const [dailyCodingProblems, setDailyCodingProblems] = useState<any[]>([]) // Daily coding problems for current day
  const [weeklyTestEligibility, setWeeklyTestEligibility] = useState<any>(null)
  const sessionStartTime = useRef<number | null>(null)
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null)

  // Real-time socket connection for progress updates
  const { isConnected, trackProgress, startStudySession, updateStudyProgress } = useSocket({
    onProgressUpdate: (data) => {
      if (data.action === 'day-completed' || data.action === 'study-session-update') {
        fetchStudentProgress()
        checkWeeklyTestEligibility()
      } else if (data.progressData) {
        setDbProgress((prev: any) => ({
          ...prev,
          ...data.progressData
        }))
      }
    }
  })

  // Configure days based on week number
  const days = useMemo(() => {
    if (weekNum === 1) {
      return [
        { id: 'pre-week', label: 'PRE-WEEK', title: 'I/O (Input/Output) - Essential Basics', dayNum: 0 },
        { id: 'day-1', label: 'Day 1', title: 'Data Types & Variables', dayNum: 1 },
        { id: 'day-2', label: 'Day 2', title: 'Operators & Decision Making', dayNum: 2 },
        { id: 'day-3', label: 'Day 3', title: 'Loops & Patterns', dayNum: 3 },
        { id: 'day-4', label: 'Day 4', title: 'Arrays (DSA Foundation)', dayNum: 4 },
        { id: 'day-5', label: 'Day 5', title: 'Functions (Basics)', dayNum: 5 },
      ]
    } else if (weekNum === 2) {
      return [
        { id: 'day-1', label: 'Day 1', title: 'Array Operations — Update, Search, Reverse', dayNum: 1 },
        { id: 'day-2', label: 'Day 2', title: 'Insertion & Deletion with Shifting', dayNum: 2 },
        { id: 'day-3', label: 'Day 3', title: 'Binary Search - The Divide & Conquer Way', dayNum: 3 },
        { id: 'day-4', label: 'Day 4', title: 'Two-Pointer Patterns & Prefix Sum', dayNum: 4 },
        { id: 'day-5', label: 'Day 5', title: 'Comprehensive String Basics', dayNum: 5 },
      ]
    } else if (weekNum === 3) {
      return [
        { id: 'day-1', label: 'Day 1', title: 'String Internals & Advanced Operations', dayNum: 1 },
        { id: 'day-2', label: 'Day 2', title: 'String Algorithms & Logic Patterns', dayNum: 2 },
        { id: 'day-3', label: 'Day 3', title: 'String Implementations & Robust Parsing', dayNum: 3 },
        { id: 'day-4', label: 'Day 4', title: 'Linked Lists – Why & Basic Structure', dayNum: 4 },
        { id: 'day-5', label: 'Day 5', title: 'Linked List Core Operations', dayNum: 5 },
      ]
    } else if (weekNum === 4) {
      return [
        { id: 'day-1', label: 'Day 1', title: 'Linked List Reversal', dayNum: 1 },
        { id: 'day-2', label: 'Day 2', title: 'Cycle Detection', dayNum: 2 },
        { id: 'day-3', label: 'Day 3', title: 'Merge & Sort', dayNum: 3 },
        { id: 'day-4', label: 'Day 4', title: 'Doubly Linked Lists', dayNum: 4 },
        { id: 'day-5', label: 'Day 5', title: 'Complex Problems', dayNum: 5 },
      ]
    } else if (weekNum === 5) {
      return [
        { id: 'day-1', label: 'Day 1', title: 'Stack Fundamentals', dayNum: 1 },
        { id: 'day-2', label: 'Day 2', title: 'Stack Applications', dayNum: 2 },
        { id: 'day-3', label: 'Day 3', title: 'Monotonic Stack', dayNum: 3 },
        { id: 'day-4', label: 'Day 4', title: 'Queue Fundamentals', dayNum: 4 },
        { id: 'day-5', label: 'Day 5', title: 'Queue Applications', dayNum: 5 },
      ]
    } else {
      // Default structure for future weeks (day-1 to day-5)
      return [
        { id: 'day-1', label: 'Day 1', title: `Week ${weekNum} - Day 1`, dayNum: 1 },
        { id: 'day-2', label: 'Day 2', title: `Week ${weekNum} - Day 2`, dayNum: 2 },
        { id: 'day-3', label: 'Day 3', title: `Week ${weekNum} - Day 3`, dayNum: 3 },
        { id: 'day-4', label: 'Day 4', title: `Week ${weekNum} - Day 4`, dayNum: 4 },
        { id: 'day-5', label: 'Day 5', title: `Week ${weekNum} - Day 5`, dayNum: 5 },
      ]
    }
  }, [weekNum])

  // Fetch progress from database on component mount
  useEffect(() => {
    fetchStudentProgress()
    fetchDailyCodingProblems(selectedDay) // Fetch daily problems for current day
    fetchCodingProblems(selectedDay) // Fetch capstone problems for day 5
    checkWeeklyTestEligibility()
    fetchWeeklyProgress() // Check capstone eligibility
    fetchBookmarks()
  }, [])

  // Fetch coding problems when day changes
  useEffect(() => {
    fetchDailyCodingProblems(selectedDay) // Fetch daily problems
    fetchCodingProblems(selectedDay) // Fetch capstone problems
    if (selectedDay.includes('day-5')) {
      fetchWeeklyProgress() // Re-check eligibility on Day 5
    }
  }, [selectedDay])

  // Save bookmarks to backend
  useEffect(() => {
    if (bookmarks.length >= 0) {
      saveBookmarks()
    }
  }, [bookmarks])

  // Fetch bookmarks from backend
  const fetchBookmarks = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error('[Bookmarks] No auth token found')
        return
      }

      const response = await fetch(`${apiBaseUrl}/student-progress/bookmarks/get`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ week: weekNum }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setBookmarks(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error)
    }
  }

  // Save bookmarks to backend
  const saveBookmarks = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error('[Bookmarks] No auth token found')
        return
      }

      await fetch(`${apiBaseUrl}/student-progress/bookmarks/save`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ week: weekNum, bookmarks }),
      })
    } catch (error) {
      console.error('Error saving bookmarks:', error)
    }
  }

  // Fetch student progress from database
  const fetchStudentProgress = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error(`[Week-${weekNum}] No auth token found`)
        return
      }

      const response = await fetch(`${apiBaseUrl}/student-progress/list`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          filter: { week: weekNum },
          projection: {},
          options: {}
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && result.data.length > 0) {
          setDbProgress(result.data[0])
        } else {
          setDbProgress({
            days_completed: [],
            assignments_completed: 0,
            tests_completed: 0,
            progress_percentage: 0,
            status: 'start'
          })
        }
      }
    } catch (error) {
      console.error('Error fetching student progress from database:', error)
    }
  }

  // Fetch daily coding problems for current day
  const fetchDailyCodingProblems = async (dayParam: string) => {
    try {
      // Extract day number from dayParam (e.g., "day-1" -> 1, "pre-week" -> 0)
      const dayMatch = dayParam.match(/day-(\d+)/)
      const dayNum = dayMatch ? parseInt(dayMatch[1]) : 0

      // Only fetch for days 1-5
      if (dayNum < 1 || dayNum > 5) {
        setDailyCodingProblems([])
        return
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error('[fetchDailyCodingProblems] No auth token found')
        setDailyCodingProblems([])
        return
      }

      console.log(`[fetchDailyCodingProblems] Fetching daily problems for Week ${weekNum}, Day ${dayNum}`)
      const response = await fetch(`${apiBaseUrl}/coding-problems/daily/${weekNum}/${dayNum}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[fetchDailyCodingProblems] API response:', result)

        if (result.success && result.problems) {
          console.log(`[fetchDailyCodingProblems] Loaded ${result.problems.length} daily problems`)
          setDailyCodingProblems(result.problems)
        } else {
          console.log('[fetchDailyCodingProblems] No problems found')
          setDailyCodingProblems([])
        }
      } else {
        console.error('[fetchDailyCodingProblems] Response not OK:', response.status)
        setDailyCodingProblems([])
      }
    } catch (error) {
      console.error('Error fetching daily coding problems:', error)
      setDailyCodingProblems([])
    }
  }

  // Fetch weekly coding progress (for capstone eligibility)
  const fetchWeeklyProgress = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) return

      const response = await fetch(`${apiBaseUrl}/coding-problems/progress/${weekNum}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setWeeklyTestEligibility((prev: any) => ({
            ...prev,
            coding_problems: {
              eligible: result.isEligible,
              completedCount: result.completedDailyProblems,
              totalCount: result.totalDailyProblems
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching weekly progress:', error)
    }
  }

  // Fetch coding problems for current week (capstone problems)
  const fetchCodingProblems = async (dayParam: string) => {
    // Only fetch on day-5 where coding problems are displayed
    if (dayParam !== 'day-5') {
      setCodingProblems([])
      return
    }

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error('[fetchCodingProblems] No auth token found')
        setCodingProblems([])
        return
      }

      console.log(`[fetchCodingProblems] Fetching capstone problems for week ${weekNum}`)
      const response = await fetch(`${apiBaseUrl}/coding-problems/week/${weekNum}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[fetchCodingProblems] API response:', result)
        if (result.success && result.problems) {
          console.log(`[fetchCodingProblems] Setting ${result.problems.length} problems for week ${weekNum}`)
          setCodingProblems(result.problems)
        } else {
          console.log('[fetchCodingProblems] No problems in response')
          setCodingProblems([])
        }
      } else {
        const errorText = await response.text()
        console.error('[fetchCodingProblems] API error:', response.status, errorText)
        setCodingProblems([])
      }
    } catch (error) {
      console.error('[fetchCodingProblems] Error fetching coding problems:', error)
      setCodingProblems([])
    }
  }

  // Check weekly test eligibility
  const checkWeeklyTestEligibility = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()

      if (!authHeader) {
        console.error('[WeeklyTestEligibility] No auth token found')
        return
      }

      const response = await fetch(`${apiBaseUrl}/student-progress/check-weekly-test-eligibility`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ week: weekNum }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setWeeklyTestEligibility(data.data)
        }
      }
    } catch (error) {
      console.error('Error checking weekly test eligibility:', error)
    }
  }

  // Handle weekly test button click
  const handleWeeklyTestClick = () => {
    // Check if eligible first
    if (!weeklyTestEligibility?.eligible) {
      // Show requirements if not eligible
      alert('You must complete all requirements before taking the weekly test:\n' +
        '• Score ≥70% on all practice tests\n' +
        (weeklyTestEligibility?.coding_problems && !weeklyTestEligibility.coding_problems.eligible
          ? '• Complete all coding problems'
          : '')
      )
      return
    }

    // Open aptitude weekly test in a new window
    const testUrl = `/student/aptitude/weekly/${weekNum}`
    window.open(testUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
  }

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (!dbProgress) {
      return 0
    }

    if (dbProgress.progress_percentage !== undefined && dbProgress.progress_percentage !== null) {
      return Math.min(Math.round(dbProgress.progress_percentage), 100)
    }

    const totalDays = days.length
    const totalAssignments = totalDays
    const totalTests = 1
    const totalItems = totalDays + totalAssignments + totalTests

    const daysCompleted = dbProgress.days_completed?.length || 0
    const assignmentsCompleted = dbProgress.assignments_completed || 0
    const testsCompleted = dbProgress.tests_completed || 0

    const completedItems = daysCompleted + assignmentsCompleted + testsCompleted
    const progressPercentage = Math.round((completedItems / totalItems) * 100)

    return Math.min(progressPercentage, 100)
  }, [dbProgress, days.length])

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

  const fetchStudyContent = async (day: string) => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

      // Use dynamic endpoint for Week 2+, fallback to week1-content for Week 1
      const endpoint = weekNum === 1
        ? `${apiBaseUrl}/syllabus/week1-content`
        : `${apiBaseUrl}/syllabus/week-content`

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          day,
          week: weekNum
        }),
      })

      if (response.ok) {
        const responseData = await response.json()
        const content = responseData.data || responseData.content
        if (responseData.success && content) {
          const contentText = content.content || ''
          const hasValidContent = contentText.length > 50 && !contentText.includes('will be loaded here')

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
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        setStudyContent(getPlaceholderContent(day))
      }
    } catch (error) {
      console.error('Error fetching study content:', error)
      setStudyContent(getPlaceholderContent(day))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const dayParam = searchParams.get('day') || defaultDay
    setSelectedDay(dayParam)
    const dayIndex = days.findIndex(d => d.id === dayParam)
    setCurrentDayIndex(dayIndex >= 0 ? dayIndex : 0)
    fetchStudyContent(dayParam)

    sessionStartTime.current = Date.now()
    startStudySession(weekNum, dayParam)

    progressUpdateInterval.current = setInterval(() => {
      if (sessionStartTime.current) {
        const timeSpent = Math.floor((Date.now() - sessionStartTime.current) / 1000 / 60)
        const currentProgress = overallProgress

        updateStudyProgress(weekNum, dayParam, timeSpent, currentProgress)
        trackProgress(weekNum, dayParam, 'study-session-update', {
          timeSpent,
          progress: currentProgress
        })
      }
    }, 30000)

    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current)
      }
    }
  }, [searchParams, weekNum, overallProgress, defaultDay, days])

  const markDayComplete = async (dayId: string) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const response = await fetch(`${apiBaseUrl}/student-progress/complete-day`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week: weekNum,
          day: dayId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save progress to database')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setDbProgress(result.data)
        setTimeout(() => {
          fetchStudentProgress()
        }, 1000)

        trackProgress(weekNum, dayId, 'day-completed', {
          day: dayId,
          completed: true,
          progressData: result.data,
          timestamp: new Date()
        })
      } else {
        await fetchStudentProgress()
      }
    } catch (error) {
      console.error('Error saving progress to database:', error)
      await fetchStudentProgress()
    }
  }

  const toggleBookmark = (day: string, section: string) => {
    setBookmarks(prev => {
      const existing = prev.find(b => b.day === day && b.section === section)
      if (existing) {
        return prev.filter(b => !(b.day === day && b.section === section))
      } else {
        return [...prev, { day, section, timestamp: new Date().toISOString() }]
      }
    })
  }

  const isBookmarked = (day: string, section: string) => {
    return bookmarks.some(b => b.day === day && b.section === section)
  }

  const navigateToDay = (dayId: string) => {
    router.push(`/student/study/${weekNum}?day=${dayId}`)
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

  // Enhanced content renderer (same as Week 1)
  const renderContent = (content: string) => {
    if (!content) return null

    const lines = content.split('\n')
    const elements: JSX.Element[] = []
    let currentCodeBlock: string[] = []
    let inCodeBlock = false
    let codeLanguage = ''
    let sectionId = ''
    let currentTable: string[] = []
    let inTable = false
    let tableTitle: string | null = null
    let previousLine: string = ''

    lines.forEach((line, index) => {
      // Detect code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          const code = currentCodeBlock.join('\n')
          elements.push(
            <CodeBlock
              key={`code-${index}`}
              code={code}
              language={codeLanguage}
              onCopy={() => {
                navigator.clipboard.writeText(code)
                setCopiedCode(`code-${index}`)
                setTimeout(() => setCopiedCode(null), 2000)
              }}
              isCopied={copiedCode === `code-${index}`}
            />
          )
          currentCodeBlock = []
          inCodeBlock = false
          codeLanguage = ''
        } else {
          codeLanguage = line.replace('```', '').trim() || 'text'
          inCodeBlock = true
        }
        return
      }

      if (inCodeBlock) {
        currentCodeBlock.push(line)
        return
      }

      // Headers
      if (line.startsWith('# ')) {
        sectionId = line.replace('# ', '').trim().toLowerCase().replace(/\s+/g, '-')
        elements.push(
          <h1 key={`h1-${index}`} id={sectionId} className="text-3xl font-bold text-neutral mt-8 mb-4 scroll-mt-20">
            {line.replace('# ', '')}
          </h1>
        )
        previousLine = line
        return
      }
      if (line.startsWith('## ')) {
        sectionId = line.replace('## ', '').trim().toLowerCase().replace(/\s+/g, '-')
        elements.push(
          <h2 key={`h2-${index}`} id={sectionId} className="text-2xl font-bold text-neutral mt-6 mb-3 scroll-mt-20 border-b border-neutral-light/20 pb-2">
            {line.replace('## ', '')}
          </h2>
        )
        previousLine = line
        return
      }
      if (line.startsWith('### ')) {
        sectionId = line.replace('### ', '').trim().toLowerCase().replace(/\s+/g, '-')
        elements.push(
          <h3 key={`h3-${index}`} id={sectionId} className="text-xl font-semibold text-neutral mt-5 mb-2 scroll-mt-20">
            {line.replace('### ', '')}
          </h3>
        )
        previousLine = line
        return
      }

      // Bold text
      if (line.includes('**')) {
        const parts = line.split('**')
        const bolded = parts.map((part, i) =>
          i % 2 === 1 ? <strong key={i} className="font-bold text-neutral">{part}</strong> : part
        )
        elements.push(
          <div key={`p-${index}`} className="text-base text-neutral-light mb-4 leading-relaxed">
            {bolded}
          </div>
        )
        previousLine = line
        return
      }

      // Tables - detect markdown table format
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        const isSeparator = /^\|[\s]*:?[\s\-]+:?[\s]*\|/.test(trimmedLine) ||
          /^\|[\s\-:]+\|$/.test(trimmedLine.replace(/\s/g, '')) ||
          (trimmedLine.match(/\|/g) || []).length >= 2 &&
          /^[\s|:\-]+$/.test(trimmedLine.replace(/\s/g, ''))

        if (!inTable && !isSeparator) {
          inTable = true
          currentTable = [line]
          const prevTrimmed = previousLine.trim()
          if (prevTrimmed.startsWith('## ') || prevTrimmed.startsWith('### ')) {
            tableTitle = prevTrimmed.replace(/^##+\s*/, '').trim()
          }
        } else if (inTable) {
          if (!isSeparator) {
            currentTable.push(line)
          }
        }
        previousLine = line
        return
      } else if (inTable) {
        if (currentTable.length > 0) {
          const tableRows = currentTable.filter(row => {
            const trimmed = row.trim()
            if (!trimmed) return false
            const isSeparator = /^\|[\s]*:?[\s\-]+:?[\s]*\|/.test(trimmed) ||
              /^\|[\s\-:]+\|$/.test(trimmed.replace(/\s/g, '')) ||
              (trimmed.match(/\|/g) || []).length >= 2 &&
              /^[\s|:\-]+$/.test(trimmed.replace(/\s/g, ''))
            return !isSeparator
          })

          if (tableRows.length > 0) {
            const headerRow = tableRows[0]
            const headers = headerRow
              .split('|')
              .map(cell => cell.trim())
              .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1 && cell.length > 0)

            const rows = tableRows.slice(1).map(row => {
              const cells = row
                .split('|')
                .map(cell => cell.trim())
                .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1)
              while (cells.length < headers.length) {
                cells.push('')
              }
              return cells.slice(0, headers.length)
            })

            const tableElement = (
              <div key={`table-${index}`} className="my-6">
                {tableTitle && (
                  <h4 className="text-lg font-semibold text-neutral mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {tableTitle}
                  </h4>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-background-surface rounded-lg overflow-hidden shadow-sm border border-neutral-light/20">
                    <thead>
                      <tr className="bg-primary/10 border-b-2 border-primary/20">
                        {headers.map((header, hIdx) => (
                          <th
                            key={hIdx}
                            className="px-4 py-3 text-left text-sm font-bold text-neutral border-r border-neutral-light/20 last:border-r-0 whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={`border-b border-neutral-light/10 hover:bg-background-elevated transition-colors ${rIdx % 2 === 0 ? 'bg-background-surface' : 'bg-background-elevated/30'
                            }`}
                        >
                          {row.map((cell, cIdx) => {
                            const renderCellContent = () => {
                              if (cell.includes('`')) {
                                const parts: (string | JSX.Element)[] = []
                                const regex = /`([^`]+)`/g
                                let lastIndex = 0
                                let match: RegExpExecArray | null

                                while ((match = regex.exec(cell)) !== null) {
                                  if (match.index > lastIndex) {
                                    parts.push(cell.substring(lastIndex, match.index))
                                  }
                                  parts.push(
                                    <code key={match.index} className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 mx-0.5">
                                      {match[1]}
                                    </code>
                                  )
                                  lastIndex = regex.lastIndex
                                }
                                if (lastIndex < cell.length) {
                                  parts.push(cell.substring(lastIndex))
                                }
                                return <span>{parts}</span>
                              }
                              if (cell.includes('✓') || cell.includes('✗')) {
                                const parts: (string | JSX.Element)[] = []
                                let text = cell
                                let lastIndex = 0
                                const regex = /(✓|✗)/g
                                let match: RegExpExecArray | null

                                while ((match = regex.exec(cell)) !== null) {
                                  if (match.index > lastIndex) {
                                    parts.push(text.substring(lastIndex, match.index))
                                  }
                                  if (match[1] === '✓') {
                                    parts.push(
                                      <span key={match.index} className="text-green-500 font-bold">✓</span>
                                    )
                                  } else if (match[1] === '✗') {
                                    parts.push(
                                      <span key={match.index} className="text-red-500 font-bold">✗</span>
                                    )
                                  }
                                  lastIndex = regex.lastIndex
                                }
                                if (lastIndex < text.length) {
                                  parts.push(text.substring(lastIndex))
                                }
                                return <span>{parts.length > 0 ? parts : cell}</span>
                              }
                              return <span>{cell}</span>
                            }

                            return (
                              <td
                                key={cIdx}
                                className="px-4 py-3 text-sm text-neutral-light border-r border-neutral-light/20 last:border-r-0 align-top"
                              >
                                <div className="min-w-[120px]">
                                  {renderCellContent()}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
            elements.push(tableElement)
          }
          currentTable = []
          inTable = false
          tableTitle = null
        }
        previousLine = line
      }

      // Lists
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('✅ ')) {
        elements.push(
          <li key={`li-${index}`} className="text-base text-neutral-light mb-2 ml-6 list-disc">
            {line.replace(/^[-*✅]\s*/, '')}
          </li>
        )
        previousLine = line
        return
      }

      // Regular paragraphs
      if (line.trim()) {
        elements.push(
          <div key={`p-${index}`} className="text-base text-neutral-light mb-4 leading-relaxed">
            {line}
          </div>
        )
      } else {
        elements.push(<br key={`br-${index}`} />)
      }

      previousLine = line
    })

    // Render any remaining table
    if (inTable && currentTable.length > 0) {
      const tableRows = currentTable.filter(row => {
        const trimmed = row.trim()
        if (!trimmed) return false
        const isSeparator = /^\|[\s]*:?[\s\-]+:?[\s]*\|/.test(trimmed) ||
          /^\|[\s\-:]+\|$/.test(trimmed.replace(/\s/g, '')) ||
          (trimmed.match(/\|/g) || []).length >= 2 &&
          /^[\s|:\-]+$/.test(trimmed.replace(/\s/g, ''))
        return !isSeparator
      })

      if (tableRows.length > 0) {
        const headerRow = tableRows[0]
        const headers = headerRow
          .split('|')
          .map(cell => cell.trim())
          .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1 && cell.length > 0)

        const rows = tableRows.slice(1).map(row => {
          const cells = row
            .split('|')
            .map(cell => cell.trim())
            .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1)
          while (cells.length < headers.length) {
            cells.push('')
          }
          return cells.slice(0, headers.length)
        })

        const tableElement = (
          <div key="table-final" className="my-6">
            {tableTitle && (
              <h4 className="text-lg font-semibold text-neutral mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {tableTitle}
              </h4>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-background-surface rounded-lg overflow-hidden shadow-sm border border-neutral-light/20">
                <thead>
                  <tr className="bg-primary/10 border-b-2 border-primary/20">
                    {headers.map((header, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-4 py-3 text-left text-sm font-bold text-neutral border-r border-neutral-light/20 last:border-r-0 whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`border-b border-neutral-light/10 hover:bg-background-elevated transition-colors ${rIdx % 2 === 0 ? 'bg-background-surface' : 'bg-background-elevated/30'
                        }`}
                    >
                      {row.map((cell, cIdx) => {
                        const renderCellContent = () => {
                          if (cell.includes('`')) {
                            const parts: (string | JSX.Element)[] = []
                            const regex = /`([^`]+)`/g
                            let lastIndex = 0
                            let match: RegExpExecArray | null

                            while ((match = regex.exec(cell)) !== null) {
                              if (match.index > lastIndex) {
                                parts.push(cell.substring(lastIndex, match.index))
                              }
                              parts.push(
                                <code key={match.index} className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 mx-0.5">
                                  {match[1]}
                                </code>
                              )
                              lastIndex = regex.lastIndex
                            }
                            if (lastIndex < cell.length) {
                              parts.push(cell.substring(lastIndex))
                            }
                            return <span>{parts}</span>
                          }
                          if (cell.includes('✓') || cell.includes('✗')) {
                            const parts: (string | JSX.Element)[] = []
                            let text = cell
                            let lastIndex = 0
                            const regex = /(✓|✗)/g
                            let match: RegExpExecArray | null

                            while ((match = regex.exec(cell)) !== null) {
                              if (match.index > lastIndex) {
                                const beforeText = text.substring(lastIndex, match.index).trim()
                                if (beforeText) {
                                  parts.push(beforeText + ' ')
                                }
                              }
                              if (match[1] === '✓') {
                                parts.push(
                                  <span key={match.index} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-600 font-bold text-sm mx-1">
                                    ✓
                                  </span>
                                )
                              } else if (match[1] === '✗') {
                                parts.push(
                                  <span key={match.index} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-600 font-bold text-sm mx-1">
                                    ✗
                                  </span>
                                )
                              }
                              lastIndex = regex.lastIndex
                            }
                            if (lastIndex < text.length) {
                              const remainingText = text.substring(lastIndex).trim()
                              if (remainingText) {
                                parts.push(' ' + remainingText)
                              }
                            }
                            return <span className="flex items-center gap-1 flex-wrap">{parts.length > 0 ? parts : cell}</span>
                          }
                          return <span>{cell}</span>
                        }

                        return (
                          <td
                            key={cIdx}
                            className="px-4 py-3 text-sm text-neutral-light border-r border-neutral-light/20 last:border-r-0 align-top"
                          >
                            <div className="min-w-[120px] break-words">
                              {renderCellContent()}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
        elements.push(tableElement)
        tableTitle = null
      }
    }

    return <div className="space-y-2">{elements}</div>
  }

  const currentDay = days[currentDayIndex]
  const isDayCompleted = dbProgress?.days_completed?.includes(selectedDay) || false

  return (
    <StudentLayout>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar Navigation */}
          <div className={cn(
            'bg-background-surface border-r border-neutral-light/20 transition-all duration-300 overflow-y-auto',
            sidebarOpen ? 'w-64' : 'w-0 hidden'
          )}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-neutral">Week {weekNum} - DSA</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded hover:bg-background-elevated"
                >
                  <X className="w-5 h-5 text-neutral-light" />
                </button>
              </div>

              <button
                onClick={() => router.push(weekNum === 1 ? '/student/study/week-1-select' : `/student/study/week-${weekNum}-select`)}
                className="w-full flex items-center gap-2 px-3 py-2 mb-4 rounded-lg hover:bg-background-elevated text-neutral-light transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>

              <div className="space-y-1">
                {days.map((day, idx) => {
                  const isCompleted = dbProgress?.days_completed?.includes(day.id) || false
                  const isActive = selectedDay === day.id

                  return (
                    <button
                      key={day.id}
                      onClick={() => navigateToDay(day.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${isActive
                        ? 'bg-primary text-white'
                        : 'bg-background-elevated text-neutral hover:bg-primary/10'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{day.label}</div>
                          <div className="text-xs opacity-80">{day.title}</div>
                        </div>
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>


              {/* Capstone Coding Challenges - Only show on day-5 */}
              {selectedDay === 'day-5' && (
                <div className="mt-6 pt-6 border-t border-neutral-light/20">
                  <h3 className="text-sm font-semibold text-neutral mb-2">Weekly Capstone Project</h3>
                  <div
                    className={`w-full text-left p-3 rounded-lg transition-all ${weeklyTestEligibility?.coding_problems?.eligible
                      ? 'bg-primary/10 border-2 border-primary/30 cursor-pointer hover:bg-primary/20'
                      : 'bg-neutral-light/10 border-2 border-neutral-light/20 opacity-60'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className={`w-4 h-4 ${weeklyTestEligibility?.coding_problems?.eligible ? 'text-primary' : 'text-neutral-light'}`} />
                          <div className="font-semibold text-sm">Capstone Projects</div>
                        </div>
                        <div className="text-xs opacity-80">
                          {weeklyTestEligibility?.coding_problems?.eligible
                            ? `${codingProblems.length} projects available`
                            : `${weeklyTestEligibility?.coding_problems?.completedCount || 0}/${weeklyTestEligibility?.coding_problems?.totalCount || 30} daily completed`
                          }
                        </div>
                      </div>
                      {weeklyTestEligibility?.coding_problems?.eligible ? (
                        <Play className="w-4 h-4 text-primary flex-shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-neutral-light flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {bookmarks.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-neutral mb-2">Bookmarks</h3>
                  <div className="space-y-1">
                    {bookmarks.slice(0, 5).map((bookmark, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigateToDay(bookmark.day)}
                        className="w-full text-left p-2 rounded text-xs text-neutral-light hover:bg-background-elevated"
                      >
                        {bookmark.section}
                      </button>
                    ))}
                  </div>
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-neutral-light">Loading content...</p>
                </Card>
              ) : studyContent ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-end gap-2 mb-6">
                    <button
                      onClick={() => toggleBookmark(selectedDay, studyContent?.title || '')}
                      className={`p-2 rounded-lg transition-all ${isBookmarked(selectedDay, studyContent?.title || '')
                        ? 'bg-primary/20 text-primary'
                        : 'bg-background-elevated text-neutral-light hover:bg-primary/10'
                        }`}
                    >
                      {isBookmarked(selectedDay, studyContent?.title || '') ? (
                        <BookmarkCheck className="w-5 h-5" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                    </button>
                    {!isDayCompleted && (
                      <button
                        onClick={() => markDayComplete(selectedDay)}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Complete
                      </button>
                    )}
                    {isDayCompleted && (
                      <div className="px-4 py-2 bg-green-500/20 text-green-600 rounded-lg text-sm font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="mb-8">
                      <h1 className="text-4xl font-bold text-neutral mb-2">
                        {studyContent.title || currentDay.title}
                      </h1>
                      <p className="text-lg text-neutral-light">
                        {studyContent.day || currentDay.label}
                      </p>
                    </div>

                    {studyContent.learning_outcomes && studyContent.learning_outcomes.length > 0 && (
                      <Card className="bg-primary/5 border-primary/20">
                        <div className="p-6">
                          <h2 className="text-xl font-bold text-neutral mb-4 flex items-center gap-2">
                            <Target className="w-6 h-6 text-primary" />
                            Learning Outcomes
                          </h2>
                          <ul className="space-y-2">
                            {studyContent.learning_outcomes.map((outcome: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-3 text-base text-neutral">
                                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <span>{outcome}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </Card>
                    )}

                    {studyContent?.content ? (
                      <Card className="border-2 border-neutral-light/10">
                        <div className="p-6">
                          {renderContent(studyContent.content)}
                        </div>
                      </Card>
                    ) : (
                      <Card className="border-2 border-neutral-light/10">
                        <div className="p-6 text-center text-neutral-light">
                          <p>Loading content...</p>
                        </div>
                      </Card>
                    )}

                    {studyContent.topics && studyContent.topics.length > 0 && (
                      <Card>
                        <div className="p-6">
                          <h2 className="text-xl font-bold text-neutral mb-4 flex items-center gap-2">
                            <FileText className="w-6 h-6 text-secondary" />
                            Topics Covered
                          </h2>
                          <div className="flex flex-wrap gap-2">
                            {studyContent.topics.map((topic: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-sm">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Daily Coding Problems Section */}
                    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 rounded-lg bg-primary/20">
                                <Code className="w-5 h-5 text-primary" />
                              </div>
                              <h2 className="font-bold text-lg text-neutral">
                                Daily Coding Problems
                              </h2>
                            </div>
                            <p className="text-sm text-neutral-light">
                              Practice problems for {currentDay.title}
                            </p>
                          </div>
                        </div>
                        {/* Daily coding problems list */}
                        {dailyCodingProblems.length > 0 ? (
                          <div className="space-y-3">
                            {dailyCodingProblems.map((problem: any, index: number) => (
                              <button
                                key={problem.question_id}
                                onClick={() => router.push(`/student/coding-problem/${problem.question_id}`)}
                                className="w-full text-left p-4 rounded-lg transition-all bg-white hover:bg-primary/5 border-2 border-neutral-light/20 hover:border-primary/40 cursor-pointer group"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-neutral-light font-medium text-xs">#{index + 1}</span>
                                      <div className="font-semibold text-base text-neutral group-hover:text-primary transition-colors">
                                        {problem.title}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-neutral-light">
                                      <span className={`px-2 py-0.5 rounded ${problem.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                        problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-red-100 text-red-700'
                                        }`}>
                                        {problem.difficulty}
                                      </span>
                                      <span>⏱️ {problem.estimated_time_minutes} min</span>
                                      {problem.concepts_tested && problem.concepts_tested.length > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Code className="w-3 h-3" />
                                          {problem.concepts_tested.slice(0, 2).join(', ')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Play className="w-5 h-5 text-primary flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-neutral-light text-center py-8 bg-neutral-light/5 rounded-lg">
                            <Code className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>No daily coding problems available for this day</p>
                          </div>
                        )}
                      </div>
                    </Card>

                    {selectedDay === days[days.length - 1].id && (
                      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 mt-6">
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-primary/20">
                                  <Trophy className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                  <h2 className="text-xl font-bold text-neutral mb-1">
                                    Weekly Capstone Project
                                  </h2>
                                  <p className="text-sm text-neutral-light">
                                    Apply your knowledge with these hands-on projects
                                  </p>
                                </div>
                              </div>
                            </div>
                            <Badge variant={weeklyTestEligibility?.coding_problems?.eligible ? "success" : "secondary"} className="text-sm px-3 py-1">
                              {weeklyTestEligibility?.coding_problems?.eligible ? (
                                <span className="flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Unlocked
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Locked
                                </span>
                              )}
                            </Badge>
                          </div>

                          {weeklyTestEligibility?.coding_problems?.eligible ? (
                            <div className="space-y-4">
                              {/* Capstone Problems List */}
                              {codingProblems.length > 0 ? (
                                codingProblems.map((problem: any, index: number) => (
                                  <div
                                    key={problem.question_id}
                                    className="bg-white rounded-lg border border-neutral-light/20 p-4 hover:border-primary/50 transition-all group cursor-pointer"
                                    onClick={() => router.push(`/student/coding-problem/${problem.question_id}`)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h3 className="font-semibold text-neutral mb-1 group-hover:text-primary transition-colors">
                                          {problem.title}
                                        </h3>
                                        <div className="flex items-center gap-3 text-xs text-neutral-light">
                                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                            Capstone
                                          </span>
                                          <span className={`px-2 py-0.5 rounded ${problem.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                            problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-red-100 text-red-700'
                                            }`}>
                                            {problem.difficulty}
                                          </span>
                                          <span>⏱️ {problem.estimated_time_minutes} min</span>
                                        </div>
                                      </div>
                                      <Play className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-6 text-neutral-light">
                                  No capstone projects available yet.
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-neutral-light/5 rounded-lg p-6 text-center border-2 border-dashed border-neutral-light/20">
                              <Lock className="w-8 h-8 text-neutral-light mx-auto mb-3 opacity-50" />
                              <h3 className="font-semibold text-neutral mb-2">Capstone Locked</h3>
                              <p className="text-sm text-neutral-light mb-4">
                                Complete all daily coding problems to unlock the Weekly Capstone Project.
                              </p>
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-background-elevated rounded-full text-sm font-medium text-neutral">
                                <span className={weeklyTestEligibility?.coding_problems?.completedCount === weeklyTestEligibility?.coding_problems?.totalCount ? "text-green-600" : "text-primary"}>
                                  {weeklyTestEligibility?.coding_problems?.completedCount || 0}
                                </span>
                                <span className="text-neutral-light">/</span>
                                <span>{weeklyTestEligibility?.coding_problems?.totalCount || 30} Completed</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <FileText className="w-16 h-16 text-neutral-light mx-auto mb-4" />
                  <p className="text-neutral-light">Content not available.</p>
                </Card>
              )}
            </div>

            {/* Navigation Footer */}
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
                      : 'bg-primary text-white hover:bg-primary-dark'
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

// Code Block Component
function CodeBlock({ code, language, onCopy, isCopied }: { code: string; language: string; onCopy: () => void; isCopied: boolean }) {
  return (
    <div className="relative my-6 rounded-lg overflow-hidden border border-neutral-light/20 bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-light/10 border-b border-neutral-light/20">
        <span className="text-xs text-neutral-light font-mono">{language || 'code'}</span>
        <button
          onClick={onCopy}
          className="flex items-center gap-2 px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded text-xs transition-all"
        >
          {isCopied ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-[#d4d4d4] font-mono leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  )
}

export default function Week1StudyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>}>
      <Week1StudyContent />
    </Suspense>
  )
}

