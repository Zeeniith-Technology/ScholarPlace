'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
    ArrowLeft,
    Code,
    Play,
    CheckCircle2,
    Clock,
    Target,
    Lightbulb,
    FileCode,
    Terminal,
} from 'lucide-react'
import { getAuthHeader } from '@/utils/auth'

interface TestCase {
    input: string
    output: string
    explanation: string
}

interface CodingProblem {
    question_id: string
    week: number
    title: string
    problem_statement: string
    function_signature: string
    input_format: string
    output_format: string
    constraints: string[]
    test_cases: TestCase[]
    expected_complexity: {
        time: string
        space: string
        reasoning: string
    }
    hints: string[]
    difficulty: string
    estimated_time_minutes: number
    concepts_tested: string[]
}

export default function CodingProblemPage() {
    const router = useRouter()
    const params = useParams()
    const problemId = params.problemId as string

    const [problem, setProblem] = useState<CodingProblem | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showHints, setShowHints] = useState(false)
    const [solution, setSolution] = useState('')

    useEffect(() => {
        if (problemId) {
            fetchProblem()
        }
    }, [problemId])

    const fetchProblem = async () => {
        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            const response = await fetch(`${apiBaseUrl}/coding-problems/${problemId}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                },
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success && result.problem) {
                    setProblem(result.problem)
                }
            }
        } catch (error) {
            console.error('Error fetching coding problem:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!solution.trim()) {
            alert('Please write your solution before submitting!')
            return
        }

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            const response = await fetch(`${apiBaseUrl}/coding-problems/submit`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                },
                body: JSON.stringify({
                    problemId: problemId,
                    solution: solution,
                    language: 'cpp',
                }),
            })

            if (response.ok) {
                const result = await response.json()
                alert(result.message || 'Solution submitted successfully!')
            }
        } catch (error) {
            console.error('Error submitting solution:', error)
            alert('Error submitting solution. Please try again.')
        }
    }

    if (isLoading) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-neutral-light">Loading problem...</p>
                    </div>
                </div>
            </StudentLayout>
        )
    }

    if (!problem) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <Code className="w-16 h-16 text-neutral-light mx-auto mb-4" />
                        <p className="text-neutral-light">Problem not found</p>
                        <Button onClick={() => router.back()} className="mt-4">
                            Go Back
                        </Button>
                    </div>
                </div>
            </StudentLayout>
        )
    }

    return (
        <StudentLayout>
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-neutral-light/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-neutral">{problem.title}</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <Badge variant={problem.difficulty === 'EASY' ? 'success' : problem.difficulty === 'MEDIUM' ? 'warning' : 'error'}>
                                {problem.difficulty}
                            </Badge>
                            <span className="text-sm text-neutral-light flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {problem.estimated_time_minutes} min
                            </span>
                            <span className="text-sm text-neutral-light">Week {problem.week}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Panel - Problem Description */}
                    <div className="space-y-6">
                        {/* Problem Statement */}
                        <Card>
                            <h2 className="text-lg font-semibold text-neutral mb-3 flex items-center gap-2">
                                <FileCode className="w-5 h-5" />
                                Problem Statement
                            </h2>
                            <p className="text-neutral-light leading-relaxed whitespace-pre-line">
                                {problem.problem_statement}
                            </p>
                        </Card>

                        {/* Function Signature */}
                        <Card>
                            <h3 className="text-md font-semibold text-neutral mb-2">Function Signature</h3>
                            <pre className="bg-neutral-900 text-green-400 p-3 rounded-lg overflow-x-auto text-sm">
                                <code>{problem.function_signature}</code>
                            </pre>
                        </Card>

                        {/* Input/Output Format */}
                        <Card>
                            <h3 className="text-md font-semibold text-neutral mb-3">Input/Output Format</h3>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm font-medium text-neutral-light">Input:</p>
                                    <p className="text-sm text-neutral-lighter ml-2">{problem.input_format}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-neutral-light">Output:</p>
                                    <p className="text-sm text-neutral-lighter ml-2">{problem.output_format}</p>
                                </div>
                            </div>
                        </Card>

                        {/* Constraints */}
                        <Card>
                            <h3 className="text-md font-semibold text-neutral mb-2">Constraints</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-neutral-light">
                                {problem.constraints.map((constraint, index) => (
                                    <li key={index}>{constraint}</li>
                                ))}
                            </ul>
                        </Card>

                        {/* Test Cases */}
                        <Card>
                            <h3 className="text-md font-semibold text-neutral mb-3">Test Cases</h3>
                            <div className="space-y-4">
                                {problem.test_cases.map((testCase, index) => (
                                    <div key={index} className="bg-neutral-light/5 p-3 rounded-lg">
                                        <p className="text-sm font-medium text-neutral mb-2">Test Case {index + 1}</p>
                                        <div className="space-y-1 text-sm">
                                            <p><span className="text-neutral-light">Input:</span> <code className="text-primary">{testCase.input}</code></p>
                                            <p><span className="text-neutral-light">Output:</span> <code className="text-secondary">{testCase.output}</code></p>
                                            <p className="text-neutral-lighter text-xs mt-1">{testCase.explanation}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Expected Complexity */}
                        <Card>
                            <h3 className="text-md font-semibold text-neutral mb-2 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Expected Complexity
                            </h3>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-medium">Time:</span> {problem.expected_complexity.time}</p>
                                <p><span className="font-medium">Space:</span> {problem.expected_complexity.space}</p>
                                <p className="text-neutral-lighter text-xs mt-2">{problem.expected_complexity.reasoning}</p>
                            </div>
                        </Card>

                        {/* Hints */}
                        {problem.hints && problem.hints.length > 0 && (
                            <Card>
                                <button
                                    onClick={() => setShowHints(!showHints)}
                                    className="w-full text-left flex items-center justify-between"
                                >
                                    <h3 className="text-md font-semibold text-neutral flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4" />
                                        Hints ({problem.hints.length})
                                    </h3>
                                    <span className="text-xs text-primary">{showHints ? 'Hide' : 'Show'}</span>
                                </button>
                                {showHints && (
                                    <ul className="list-decimal list-inside space-y-2 mt-3 text-sm text-neutral-light">
                                        {problem.hints.map((hint, index) => (
                                            <li key={index}>{hint}</li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        )}

                        {/* Concepts Tested */}
                        <Card>
                            <h3 className="text-md font-semibold text-neutral mb-2">Concepts Tested</h3>
                            <div className="flex flex-wrap gap-2">
                                {problem.concepts_tested.map((concept, index) => (
                                    <Badge key={index} variant="info">{concept}</Badge>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Right Panel - Code Editor */}
                    <div className="lg:sticky lg:top-6 h-fit">
                        <Card>
                            <h2 className="text-lg font-semibold text-neutral mb-3 flex items-center gap-2">
                                <Terminal className="w-5 h-5" />
                                Your Solution
                            </h2>

                            <textarea
                                value={solution}
                                onChange={(e) => setSolution(e.target.value)}
                                placeholder={`// Write your solution here...\n\n${problem.function_signature} {\n    // Your code here\n}`}
                                className="w-full h-96 p-4 bg-neutral-900 text-green-400 font-mono text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            />

                            <div className="mt-4 flex gap-3">
                                <Button
                                    onClick={handleSubmit}
                                    fullWidth
                                    className="flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Submit Solution
                                </Button>
                            </div>

                            <p className="text-xs text-neutral-lighter mt-3 text-center">
                                💡 Code execution feature coming soon. For now, your submission will be saved.
                            </p>
                        </Card>
                    </div>
                </div>
            </div>
        </StudentLayout>
    )
}
