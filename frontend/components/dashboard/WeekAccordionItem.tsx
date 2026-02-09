'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Code2, Calculator } from 'lucide-react'

interface TestItem {
    _id: string
    day?: string
    week?: string | number
    title?: string
    problem_title?: string
    completed_at?: string
    submitted_at?: string
    score?: number
    total_questions?: number
    correct_answers?: number
    category?: string
    is_capstone?: boolean
}

interface WeekAccordionItemProps {
    weekNum: number
    dsa: TestItem[]
    aptitude: TestItem[]
}

export function WeekAccordionItem({ weekNum, dsa, aptitude }: WeekAccordionItemProps) {
    const [isOpen, setIsOpen] = useState(false)

    const hasDSA = dsa.length > 0
    const hasAptitude = aptitude.length > 0

    if (!hasDSA && !hasAptitude) return null

    return (
        <div className="rounded-xl border border-neutral-light/20 overflow-hidden bg-white shadow-sm transition-all duration-200 hover:shadow-md">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        W{weekNum}
                    </div>
                    <h3 className="font-semibold text-neutral text-base">Week {weekNum}</h3>
                    <span className="text-xs text-neutral-light bg-neutral-100 px-2 py-0.5 rounded-full">
                        {dsa.length + aptitude.length} Tests
                    </span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-neutral-light" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-light" />
                )}
            </button>

            {isOpen && (
                <div className="p-4 space-y-6 border-t border-neutral-light/10 animate-in slide-in-from-top-2 duration-200">
                    {hasDSA && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                                <Code2 className="w-3.5 h-3.5" />
                                <span>DSA Progress</span>
                            </div>
                            <ul className="grid gap-2">
                                {dsa.map((t: any, idx: number) => {
                                    const dateStr = (t.completed_at || t.submitted_at)
                                        ? new Date(t.completed_at || t.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                        : '—'

                                    // Handle Problem Title Display
                                    const displayTitle = t.problem_title || t.title || 'Unknown Problem'
                                    const displayDay = t.day ? String(t.day).replace('-', ' ') : 'Practice'

                                    return (
                                        <li key={t._id || `dsa-${weekNum}-${idx}`} className="group flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50 hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-medium text-neutral-800 text-sm truncate">{displayTitle}</span>
                                                    {t.is_capstone && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Capstone</span>}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                    <span className="capitalize font-medium">{displayDay}</span>
                                                    <span>•</span>
                                                    <span>{dateStr}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs border border-green-100">
                                                    {t.score != null ? `${t.score}%` : 'Passed'}
                                                </span>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}

                    {hasAptitude && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider">
                                <Calculator className="w-3.5 h-3.5" />
                                <span>Aptitude</span>
                            </div>
                            <ul className="grid gap-2">
                                {aptitude.map((t: any, idx: number) => {
                                    const dateStr = t.completed_at ? new Date(t.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
                                    const displayTitle = t.title || 'Weekly Test'
                                    return (
                                        <li key={t._id || `apt-${weekNum}-${idx}`} className="group flex items-start justify-between gap-4 p-3 rounded-lg bg-orange-50/50 hover:bg-orange-50 border border-orange-100/50 hover:border-orange-200 transition-all">
                                            <div className="min-w-0">
                                                <div className="font-medium text-neutral-800 text-sm mb-0.5">{displayTitle}</div>
                                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                    <span>{t.day || 'Assessment'}</span>
                                                    <span>•</span>
                                                    <span>{dateStr}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={`font-bold text-xs px-2 py-0.5 rounded border ${(t.score || 0) >= 70
                                                    ? 'text-green-600 bg-green-50 border-green-100'
                                                    : 'text-orange-600 bg-orange-50 border-orange-100'
                                                    }`}>
                                                    {t.score != null ? `${t.score}%` : '—'}
                                                </span>
                                                {t.total_questions != null && (
                                                    <span className="text-[10px] text-neutral-400">{t.correct_answers ?? '—'}/{t.total_questions}</span>
                                                )}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
