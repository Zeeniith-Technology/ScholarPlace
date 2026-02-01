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
    Terminal
} from 'lucide-react'


interface CodingProblem {
    _id: string
    title: string
    description?: string
    problem_statement?: string | any
    input_format?: string
    output_format?: string
    constraints?: string[]
    function_signature?: string
    test_cases?: any[]
    difficulty: string // Restored
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
    const [canSubmit, setCanSubmit] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [modalContent, setModalContent] = useState({ title: '', message: '', type: 'info' as 'info' | 'success' | 'error' })

    // Timer Ref
    const timerRef = useRef<NodeJS.Timeout | null>(null)

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
                // Backend returns 'problems' array, not 'data'
                setProblems(probData.problems || probData.data || [])
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
            alert(`Test Terminated: ${reason}`)
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
                    // Disabled auto-block for testing/user request
                    // if (newCount >= 3) {
                    //    blockUser("Multiple tab switches detected")
                    // } else {
                    // toast.error(`Warning ${newCount}/3: Do not switch tabs!`, { duration: 4000 })
                    alert(`Warning ${newCount}: Please stay on the tab.`)
                    // }
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
                        onClick={() => router.push(`/student/study/week-${weekNum}`)}
                    >
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        )
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
                                    <li>Switching tabs or exiting fullscreen will trigger a warning.</li>
                                    <li>3 warnings will result in an immediate block.</li>
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
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white"
                    onClick={() => {
                        if (confirm("Are you sure you want to exit? Your progress may be lost.")) {
                            document.exitFullscreen().catch(() => { })
                            // If opened in a new window/popup, close it. Otherwise, navigate back.
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
                                </div>
                            </div>

                            {/* Code Editor (Right) */}
                            <div className="flex-1 relative overflow-hidden bg-[#1e1e1e] border-l border-gray-800">
                                <CodeEditor
                                    key={`${activeProblem._id}-${selectedLanguage}`}
                                    problemId={activeProblem._id}
                                    defaultValue={(() => {
                                        const sig = activeProblem.function_signature || "";

                                        if (selectedLanguage === 'cpp') {
                                            return `#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\n${sig} {\n    // Write your solution here\n    \n}\n\nint main() {\n    // You can test your function here\n    return 0;\n}`;
                                        }

                                        if (selectedLanguage === 'c') {
                                            return `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n// Warning: Signature below is C++ style. Update for C.\n// ${sig}\n\nvoid solve() {\n    // Write your solution here\n}\n\nint main() {\n    solve();\n    return 0;\n}`;
                                        }

                                        if (selectedLanguage === 'python') {
                                            return `import sys\nimport math\n\n# ${sig}\n\ndef solve():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()`;
                                        }

                                        if (selectedLanguage === 'javascript') {
                                            return `/**\n * ${sig}\n */\n\nfunction solve() {\n    // Write your solution here\n}\n\n// console.log(solve());`;
                                        }

                                        return sig;
                                    })()}
                                    language={selectedLanguage}
                                    onTestComplete={(results) => {
                                        const allPassed = results.every(r => r.passed);
                                        setCanSubmit(allPassed);
                                    }}
                                    testCases={(activeProblem.test_cases || []).map((tc: any) => ({
                                        ...tc,
                                        expectedOutput: tc.expectedOutput || tc.output || tc.expected_output
                                    }))}
                                    onSubmit={async () => {
                                        if (!canSubmit) {
                                            setModalContent({
                                                title: 'Tests Not Passed',
                                                message: 'Please run your code and ensure ALL test cases pass before submitting.',
                                                type: 'error'
                                            });
                                            setShowModal(true);
                                            return;
                                        }

                                        try {
                                            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
                                            const authHeader = getAuthHeader()

                                            // Call backend to save
                                            const response = await fetch(`${apiBaseUrl}/student-progress/complete-coding-problem`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': authHeader!
                                                },
                                                body: JSON.stringify({
                                                    week: weekNum,
                                                    problem_id: activeProblem._id
                                                })
                                            });

                                            const data = await response.json();

                                            if (data.success) {
                                                setModalContent({
                                                    title: 'Success!',
                                                    message: 'Solution Submitted & Saved Successfully! 🚀',
                                                    type: 'success'
                                                });
                                                setShowModal(true);

                                                setProblems(prev => prev.map(p =>
                                                    p._id === activeProblem._id ? { ...p, status: 'passed' } : p
                                                ));
                                                setActiveProblem(prev => prev ? { ...prev, status: 'passed' } : null);
                                            } else {
                                                setModalContent({
                                                    title: 'Submission Failed',
                                                    message: "Failed to save progress: " + data.message,
                                                    type: 'error'
                                                });
                                                setShowModal(true);
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            setModalContent({
                                                title: 'Error',
                                                message: "An error occurred while submitting solution.",
                                                type: 'error'
                                            });
                                            setShowModal(true);
                                        }
                                    }}
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

                    <Button
                        onClick={() => setShowModal(false)}
                        className={modalContent.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-dark'}
                    >
                        {modalContent.type === 'error' ? 'Try Again' : 'Close'}
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
