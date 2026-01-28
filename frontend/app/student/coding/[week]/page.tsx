'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CodeEditor } from '@/components/ui/CodeEditor'
import { CodeReview } from '@/components/ai/CodeReview'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'
import {
  ArrowLeft,
  Code2,
  Lightbulb,
  Target,
  ChevronRight,
  Terminal,
  FileCode,
  Layout,
  List,
  Sparkles
} from 'lucide-react'

// Types
interface CodingProblem {
  problem_id: string
  day: string
  title: string
  description: string
  problem_type: 'real_life' | 'learning'
  difficulty: 'easy' | 'intermediate' | 'difficult'
  language: 'javascript' | 'c' | 'cpp' | 'python'
  code_template?: string
  code_templates?: {
    javascript?: string
    c?: string
    cpp?: string
    python?: string
  }
  test_cases: Array<{
    input: string
    expectedOutput: string
    description?: string
  }>
  explanation: string
}

// Day Configuration
const DAYS = [
  { id: 'pre-week', label: 'Pre-Week', title: 'I/O & Basics', description: 'Input/Output operations and basic syntax' },
  { id: 'day-1', label: 'Day 1', title: 'Concepts', description: 'Core concepts and basic operations' },
  { id: 'day-2', label: 'Day 2', title: 'Logic', description: 'Conditional logic and decision making' },
  { id: 'day-3', label: 'Day 3', title: 'Structures', description: 'Data structures and patterns' },
  { id: 'day-4', label: 'Day 4', title: 'Algorithms', description: 'Algorithmic thinking and loops' },
  { id: 'day-5', label: 'Day 5', title: 'Advanced', description: 'Complex problems and optimization' },
]

function CodingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const { toast, showToast, hideToast } = useToast()

  // URL State
  const currentDay = searchParams.get('day')

  // Parse Week
  // params.week is likely 'week-1', 'week-2', etc.
  const weekParam = params.week as string;
  const weekNum = weekParam ? weekParam.replace('week-', '') : '1';
  const weekLabel = `Week ${weekNum}`;

  // Data State
  const [problems, setProblems] = useState<CodingProblem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null)

  // Editor State
  const [code, setCode] = useState('')
  const [activeTab, setActiveTab] = useState<'editor' | 'review'>('editor')
  const [language, setLanguage] = useState<'javascript' | 'c' | 'cpp' | 'python'>('javascript')

  // Fetch Problems
  useEffect(() => {
    if (!currentDay) return

    const fetchProblems = async () => {
      setLoading(true)
      try {
        const apiBaseUrl = getApiBaseUrl()
        const authHeader = getAuthHeader()

        const res = await fetch(`${apiBaseUrl}/questions/coding`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader || ''
          },
          body: JSON.stringify({
            day: currentDay,
            week: weekNum // Pass the week number
          })
        })

        const data = await res.json()
        if (data.success && data.data?.problems) {
          setProblems(data.data.problems)
          // Auto-select first problem if none selected
          if (data.data.problems.length > 0 && !selectedProblem) {
            handleSelectProblem(data.data.problems[0])
          }
        } else {
          showToast(data.message || 'Failed to fetch problems', 'error')
        }
      } catch (error) {
        console.error('Fetch error:', error)
        showToast('Failed to load problems', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchProblems()
  }, [currentDay, weekNum])

  // Handlers
  const handleSelectProblem = (problem: CodingProblem) => {
    setSelectedProblem(problem)
    // Set code template based on language
    const initialCode = problem.code_templates?.javascript || problem.code_template || '// Write your code here'
    setCode(initialCode)
    setLanguage('javascript') // Reset to JS on new problem
    setActiveTab('editor')
  }

  const handleLanguageChange = (lang: 'javascript' | 'c' | 'cpp' | 'python') => {
    if (!selectedProblem) return
    setLanguage(lang)
    // Update code to template for this language if available
    const template = selectedProblem.code_templates?.[lang]
    if (template) {
      setCode(template)
    }
  }

  // Render: Day Selection Dashboard
  if (!currentDay) {
    return (
      <StudentLayout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <button onClick={() => router.push('/student/dashboard')} className="flex items-center text-sm text-neutral-light hover:text-primary mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Code2 className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-heading font-bold text-neutral">DSA Practice - {weekLabel}</h1>
            </div>
            <p className="text-neutral-light ml-14">Master Data Structures and Algorithms week by week.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DAYS.map((day) => (
              <Card
                key={day.id}
                className="p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-transparent hover:border-primary/20 group relative overflow-hidden"
                onClick={() => router.push(`/student/coding/${weekParam}?day=${day.id}`)}
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Code2 className="w-24 h-24 transform rotate-12" />
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="secondary" className="bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {day.label}
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral mb-2 group-hover:text-primary transition-colors">{day.title}</h3>
                  <p className="text-sm text-gray-500">{day.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </StudentLayout>
    )
  }

  // Render: Problem Solving View
  return (
    <StudentLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
        {/* Header Bar */}
        <div className="h-14 px-4 sticky top-0 z-20 bg-white border-b flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/student/coding')}
              className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-full transition-colors"
              title="Back to Roadmap"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="h-6 w-[1px] bg-gray-200"></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {weekLabel} / {DAYS.find(d => d.id === currentDay)?.label}
                </span>
                <span className="text-gray-300">/</span>
                <h1 className="text-sm font-bold text-gray-900 truncate max-w-[200px] md:max-w-md">
                  {selectedProblem?.title || 'Select a Problem'}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Problem List */}
          <div className="w-72 bg-white border-r flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <List className="w-3.5 h-3.5" />
                Problem List
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading && (
                <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                  <div className="animate-pulse">Loading problems...</div>
                </div>
              )}
              {problems.length === 0 && !loading && (
                <div className="flex items-center justify-center py-8 text-gray-400 text-sm italic">
                  No problems found for this day.
                </div>
              )}
              {problems.map(problem => (
                <div
                  key={problem.problem_id}
                  onClick={() => handleSelectProblem(problem)}
                  className={`group px-3 py-2.5 rounded-md cursor-pointer transition-all border-l-2 ${selectedProblem?.problem_id === problem.problem_id
                    ? 'bg-blue-50 border-primary text-blue-700'
                    : 'hover:bg-gray-50 border-transparent hover:border-gray-300 text-gray-600'
                    }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm font-medium ${selectedProblem?.problem_id === problem.problem_id ? 'text-blue-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                      {problem.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${problem.difficulty && problem.difficulty.toLowerCase() === 'easy' ? 'bg-green-400' :
                      problem.difficulty && problem.difficulty.toLowerCase() === 'intermediate' ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></span>
                    <span className="text-[10px] text-gray-400 uppercase">{problem.difficulty || 'Easy'}</span>
                    {problem.problem_type === 'real_life' && (
                      <Target className="w-3 h-3 text-blue-400 ml-auto" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle: Description */}
          <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
              {selectedProblem ? (
                <div className="max-w-3xl mx-auto space-y-8 pb-10">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                        {selectedProblem.title}
                      </h2>
                      <Badge variant={(selectedProblem.difficulty && selectedProblem.difficulty.toLowerCase() === 'easy') ? 'success' : (selectedProblem.difficulty && selectedProblem.difficulty.toLowerCase() === 'intermediate') ? 'warning' : 'error'} className="uppercase text-[10px]">
                        {selectedProblem.difficulty || 'Easy'}
                      </Badge>
                    </div>

                    <div className="prose prose-sm md:prose-base max-w-none text-gray-600 leading-relaxed">
                      <p>{selectedProblem.description}</p>
                    </div>
                  </div>

                  {selectedProblem.explanation && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 p-5 rounded-xl">
                      <div className="flex gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                          <Lightbulb className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-blue-900 text-sm mb-1">Learning Goal</h4>
                          <p className="text-sm text-blue-800/90 leading-relaxed">{selectedProblem.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <Terminal className="w-4 h-4 text-gray-500" />
                      Test Scenarios
                    </h3>
                    <div className="grid gap-4">
                      {selectedProblem.test_cases?.map((test, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                          {test.description && (
                            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                              <p className="text-xs text-gray-500 font-medium">{test.description}</p>
                            </div>
                          )}
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Input</span>
                              <div className="font-mono text-sm bg-white p-2 rounded border border-gray-200 text-gray-700">
                                {test.input}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Expected Output</span>
                              <div className="font-mono text-sm bg-green-50/50 p-2 rounded border border-green-100 text-green-800">
                                {test.expectedOutput}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Layout className="w-12 h-12 mb-4 opacity-20" />
                  <p>Select a problem from the list to start solving</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Editor */}
          <div className="w-[45%] flex flex-col bg-[#1e1e1e] border-l border-gray-800 shadow-xl">
            {/* Tab Bar */}
            <div className="flex items-center bg-[#252526] border-b border-[#333]">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-t-2 transition-colors ${activeTab === 'editor'
                  ? 'bg-[#1e1e1e] text-white border-blue-500'
                  : 'bg-[#2d2d2d] text-gray-400 border-transparent hover:bg-[#2a2a2a] hover:text-gray-300'
                  }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Code Editor
              </button>
              <button
                onClick={() => setActiveTab('review')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-t-2 transition-colors ${activeTab === 'review'
                  ? 'bg-[#1e1e1e] text-blue-400 border-blue-500'
                  : 'bg-[#2d2d2d] text-gray-400 border-transparent hover:bg-[#2a2a2a] hover:text-gray-300'
                  }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Coach
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 relative overflow-hidden">
              {activeTab === 'editor' ? (
                <CodeEditor
                  value={code}
                  language={language}
                  onChange={setCode}
                  onLanguageChange={handleLanguageChange}
                  testCases={selectedProblem?.test_cases}
                  problemId={selectedProblem?.problem_id}
                />
              ) : (
                <div className="h-full overflow-y-auto bg-gray-50/10 custom-scrollbar">
                  <div className="p-4">
                    <CodeReview
                      code={code}
                      language={language}
                      problemId={selectedProblem?.problem_id}
                      problemDescription={selectedProblem?.description}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </StudentLayout>
  )
}

export default function CodingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>}>
      <CodingContent />
    </Suspense>
  )
}
