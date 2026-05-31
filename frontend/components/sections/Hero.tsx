'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  FileText, LayoutDashboard, Users, BarChart3, BookOpen,
  Award, RefreshCw, Target, TrendingUp, Clock, Star, Calendar,
  CheckCircle, AlertTriangle, Zap, Code, Settings, ClipboardList,
  Brain, GraduationCap, PieChart, ScrollText
} from 'lucide-react'

/* ─── Sidebar nav items with icons ─── */
const sidebarItems = [
  { label: 'Dashboard',         Icon: LayoutDashboard, active: true  },
  { label: 'Students',          Icon: Users,           active: false },
  { label: 'Aptitude Monitoring',Icon: Brain,          active: false },
  { label: 'Coding Monitoring', Icon: Code,            active: false },
  { label: 'AI Reviews',        Icon: Star,            active: false },
  { label: 'Tests',             Icon: ClipboardList,   active: false },
  { label: 'Test Results',      Icon: ScrollText,      active: false },
  { label: 'Certificates',      Icon: Award,           active: false },
  { label: 'Analytics',         Icon: PieChart,        active: false },
  { label: 'Reports',           Icon: BarChart3,       active: false },
  { label: 'Settings',          Icon: Settings,        active: false },
]

/* ─── SP Logo component (uses actual image) ─── */
function SpLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex-shrink-0 rounded-lg overflow-hidden" style={{ width: size, height: size }}>
      <Image
        src="/images/Small_Logo.png"
        alt="ScholarPlace"
        width={size}
        height={size}
        className="object-contain w-full h-full"
        priority
      />
    </div>
  )
}

/* ─── Dept TPC Dashboard mockup ─── */
function DeptTPCCard() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-[540px] select-none pointer-events-none">
      {/* Top bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <SpLogo size={26} />
        <span className="text-xs font-bold text-gray-800">Department TPC Dashboard</span>
        <div className="ml-auto flex items-center gap-2">
          <RefreshCw className="w-3 h-3 text-gray-400" />
          <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5 font-semibold">
            Department TPC
          </span>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-40 bg-gray-50 border-r border-gray-100 py-2 flex-shrink-0">
          {sidebarItems.map(({ label, Icon, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2 px-3 py-1.5 mx-1.5 rounded-lg mb-0.5
                ${active ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
            >
              <Icon className={`w-3 h-3 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
              <span className={`text-[8px] font-medium truncate ${active ? 'text-white' : 'text-gray-500'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-3.5 space-y-3">
          <p className="text-[9px] text-gray-400">Manage students, track performance, and monitor progress</p>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Total Students',  val: '847',  sub: '821 active',           color: 'text-gray-800',  Icon: Users        },
              { label: 'Average Score',   val: '74%',  sub: 'Overall average',      color: 'text-green-600', Icon: TrendingUp   },
              { label: 'Tests Completed', val: '1,243',sub: 'Across all students',  color: 'text-amber-500', Icon: CheckCircle  },
              { label: 'Top Performers',  val: '312',  sub: 'Score ≥85%',           color: 'text-blue-600',  Icon: Star         },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-2 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[7.5px] text-gray-400 leading-tight">{s.label}</span>
                  <s.Icon className={`w-3 h-3 ${s.color}`} />
                </div>
                <div className={`text-sm font-bold ${s.color}`}>{s.val}</div>
                <div className="text-[7px] text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Bottom panels */}
          <div className="grid grid-cols-2 gap-2">
            {/* Top Performers */}
            <div className="bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm">
              <div className="flex items-center gap-1 mb-2">
                <Award className="w-3 h-3 text-blue-500" />
                <span className="text-[8px] font-bold text-gray-700">Top Performers</span>
                <span className="ml-auto text-[7px] text-blue-500">View All →</span>
              </div>
              {['Priya S. — 96%', 'Arjun M. — 94%', 'Nisha K. — 91%'].map((name) => (
                <div key={name} className="flex items-center gap-1.5 py-0.5">
                  <div className="w-3 h-3 rounded-full bg-blue-100 flex items-center justify-center">
                    <GraduationCap className="w-2 h-2 text-blue-500" />
                  </div>
                  <span className="text-[7.5px] text-gray-600">{name}</span>
                </div>
              ))}
            </div>
            {/* Needs Attention */}
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-2.5 shadow-sm">
              <div className="flex items-center gap-1 mb-2">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span className="text-[8px] font-bold text-gray-700">Needs Attention</span>
              </div>
              <div className="bg-white rounded-lg border border-amber-100 p-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-semibold text-gray-700">3 Students</span>
                  <span className="text-[7px] bg-red-100 text-red-500 rounded-full px-1.5 py-0.5">Below 40%</span>
                </div>
                <div className="text-[7px] text-gray-400 mt-0.5">Avg score: 32%</div>
                <div className="text-[7px] text-gray-400">Days completed: &lt; 2</div>
                <span className="text-[7px] text-blue-500 mt-0.5 block">View Profiles →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Student top nav items ─── */
