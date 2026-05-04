'use client'

import React from 'react'
import {
  TrendingUp, AlertCircle, FileText, ShieldCheck,
  Users, BarChart3, Download, Target, CheckCircle2,
  Bell, Brain, ArrowUpRight, Building2, ChevronRight
} from 'lucide-react'

/* ── Bottom feature strip ─────────────────────────────────── */
const bottomFeatures = [
  { icon: ShieldCheck, label: 'Centralized Control',   desc: 'Manage all departments, batches & placement activities in one place.' },
  { icon: Users,       label: 'Role-Based Access',     desc: 'Secure access for TPCs, HODs, faculty & admins with custom permissions.' },
  { icon: Download,    label: 'Exportable Reports',    desc: 'Generate comprehensive reports for recruiters and leadership.' },
  { icon: BarChart3,   label: 'Placement Analytics',   desc: 'Advanced analytics to predict outcomes and improve placement rate.' },
  { icon: Target,      label: 'Outcome Focused',       desc: 'Everything you need to drive better results and student success.' },
]

/* ── Mock dashboard stats ─────────────────────────────────── */
const stats = [
  { label: 'Total Students',     value: '1,248', change: '+12.4%', up: true  },
  { label: 'Placement Ready',    value: '642',   change: '+18.7%', up: true  },
  { label: 'At-Risk Students',   value: '156',   change: '-8.3%',  up: false },
  { label: 'Avg. Placement Score', value: '72%', change: '+11.6%', up: true  },
]

const alerts = [
  { color: 'bg-red-500',    text: '32 students in CSE – Batch 2025 are underperforming in Aptitude', time: '2 hrs ago' },
  { color: 'bg-amber-400',  text: 'Low test score trend detected in ECE – Batch 2025',               time: '5 hrs ago' },
  { color: 'bg-blue-500',   text: '5 students need immediate attention in Coding Skills',             time: '1 day ago' },
]

const drives = [
  { company: 'TCS Digital',  date: 'May 20, 2025', eligible: 120, color: 'bg-blue-50 text-blue-600'   },
  { company: 'Infosys',      date: 'May 28, 2025', eligible: 98,  color: 'bg-green-50 text-green-600' },
  { company: 'Capgemini',    date: 'Jun 05, 2025', eligible: 110, color: 'bg-purple-50 text-purple-600' },
]

export function ForColleges() {
  return (
    <section
      id="for-colleges"
      className="relative py-24 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #f0f4ff 0%, #fafcff 50%, #f0fdf4 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── MAIN HERO SPLIT ─────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center mb-20">

          {/* LEFT — Copy */}
          <div className="space-y-8">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 mb-5">
                <Building2 className="w-3.5 h-3.5" /> For Colleges &amp; TPC Teams
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
                Run Placements Like a{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                  Data-Driven System
                </span>
              </h2>
            </div>

            <p className="text-lg text-gray-500 leading-relaxed max-w-lg">
              Empower your TPC team with real-time insights, early alerts, and actionable reports to maximize placement success across your entire campus.
            </p>

            {/* Feature list */}
            <ul className="space-y-5">
              {[
                { icon: TrendingUp, color: 'bg-blue-50 text-blue-600',   title: 'Real-Time Insights',       desc: 'Track student, batch, department & campus performance in real-time with powerful dashboards.' },
                { icon: Bell,       color: 'bg-green-50 text-green-600', title: 'Early Intervention',       desc: 'AI-powered alerts help you identify weak areas and at-risk students before it\'s too late.' },
                { icon: FileText,   color: 'bg-purple-50 text-purple-600', title: 'Data-Driven Decisions', desc: 'Make smarter placement strategies with in-depth analytics and exportable reports.' },
              ].map(({ icon: Icon, color, title, desc }) => (
                <li key={title} className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-base mb-0.5">{title}</div>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-blue-200"
                style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
              >
                Request a Demo <ChevronRight className="w-4 h-4" />
              </a>
              <a href="#pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">
                View Pricing <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* RIGHT — Mock Dashboard */}
          <div className="relative">

            {/* Floating: Placement Improvement badge */}
            <div className="absolute -top-6 -right-4 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-lg font-black text-emerald-600">+32%</div>
                <div className="text-[10px] text-gray-500 font-medium leading-tight">Placement Improvement<br />vs last academic year</div>
              </div>
            </div>

            {/* Floating: AI Detects badge */}
            <div className="absolute -bottom-4 right-6 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-black text-gray-900">AI Detects</div>
                <div className="text-[10px] text-gray-500 leading-tight">Weak Areas Early<br />For Better Outcomes</div>
              </div>
            </div>

            {/* Floating: Students Tracked badge */}
            <div className="absolute -bottom-4 left-0 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-lg font-black text-gray-900">1200+</div>
                <div className="text-[10px] text-gray-500 leading-tight">Students Tracked<br />Across 18 Departments</div>
              </div>
            </div>

            {/* Main dashboard card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">

              {/* Dashboard Top Bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white/90">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                    <BarChart3 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-bold text-gray-900">ScholarPlace TPC</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">TP</span>
                  </div>
                </div>
              </div>

              <div className="flex">
                {/* Sidebar */}
                <div className="w-28 bg-gray-50/70 border-r border-gray-100 py-4 px-3 flex-shrink-0 hidden sm:block">
                  {['Overview', 'Batches', 'Students', 'Assessments', 'Analytics', 'Reports', 'Companies', 'Alerts'].map((item, i) => (
                    <div
                      key={item}
                      className={`text-[10px] font-medium py-1.5 px-2 rounded-lg mb-0.5 cursor-default ${i === 0 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                {/* Main Content */}
                <div className="flex-1 p-4 space-y-4 min-w-0">

                  {/* Heading */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">Overview</span>
                    <div className="flex gap-1.5">
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">All Depts</span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">This Month</span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {stats.map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-2.5">
                        <div className="text-[9px] text-gray-400 mb-0.5">{s.label}</div>
                        <div className="text-base font-black text-gray-900">{s.value}</div>
                        <div className={`text-[9px] font-semibold ${s.up ? 'text-emerald-500' : 'text-red-400'}`}>
                          {s.change} vs last month
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Split: Alerts + Drives */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* Alerts */}
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Recent Alerts</div>
                      <div className="space-y-1.5">
                        {alerts.map((a, i) => (
                          <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-xl p-2.5">
                            <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${a.color}`} />
                            <div className="min-w-0">
                              <p className="text-[9px] text-gray-700 leading-snug">{a.text}</p>
                              <p className="text-[8px] text-gray-400 mt-0.5">{a.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Upcoming Drives */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Upcoming Drives</div>
                        <span className="text-[9px] text-blue-500 font-semibold cursor-pointer">View All</span>
                      </div>
                      <div className="space-y-1.5">
                        {drives.map((d, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-2.5 py-2">
                            <div>
                              <div className="text-[10px] font-bold text-gray-800">{d.company}</div>
                              <div className="text-[9px] text-gray-400">{d.date}</div>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${d.color}`}>
                              {d.eligible} Eligible
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM FEATURE STRIP ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
          {bottomFeatures.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-5 flex items-start gap-3 hover:shadow-md transition-shadow group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                <Icon className="w-4.5 h-4.5 text-blue-600 w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 mb-0.5">{label}</div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TRUST BAR ────────────────────────────────────────── */}
        {/* <div className="text-center"> */}
          {/* <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Trusted by <span className="font-bold text-gray-900">250+ Colleges &amp; Universities</span> Across India
          </div> */}
        {/* </div> */}

      </div>
    </section>
  )
}
