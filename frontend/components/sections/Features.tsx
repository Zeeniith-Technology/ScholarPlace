import React from 'react'
import {
  BookOpen, Calendar, BarChart3, Award, Users,
  Building2, TrendingUp, XCircle, CheckCircle2,
  Frown, Shuffle, EyeOff, AlarmClock, ArrowRight, Target
} from 'lucide-react'

/* ─── Pain points (left panel) ─── */
const painPoints = [
  {
    Icon: Frown,
    title: 'No Clear Roadmap',
    desc: "Students don't know what to study, when to start, or how to stay on track.",
  },
  {
    Icon: Shuffle,
    title: 'Random Preparation',
    desc: 'No structured plan or guidance leads to inconsistent and ineffective preparation.',
  },
  {
    Icon: EyeOff,
    title: 'No Performance Visibility',
    desc: 'Students and TPOs lack real-time insights into strengths, weaknesses, and progress.',
  },
  {
    Icon: AlarmClock,
    title: 'Late Realization',
    desc: 'Weak areas are identified too late, leaving less time to improve before placements.',
  },
]

/* ─── Solutions (right panel) ─── */
const solutions = [
  {
    Icon: BookOpen,
    title: 'Semester-wise Roadmaps',
    desc: 'Structured learning paths from 3rd to 7th semester covering aptitude, DSA, core & more.',
  },
  {
    Icon: Calendar,
    title: 'Automated Test System',
    desc: 'Weekly, biweekly & monthly tests keep students consistent and exam-ready.',
  },
  {
    Icon: BarChart3,
    title: 'Real-time Analytics',
    desc: 'Track performance, compare with peers, and focus on what matters most.',
  },
  {
    Icon: Award,
    title: 'Placement Readiness',
    desc: 'Continuous improvement with AI insights ensures students become interview-ready.',
  },
]

/* ─── Beneficiary pills (bottom row) ─── */
const beneficiaries = [
  {
    Icon: Users,
    label: 'For Students',
    desc: 'Know what to study, track progress & improve consistently.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    Icon: Building2,
    label: 'For Colleges',
    desc: 'Better placement outcomes with data-driven insights.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    Icon: Target,
    label: 'For TPCs',
    desc: 'Monitor batches, identify gaps & make informed decisions.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    Icon: TrendingUp,
    label: 'Better Placements',
    desc: 'Stronger preparation today, better offers tomorrow.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
]

export function Features() {
  return (
    <section
      id="features"
      className="py-20 sm:py-24 lg:py-28 px-4 sm:px-6 lg:px-8 bg-white"
    >
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-12 sm:mb-16">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-100 mb-5">
            <Target className="w-4 h-4 flex-shrink-0" />
            The Placement Challenge
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-gray-900 leading-tight tracking-tight mb-4">
            Why Placements Fail — And How{' '}
            <span className="text-blue-600">ScholarPlace</span> Fixes It
          </h2>
          <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">
            We bridge the gap between where students are and where they need to be.
          </p>
        </div>

        {/* ── Two-column comparison ── */}
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-5 mb-8 sm:mb-10">

          {/* LEFT — Pain points */}
          <div className="rounded-2xl border border-red-100 bg-red-50/40 p-6 sm:p-8 h-full">
            {/* Panel header */}
            <div className="flex items-center gap-2 mb-6">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-base sm:text-lg font-bold text-red-600">
                Why Most Students Struggle
              </span>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {painPoints.map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-0.5">{title}</h4>
                    <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER — Arrow */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-gray-200 bg-white shadow-sm flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          {/* Mobile arrow */}
          <div className="flex lg:hidden items-center justify-center -my-1">
            <div className="w-9 h-9 rounded-full border-2 border-gray-200 bg-white shadow-sm flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-gray-500 rotate-90" />
            </div>
          </div>

          {/* RIGHT — Solutions */}
          <div className="rounded-2xl border border-green-100 bg-green-50/40 p-6 sm:p-8 h-full">
            {/* Panel header */}
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-base sm:text-lg font-bold text-green-700">
                How ScholarPlace Solves This
              </span>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {solutions.map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-800 mb-0.5">{title}</h4>
                    <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Beneficiary pills row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {beneficiaries.map(({ Icon, label, desc, color, bg }) => (
            <div
              key={label}
              className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
              </div>
              <div>
                <div className={`text-xs sm:text-sm font-bold ${color} mb-0.5`}>{label}</div>
                <div className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
