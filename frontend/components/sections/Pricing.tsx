'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Building2, Users, CheckCircle2, ShieldCheck,
  BarChart3, HeadphonesIcon, ChevronRight, Star, GraduationCap
} from 'lucide-react'

const collegeFeatures = [
  { title: 'Centralized TPC Dashboard',       desc: 'Monitor all departments and batches in one place' },
  { title: 'Advanced Analytics & Reports',    desc: 'In-depth insights to drive placement outcomes' },
  { title: 'Student Performance Tracking',    desc: 'Track readiness, progress & engagement in real-time' },
  { title: 'AI-Powered Insights & Alerts',    desc: 'Identify weak areas and at-risk students early' },
  { title: 'Recruiter-Ready Reports',         desc: 'Export industry-standard reports in one click' },
  { title: 'Role-Based Access',               desc: 'Define access for TPCs, HODs & faculty' },
]

const studentFeatures = [
  { title: 'Personalized Learning Roadmap',   desc: 'Semester-wise plan tailored to your goals' },
  { title: 'Weekly Tests & Practice',         desc: 'MCQs, coding & aptitude – practice consistently' },
  { title: 'Performance Analytics',           desc: 'Track your strengths, weaknesses & improvement' },
  { title: 'Rank & Peer Comparison',          desc: 'See where you stand among your peers' },
  { title: 'AI Study Recommendations',        desc: 'Get smart suggestions to improve faster' },
  { title: 'Learn Anytime, Anywhere',         desc: 'Web & mobile access – study on the go' },
]

const bottomFeatures = [
  { icon: ShieldCheck,    label: 'Trusted & Secure',   desc: 'Enterprise-grade security you can rely on',         color: 'text-blue-600 bg-blue-50'   },
  { icon: Users,          label: 'Built for TPCs',      desc: 'Designed by placement experts for placement teams', color: 'text-emerald-600 bg-emerald-50' },
  { icon: BarChart3,      label: 'Impact That Matters', desc: 'Drive better outcomes across your campus',          color: 'text-orange-500 bg-orange-50' },
  { icon: HeadphonesIcon, label: 'Dedicated Support',   desc: "We're with you at every step of your journey",     color: 'text-purple-600 bg-purple-50' },
]

type Tab = 'college' | 'student'

