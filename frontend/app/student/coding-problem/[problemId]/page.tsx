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
    ArrowRight,
    Lightbulb,
    FileCode,
    Terminal,
    X,
    AlertCircle,
} from 'lucide-react'
import { getAuthHeader } from '@/utils/auth'
import Editor from '@monaco-editor/react'
import { ProblemCompleted } from '@/components/coding/ProblemCompleted'

interface TestCase {
    input: string
    output: string
    explanation: string
}

interface CodingProblem {
    question_id: string
    week: number
    day?: number
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
    hints: (string | { hint_text: string; hint_level: string })[]
    difficulty: string
    estimated_time_minutes: number
    concepts_tested: string[]
    status?: string // 'passed' | 'pending'
}

interface TestResult {
    input: string
    expectedOutput: string
    actualOutput: string
    stderr: string
    passed: boolean
}

interface SubmissionResult {
    success: boolean
    message: string
    status: 'passed' | 'failed' | 'pending'
    testResults: TestResult[]
}

export default function CodingProblemPage() {
    const router = useRouter()
    const params = useParams()
    const problemId = params.problemId as string

    const [problem, setProblem] = useState<CodingProblem | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showHints, setShowHints] = useState(false)
    const [solution, setSolution] = useState('')
    const [language, setLanguage] = useState('cpp')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [runResult, setRunResult] = useState<SubmissionResult | null>(null)
    const [canSubmit, setCanSubmit] = useState(false) // Only true if All Tests Passed in Run

    const BOILERPLATES: Record<string, string> = {
        cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    // Write your code here
    cout << "Welcome to Coding" << endl;
    return 0;
}`,
        c: `#include <stdio.h>

int main() {
    // Write your code here
    printf("Welcome to Coding\\n");
    return 0;
}`,
        javascript: `// Write your code here
console.log("Welcome to Coding");`,
        python: `# Write your code here
print("Welcome to Coding")`
    }

    useEffect(() => {
        if (problem) {
            // Use function signature if available, otherwise default boilerplate
            if (problem.function_signature) {
                setSolution(`// Write your solution here...

