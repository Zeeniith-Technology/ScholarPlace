'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { CodeEditor } from '@/components/ui/CodeEditor'
import { CodeReview } from '@/components/ai/CodeReview'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'
import {
  ArrowLeft, Code2, Zap, Target, Trophy, CheckCircle2,
  ChevronDown, ChevronRight, Lightbulb, Terminal, FileCode,
  Sparkles, Lock, Star, TrendingUp, Clock
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface TieredProblem {
  problem_id: string
  title: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  topic: string
  problem_statement: string
  input_format: string
  output_format: string
  constraints: string[]
  test_cases: Array<{ input: string; expected_output: string; explanation?: string }>
  hints: string[]
  concepts_tested: string[]
  estimated_time_minutes: number
  function_signature: string
  status: 'passed' | 'pending'
}

interface TieredData {
  week: number
  day: string
  easy: TieredProblem[]
  medium: TieredProblem[]
  hard: TieredProblem[]
  total: number
  daily_goal: number
  solved_today: number
  goal_achieved: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFF_CONFIG = {
  EASY:   { label: 'Easy',   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-400', icon: <Zap className="w-3.5 h-3.5" />, time: 10 },
  MEDIUM: { label: 'Medium', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-400',   icon: <Target className="w-3.5 h-3.5" />, time: 20 },
  HARD:   { label: 'Hard',   color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-400',     icon: <Trophy className="w-3.5 h-3.5" />, time: 30 },
}

const DAYS: Record<string, string> = {
  'pre-week': 'Pre-Week', 'day-1': 'Day 1', 'day-2': 'Day 2',
  'day-3': 'Day 3', 'day-4': 'Day 4', 'day-5': 'Day 5'
}

// ─── Main Component ───────────────────────────────────────────────────────────
function TieredCodingContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast, showToast, hideToast } = useToast()

  const weekParam = params.week as string
  const weekNum = weekParam?.replace('week-', '') || '1'
  const currentDay = searchParams.get('day') || 'day-1'

  // Data state
  const [tieredData, setTieredData] = useState<TieredData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState<'EASY' | 'MEDIUM' | 'HARD' | null>('EASY')
  const [selectedProblem, setSelectedProblem] = useState<TieredProblem | null>(null)

  // Editor state
  const [code, setCode] = useState('// Write your complete program here\n')
  const [language, setLanguage] = useState<'javascript' | 'c' | 'cpp' | 'python'>('cpp')
  const [activeTab, setActiveTab] = useState<'editor' | 'review'>('editor')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHint, setShowHint] = useState(false)

  // ─── Fetch tiered problems ──────────────────────────────────────────────────
  const fetchProblems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/coding-problems/tiered/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': getAuthHeader() || '' },
        body: JSON.stringify({ week: parseInt(weekNum), day: currentDay })
      })
      const data = await res.json()
      if (data.success && data.data) {
        setTieredData(data.data)
        // Auto-select first pending easy problem
        const first = data.data.easy.find((p: TieredProblem) => p.status === 'pending') || data.data.easy[0]
        if (first) selectProblem(first)
      } else {
        showToast(data.message || 'Failed to load problems', 'error')
      }
    } catch {
      showToast('Network error loading problems', 'error')
    } finally {
      setLoading(false)
    }
  }, [weekNum, currentDay])

  useEffect(() => { fetchProblems() }, [fetchProblems])

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const selectProblem = (p: TieredProblem) => {
    setSelectedProblem(p)
    setCode('// Write your complete program here\n// Read input from stdin, print output to stdout\n\n')
    setActiveTab('editor')
    setShowHint(false)
  }

  const handleSubmit = async () => {
    if (!selectedProblem) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/coding-problems/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': getAuthHeader() || '' },
        body: JSON.stringify({ problemId: selectedProblem.problem_id, code, language })
      })
      const data = await res.json()
      if (data.success && data.status === 'passed') {
        showToast('All test cases passed! 🎉', 'success')
        // Update local state
        setTieredData(prev => {
          if (!prev) return prev
          const update = (arr: TieredProblem[]) =>
            arr.map(p => p.problem_id === selectedProblem.problem_id ? { ...p, status: 'passed' as const } : p)
          const newData = { ...prev, easy: update(prev.easy), medium: update(prev.medium), hard: update(prev.hard) }
          newData.solved_today = [...newData.easy, ...newData.medium, ...newData.hard].filter(p => p.status === 'passed').length
          newData.goal_achieved = newData.solved_today >= newData.daily_goal
          return newData
        })
        setSelectedProblem(prev => prev ? { ...prev, status: 'passed' } : null)
      } else {
        const msg = data.message || 'Some test cases failed'
        showToast(msg, 'error')
      }
    } catch {
      showToast('Failed to submit solution', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLanguageChange = (lang: 'javascript' | 'c' | 'cpp' | 'python') => setLanguage(lang)

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const solved = tieredData?.solved_today ?? 0
  const goal = tieredData?.daily_goal ?? 6
  const pct = Math.min(100, Math.round((solved / goal) * 100))
  const goalAchieved = tieredData?.goal_achieved ?? false

  const ProblemList = ({ problems, diff }: { problems: TieredProblem[], diff: 'EASY' | 'MEDIUM' | 'HARD' }) => {
    const cfg = DIFF_CONFIG[diff]
    const isOpen = expandedSection === diff
    const solvedCount = problems.filter(p => p.status === 'passed').length

    return (
      <div className={`border ${cfg.border} rounded-xl overflow-hidden`}>
        {/* Section header */}
        <button
          className={`w-full flex items-center justify-between px-4 py-3 ${cfg.bg} hover:opacity-90 transition-opacity`}
          onClick={() => setExpandedSection(isOpen ? null : diff)}
        >
          <div className="flex items-center gap-2">
            <span className={cfg.color}>{cfg.icon}</span>
            <span className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</span>
            <span className="text-xs text-gray-500">~{cfg.time} min each</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">{solvedCount}/{problems.length}</span>
            {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </button>

        {/* Problem rows */}
        {isOpen && (
          <div className="divide-y divide-gray-100 bg-white">
            {problems.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400 italic">
                <Lock className="w-3.5 h-3.5" /> Problems not generated yet
              </div>
            ) : problems.map(p => (
              <button
                key={p.problem_id}
                onClick={() => { selectProblem(p); setExpandedSection(diff) }}
                className={`w-full text-left flex items-center justify-between px-4 py-2.5 transition-colors
                  ${selectedProblem?.problem_id === p.problem_id ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <span className="text-sm text-gray-800 truncate">{p.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-xs text-gray-400 flex items-center gap-0.5"><Clock className="w-3 h-3" />{p.estimated_time_minutes}m</span>
                  {p.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading daily challenges...</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
        {/* ── Top Bar ──────────────────────────────────────────────────── */}
        <div className="h-14 px-4 sticky top-0 z-20 bg-white border-b flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-full transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                Week {weekNum} / {DAYS[currentDay] || currentDay}
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-semibold text-gray-800 truncate max-w-xs">
                {selectedProblem?.title || 'Select a Problem'}
              </span>
            </div>
          </div>

          {/* Daily Goal Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-gray-700">Daily Goal:</span>
              <span className={`text-xs font-bold ${goalAchieved ? 'text-emerald-600' : 'text-blue-600'}`}>
                {solved}/{goal}
              </span>
              {goalAchieved && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
            </div>
            {/* Progress bar */}
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${goalAchieved ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Goal achieved banner */}
        {goalAchieved && (
          <div className="bg-emerald-500 text-white text-center py-2 text-sm font-semibold flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4" />
            🎉 Daily goal achieved! You've solved {solved} problems today. Keep going!
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* ── Left: Problem List Panel ────────────────────────────────── */}
          <div className="w-72 bg-white border-r flex flex-col overflow-hidden">
            {/* Topic tag */}
            {tieredData?.easy[0]?.topic && (
              <div className="px-4 py-3 border-b bg-blue-50/50">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Today's Topic</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{tieredData.easy[0].topic}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tieredData ? (
                <>
                  <ProblemList problems={tieredData.easy} diff="EASY" />
                  <ProblemList problems={tieredData.medium} diff="MEDIUM" />
                  <ProblemList problems={tieredData.hard} diff="HARD" />
                </>
              ) : (
                <div className="text-sm text-gray-400 text-center py-8 italic">
                  No problems available. Run the generation script.
                </div>
              )}
            </div>

            {/* Bottom stats */}
            <div className="border-t px-4 py-3 bg-gray-50 space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span className="text-emerald-600 font-semibold">✓ {tieredData?.easy.filter(p=>p.status==='passed').length||0} Easy</span>
                <span className="text-amber-600 font-semibold">✓ {tieredData?.medium.filter(p=>p.status==='passed').length||0} Medium</span>
                <span className="text-red-600 font-semibold">✓ {tieredData?.hard.filter(p=>p.status==='passed').length||0} Hard</span>
              </div>
              <p className="text-xs text-gray-400 text-center">Solve any 6 to complete today's goal</p>
            </div>
          </div>

          {/* ── Middle: Problem Description ──────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {selectedProblem ? (
                <div className="max-w-3xl mx-auto space-y-6 pb-10">
                  {/* Title + difficulty */}
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedProblem.title}</h2>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${DIFF_CONFIG[selectedProblem.difficulty].bg} ${DIFF_CONFIG[selectedProblem.difficulty].color} border ${DIFF_CONFIG[selectedProblem.difficulty].border}`}>
                      {DIFF_CONFIG[selectedProblem.difficulty].icon}
                      {DIFF_CONFIG[selectedProblem.difficulty].label}
                    </div>
                  </div>

                  {/* Concepts */}
                  {selectedProblem.concepts_tested?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProblem.concepts_tested.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">{c}</span>
                      ))}
                    </div>
                  )}

                  {/* Status banner if solved */}
                  {selectedProblem.status === 'passed' && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-700">You've already solved this problem!</span>
                    </div>
                  )}

                  {/* Problem Statement */}
                  <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                    <p>{selectedProblem.problem_statement}</p>
                  </div>

                  {/* Input/Output Format */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedProblem.input_format && (
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Input Format</h4>
                        <p className="text-sm text-gray-700">{selectedProblem.input_format}</p>
                      </div>
                    )}
                    {selectedProblem.output_format && (
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Output Format</h4>
                        <p className="text-sm text-gray-700">{selectedProblem.output_format}</p>
                      </div>
                    )}
                  </div>

                  {/* Constraints */}
                  {selectedProblem.constraints?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Constraints</h4>
                      <ul className="space-y-1">
                        {selectedProblem.constraints.map((c, i) => (
                          <li key={i} className="text-sm text-amber-800 font-mono">{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Test Cases */}
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wide mb-3">
                      <Terminal className="w-4 h-4 text-gray-500" /> Examples
                    </h3>
                    <div className="space-y-3">
                      {selectedProblem.test_cases?.slice(0, 2).map((tc, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                          {tc.explanation && (
                            <div className="px-4 py-2 border-b border-gray-200 bg-gray-100/60">
                              <p className="text-xs text-gray-500">{tc.explanation}</p>
                            </div>
                          )}
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Input</span>
                              <pre className="font-mono text-sm bg-white p-2 rounded border border-gray-200 text-gray-700 whitespace-pre-wrap">{tc.input}</pre>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Expected Output</span>
                              <pre className="font-mono text-sm bg-green-50 p-2 rounded border border-green-100 text-green-800 whitespace-pre-wrap">{tc.expected_output}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hints */}
                  {selectedProblem.hints?.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowHint(h => !h)}
                        className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Lightbulb className="w-4 h-4" />
                        {showHint ? 'Hide Hints' : 'Show Hints'}
                      </button>
                      {showHint && (
                        <ul className="mt-2 space-y-2">
                          {selectedProblem.hints.map((h, i) => (
                            <li key={i} className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-sm text-blue-800">
                              <span className="font-bold text-blue-400 flex-shrink-0">Hint {i+1}:</span> {h}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                  <Code2 className="w-12 h-12 opacity-20" />
                  <p>Select a problem from the left panel to begin</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Code Editor ─────────────────────────────────────── */}
          <div className="w-[45%] flex flex-col bg-[#1e1e1e] border-l border-gray-800">
            {/* Tab bar */}
            <div className="flex items-center bg-[#252526] border-b border-[#333]">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-t-2 transition-colors
                  ${activeTab === 'editor' ? 'bg-[#1e1e1e] text-white border-blue-500' : 'bg-[#2d2d2d] text-gray-400 border-transparent hover:text-gray-300'}`}
              >
                <FileCode className="w-3.5 h-3.5" /> Code Editor
              </button>
              <button
                onClick={() => setActiveTab('review')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-t-2 transition-colors
                  ${activeTab === 'review' ? 'bg-[#1e1e1e] text-blue-400 border-blue-500' : 'bg-[#2d2d2d] text-gray-400 border-transparent hover:text-gray-300'}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Coach
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden">
              {activeTab === 'editor' ? (
                <CodeEditor
                  value={code}
                  language={language}
                  onChange={setCode}
                  onLanguageChange={handleLanguageChange}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                  testCases={selectedProblem?.test_cases?.map(tc => ({ input: tc.input, expectedOutput: tc.expected_output }))}
                  problemId={selectedProblem?.problem_id}
                />
              ) : (
                <div className="h-full overflow-y-auto bg-gray-50/10">
                  <div className="p-4">
                    <CodeReview
                      code={code}
                      language={language}
                      problemId={selectedProblem?.problem_id}
                      problemDescription={selectedProblem?.problem_statement}
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

export default function TieredCodingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    }>
      <TieredCodingContent />
    </Suspense>
  )
}
