'use client'

import React, { useRef } from 'react'
import {
  BookOpen, BarChart3, Layers, Brain, Rocket,
  Target, CheckCircle2, GraduationCap, Calendar,
  ArrowRight
} from 'lucide-react'

const semesters = [
  {
    num: '3rd', title: 'Foundation', hours: '6–8 Hrs/Wk', Icon: BookOpen,
    accent: '#2563eb', lightBg: '#eff6ff',
    coreFocus: ['DSA & Programming Basics', 'Aptitude Fundamentals', 'Logical Reasoning Basics'],
    aptTopics: ['Number System', 'HCF & LCM', 'Simplification', 'Percentages Intro'],
    logicTopics: ['Series', 'Coding-Decoding', 'Odd One Out', 'Analogy'],
    dsaTopics: ['Variables & I/O', 'Loops & Patterns', 'Functions', '1D & 2D Arrays'],
    tests: ['Weekly MCQ', 'Monthly Aptitude'],
    outcome: 'Build a rock-solid base before advanced topics.',
  },
  {
    num: '4th', title: 'Intermediate', hours: '8–10 Hrs/Wk', Icon: BarChart3,
    accent: '#2563eb', lightBg: '#eff6ff',
    coreFocus: ['Advanced DSA (Arrays/Strings)', 'Quant Aptitude', 'SQL Basics'],
    aptTopics: ['Ratio & Proportion', 'Profit & Loss', 'Time & Work', 'Averages'],
    logicTopics: ['Syllogism', 'Blood Relations', 'Direction Sense', 'Puzzles'],
    dsaTopics: ['Binary Search', 'Two Pointers', 'Linked List', 'Merge Sort'],
    tests: ['Biweekly Aptitude', 'SQL Assessment'],
    outcome: 'Solve medium-level problems efficiently.',
  },
  {
    num: '5th', title: 'Advanced Logic', hours: '10–12 Hrs/Wk', Icon: Layers,
    accent: '#2563eb', lightBg: '#eff6ff',
    coreFocus: ['Trees, Graphs, DP Intro', 'Time-Speed-Distance, CI', 'OOPs Concepts'],
    aptTopics: ['Time-Speed-Distance', 'Compound Interest', 'Mixtures', 'Data Interpretation'],
    logicTopics: ['Data Sufficiency', 'Input-Output', 'Critical Reasoning'],
    dsaTopics: ['Stack & Queue', 'Binary Tree', 'BST', 'Graph (BFS/DFS)'],
    tests: ['OOPs MCQ', 'DSA Contest'],
    outcome: 'Prepare confidently for higher-level problems.',
  },
  {
    num: '6th', title: 'Industry Ready', hours: '10–14 Hrs/Wk', Icon: Brain,
    accent: '#2563eb', lightBg: '#eff6ff',
    coreFocus: ['Multi-Domain Skill Track', 'Advanced Graphs & DP', 'Advanced Aptitude'],
    aptTopics: ['Probability', 'Permutation', 'Advanced DI', 'Set Theory'],
    logicTopics: ['Advanced Puzzles', 'Decision Making', 'Cause & Effect'],
    dsaTopics: ['Dijkstra', 'DP (Knapsack)', 'Bit Manipulation', 'Trie'],
    tests: ['Domain Project', 'Mega Mock Test'],
    outcome: 'Become industry-ready with in-demand skills.',
  },
  {
    num: '7th', title: 'Placement', hours: '10–12 Hrs/Wk', Icon: Rocket,
    accent: '#2563eb', lightBg: '#eff6ff',
    coreFocus: ['Company-specific patterns', 'Full DSA Revision', 'Interviews & Resume'],
    aptTopics: ['TCS Pattern', 'Infosys Pattern', 'Wipro Pattern', 'Mixed Revision'],
    logicTopics: ['Group Discussion Prep', 'HR Questions', 'Statement Reasoning'],
    dsaTopics: ['System Design Basics', 'LLD & HLD', 'Mock Coding'],
    tests: ['Company Mock Tests', 'Final Assessment'],
    outcome: 'Get 100% placement-ready and crack offers.',
  },
]

