'use client'

import React from 'react'
import Image from 'next/image'
import {
  CheckCircle2, Calendar, Trophy, Target, Clock,
  BookOpen, BarChart3, Brain, ChevronRight,
  TrendingUp, GraduationCap
} from 'lucide-react'

/* ─────────── Mock Roadmap Data ─────────── */
const roadmapTopics = [
  { name: 'Syllogism',           status: 'Completed',    pct: 100, color: 'text-emerald-500' },
  { name: 'Blood Relations',     status: 'Completed',    pct: 90,  color: 'text-emerald-500' },
  { name: 'Seating Arrangement', status: 'In Progress',  pct: 60,  color: 'text-blue-500'    },
  { name: 'Puzzles',             status: 'Not Started',  pct: 0,   color: 'text-gray-400'    },
  { name: 'Coding-Decoding',     status: 'Not Started',  pct: 0,   color: 'text-gray-400'    },
]

const roadmapSteps = [
  { label: 'DSA Basics',        status: 'done'     },
  { label: 'Aptitude',          status: 'done'     },
  { label: 'Logical Reasoning', status: 'active'   },
  { label: 'Programming',       status: 'upcoming' },
  { label: 'Mock & Revision',   status: 'upcoming' },
]

/* ─────────── Mock Test Data ─────────── */
const testOptions = [
  { label: 'A', text: 'Stack'  },
  { label: 'B', text: 'Queue', selected: true },
  { label: 'C', text: 'Tree'   },
  { label: 'D', text: 'Graph'  },
]

/* ─────────── Mock Analytics Data ─────────── */
const strengths    = [
  { label: 'Arrays',            pct: 85, color: 'bg-blue-500'    },
  { label: 'Logical Reasoning', pct: 80, color: 'bg-blue-400'    },
  { label: 'Maths',             pct: 75, color: 'bg-blue-300'    },
]
const improvements = [
  { label: 'DP',            pct: 45, color: 'bg-slate-400'   },
  { label: 'System Design', pct: 50, color: 'bg-slate-300'   },
  { label: 'Operating Sys', pct: 55, color: 'bg-slate-300'   },
]

