'use client'

import React, { useEffect, useState } from 'react'
import { ClipboardList, X } from 'lucide-react'
import { WeeklyFeedbackModal } from './WeeklyFeedbackModal'

/**
 * Global handler for the weekly-feedback gate.
 *
 * The backend blocks a student from entering week N until week N-1's feedback
 * is submitted, answering with 403 + { error: 'FEEDBACK_REQUIRED', required_week }.
 * Without this component the student would just see a page that silently failed
 * to load. This catches that response anywhere in the app and explains what to
 * do — and lets them submit the missing feedback right there.
 *
 * Implemented as a one-time window.fetch wrapper rather than a check on each
 * page: every student page calls fetch directly (there is no shared API client),
 * so this covers all of them — including any added later — from one place.
 */

interface GateState {
    requiredWeek: number
    requestedWeek: number | null
}

/**
 * The interceptor is installed at MODULE scope, not inside the component's
 * useEffect.
 *
 * Why: on a direct page load (typing the URL, or a refresh) a page's own data
 * fetch can fire before this component's effect has run, so the 403 goes unseen
 * and the student is left staring at "No questions available" with no
 * explanation of why. Patching at module evaluation — which happens while the
 * client bundle loads, before any component effect — closes that window.
 *
 * The most recent gate hit is held here and replayed to the component when it
 * mounts, so a 403 that arrives before mount is still shown.
 */
let pendingGate: GateState | null = null
let notify: ((g: GateState) => void) | null = null

function installInterceptor() {
    if (typeof window === 'undefined') return
    if ((window as any).__feedbackGateInstalled) return
    ;(window as any).__feedbackGateInstalled = true

    const originalFetch = window.fetch.bind(window)

    window.fetch = async (...args: Parameters<typeof fetch>) => {
        const response = await originalFetch(...args)

        // Only inspect 403s, and never disturb the response the caller receives
        // (the body is read from a clone).
        if (response.status === 403) {
            try {
                const data = await response.clone().json()
                if (data?.error === 'FEEDBACK_REQUIRED' && data?.required_week) {
                    const g: GateState = {
                        requiredWeek: Number(data.required_week),
                        requestedWeek: data.requested_week ? Number(data.requested_week) : null,
                    }
                    pendingGate = g
                    if (notify) notify(g)
                }
            } catch {
                /* not JSON, or already consumed — must never break a request */
            }
        }

        return response
    }
}

installInterceptor()

export function FeedbackRequiredGate() {
    const [gate, setGate] = useState<GateState | null>(null)
    const [showForm, setShowForm] = useState(false)

    useEffect(() => {
        installInterceptor() // no-op if already installed; covers odd mount orders
        notify = setGate
        // Replay a 403 that landed before this component mounted.
        if (pendingGate) setGate(pendingGate)
        return () => { notify = null }
    }, [])

    /** Clear both the local state and the replay buffer, or it reappears on remount. */
    const dismiss = () => {
        pendingGate = null
        setGate(null)
    }

    if (!gate) return null

    if (showForm) {
        return (
            <WeeklyFeedbackModal
                weekNumber={gate.requiredWeek}
                onClose={() => setShowForm(false)}
                onSubmitted={() => {
                    // Feedback is in — reload so the content that was blocked loads.
                    setShowForm(false)
                    pendingGate = null
                    setGate(null)
                    window.location.reload()
                }}
            />
        )
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="flex items-start justify-between gap-4 p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <ClipboardList className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                One quick step first
                            </h2>
                            <p className="text-sm text-gray-500">
                                Week {gate.requiredWeek} feedback pending
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={dismiss}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 pb-6">
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {gate.requestedWeek
                            ? `Please share your feedback on Week ${gate.requiredWeek} before moving on to Week ${gate.requestedWeek}. It only takes a minute, and it helps us improve the program.`
                            : `Please share your feedback on Week ${gate.requiredWeek} before moving on. It only takes a minute, and it helps us improve the program.`}
                    </p>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={dismiss}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Not now
                        </button>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                            Give feedback
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