export function Roadmap() {
  return (
    <section id="roadmap" className="py-20 relative overflow-hidden bg-white">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-50/60 blur-3xl" />
        <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-50/40 blur-3xl" />
      </div>

      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 mb-4 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> 0% to 100% Placement Ready
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            The Complete <span className="text-blue-600">Journey</span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base">
            A step-by-step timeline. We don't just teach—we guide you through every milestone until you land your dream job.
          </p>
        </div>

        {/* Timeline Container */}
        <div className="relative">
          
          {/* Continuous Progress Line (Desktop 5-col mode) */}
          <div className="hidden xl:block absolute top-[52px] left-0 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden z-0">
            <div className="h-full bg-blue-500 w-full opacity-15" />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 xl:gap-5 relative pt-2">
            {semesters.map((sem, i) => {
              const { Icon } = sem
              return (
                <div 
                  key={sem.num} 
                  className="relative group flex flex-col"
                >
                  
                  {/* Timeline Node & Connector Arrow (Desktop) */}
                  <div className="hidden xl:flex flex-col items-center mb-6 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-white border-4 shadow-md flex items-center justify-center transition-transform group-hover:scale-110" style={{ borderColor: sem.accent }}>
                      <span className="text-[11px] font-black" style={{ color: sem.accent }}>{sem.num}</span>
                    </div>
                    {i < semesters.length - 1 && (
                      <ArrowRight className="absolute top-2.5 -right-6 w-5 h-5 text-gray-300" />
                    )}
                  </div>

                  {/* The Card */}
                  <div 
                    className="flex-1 bg-white/60 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col overflow-hidden"
                  >
                    {/* Top Accent Line */}
                    <div className="h-1.5 w-full" style={{ background: sem.accent }} />

                    <div className="p-5 flex-1 flex flex-col">
                      
                      {/* Card Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: sem.lightBg }}>
                          <Icon className="w-5 h-5" style={{ color: sem.accent }} />
                        </div>
                        <div>
                          <div className="text-lg font-black text-gray-900 leading-tight">{sem.num} Sem</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: sem.accent }}>{sem.title}</div>
                        </div>
                      </div>

                      {/* Content Stack */}
                      <div className="space-y-4 flex-1">
                        
                        {/* Core Focus */}
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Target className="w-3 h-3" /> Core Focus
                          </div>
                          <ul className="space-y-1">
                            {sem.coreFocus.map(item => (
                              <li key={item} className="text-xs text-gray-700 flex items-start gap-1.5 leading-tight">
                                <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: sem.accent }} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Topics Container (Grey Box) */}
                        <div className="bg-gray-50/80 rounded-2xl p-3 space-y-3">
                          {/* Aptitude */}
                          <div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">📊 Aptitude</div>
                            <div className="flex flex-wrap gap-1">
                              {sem.aptTopics.map(t => (
                                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-gray-100 text-gray-600 shadow-sm">{t}</span>
                              ))}
                            </div>
                          </div>
                          {/* Logical */}
                          <div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">🧠 Logical</div>
                            <div className="flex flex-wrap gap-1">
                              {sem.logicTopics.map(t => (
                                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-gray-100 text-gray-600 shadow-sm">{t}</span>
                              ))}
                            </div>
                          </div>
                          {/* DSA */}
                          <div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">💻 DSA</div>
                            <div className="flex flex-wrap gap-1">
                              {sem.dsaTopics.map(t => (
                                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-gray-100 text-gray-600 shadow-sm">{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Tests */}
                        <div className="flex items-center gap-2 pt-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <div className="flex flex-wrap gap-1">
                            {sem.tests.map(t => (
                              <span key={t} className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{t}</span>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Outcome Footer */}
                      <div className="mt-5 pt-3 border-t border-gray-100 flex items-start gap-2">
                        <GraduationCap className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: sem.accent }} />
                        <p className="text-[11px] font-medium text-gray-800 leading-snug">{sem.outcome}</p>
                      </div>

                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}