export function StudentExperience() {
  return (
    <section
      id="student-experience"
      className="relative py-24 overflow-hidden bg-white"
    >
      {/* Soft blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-50/60 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-50/30 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── HEADER ── */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 mb-5">
            <Image src="/images/Small_Logo.png" alt="SP" width={16} height={16} className="rounded object-contain" />
            For Students
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Student{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Experience</span>
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            A guided path that makes placement preparation manageable, trackable and motivating.
          </p>
        </div>

        {/* ── 3 MINI PILLS ── */}
        <div className="flex flex-wrap justify-center gap-6 mb-20">
          {[
            { icon: Target,     label: 'Focused Preparation', sub: 'Right topics, right time'      },
            { icon: Calendar,   label: 'Consistent Practice',  sub: 'Tests that keep you on track'  },
            { icon: TrendingUp, label: 'Measurable Growth',    sub: 'Track, compare & improve'      },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 bg-white/80 border border-gray-100 shadow-sm rounded-2xl px-5 py-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 leading-tight">{label}</div>
                <div className="text-[11px] text-gray-400">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════
            FEATURE 01 — Know Exactly What to Study
        ════════════════════════════════════════════ */}
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center mb-28">

          {/* Left text */}
          <div className="space-y-6 order-2 lg:order-1">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-blue-600 select-none opacity-20">01</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              Know Exactly<br />
              <span className="text-blue-600">What to Study Next</span>
            </h3>
            <p className="text-gray-500 leading-relaxed">
              No more confusion. Your personalized semester-wise roadmap shows exactly which topics to focus on, aligned with your placement goals.
            </p>
            <ul className="space-y-3">
              {['Personalized roadmap for your semester', 'Topic recommendations based on your performance', 'Track completion and stay ahead'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — Mock Roadmap UI */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <Image src="/images/Small_Logo.png" alt="SP" width={22} height={22} className="rounded object-contain" />
                  <span className="text-xs font-bold text-gray-800">ScholarPlace</span>
                </div>
                <div className="flex gap-4 text-[10px] text-gray-400 font-medium">
                  {['Overview', 'By-topic', 'Analytics', 'Study Material', 'Doubts'].map(n => (
                    <span key={n} className={n === 'By-topic' ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-0.5' : ''}>{n}</span>
                  ))}
                </div>
              </div>

              <div className="p-5">
                {/* Roadmap header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-gray-900">Your Roadmap</div>
                    <div className="text-[10px] text-gray-400">3rd Semester • CSE</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500">Overall Progress</span>
                    <span className="text-xs font-black text-blue-600">68%</span>
                  </div>
                </div>

                {/* Steps strip */}
                <div className="flex items-start gap-1 mb-5">
                  {roadmapSteps.map((step, i) => (
                    <React.Fragment key={step.label}>
                      <div className={`flex flex-col items-center flex-shrink-0 ${step.status === 'upcoming' ? 'opacity-40' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 ${
                          step.status === 'done'   ? 'border-emerald-500 bg-emerald-500 text-white' :
                          step.status === 'active' ? 'border-blue-500 bg-blue-500 text-white' :
                          'border-gray-200 bg-white text-gray-400'}`}>
                          {step.status === 'done' ? '✓' : i + 1}
                        </div>
                        <span className={`text-[8px] mt-1 font-medium text-center w-14 leading-tight ${step.status === 'active' ? 'text-blue-600' : 'text-gray-500'}`}>{step.label}</span>
                        {step.status === 'done'   && <span className="text-[7px] text-emerald-500">Completed</span>}
                        {step.status === 'active' && <span className="text-[7px] text-blue-500">In Progress</span>}
                      </div>
                      {i < roadmapSteps.length - 1 && (
                        <div className={`flex-1 h-px min-w-[12px] mt-3 ${i < 2 ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Current focus */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-900">Current Focus: Logical Reasoning</span>
                  <span className="text-[10px] text-gray-400">12 / 26 Topics Completed</span>
                </div>
                <div className="space-y-2">
                  {roadmapTopics.map(t => (
                    <div key={t.name} className="flex items-center bg-gray-50 rounded-xl px-3 py-2 gap-2">
                      <span className="text-[11px] text-gray-700 flex-1">{t.name}</span>
                      <span className={`text-[10px] font-bold flex-shrink-0 w-20 text-right ${t.color}`}>{t.status}</span>
                      <div className="w-20 h-1.5 rounded-full bg-gray-200 ml-1">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${t.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            FEATURE 02 — Stay Consistent with Smart Tests
        ════════════════════════════════════════════ */}
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center mb-28">

          {/* Left — Mock Test UI */}
          <div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
              {/* Test header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
                <div>
                  <div className="text-sm font-bold text-gray-900">Weekly Test – DSA</div>
                  <div className="text-[10px] text-gray-400">Question 8 of 20</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-orange-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">00 : 24 : 15</span>
                  </div>
                  <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}>
                    Submit Test
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-5 divide-x divide-gray-100">
                {/* Question + Options */}
                <div className="col-span-3 p-5 space-y-4">
                  <p className="text-xs font-semibold text-gray-800">Which data structure uses FIFO principle?</p>
                  <div className="space-y-2">
                    {testOptions.map(opt => (
                      <div key={opt.label} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs font-medium ${opt.selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                        <span className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${opt.selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{opt.label}</span>
                        {opt.text}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button className="text-[10px] px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-medium">Previous</button>
                    <button className="text-[10px] px-4 py-1.5 rounded-lg text-white font-bold" style={{ background: '#2563eb' }}>Next</button>
                  </div>
                </div>

                {/* Progress panel */}
                <div className="col-span-2 p-4 space-y-4">
                  <div className="text-xs font-bold text-gray-800">Your Progress</div>
                  {/* Donut */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-20 h-20">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#2563eb" strokeWidth="3.5" strokeDasharray="70 100" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-black text-gray-900">14</span>
                        <span className="text-[9px] text-gray-400">/20</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    {[['Answered','14','text-blue-500'],['Review','2','text-orange-500'],['Unanswered','4','text-gray-400']].map(([l,v,c]) => (
                      <div key={l} className="flex justify-between items-center">
                        <span className="text-gray-500">{l}</span>
                        <span className={`font-bold ${c}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-3 space-y-1.5 text-[10px]">
                    <div className="font-bold text-gray-700 mb-2">Performance</div>
                    <div className="flex justify-between"><span className="text-gray-500">Accuracy</span><span className="font-bold text-emerald-500">85%</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Score</span><span className="font-bold text-gray-800">14 / 20</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right text */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-blue-600 select-none opacity-20">02</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              Stay Consistent<br />
              with{' '}
              <span className="text-blue-600">Smart Tests</span>
            </h3>
            <p className="text-gray-500 leading-relaxed">
              Weekly, bi-weekly and monthly tests help you practice consistently. Get instant feedback to know where you stand and what to improve.
            </p>
            <ul className="space-y-3">
              {['Topic-wise, sectional & full-length tests', 'Instant results with detailed solutions', 'Performance history to track improvement'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            FEATURE 03 — Track Growth & Rank Among Peers
        ════════════════════════════════════════════ */}
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center mb-24">

          {/* Left text */}
          <div className="space-y-6 order-2 lg:order-1">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-blue-600 select-none opacity-20">03</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              Track Growth &amp;<br />
              <span className="text-blue-600">Rank Among Peers</span>
            </h3>
            <p className="text-gray-500 leading-relaxed">
              Beautiful analytics help you understand your strengths and weaknesses. Compare your rank with peers and keep improving every day.
            </p>
            <ul className="space-y-3">
              {['Visual progress over time', 'Compare with your batch & campus', 'Identify weak areas and improve faster'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — Analytics Mock UI */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-900">Performance Overview</span>
                <div className="flex gap-1.5">
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium">This Month</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium">vs Last Month</span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* 4 stat chips */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    ['Overall Score','72%','+12.4%','text-blue-600'],
                    ['Tests Attempted','18','+20%','text-blue-500'],
                    ['Accuracy','78%','-8.6%','text-red-400'],
                    ['Batch Rank','23/120','+15','text-blue-600'],
                  ].map(([l,v,c,col]) => (
                    <div key={l} className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <div className="text-[8px] text-gray-400 mb-0.5">{l}</div>
                      <div className="text-sm font-black text-gray-900">{v}</div>
                      <div className={`text-[8px] font-semibold ${col}`}>{c}</div>
                    </div>
                  ))}
                </div>

                {/* Score trend bars */}
                <div>
                  <div className="text-[10px] font-bold text-gray-600 mb-2">Score Trend</div>
                  <div className="bg-gray-50 rounded-2xl p-3 h-24 flex items-end gap-2 relative overflow-hidden">
                    {[30,42,55,48,65,72,80].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end h-full">
                        <div className="w-full rounded-sm" style={{ height: `${h}%`, background: i === 6 ? '#2563eb' : '#93c5fd' }} />
                      </div>
                    ))}
                    <div className="absolute bottom-1.5 left-3 right-3 flex justify-between">
                      {['Wk1','Wk2','Wk3','Wk4','Wk5','Wk6','Wk7'].map(w => (
                        <span key={w} className="text-[7px] text-gray-400">{w}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Strengths + Improvements */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-gray-600 mb-2">Top Strengths</div>
                    <div className="space-y-1.5">
                      {strengths.map(s => (
                        <div key={s.label}>
                          <div className="flex justify-between text-[9px] mb-0.5">
                            <span className="text-gray-600">{s.label}</span>
                            <span className="font-bold text-gray-800">{s.pct}%</span>
                          </div>
                          <div className="h-1 bg-gray-200 rounded-full">
                            <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-600 mb-2">Needs Improvement</div>
                    <div className="space-y-1.5">
                      {improvements.map(s => (
                        <div key={s.label}>
                          <div className="flex justify-between text-[9px] mb-0.5">
                            <span className="text-gray-600">{s.label}</span>
                            <span className="font-bold text-gray-800">{s.pct}%</span>
                          </div>
                          <div className="h-1 bg-gray-200 rounded-full">
                            <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM CTA BANNER ── */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #06b6d4 100%)' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-6">
            <div className="flex items-center gap-4">
              <Image src="/images/Small_Logo.png" alt="SP" width={36} height={36} className="rounded-xl object-contain brightness-0 invert opacity-80" />
              <div>
                <div className="text-white font-bold text-base">Small steps every day lead to big placement dreams.</div>
                <div className="text-blue-200 text-sm">Stay consistent. Stay focused. We&apos;re with you!</div>
              </div>
            </div>
            <a
              href="#contact"
              className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Let&apos;s Get Started <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </section>
  )
}
