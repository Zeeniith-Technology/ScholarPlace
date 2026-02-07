'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

import { CodeEditor } from '@/components/ui/CodeEditor'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAuthHeader } from '@/utils/auth'
import {
    AlertTriangle,
    Maximize2,
    Timer,
    CheckCircle2,
    XCircle,
    Loader2,
    Lock,
    Terminal,
    Sparkles
} from 'lucide-react'
import { CodeReviewDisplay } from '@/components/coding/CodeReviewDisplay'


interface CodingProblem {
    _id: string
    question_id?: string
    title: string
    description?: string
    problem_statement?: string | any
    input_format?: string
    output_format?: string
    constraints?: string[]
    function_signature?: string
    test_cases?: any[]
    difficulty: string
    status?: 'pending' | 'passed' | 'failed'
}

export default function CapstoneTestPage() {
    const params = useParams()
    const router = useRouter()
    const weekNum = params?.week ? String(params.week).replace('week-', '') : '1'

    const [isLoading, setIsLoading] = useState(true)
    const [isBlocked, setIsBlocked] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const [problems, setProblems] = useState<CodingProblem[]>([])
    const [activeProblem, setActiveProblem] = useState<CodingProblem | null>(null)
    const [timeLeft, setTimeLeft] = useState(3600) // 1 Hour default
    const [warningCount, setWarningCount] = useState(0)
    const [selectedLanguage, setSelectedLanguage] = useState<'javascript' | 'python' | 'cpp' | 'c'>('cpp')
    const [showModal, setShowModal] = useState(false)
    const [isSubmittingCapstone, setIsSubmittingCapstone] = useState(false)
    const [modalContent, setModalContent] = useState({ title: '', message: '', type: 'info' as 'info' | 'success' | 'error' })
    // Persist code per problem so switching problems doesn't lose code
    const [codeByProblemId, setCodeByProblemId] = useState<Record<string, string>>({})
    // Track which problems have passed all test cases (required before final submit)
    const [problemPassedState, setProblemPassedState] = useState<Record<string, boolean>>({})
    // After capstone submit: submission_id per problem (for "View code review")
    const [submissionIdByProblemKey, setSubmissionIdByProblemKey] = useState<Record<string, string>>({})
    const [showCodeReviewModal, setShowCodeReviewModal] = useState(false)
    const [codeReviewSubmissionId, setCodeReviewSubmissionId] = useState<string | null>(null)
    // True when API returns all problems with status 'passed' (already completed this capstone)
    const [capstoneAlreadyCompleted, setCapstoneAlreadyCompleted] = useState(false)

    // Timer Ref
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const getDefaultCode = useCallback((problem: CodingProblem) => {
        const sig = problem.function_signature || ''
        if (selectedLanguage === 'cpp') {
            return `#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\n${sig} {\n    // Write your solution here\n    \n}\n\nint main() {\n    // You can test your function here\n    return 0;\n}`
        }
        if (selectedLanguage === 'c') {
            return `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n// ${sig}\n\nvoid solve() {\n    // Write your solution here\n}\n\nint main() {\n    solve();\n    return 0;\n}`
        }
        if (selectedLanguage === 'python') {
            return `import sys\nimport math\n\n# ${sig}\n\ndef solve():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()`
        }
        if (selectedLanguage === 'javascript') {
            return `/**\n * ${sig}\n */\n\nfunction solve() {\n    // Write your solution here\n}\n\n// console.log(solve());`
        }
        return sig
    }, [selectedLanguage])

    const allProblemsPassed = problems.length > 0 && problems.every(p => problemPassedState[p._id])
    const allProblemsHaveCode = problems.length > 0 && problems.every(p => ((codeByProblemId[p._id] ?? '').trim().length > 0))
    const canSubmitCapstone = allProblemsPassed && allProblemsHaveCode

    // Check Eligibility & Block Status
    const checkStatus = useCallback(async () => {
        try {
            const authHeader = getAuthHeader()
            if (!authHeader) return

            // 1. Check if blocked
            const blockRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/student-progress/check-blocked-retake`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({ week: weekNum, test_type: 'capstone' })
            })
            const blockData = await blockRes.json()

            if (blockData.success && blockData.data?.blocked) {
                setIsBlocked(true)
                setIsLoading(false)
                return
            }

            // 2. Fetch Problems
            const probRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/coding-problems/week/${weekNum}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                }
            })
            const probData = await probRes.json()

            if (probData.success) {
                const list = probData.problems || probData.data || []
                setProblems(list)
                // If all problems already passed, mark capstone as completed (no retake)
                const allPassed = list.length > 0 && list.every((p: CodingProblem) => p.status === 'passed')
                setCapstoneAlreadyCompleted(!!allPassed)
                // Initialize passed state from API so UI shows checkmarks for completed problems
                if (list.length > 0) {
                    setProblemPassedState(prev => {
                        const next = { ...prev }
                        list.forEach((p: CodingProblem) => {
                            if (p.status === 'passed' && p._id) next[p._id] = true
                        })
                        return next
                    })
                }
            }

        } catch (error) {
            console.error("Error checking status:", error)
            console.error("Failed to load test status");
        } finally {
            setIsLoading(false)
        }
    }, [weekNum])

    useEffect(() => {
        checkStatus()
    }, [checkStatus])

    // Block User Function
    const blockUser = async (reason: string) => {
        try {
            const authHeader = getAuthHeader()
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/student-progress/block-test-retake`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader || '' },
                body: JSON.stringify({
                    week: weekNum,
                    test_type: 'capstone',
                    reason
                })
            })
            setIsBlocked(true)
            alert(`Test terminated: ${reason}`)
        } catch (error) {
            console.error("Error blocking user:", error)
        }
    }

    // Fullscreen Enforcement & Tab Switching
    useEffect(() => {
        if (!hasStarted || isBlocked) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setWarningCount((prev: number) => {
                    const newCount = prev + 1
                    // Limit 1: single tab switch requires Dept TPC approval
                    if (newCount >= 1) {
                        blockUser("Tab switch detected. Department TPC approval required for retake.")
                    }
                    return newCount
                })
            }
        }

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                // User exited fullscreen
                setWarningCount((prev: number) => {
                    const newCount = prev + 1
                    if (newCount >= 3) {
                        blockUser("Exited fullscreen mode multiple times")
                    } else {
                        // toast.error(`Warning ${newCount}/3: Return to fullscreen immediately!`, { duration: 4000 })
                        alert(`Warning ${newCount}/3: Return to fullscreen immediately!`)
                        // Attempt to force back? Browsers block this usually without user interaction
                    }
                    return newCount
                })
            }
        }

        // Prevent Context Menu
        const preventRightClick = (e: MouseEvent) => e.preventDefault()

        document.addEventListener('visibilitychange', handleVisibilityChange)
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        document.addEventListener('contextmenu', preventRightClick)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            document.removeEventListener('contextmenu', preventRightClick)
        }
    }, [hasStarted, isBlocked])

    // Timer Logic
    useEffect(() => {
        if (hasStarted && !isBlocked && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev: number) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!)
                        // Auto-submit or finish
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } else if (timeLeft === 0) {
            // Time over logic
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [hasStarted, isBlocked, timeLeft])


    const startTest = async () => {
        try {
            await document.documentElement.requestFullscreen()
            setHasStarted(true)
        } catch (err) {
            alert("Fullscreen is required to start the test")
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-100">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (isBlocked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
                <Card className="max-w-md w-full p-8 text-center border-red-500/30 bg-red-50/10">
                    <Lock className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Test Locked</h1>
                    <p className="text-neutral-600 mb-6">
                        Your test session has been terminated due to a violation of strict mode rules (Tab switch or Fullscreen exit).
                    </p>
                    <div className="p-4 bg-base-200 rounded-lg text-sm text-center mb-6">
                        Please contact your Department TPC to request approval to retake this test.
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full border border-neutral-300"
                        onClick={() => {
                            if (typeof window !== 'undefined') window.close();
                        }}
                    >
                        Close
                    </Button>
                </Card>
            </div>
        )
    }

    if (capstoneAlreadyCompleted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
                <Card className="max-w-md w-full p-8 text-center border-green-500/30 bg-green-50/10">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
                    <h1 className="text-2xl font-bold text-green-700 mb-2">Capstone Completed</h1>
                    <p className="text-neutral-600 mb-6">
                        You have already passed and submitted this week&apos;s capstone project. You cannot submit again.
                    </p>
                    <Button
                        className="w-full bg-primary hover:bg-primary-dark text-white"
                        onClick={() => {
                            if (typeof window !== 'undefined' && window.opener) window.close();
                            else router.push(`/student/study/week-${weekNum}`);
                        }}
                    >
                        Back to Study
                    </Button>
                </Card>
            </div>
        );
    }

    if (!hasStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
                <Card className="max-w-2xl w-full p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Capstone Project - Week {weekNum}</h1>
                        <p className="text-neutral-500">Strict Proctored Environment</p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-start gap-4 p-4 bg-warning/10 rounded-lg border border-warning/20">
                            <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold text-warning-content mb-1">Strict Mode Enforcement</h3>
                                <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1">
                                    <li>Fullscreen mode is mandatory.</li>
                                    <li>Switching tabs not allowed.</li>
                                    <li>Exiting fullscreen will require Department TPC approval to Retake the test.</li>
                                    <li>Right-click and copy-paste capabilities are disabled.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Timer className="w-5 h-5 text-neutral-500" />
                                <span className="font-medium">Duration</span>
                            </div>
                            <span className="font-bold">60 Minutes</span>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        className="w-full font-bold text-lg h-12"
                        onClick={startTest}
                    >
                        Start Assessment
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-base-100 flex flex-col">
            {/* Header / Timer Bar */}
            <div className="bg-neutral-900 text-white p-4 flex items-center justify-between shadow-lg z-50 sticky top-0">
                <div className="font-bold text-lg">Capstone Project</div>
                <div className={`text-2xl font-mono font-bold ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-primary'}`}>
                    {formatTime(timeLeft)}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                        disabled={!canSubmitCapstone || isSubmittingCapstone}
                        onClick={async () => {
                            if (!canSubmitCapstone || isSubmittingCapstone) return
                            if (!confirm('Submit capstone? Both solutions will be saved. You cannot change them after submission.')) return
                            setIsSubmittingCapstone(true)
                            try {
                                const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
                                const authHeader = getAuthHeader()
                                if (!authHeader) {
                                    setModalContent({ title: 'Error', message: 'Authentication required.', type: 'error' })
                                    setShowModal(true)
                                    return
                                }
                                // 1) Submit code for each problem (saves submission + triggers AI review when passed)
                                const submitPayloads = problems.map((p) => ({
                                    problemId: p.question_id || p._id,
                                    solution: codeByProblemId[p._id] ?? '',
                                    language: selectedLanguage,
                                }))
                                const submitResults = await Promise.all(
                                    submitPayloads.map((payload) =>
                                        fetch(`${apiBaseUrl}/coding-problems/submit`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                                            body: JSON.stringify(payload),
                                        }).then((r) => r.json())
                                    )
                                )
                                const submissionIds: Record<string, string> = {}
                                submitResults.forEach((res: any, i: number) => {
                                    const p = problems[i]
                                    if (p && res.submission_id) {
                                        const sid = typeof res.submission_id === 'string' ? res.submission_id : String(res.submission_id)
                                        submissionIds[p._id] = sid
                                    }
                                })
                                setSubmissionIdByProblemKey(submissionIds)
                                // 2) Mark each problem as completed for progress
                                const completeResults = await Promise.all(
                                    problems.map((p) =>
                                        fetch(`${apiBaseUrl}/student-progress/complete-coding-problem`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                                            body: JSON.stringify({ week: weekNum, problem_id: p.question_id || p._id }),
                                        }).then((r) => r.json())
                                    )
                                )
                                const allOk = completeResults.every((r: any) => r.success)
                                if (allOk) {
                                    setModalContent({
                                        title: 'Success!',
                                        message: 'Capstone submitted successfully. You can proceed to Week 2.',
                                        type: 'success',
                                    })
                                    setProblems(prev => prev.map(p => ({ ...p, status: 'passed' })))
                                    if (activeProblem) setActiveProblem(prev => prev ? { ...prev, status: 'passed' } : null)
                                } else {
                                    setModalContent({
                                        title: 'Submission Failed',
                                        message: 'One or more solutions could not be saved. Please try again.',
                                        type: 'error',
                                    })
                                }
                                setShowModal(true)
                            } catch (e) {
                                console.error(e)
                                setModalContent({
                                    title: 'Error',
                                    message: 'An error occurred while submitting. Please try again.',
                                    type: 'error',
                                })
                                setShowModal(true)
                            } finally {
                                setIsSubmittingCapstone(false)
                            }
                        }}
                    >
                        {isSubmittingCapstone ? 'Submitting…' : 'Submit Capstone'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/70 hover:text-white"
                        onClick={() => {
                            if (confirm("Are you sure you want to exit? Your progress may be lost.")) {
                                document.exitFullscreen().catch(() => { })
                                if (window.opener) {
                                    window.close();
                                } else {
                                    router.push(`/student/study/week-${weekNum}`)
                                }
                            }
                        }}
                    >
                        Exit Test
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Problem List Sidebar */}
                <div className="w-64 bg-base-200 border-r overflow-y-auto p-4 hidden md:block">
                    <h3 className="font-semibold mb-4 text-sm uppercase text-neutral-500">Problems</h3>
                    <div className="space-y-2">
                        {problems.map((prob, idx) => (
                            <div
                                key={prob._id}
                                onClick={() => setActiveProblem(prob)}
                                className={`p-3 rounded border cursor-pointer transition-colors block ${activeProblem?._id === prob._id
                                    ? 'bg-primary/10 border-primary shadow-sm'
                                    : 'bg-base-100 border-base-300 hover:border-primary/50'
                                    }`}
                            >
                                <div className="text-xs text-neutral-500 mb-1">Problem {idx + 1}</div>
                                <div className="font-medium truncate">{prob.title}</div>
                            </div>
                        ))}
                        {problems.length === 0 && (
                            <div className="text-sm text-neutral-500 italic">No problems found for this week.</div>
                        )}
                    </div>
                </div>

                {/* Workspace Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {activeProblem ? (
                        <div className="flex h-full">
                            {/* Problem Description (Left) */}
                            <div className="w-1/3 min-w-[350px] bg-base-100 border-r overflow-y-auto p-6 flex flex-col gap-6">
                                <div>
                                    <h2 className="text-xl font-bold mb-2">{activeProblem.title}</h2>
                                    <Badge
                                        className={`${activeProblem.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                            activeProblem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}
                                    >
                                        {activeProblem.difficulty}
                                    </Badge>
                                </div>

                                <div className="prose prose-sm max-w-none text-neutral-800">
                                    <h3 className="text-xs font-bold uppercase text-neutral-500 mb-2">Description</h3>
                                    <div className="whitespace-pre-wrap mb-4 font-normal leading-relaxed">
                                        {/* Handle both string and object formats for robustness */}
                                        {typeof activeProblem.problem_statement === 'string'
                                            ? activeProblem.problem_statement
                                            : (activeProblem.problem_statement?.description || activeProblem.description || "No description available.")}
                                    </div>

                                    {(activeProblem.input_format || (typeof activeProblem.problem_statement !== 'string' && activeProblem.problem_statement?.input_format)) && (
                                        <>
                                            <h3 className="text-xs font-bold uppercase text-neutral-500 mb-2 mt-6">Input Format</h3>
                                            <div className="bg-base-200/50 p-3 rounded-md text-sm">
                                                {typeof activeProblem.input_format === 'string'
                                                    ? activeProblem.input_format
                                                    : activeProblem.problem_statement?.input_format}
                                            </div>
                                        </>
                                    )}

                                    {(activeProblem.output_format || (typeof activeProblem.problem_statement !== 'string' && activeProblem.problem_statement?.output_format)) && (
                                        <>
                                            <h3 className="text-xs font-bold uppercase text-neutral-500 mb-2 mt-6">Output Format</h3>
                                            <div className="bg-base-200/50 p-3 rounded-md text-sm">
                                                {typeof activeProblem.output_format === 'string'
                                                    ? activeProblem.output_format
                                                    : activeProblem.problem_statement?.output_format}
                                            </div>
                                        </>
                                    )}

                                    {(activeProblem.constraints && activeProblem.constraints.length > 0) && (
                                        <>
                                            <h3 className="text-xs font-bold uppercase text-neutral-500 mb-2 mt-6">Constraints</h3>
                                            <ul className="list-disc list-inside bg-base-200/50 p-3 rounded-md text-sm space-y-1">
                                                {activeProblem.constraints.map((c: string, i: number) => (
                                                    <li key={i} className="font-mono text-xs">{c}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}

                                    {(activeProblem.test_cases && activeProblem.test_cases.length > 0) && (
                                        <>
                                            <h3 className="text-xs font-bold uppercase text-neutral-500 mb-2 mt-6">Test cases</h3>
                                            <p className="text-xs text-neutral-500 mb-2">
                                                Input is passed to your program as <strong>stdin</strong>. Use <code className="bg-base-200 px-1 rounded">cin &gt;&gt; n</code> (C++), <code className="bg-base-200 px-1 rounded">scanf</code> (C), or <code className="bg-base-200 px-1 rounded">input()</code> (Python) in your code. Run to see results for each test.
                                            </p>
                                            <div className="space-y-2">
                                                {(activeProblem.test_cases as any[]).slice(0, 5).map((tc: any, i: number) => (
                                                    <div key={i} className="bg-base-200/50 p-3 rounded-md text-sm border border-base-300/50">
                                                        <span className="font-semibold text-neutral-600">Test {i + 1}:</span>{' '}
                                                        <span className="text-neutral-700">{tc.input ?? tc.stdin ?? '—'}</span>
                                                        {tc.output != null || tc.expected_output != null ? (
                                                            <div className="mt-1 text-neutral-600">Expected: <code className="text-xs">{tc.expected_output ?? tc.output ?? ''}</code></div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Code Editor (Right) - controlled value so switching problems keeps code */}
                            <div className="flex-1 relative overflow-hidden bg-[#1e1e1e] border-l border-gray-800 flex flex-col">
                                <CodeEditor
                                    key={`${activeProblem._id}-${selectedLanguage}`}
                                    problemId={activeProblem._id}
                                    value={codeByProblemId[activeProblem._id] ?? getDefaultCode(activeProblem)}
                                    defaultValue={getDefaultCode(activeProblem)}
                                    onChange={(code) => setCodeByProblemId(prev => ({ ...prev, [activeProblem._id]: code }))}
                                    language={selectedLanguage}
                                    onTestComplete={(results) => {
                                        const allPassed = results.every((r: any) => r.passed);
                                        setProblemPassedState(prev => ({ ...prev, [activeProblem._id]: allPassed }));
                                    }}
                                    testCases={(activeProblem.test_cases || []).map((tc: any) => ({
                                        ...tc,
                                        expectedOutput: tc.expectedOutput || tc.output || tc.expected_output
                                    }))}
                                    hideSubmitButton
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-center p-8 bg-base-200/50">
                            <div>
                                <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Terminal className="w-8 h-8 text-neutral-400" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Ready to Code?</h3>
                                <p className="text-neutral-500">Select a problem from the sidebar to begin.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={modalContent.title}
                size="sm"
            >
                <div className="flex flex-col items-center justify-center p-4 text-center">
                    {modalContent.type === 'success' ? (
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                    ) : modalContent.type === 'error' ? (
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-blue-600" />
                        </div>
                    )}

                    <p className="text-neutral text-lg mb-6">{modalContent.message}</p>

                    {modalContent.type === 'success' && Object.keys(submissionIdByProblemKey).length > 0 && (
                        <div className="w-full mb-4 flex flex-col gap-2">
                            <span className="text-sm font-medium text-neutral-600">View AI code review:</span>
                            {problems.map((p, idx) => {
                                const sid = submissionIdByProblemKey[p._id]
                                if (!sid) return null
                                return (
                                    <Button
                                        key={p._id}
                                        variant="secondary"
                                        className="w-full gap-2"
                                        onClick={() => {
                                            setCodeReviewSubmissionId(sid)
                                            setShowCodeReviewModal(true)
                                        }}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Problem {idx + 1}: {p.title}
                                    </Button>
                                )
                            })}
                        </div>
                    )}

                    <Button
                        onClick={() => {
                            setShowModal(false)
                            if (modalContent.type === 'success' && modalContent.message.includes('proceed to Week 2')) {
                                document.exitFullscreen().catch(() => {})
                                if (typeof window !== 'undefined' && window.opener) window.close()
                                else router.push(`/student/study/week-${weekNum}`)
                            }
                        }}
                        className={modalContent.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-dark'}
                    >
                        {modalContent.type === 'error' ? 'Try Again' : (modalContent.type === 'success' && modalContent.message.includes('proceed to Week 2') ? 'Proceed to Week 2' : 'Close')}
                    </Button>
                </div>
            </Modal>

            <CodeReviewDisplay
                isOpen={showCodeReviewModal}
                onClose={() => setShowCodeReviewModal(false)}
                submissionId={codeReviewSubmissionId}
            />
        </div>
    )
}