${problem.function_signature} {
    // Your code here
}`)
            } else {
                setSolution(BOILERPLATES[language] || '')
            }
        }
    }, [problem, language])

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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || '',
                },
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success && result.problem) {
                    let problemData = result.problem;

                    // Handle legacy data where fields are nested inside problem_statement
                    if (typeof problemData.problem_statement === 'object' && problemData.problem_statement !== null) {
                        const nested = problemData.problem_statement as any;
                        problemData = {
                            ...problemData,
                            problem_statement: nested.description || '',
                            // Use root fields if present, otherwise fallback to nested
                            constraints: problemData.constraints || nested.constraints || [],
                            input_format: problemData.input_format || nested.input_format || '',
                            output_format: problemData.output_format || nested.output_format || '',
                        };
                    }

                    setProblem(problemData)
                }
            }
        } catch (error) {
            console.error('Error fetching coding problem:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleRun = async () => {
        if (!solution.trim()) {
            alert('Please write your solution before running!')
            return
        }

        setIsSubmitting(true)
        setRunResult(null)
        setCanSubmit(false)

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            const response = await fetch(`${apiBaseUrl}/coding-problems/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || '',
                },
                body: JSON.stringify({
                    problemId: problemId,
                    solution: solution,
                    language: language,
                }),
            })

            const result = await response.json()

            if (response.ok) {
                setRunResult({
                    success: result.success,
                    message: result.message,
                    status: result.status,
                    testResults: result.testResults || []
                })
                // Enable submission ONLY if all passed
                if (result.status === 'passed') {
                    setCanSubmit(true)
                }
            } else {
                alert(result.message || 'Error running code')
            }
        } catch (error) {
            console.error('Error running code:', error)
            alert('Error running code. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmit = async () => {
        if (!canSubmit) {
            return
        }

        setIsSubmitting(true)

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            const response = await fetch(`${apiBaseUrl}/coding-problems/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || '',
                },
                body: JSON.stringify({
                    problemId: problemId,
                    solution: solution,
                    language: language,
                }),
            })

            const result = await response.json()

            if (response.ok) {
                // NO ALERT, NO REDIRECT
                // Instead, mark as passed to show the ProblemCompleted component
                if (problem) {
                    setProblem({
                        ...problem,
                        status: 'passed'
                    });
                }
            } else {
                alert(result.message || 'Error submitting solution')
            }
        } catch (error) {
            console.error('Error submitting solution:', error)
            alert('Error submitting solution. Please try again.')
        } finally {
            setIsSubmitting(false)
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

    const isProblemCompleted = problem.status === 'passed';

    return (
        <StudentLayout>
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => {
                            const dayParam = problem?.day ? `day-${problem.day}` : 'day-1';
                            const backPath = problem?.week === 1
                                ? `/student/study/week-1?day=${dayParam}#daily-coding-problems`
                                : `/student/study/week-${problem?.week || 1}?day=${dayParam}#daily-coding-problems`
                            router.push(backPath)
                        }}
                        className="p-2 hover:bg-neutral-light/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-neutral flex items-center gap-3">
                            {problem.title}
                            {isProblemCompleted && (
                                <Badge variant="success" className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Terminated / Solved
                                </Badge>
                            )}
                        </h1>
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
                        {problem.function_signature && (
                            <Card>
                                <h3 className="text-md font-semibold text-neutral mb-2">Function Signature</h3>
                                <pre className="bg-neutral-900 text-green-400 p-3 rounded-lg overflow-x-auto text-sm">
                                    <code>{problem.function_signature}</code>
                                </pre>
                            </Card>
                        )}

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
                        {problem.constraints && problem.constraints.length > 0 && (
                            <Card>
                                <h3 className="text-md font-semibold text-neutral mb-2">Constraints</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-neutral-light">
                                    {problem.constraints.map((constraint, index) => (
                                        <li key={index}>{constraint}</li>
                                    ))}
                                </ul>
                            </Card>
                        )}

                        {/* Test Cases */}
                        {problem.test_cases && problem.test_cases.length > 0 && (
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
                        )}

                        {/* Expected Complexity */}
                        {problem.expected_complexity && (
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
                        )}

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
                                            <li key={index}>
                                                {typeof hint === 'string' ? hint : hint.hint_text}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        )}

                        {/* Concepts Tested */}
                        {problem.concepts_tested && problem.concepts_tested.length > 0 && (
                            <Card>
                                <h3 className="text-md font-semibold text-neutral mb-2">Concepts Tested</h3>
                                <div className="flex flex-wrap gap-2">
                                    {problem.concepts_tested.map((concept, index) => (
                                        <Badge key={index} variant="secondary">{concept}</Badge>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Right Panel - Code Editor */}
                    <div className="lg:sticky lg:top-6 h-fit">
                        <Card>
                            <h2 className="text-lg font-semibold text-neutral mb-3 flex items-center gap-2">
                                <Terminal className="w-5 h-5" />
                                Your Solution
                            </h2>

                            {isProblemCompleted ? (
                                <ProblemCompleted week={problem.week} day={problem.day} />
                            ) : (
                                <>
                                    {/* Language Selector */}
                                    <div className="mb-3 flex gap-2">
                                        {['cpp', 'c', 'javascript', 'python'].map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => setLanguage(lang)}
                                                className={`px-3 py-1 text-xs rounded-md transition-colors ${language === lang
                                                    ? 'bg-primary text-white'
                                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                                    }`}
                                            >
                                                {lang === 'cpp' ? 'C++' : lang === 'c' ? 'C' : lang === 'javascript' ? 'JavaScript' : 'Python'}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="border border-neutral-800 rounded-lg overflow-hidden">
                                        <Editor
                                            height="400px"
                                            language={language === 'c' ? 'c' : language === 'cpp' ? 'cpp' : language === 'python' ? 'python' : 'javascript'}
                                            theme="vs-dark"
                                            value={solution}
                                            onChange={(value) => setSolution(value || '')}
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 14,
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                                readOnly: false,
                                            }}
                                        />
                                    </div>

                                    <div className="mt-4 flex gap-3">
                                        <Button
                                            onClick={handleRun}
                                            disabled={isSubmitting}
                                            variant="secondary"
                                            className="flex-1 flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Play className="w-4 h-4" />
                                            )}
                                            {isSubmitting ? 'Running...' : 'Run Code'}
                                        </Button>

                                        {canSubmit && (
                                            <Button
                                                onClick={handleSubmit}
                                                disabled={isSubmitting}
                                                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 animate-in fade-in zoom-in duration-300"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Submit Solution
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Results Display for Run Action */}
                            {runResult && (
                                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className={`p-4 rounded-lg border ${runResult.status === 'passed'
                                        ? 'bg-green-500/10 border-green-500/20'
                                        : 'bg-red-500/10 border-red-500/20'
                                        }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className={`font-semibold ${runResult.status === 'passed' ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {runResult.status === 'passed' ? 'All Tests Passed! 🎉' : 'Tests Failed'}
                                            </h3>
                                            <Badge variant={runResult.status === 'passed' ? 'success' : 'error'}>
                                                {runResult.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-neutral-light">
                                            {runResult.message}
                                        </p>
                                        {runResult.status === 'passed' && (
                                            <p className="text-xs text-green-400 mt-2 font-medium">
                                                You can now submit your solution!
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-neutral flex items-center gap-2">
                                            <Terminal className="w-4 h-4 text-primary" />
                                            Test Case Results
                                        </h4>
                                        <div className="grid gap-3">
                                            {runResult.testResults.map((result, index) => (
                                                <div
                                                    key={index}
                                                    className={`group rounded-xl border transition-all duration-300 overflow-hidden ${result.passed
                                                        ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                                                        : 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                                                        }`}
                                                >
                                                    <div className="p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${result.passed ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                                }`}>
                                                                {result.passed ? (
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                ) : (
                                                                    <X className="w-4 h-4" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className="text-sm font-medium text-neutral block">Test Case {index + 1}</span>
                                                                <span className={`text-xs ${result.passed ? 'text-green-500' : 'text-red-400'}`}>
                                                                    {result.passed ? 'Passed Successfully' : 'Execution Failed'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {result.passed && (
                                                            <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium border border-green-500/20">
                                                                Success
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!result.passed && (
                                                        <div className="bg-red-50/50 border-t border-red-200/50 p-4 space-y-3">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                <div className="space-y-1.5">
                                                                    <span className="text-xs font-medium text-neutral-600 flex items-center gap-1">
                                                                        <ArrowRight className="w-3 h-3" /> Input
                                                                    </span>
                                                                    <code className="block bg-white p-2 rounded-lg text-neutral-700 font-mono text-xs border border-neutral-200 break-all shadow-sm">
                                                                        {result.input || '(empty)'}
                                                                    </code>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <span className="text-xs font-medium text-neutral-600 flex items-center gap-1">
                                                                        <Target className="w-3 h-3 text-green-600" /> Expected
                                                                    </span>
                                                                    <code className="block bg-green-50 p-2 rounded-lg text-green-700 font-mono text-xs border border-green-200 break-all shadow-sm">
                                                                        {result.expectedOutput}
                                                                    </code>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <span className="text-xs font-medium text-neutral-600 flex items-center gap-1">
                                                                        <AlertCircle className="w-3 h-3 text-red-600" /> Actual
                                                                    </span>
                                                                    <code className="block bg-red-50 p-2 rounded-lg text-red-700 font-mono text-xs border border-red-200 break-all shadow-sm">
                                                                        {result.actualOutput || '(empty)'}
                                                                    </code>
                                                                </div>
                                                            </div>
                                                            {result.stderr && (
                                                                <div className="mt-2 pt-2 border-t border-red-200/50">
                                                                    <span className="text-xs font-medium text-red-600 block mb-1">Error Output:</span>
                                                                    <pre className="text-xs text-red-600 font-mono p-2 bg-red-50 rounded-lg overflow-x-auto border border-red-100">
                                                                        {result.stderr}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </StudentLayout>
    )
}
