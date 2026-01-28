'use client'

import React, { useState, useEffect } from 'react'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getAuthHeader } from '@/utils/auth'
import {
  HelpCircle,
  MessageCircle,
  ClipboardCheck,
  Send,
  Loader2,
  Plus,
  CheckCircle2,
  XCircle,
  BookOpen,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { QuickCheckModal } from './QuickCheckModal'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

function stripAsterisks(s: string): string {
  if (typeof s !== 'string') return ''
  return s.replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1').replace(/\*+/g, '').replace(/\*/g, '')
}

function api(endpoint: string, body: object) {
  return fetch(`${API}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(getAuthHeader() ? { Authorization: getAuthHeader()! } : {}),
    },
    body: JSON.stringify(body),
  }).then((r) => r.json())
}

export default function StudyHelpPage() {
  const [subTab, setSubTab] = useState<'clarify' | 'checks'>('clarify')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [question, setQuestion] = useState('')
  const [topic, setTopic] = useState('')
  const [week, setWeek] = useState<number | ''>('')
  const [day, setDay] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [genCheckLoading, setGenCheckLoading] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<string>('active')

  const [checks, setChecks] = useState<any[]>([])
  const [checksLoading, setChecksLoading] = useState(false)
  const [takingId, setTakingId] = useState<string | null>(null)
  const [takingQ, setTakingQ] = useState<any[]>([])
  const [takingTitle, setTakingTitle] = useState('')
  const [selections, setSelections] = useState<Record<number, string>>({})
  const [submitLoading, setSubmitLoading] = useState(false)
  const [attemptResult, setAttemptResult] = useState<any>(null)
  const [viewResultId, setViewResultId] = useState<string | null>(null)
  const [resultDetail, setResultDetail] = useState<any>(null)

  const loadSessions = () => {
    setLoading(true)
    api('/study-help/conversation/list', {}).then((d) => {
      if (d.success && d.data?.sessions) setSessions(d.data.sessions)
    }).finally(() => setLoading(false))
  }

  const loadHistory = (sid: string) => {
    setLoadingHistory(true)
    api('/study-help/conversation/history', { session_id: sid }).then((d) => {
      if (d.success && d.data) {
        setConversation(d.data.conversation || [])
        setSessionStatus(d.data.status || 'active')
      }
    }).finally(() => setLoadingHistory(false))
  }

  const loadChecks = () => {
    setChecksLoading(true)
    api('/study-help/check/list', {}).then((d) => {
      if (d.success && d.data?.checks) setChecks(d.data.checks)
    }).finally(() => setChecksLoading(false))
  }

  useEffect(() => { loadSessions(); loadChecks() }, [])
  useEffect(() => {
    if (sessionId) loadHistory(sessionId)
    else setConversation([])
  }, [sessionId])

  const startSession = () => {
    setLoading(true)
    api('/study-help/conversation/start', { topic: topic || undefined, week: week || undefined, day: day || undefined })
      .then((d) => {
        if (d.success && d.data?.session_id) {
          setSessionId(d.data.session_id)
          setConversation([])
          setSessionStatus('active')
        }
      })
      .finally(() => setLoading(false))
  }

  const ask = () => {
    if (!question.trim() || !sessionId) return
    setLoading(true)
    api('/study-help/conversation/ask', { session_id: sessionId, question: question.trim() })
      .then((d) => {
        if (d.success && d.data?.answer) {
          setConversation((prev) => [
            ...prev,
            { role: 'student', content: question.trim() },
            { role: 'assistant', content: stripAsterisks(d.data.answer) },
          ])
          setQuestion('')
        }
      })
      .finally(() => setLoading(false))
  }

  const generateCheck = () => {
    if (!sessionId) return
    setGenCheckLoading(true)
    api('/study-help/generate-check', { session_id: sessionId })
      .then((d) => { if (d.success) { loadChecks(); setSubTab('checks') } })
      .finally(() => setGenCheckLoading(false))
  }

  const startTake = (id: string) => {
    setTakingId(id)
    setTakingQ([])
    setTakingTitle('')
    setSelections({})
    setAttemptResult(null)
    api('/study-help/check/get', { concept_check_id: id }).then((d) => {
      if (d.success && d.data) {
        setTakingQ(d.data.questions || [])
        setTakingTitle(d.data.title || 'Quick check')
      }
    })
  }

  const submitAttempt = () => {
    if (!takingId) return
    setSubmitLoading(true)
    api('/study-help/check/submit', { concept_check_id: takingId, answers: takingQ.map((_, i) => ({ question_index: i, selected_answer: selections[i] ?? '' })), time_spent: 0 })
      .then((d) => { if (d.success && d.data) { setAttemptResult(d.data); loadChecks() } })
      .finally(() => setSubmitLoading(false))
  }

  const openResult = (id: string) => {
    setViewResultId(id)
    setResultDetail(null)
    api('/study-help/check/result', { concept_check_id: id }).then((d) => { if (d.success && d.data) setResultDetail(d.data) })
  }

  const canGenerateCheck = sessionId && conversation.length >= 2 && sessionStatus !== 'practice_generated'

  return (
    <StudentLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/[0.03] via-background to-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
          {/* Hero */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <HelpCircle className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-neutral tracking-tight">Study Help</h1>
                <p className="text-neutral-light text-sm mt-0.5">Clarify concepts and test your understanding</p>
              </div>
            </div>
          </div>

          {/* Mode cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
            <button
              onClick={() => setSubTab('clarify')}
              className={`text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 ${
                subTab === 'clarify'
                  ? 'border-primary/40 bg-primary/5 shadow-sm shadow-primary/5'
                  : 'border-neutral-light/15 bg-background-surface hover:border-neutral-light/30 hover:bg-background-elevated/50'
              }`}
            >
              <MessageCircle className={`w-8 h-8 mb-2 ${subTab === 'clarify' ? 'text-primary' : 'text-neutral-light'}`} />
              <h2 className="font-heading font-semibold text-neutral text-base sm:text-lg">Clarify & Learn</h2>
              <p className="text-neutral-light text-xs sm:text-sm mt-0.5">Ask questions and get clear explanations</p>
            </button>
            <button
              onClick={() => setSubTab('checks')}
              className={`text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 ${
                subTab === 'checks'
                  ? 'border-primary/40 bg-primary/5 shadow-sm shadow-primary/5'
                  : 'border-neutral-light/15 bg-background-surface hover:border-neutral-light/30 hover:bg-background-elevated/50'
              }`}
            >
              <ClipboardCheck className={`w-8 h-8 mb-2 ${subTab === 'checks' ? 'text-primary' : 'text-neutral-light'}`} />
              <h2 className="font-heading font-semibold text-neutral text-base sm:text-lg">Quick checks</h2>
              <p className="text-neutral-light text-xs sm:text-sm mt-0.5">Practice with short quizzes from your sessions</p>
            </button>
          </div>

          {/* Clarify & Learn */}
          {subTab === 'clarify' && (
            <section className="animate-fade-in">
              {!sessionId ? (
                <div className="rounded-2xl border border-neutral-light/20 bg-background-surface shadow-sm overflow-hidden">
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-2 text-primary mb-1">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-heading font-semibold text-primary">Start a conversation</span>
                    </div>
                    <p className="text-neutral-light text-sm sm:text-base mt-1 max-w-xl">
                      Ask about any topic you’re learning. Your questions and the explanations are saved so you can build on them over time.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                      <div>
                        <label className="block text-xs font-medium text-neutral-light mb-1.5">Topic (optional)</label>
                        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Arrays" className="rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-light mb-1.5">Week (optional)</label>
                        <Input type="number" value={week} onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : '')} placeholder="1" className="rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-light mb-1.5">Day (optional)</label>
                        <Input value={day} onChange={(e) => setDay(e.target.value)} placeholder="day-1" className="rounded-xl" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-6">
                      <Button onClick={startSession} disabled={loading} className="rounded-xl">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Start conversation
                      </Button>
                      {sessions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs text-neutral-light self-center">Recent:</span>
                          {sessions.slice(0, 5).map((s) => (
                            <button
                              key={s.session_id}
                              onClick={() => { setSessionId(s.session_id); setTopic(s.topic || ''); setWeek(s.week ?? ''); setDay(s.day || '') }}
                              className="px-3 py-1.5 rounded-xl border border-neutral-light/20 text-sm text-neutral hover:bg-primary/5 hover:border-primary/30 transition-colors"
                            >
                              {s.topic || `Session ${s.session_id?.slice(-6)}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-light/20 bg-background-surface shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-neutral-light/15 flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="font-heading font-semibold text-neutral">Clarify & Learn</h2>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => { setSessionId(null); setTopic(''); setWeek(''); setDay('') }} className="rounded-xl">
                        New conversation
                      </Button>
                      {canGenerateCheck && (
                        <Button size="sm" onClick={generateCheck} disabled={genCheckLoading} className="rounded-xl">
                          {genCheckLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                          Create Quick check
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-h-[280px] max-h-[420px] overflow-y-auto p-5 space-y-4 scrollbar-thin">
                    {loadingHistory ? (
                      <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : conversation.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 rounded-2xl bg-primary/5 mb-4">
                          <MessageCircle className="w-10 h-10 text-primary/70" />
                        </div>
                        <p className="font-medium text-neutral">Ask your first question</p>
                        <p className="text-neutral-light text-sm mt-1 max-w-sm">Type something you don’t understand below. The explanation will build on what we discuss.</p>
                      </div>
                    ) : (
                      conversation.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                            m.role === 'student'
                              ? 'bg-primary/12 text-neutral'
                              : 'bg-background-elevated/80 border border-neutral-light/15 text-neutral'
                          }`}>
                            <p className="whitespace-pre-wrap">{m.role === 'assistant' ? stripAsterisks(m.content) : m.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-neutral-light/15 flex gap-3">
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && ask()}
                      placeholder="Ask something you don’t understand..."
                      disabled={loading}
                      className="flex-1 rounded-xl border-neutral-light/20"
                    />
                    <Button onClick={ask} disabled={loading || !question.trim()} className="rounded-xl shrink-0">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Ask
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Quick checks */}
          {subTab === 'checks' && (
            <section className="animate-fade-in">
              <div className="rounded-2xl border border-neutral-light/20 bg-background-surface shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-light/15">
                  <h2 className="font-heading font-semibold text-neutral">Your Quick checks</h2>
                  <p className="text-neutral-light text-sm mt-0.5">Short quizzes from your Clarify & Learn conversations</p>
                </div>
                <div className="p-5">
                  {checksLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : checks.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                      <div className="p-5 rounded-2xl bg-primary/5 mb-4">
                        <ClipboardCheck className="w-12 h-12 text-primary/60" />
                      </div>
                      <p className="font-heading font-medium text-neutral">No Quick checks yet</p>
                      <p className="text-neutral-light text-sm mt-1 max-w-sm">Have a Clarify & Learn conversation, then use “Create Quick check” to generate a practice quiz.</p>
                      <Button variant="secondary" className="mt-6 rounded-xl" onClick={() => setSubTab('clarify')}>
                        <ArrowRight className="w-4 h-4 rotate-180 mr-2" />
                        Go to Clarify & Learn
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {checks.map((c) => (
                        <div
                          key={c.concept_check_id}
                          className="group p-5 rounded-2xl border border-neutral-light/20 bg-background-elevated/30 hover:border-primary/25 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                              <BookOpen className="w-4 h-4 text-primary" />
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg shrink-0 ${c.status === 'attempted' ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'}`}>
                              {c.status}
                            </span>
                          </div>
                          <h3 className="font-medium text-neutral line-clamp-2 mb-4">{c.title}</h3>
                          <div className="flex gap-2">
                            {c.status === 'attempted' && (
                              <Button variant="secondary" size="sm" onClick={() => openResult(c.concept_check_id)} className="rounded-xl flex-1">
                                View answers
                              </Button>
                            )}
                            <Button size="sm" onClick={() => startTake(c.concept_check_id)} className="rounded-xl flex-1">
                              Take
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <QuickCheckModal
        isOpen={!!takingId}
        title={takingTitle}
        questions={takingQ}
        selections={selections}
        onSelect={(i, v) => setSelections((s) => ({ ...s, [i]: v }))}
        onSubmit={submitAttempt}
        onCancel={() => { setTakingId(null); setTakingQ([]); setAttemptResult(null) }}
        submitLoading={submitLoading}
        attemptResult={attemptResult}
        onViewExplanations={() => { if (takingId) openResult(takingId); setTakingId(null); setAttemptResult(null) }}
        onCloseAfterSubmit={() => { setTakingId(null); setAttemptResult(null) }}
      />

      {/* View result / explanations modal */}
      {viewResultId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-neutral-light/20 bg-background-surface shadow-2xl">
            <div className="px-6 py-5 border-b border-neutral-light/15 bg-gradient-to-r from-primary/5 to-transparent">
              <h3 className="font-heading font-semibold text-neutral text-lg">{resultDetail?.title || 'Results'}</h3>
              {resultDetail?.last_attempt && (
                <p className="text-primary font-semibold mt-1">Score: {resultDetail.last_attempt.score}%</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(resultDetail?.questions || []).map((q: any, i: number) => (
                <div key={i} className="p-5 rounded-2xl border border-neutral-light/15 bg-background-elevated/30">
                  <p className="font-medium text-neutral mb-3 text-[15px] leading-relaxed break-words">{i + 1}. {stripAsterisks(q.question || '')}</p>
                  <p className="text-sm text-neutral-light break-words flex items-center gap-2">
                    Your answer: {stripAsterisks(String(q.your_answer ?? '—'))}
                    {q.is_correct ? <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" /> : <XCircle className="w-4 h-4 text-accent shrink-0" />}
                  </p>
                  <p className="text-sm text-neutral-light break-words mt-1">Correct: {stripAsterisks(String(q.correct_answer || ''))}</p>
                  {q.explanation && <p className="text-sm mt-3 p-3 bg-primary/5 rounded-xl break-words">{stripAsterisks(q.explanation)}</p>}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-neutral-light/15">
              <Button className="rounded-xl w-full sm:w-auto" onClick={() => setViewResultId(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  )
}