const studentNav = [
  { label: 'Dashboard', Icon: LayoutDashboard, active: true  },
  { label: 'Learn',     Icon: BookOpen,         active: false },
  { label: 'Practice',  Icon: ClipboardList,    active: false },
  { label: 'AI Analysis',Icon: Brain,           active: false },
  { label: 'Certificate',Icon: Award,           active: false },
]

/* ─── Student Dashboard mockup ─── */
function StudentDashCard() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-[510px] select-none pointer-events-none">
      {/* Top nav */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100">
        <SpLogo size={24} />
        {studentNav.map(({ label, Icon, active }) => (
          <span
            key={label}
            className={`text-[8.5px] font-medium flex items-center gap-1 px-1.5 py-0.5 rounded-md
              ${active ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-gray-400'}`}
          >
            <Icon className={`w-2.5 h-2.5 ${active ? 'text-blue-500' : 'text-gray-300'}`} />
            {label}
          </span>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[7px] font-bold">S</span>
          </div>
          <div>
            <div className="text-[8px] font-semibold text-gray-700">My account</div>
            <div className="text-[7px] text-gray-400">Profile &amp; settings</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Good Evening, Student! 👋</h3>
            <p className="text-[9px] text-gray-400">Welcome back to your 6th Semester dashboard</p>
            <button className="mt-1 flex items-center gap-1 text-[8px] text-gray-500 border border-gray-200 rounded-md px-1.5 py-0.5 bg-white">
              <RefreshCw className="w-2 h-2" /> Refresh
            </button>
          </div>
          <span className="text-[8px] bg-green-50 text-green-600 border border-green-200 rounded-full px-2 py-0.5 font-semibold flex items-center gap-1">
            <BookOpen className="w-2.5 h-2.5" /> Week 5 of 8
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Overall Progress', val: '68%',    sub: '34 days completed', Icon: Target,      color: 'text-blue-500'  },
            { label: 'Tests Completed',  val: '12',     sub: '12 tests done',     Icon: CheckCircle, color: 'text-green-500' },
            { label: 'Current Streak',   val: '7 days', sub: 'Keep it up! 🔥',   Icon: Zap,         color: 'text-amber-500' },
            { label: 'Current Rank',     val: '#42',    sub: 'Out of 847',        Icon: Star,        color: 'text-purple-500'},
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-2 shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[7px] text-gray-400 leading-tight">{s.label}</span>
                <s.Icon className={`w-2.5 h-2.5 ${s.color}`} />
              </div>
              <div className={`text-[11px] font-bold ${s.color}`}>{s.val}</div>
              <div className="text-[7px] text-gray-400">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Upcoming tests */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold text-gray-700 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-blue-500" /> Upcoming Tests
            </span>
            <span className="text-[8px] text-blue-500">View All +</span>
          </div>
          <div className="space-y-1.5">
            {[
              { title: 'Week 5 Capstone Project', date: 'May 2 at 10:00 AM', type: 'Coding',  badge: 'bg-blue-100 text-blue-600',   label: 'DSA'     },
              { title: 'Week 5 Aptitude Test',    date: 'May 3 at 11:00 AM', type: 'Mixed',   badge: 'bg-green-100 text-green-600', label: 'Aptitude'},
            ].map(t => (
              <div key={t.title} className="bg-gray-50 rounded-xl border border-gray-100 p-2">
                <div className="text-[9px] font-semibold text-gray-700">{t.title}</div>
                <div className="text-[7px] text-gray-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-2 h-2" /> {t.date} · {t.type}
                </div>
                <span className={`inline-block text-[7px] font-medium rounded-full px-1.5 py-0.5 mt-1 ${t.badge}`}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'View Syllabus',  sub: 'Check modules',         Icon: BookOpen,    bg: 'bg-blue-50',   ic: 'text-blue-600',   txt: 'text-blue-700'   },
            { label: 'Take Test',      sub: 'Start assessment',      Icon: FileText,    bg: 'bg-green-50',  ic: 'text-green-600',  txt: 'text-green-700'  },
            { label: 'View Analytics', sub: 'Track progress',        Icon: BarChart3,   bg: 'bg-amber-50',  ic: 'text-amber-600',  txt: 'text-amber-700'  },
            { label: 'AI Analysis',    sub: 'Personalized insights', Icon: Brain,       bg: 'bg-purple-50', ic: 'text-purple-600', txt: 'text-purple-700' },
          ].map(a => (
            <div key={a.label} className="bg-white rounded-xl border border-gray-100 p-2 shadow-sm">
              <div className={`w-6 h-6 rounded-lg ${a.bg} flex items-center justify-center mb-1.5`}>
                <a.Icon className={`w-3.5 h-3.5 ${a.ic}`} />
              </div>
              <div className={`text-[7.5px] font-semibold leading-tight ${a.txt}`}>{a.label}</div>
              <div className="text-[6.5px] text-gray-400 leading-tight mt-0.5">{a.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Feature icons ─── */
const featurePills = [
  { Icon: BookOpen,      label: 'DSA + Aptitude Curriculum' },
  { Icon: FileText,      label: 'Weekly Tests & Assessments' },
  { Icon: BarChart3,     label: 'AI-Powered Analytics'      },
  { Icon: Users,         label: 'TPC Management Dashboard'  },
]

const stats = [
  { Icon: Users,          value: '500+', label: 'Students Trained'                 },
  { Icon: TrendingUp,     value: '3X',   label: 'Improvement in Placement Readiness'},
  { Icon: GraduationCap,  value: '25+',  label: 'Colleges Trust ScholarPlace'      },
]

/* ─── MAIN HERO ─── */
export function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden pt-32 pb-16 select-none"
      style={{ background: 'linear-gradient(160deg, #f0f5ff 0%, #f8faff 60%, #ffffff 100%)' }}
    >
      {/* Subtle background accent — very light, not blurry */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-100/25 blur-xl -top-32 -left-16" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-blue-50/30 blur-lg bottom-10 right-10" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-10 xl:gap-16 items-center">

          {/* ── LEFT ── */}
          <div className="space-y-6">

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-100 w-fit">
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              Placement Prep Platform for Engineering Colleges
            </div>

            {/* Headline — product-specific, scannable in 3s */}
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-[32px] sm:text-4xl lg:text-5xl font-heading font-extrabold text-gray-900 leading-tight tracking-tight">
                One Platform to Prepare<br className="hidden sm:block" /> Students for Campus Placements
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] sm:text-base lg:text-lg font-semibold text-blue-600">
                <span>DSA</span> <span className="opacity-50">·</span>
                <span>Aptitude</span> <span className="opacity-50">·</span>
                <span>Mock Tests</span> <span className="opacity-50">·</span>
                <span>Analytics</span> <span className="opacity-50">·</span>
                <span>TPC Dashboard</span>
              </div>
            </div>

            {/* Subtitle — SEO friendly, clear, specific */}
            <p className="text-[13px] sm:text-base text-gray-500 leading-relaxed max-w-lg">
              An all-in-one campus placement preparation platform. ScholarPlace guides students through a structured 3rd to 7th-semester curriculum, while empowering Department and College TPCs with real-time analytics and performance tracking to maximize hiring success.
            </p>

            {/* Feature pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {featurePills.map(({ Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-gray-600 font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <Link
                href="#contact"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3.5 rounded-xl shadow-[0_4px_24px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_28px_rgba(37,99,235,0.55)] transition-all duration-200 hover:-translate-y-0.5 select-none w-full sm:w-auto"
              >
                <Calendar className="w-4 h-4" />
                Book a Free Demo →
              </Link>
              <Link
                href="#student-experience"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3.5 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 select-none w-full sm:w-auto"
              >
                <FileText className="w-4 h-4" />
                See How It Works
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-5 border-t border-gray-200">
              {stats.map(({ Icon, value, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none">{value}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 leading-tight mt-0.5">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT — overlapping dashboard mockups ── */}
          <div className="relative hidden lg:flex items-start justify-center" style={{ minHeight: '580px' }}>

            {/* Back: Dept TPC */}
            <div
              className="absolute top-0 right-0 z-10 origin-top-right rounded-2xl"
              style={{
                transform: 'rotate(2deg) scale(0.83)',
                filter: 'drop-shadow(0 20px 60px rgba(37,99,235,0.15))',
              }}
            >
              <DeptTPCCard />
            </div>

            {/* Front: Student Dashboard */}
            <div
              className="absolute bottom-0 left-0 z-20 origin-bottom-left rounded-2xl"
              style={{
                transform: 'rotate(-1deg) scale(0.86)',
                filter: 'drop-shadow(0 24px 64px rgba(37,99,235,0.18))',
              }}
            >
              <StudentDashCard />
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
