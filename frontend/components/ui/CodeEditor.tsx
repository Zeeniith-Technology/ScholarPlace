'use client'

import React, { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Play, RotateCcw, Copy, CheckCircle2, XCircle, Loader2, Terminal, ChevronDown } from 'lucide-react'
import { Card } from './Card'
import { Badge } from './Badge'

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-neutral-light">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      Loading editor...
    </div>
  )
})

export interface CodeEditorProps {
  language?: 'javascript' | 'c' | 'cpp' | 'python'
  value?: string
  defaultValue?: string
  onChange?: (code: string) => void
  onLanguageChange?: (language: 'javascript' | 'c' | 'cpp' | 'python') => void
  onTestComplete?: (testResults: Array<TestResult>) => void
  testCases?: Array<TestCase>
  readOnly?: boolean
  height?: string
  disablePaste?: boolean
  problemId?: string
}

export interface TestCase {
  input: string
  expectedOutput: string
  description?: string
}

export interface TestResult {
  passed: boolean
  input: string
  expected: string
  actual: string
  error?: string
}

export function CodeEditor({
  language = 'javascript',
  value,
  defaultValue = '',
  onChange,
  onLanguageChange,
  onTestComplete,
  testCases = [],
  readOnly = false,
  height = '100%',
  disablePaste = false,
  problemId
}: CodeEditorProps) {
  // Internal state for uncontrolled mode
  const [internalCode, setInternalCode] = useState(defaultValue)
  const code = value !== undefined ? value : internalCode

  const [output, setOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [showOutput, setShowOutput] = useState(true)

  const editorRef = useRef<any>(null)

  // Clear output when problem changes
  useEffect(() => {
    setOutput('')
    setTestResults([])
    setExecutionTime(null)
  }, [problemId])

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor

    if (disablePaste) {
      // Paste prevention logic
      const preventPaste = (e: any) => {
        e.preventDefault()
        e.stopPropagation()
      }
      const editorDom = editor.getContainerDomNode()
      editorDom.addEventListener('paste', preventPaste, true)

      editor.onKeyDown((e: any) => {
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
          e.preventDefault()
          e.stopPropagation()
        }
      })
    }
  }

  const handleCodeChange = (newValue: string | undefined) => {
    const safeValue = newValue || ''
    setInternalCode(safeValue) // Update internal state
    onChange?.(safeValue) // Notify parent
  }

  const executeCode = async () => {
    if (!code.trim()) {
      setOutput('Please write some code first.')
      setShowOutput(true)
      return
    }

    setIsRunning(true)
    setOutput('')
    setTestResults([])
    setExecutionTime(null)
    setShowOutput(true)

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const auth = localStorage.getItem('auth')

      if (!auth) {
        setOutput('Error: Authentication required')
        setIsRunning(false)
        return
      }

      const authData = JSON.parse(auth)
      const token = authData.token

      const startTime = Date.now()

      const response = await fetch(`${apiBaseUrl}/code/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          language,
          testCases: testCases.length > 0 ? testCases : undefined,
        }),
      })

      const endTime = Date.now()
      setExecutionTime(endTime - startTime)

      const result = await response.json()

      if (response.ok && result.success) {
        if (result.data.testResults && result.data.testResults.length > 0) {
          setTestResults(result.data.testResults)
          const allPassed = result.data.testResults.every((t: any) => t.passed)
          setOutput(allPassed
            ? `✅ All test cases passed!\n\n${result.data.output || ''}`
            : `❌ Some test cases failed.\n\n${result.data.output || ''}`
          )
          onTestComplete?.(result.data.testResults)
        } else {
          setOutput(result.data.output || 'No output')
        }
      } else {
        setOutput(`Error: ${result.message || result.error || 'Execution failed'}`)
        if (result.data?.error) {
          setOutput(prev => prev + `\n\n${result.data.error}`)
        }
      }
    } catch (error: any) {
      setOutput(`Error: ${error.message || 'Failed to execute code'}`)
    } finally {
      setIsRunning(false)
    }
  }

  const resetCode = () => {
    // If controlled, parent handles reset likely, or we just reset internal to default
    const resetValue = defaultValue
    setInternalCode(resetValue)
    onChange?.(resetValue)
    setOutput('')
    setTestResults([])
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333]">
      {/* Editor Toolbar */}
      <div className="h-10 bg-[#252526] border-b border-[#333] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative flex items-center gap-1 bg-[#333] rounded px-2 py-0.5 text-xs text-gray-300 border border-[#444] hover:bg-[#444] transition-colors cursor-pointer group">
            <span className="font-medium pointer-events-none select-none">
              {language === 'cpp' ? 'C++' : language === 'javascript' ? 'JavaScript' : language.charAt(0).toUpperCase() + language.slice(1)}
            </span>
            {onLanguageChange && (
              <>
                <ChevronDown className="w-3 h-3 opacity-50 pointer-events-none group-hover:opacity-100 transition-opacity" />
                <select
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value as any)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Change Language"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="c">C</option>
                  <option value="cpp">C++</option>
                  <option value="python">Python</option>
                </select>
              </>
            )}
          </div>

          {executionTime && (
            <span className="text-[10px] text-gray-500 flex items-center gap-1 ml-2">
              <span className="w-1 h-1 rounded-full bg-green-500"></span>
              {executionTime}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
            title="Copy Code"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={resetCode}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
            title="Reset Code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-[#444] mx-1"></div>

          <button
            onClick={executeCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 group-hover:text-green-100" />
            )}
            Run
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 min-h-0 relative">
        <Editor
          height="100%"
          language={language === 'c' ? 'c' : language === 'cpp' ? 'cpp' : language === 'python' ? 'python' : 'javascript'}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            formatOnPaste: !disablePaste,
            formatOnType: true,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          }}
        />
      </div>

      {/* Terminal / Output Panel */}
      <div className={`border-t border-[#333] bg-[#1e1e1e] flex flex-col transition-all duration-300 ${showOutput ? 'h-1/3' : 'h-8'}`}>
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-[#252526] cursor-pointer border-b border-[#333] hover:bg-[#2a2a2b]"
          onClick={() => setShowOutput(!showOutput)}
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-300">CONSOLE / TEST RESULTS</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showOutput ? '' : 'rotate-180'}`} />
        </div>

        {showOutput && (
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-gray-300 scrollbar-thin scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-600">
            {testResults.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400">Status:</span>
                  {testResults.every(t => t.passed) ? (
                    <span className="text-green-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> All Tests Passed
                    </span>
                  ) : (
                    <span className="text-red-500 font-medium flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> {testResults.filter(t => !t.passed).length} Tests Failed
                    </span>
                  )}
                </div>

                {testResults.map((test, index) => (
                  <div key={index} className={`rounded p-2 border ${test.passed ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-semibold text-gray-200">Test Case {index + 1}</span>
                      {test.passed ? (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-[10px] border-0">Passed</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-500/20 text-red-400 text-[10px] border-0">Failed</Badge>
                      )}
                    </div>
                    {!test.passed && (
                      <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 mt-2 text-[11px] opacity-90">
                        <span className="text-gray-500">Input:</span>
                        <span className="font-mono text-gray-300">{test.input}</span>
                        <span className="text-gray-500">Expected:</span>
                        <span className="font-mono text-green-400">{test.expected}</span>
                        <span className="text-gray-500">Actual:</span>
                        <span className="font-mono text-red-300">{test.actual}</span>
                        {test.error && (
                          <>
                            <span className="text-gray-500">Error:</span>
                            <span className="text-red-400">{test.error}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{output || <span className="text-gray-600 italic">Run code to see output...</span>}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