export function Pricing() {
  const [activeTab, setActiveTab] = useState<Tab>('college')

  return (
    <section
      id="pricing"
      className="relative py-24 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #eef2ff 0%, #f8faff 50%, #f0fdf4 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/3 w-[500px] h-[300px] bg-blue-100/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-100/30 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── HEADER ── */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 mb-5">
            <Image src="/images/Small_Logo.png" alt="SP" width={16} height={16} className="rounded object-contain" />
            Flexible Plans
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
            Choose the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Right Plan</span>
            {' '}for Your Needs
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Whether you're a college managing placements or a student preparing individually —{' '}
            we've got you covered.
          </p>
        </div>

        {/* ── PRICING CARDS ── */}
        <div className="relative grid md:grid-cols-2 gap-6 mb-12 items-stretch mt-12 lg:mt-24">

          {/* Left — handwriting label + curved arrow */}
          <div className="hidden lg:flex flex-col items-end absolute -top-20 xl:-top-24 left-10 xl:left-0 gap-0 pointer-events-none">
            <span
              className="text-blue-500 text-right leading-snug mb-1"
              style={{ fontFamily: 'var(--font-caveat)', fontSize: '20px' }}
            >
              Ideal for<br />Placement Teams
            </span>
            {/* Blue curved arrow pointing down-right into the card */}
            <svg width="70" height="50" viewBox="0 0 80 54" fill="none">
              <path d="M 8 6 C 20 4, 58 18, 72 46" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              <path d="M 72 46 L 60 41 L 65 32 Z" fill="#3b82f6" stroke="#3b82f6" strokeWidth="0.5" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Right — handwriting label + curved arrow */}
          <div className="hidden lg:flex flex-col items-start absolute -top-20 xl:-top-24 right-10 xl:right-0 gap-0 pointer-events-none">
            <span
              className="text-purple-500 text-left leading-snug mb-1"
              style={{ fontFamily: 'var(--font-caveat)', fontSize: '20px' }}
            >
              Ideal for<br />Students
            </span>
            {/* Purple curved arrow pointing down-left into the card (flipped horizontally) */}
            <svg width="70" height="50" viewBox="0 0 80 54" fill="none" className="-scale-x-100">
              <path d="M 8 6 C 20 4, 58 18, 72 46" stroke="#9333ea" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              <path d="M 72 46 L 60 41 L 65 32 Z" fill="#9333ea" stroke="#9333ea" strokeWidth="0.5" strokeLinejoin="round" />
            </svg>
          </div>

          {/* ── COLLEGE CARD ── */}
          <div
            className={`rounded-3xl border-2 transition-all duration-300 flex flex-col ${
              activeTab === 'college'
                ? 'border-blue-300 shadow-2xl shadow-blue-100'
                : 'border-gray-200 shadow-md'
            }`}
            style={{ background: activeTab === 'college' ? 'linear-gradient(145deg, #eff6ff 0%, #ffffff 70%)' : 'white' }}
          >
            <div className="p-8 flex flex-col flex-1">
              {/* Most Popular badge — INSIDE card, properly centered */}
              <div className="flex justify-center mb-6">
                <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[11px] font-bold text-white shadow-md" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                  <Star className="w-3 h-3 fill-white" /> Most Popular
                </span>
              </div>

              {/* Card header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">For Colleges &amp; Universities</h3>
                  <p className="text-sm text-gray-500">Centralized placement management for entire institutions</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-1">
                {collegeFeatures.map(f => (
                  <li key={f.title} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{f.title}</div>
                      <div className="text-xs text-gray-500">{f.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href="#contact">
                <button className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-200 hover:scale-[1.02] transition-all" style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}>
                  <Building2 className="w-4 h-4" /> Book a Demo <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
              <p className="text-center text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                Custom pricing based on your institution&apos;s needs
              </p>
            </div>
          </div>

          {/* ── STUDENT CARD ── */}
          <div
            className={`rounded-3xl border-2 transition-all duration-300 flex flex-col ${
              activeTab === 'student'
                ? 'border-purple-300 shadow-2xl shadow-purple-100'
                : 'border-gray-200 shadow-md'
            }`}
            style={{ background: activeTab === 'student' ? 'linear-gradient(145deg, #faf5ff 0%, #ffffff 70%)' : 'white' }}
          >
            <div className="p-8 flex flex-col flex-1">
              {/* Spacer to align card header with college card */}
              <div className="mb-6 h-[26px]" />

              {/* Card header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">For Individual Students</h3>
                  <p className="text-sm text-gray-500">Self-paced preparation to crack placement interviews</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-1">
                {studentFeatures.map(f => (
                  <li key={f.title} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{f.title}</div>
                      <div className="text-xs text-gray-500">{f.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href="#contact">
                <button className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-200 hover:scale-[1.02] transition-all" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
                  Get Started <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
              <p className="text-center text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-purple-400" />
                Affordable plans for every student
              </p>
            </div>
          </div>
        </div>

        {/* ── BOTTOM FEATURE STRIP ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {bottomFeatures.map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="bg-white/70 backdrop-blur border border-white/80 rounded-2xl p-5 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 mb-0.5">{label}</div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TRUST BAR ── */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <Image src="/images/Small_Logo.png" alt="SP" width={18} height={18} className="rounded object-contain opacity-60" />
            Trusted by <span className="font-bold text-gray-800 mx-1">25+ Colleges &amp; Universities</span> Across India
          </div>
        </div>

      </div>
    </section>
  )
}
