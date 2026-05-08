'use client'

import React, { useState } from 'react'
import { Star, CheckCircle2, ChevronRight, X } from 'lucide-react'
import { getAuthHeader } from '@/utils/auth'

// ─── Question Configuration ──────────────────────────────────────────────────

const QUESTIONS = {
  q2: {
    label: 'Compared to before this week, how much has your placement readiness improved?',
    options: [
      { value: 'a_lot_more_ready',    label: '🚀 A lot more ready' },
      { value: 'somewhat_more_ready', label: '📈 Somewhat more ready' },
      { value: 'about_the_same',      label: '😐 About the same' },
      { value: 'more_confused',       label: '😕 I\'m feeling more confused' },
    ]
  },
  q3: {
    label: 'How did you find the difficulty level of this week\'s content?',
    options: [
      { value: 'too_easy',        label: '🎯 Too easy — I needed more challenge' },
      { value: 'just_right',      label: '✅ Just right — perfect balance' },
      { value: 'a_little_hard',   label: '💪 A little hard — but manageable' },
      { value: 'too_overwhelming', label: '😤 Too overwhelming — I struggled' },
    ]
  },
  q4: {
    label: 'Do you feel this week\'s topics are what companies actually ask in placements?',
    options: [
      { value: 'very_relevant',  label: '🎯 Yes — very industry relevant' },
      { value: 'mostly_aligned', label: '👍 Mostly yes — mostly aligned' },
      { value: 'unsure',         label: '🤔 Unsure — I\'m not sure what companies ask' },
      { value: 'not_really',     label: '📚 Not really — feels theoretical' },
    ]
  },
  q5: {
    label: 'Was the workload manageable alongside your college schedule?',
    options: [
      { value: 'very_manageable',       label: '✅ Yes, very manageable' },
      { value: 'manageable_but_tight',  label: '⏱️ Yes, but it was tight' },
      { value: 'clashed_with_college',  label: '⚠️ No, it clashed with my college work' },
      { value: 'couldnt_complete',      label: '❌ No, I couldn\'t complete it fully' },
    ]
  },
  q6: {
    label: 'Did you feel supported this week?',
    options: [
      { value: 'yes_all_resources', label: '✅ Yes — I had all the resources I needed' },
      { value: 'mostly_yes',        label: '👍 Mostly yes — a few unresolved doubts' },
      { value: 'not_really',        label: '😐 Not really — I needed more guidance' },
      { value: 'no_felt_lost',      label: '😕 No — I felt lost' },
    ]
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
          aria-label={`${star} star`}
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              star <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 self-center text-sm font-semibold text-amber-600">
          {['', 'Not confident', 'Slightly confident', 'Somewhat confident', 'Confident', 'Very confident'][value]}
        </span>
      )}
    </div>
  )
}

function NPSRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
              value === n
                ? n <= 6
                  ? 'bg-red-500 text-white shadow-md scale-110'
                  : n <= 8
                  ? 'bg-amber-400 text-white shadow-md scale-110'
                  : 'bg-emerald-500 text-white shadow-md scale-110'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>Not at all</span>
        <span>Absolutely yes</span>
      </div>
    </div>
  )
}

function RadioGroup({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm ${
            value === opt.value
              ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
              : 'border-gray-200 text-gray-700 hover:border-blue-200 hover:bg-blue-50/50'
          }`}
        >
          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
            value === opt.value
              ? 'border-blue-500 bg-blue-500'
              : 'border-gray-300'
          }`} />
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface WeeklyFeedbackModalProps {
  weekNumber: number
  onClose: () => void
  onSubmitted: () => void
}

export function WeeklyFeedbackModal({ weekNumber, onClose, onSubmitted }: WeeklyFeedbackModalProps) {
  const totalSteps = 8
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    q1_confidence_score: 0,
    q2_placement_readiness: '',
    q3_difficulty_level: '',
    q4_industry_relevance: '',
    q5_workload_manageable: '',
    q6_felt_supported: '',
    q7_nps_score: 0,
    q8_loved: '',
    q8_improve: ''
  })

  const set = (field: string, value: string | number) => setForm(prev => ({ ...prev, [field]: value }))

  // Validate current step before proceeding
  const canProceed = (): boolean => {
    switch (step) {
      case 1: return form.q1_confidence_score > 0
      case 2: return !!form.q2_placement_readiness
      case 3: return !!form.q3_difficulty_level
      case 4: return !!form.q4_industry_relevance
      case 5: return !!form.q5_workload_manageable
      case 6: return !!form.q6_felt_supported
      case 7: return form.q7_nps_score > 0
      case 8: return true // Optional fields
      default: return false
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const authHeader = getAuthHeader()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/student/feedback/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {})
        },
        body: JSON.stringify({ week_number: weekNumber, ...form })
      })
      const data = await res.json()
      if (data.success) {
        onSubmitted()
      } else {
        setError(data.message || 'Failed to submit. Please try again.')
        setSubmitting(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  const progress = Math.round((step / totalSteps) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-semibold opacity-80 uppercase tracking-wider">Week {weekNumber} Complete 🎉</div>
              <h2 className="text-xl font-extrabold mt-0.5">Quick Feedback</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-bold opacity-80">{step}/{totalSteps}</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 min-h-[280px]">

          {/* Q1 — Confidence */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-800 leading-snug">How confident do you feel about interview questions on this week's topics?</p>
              <StarRating value={form.q1_confidence_score} onChange={v => set('q1_confidence_score', v)} />
            </div>
          )}

          {/* Q2 — Placement Readiness */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-800 leading-snug">{QUESTIONS.q2.label}</p>
              <RadioGroup options={QUESTIONS.q2.options} value={form.q2_placement_readiness} onChange={v => set('q2_placement_readiness', v)} />
            </div>
          )}

          {/* Q3 — Difficulty */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-800 leading-snug">{QUESTIONS.q3.label}</p>
              <RadioGroup options={QUESTIONS.q3.options} value={form.q3_difficulty_level} onChange={v => set('q3_difficulty_level', v)} />
            </div>
          )}

          {/* Q4 — Industry Relevance */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-800 leading-snug">{QUESTIONS.q4.label}</p>
              <RadioGroup options={QUESTIONS.q4.options} value={form.q4_industry_relevance} onChange={v => set('q4_industry_relevance', v)} />
            </div>
          )}

          {/* Q5 — Workload */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-800 leading-snug">{QUESTIONS.q5.label}</p>
              <RadioGroup options={QUESTIONS.q5.options} value={form.q5_workload_manageable} onChange={v => set('q5_workload_manageable', v)} />
            </div>
          )}

          {/* Q6 — Felt Supported */}
          {step === 6 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-800 leading-snug">{QUESTIONS.q6.label}</p>
              <RadioGroup options={QUESTIONS.q6.options} value={form.q6_felt_supported} onChange={v => set('q6_felt_supported', v)} />
            </div>
          )}

          {/* Q7 — NPS */}
          {step === 7 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-800 leading-snug">Would you recommend ScholarPlace to a friend from another college preparing for placements?</p>
              <NPSRating value={form.q7_nps_score} onChange={v => set('q7_nps_score', v)} />
            </div>
          )}

          {/* Q8 — Open text */}
          {step === 8 && (
            <div className="space-y-5">
              <p className="text-sm font-bold text-gray-800">Almost done! Share your thoughts (optional):</p>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">💚 What I loved this week</label>
                <textarea
                  value={form.q8_loved}
                  onChange={e => set('q8_loved', e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="e.g. The tree traversal explanation finally clicked for me!"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">💡 What could be better</label>
                <textarea
                  value={form.q8_improve}
                  onChange={e => set('q8_improve', e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="e.g. More practice problems for dynamic programming..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : <><CheckCircle2 className="w-4 h-4" /> Submit Feedback</>}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
