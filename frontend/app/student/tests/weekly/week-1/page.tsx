'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// Removed StudentLayout - test pages should be isolated without navigation
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Brain,
  Trophy,
  AlertCircle,
  Play,
  ChevronRight,
  ChevronLeft,
  Target,
  Award,
  Lightbulb,
  X,
  Loader2,
  Shield,
} from 'lucide-react'
import { AIService } from '@/lib/aiService'
import { useTestSecurity } from '@/hooks/useTestSecurity'
import { getAuthHeader } from '@/utils/auth'

interface Question {
  question_id: string
  question: string
  options: string[]
  answer: string
  question_type: 'easy' | 'intermediate' | 'difficult'
  time_taken: string
  question_topic: string[]
  question_subtopic: string
  explanation: string
  day: string
}

interface AnswerState {
  [questionId: string]: {
    selected: string
    isCorrect: boolean | null
    timeSpent: number
  }
}

/**
 * Week 1 Weekly Test Page
 * Comprehensive test covering all days of Week 1
 * Route: /student/tests/weekly/week-1
 */
export default function Week1WeeklyTestPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerState>({})
  const [showResults, setShowResults] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [totalTime, setTotalTime] = useState(0)
  const [testStarted, setTestStarted] = useState(false)
  const [eligibility, setEligibility] = useState<any>(null)
  const [questionStartTimes, setQuestionStartTimes] = useState<{ [questionId: string]: number }>({})
  const [showHint, setShowHint] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [loadingHint, setLoadingHint] = useState(false)
  const [hintError, setHintError] = useState<string | null>(null)
  const [testAnalysis, setTestAnalysis] = useState<any>(null)
  const [blockedForRetake, setBlockedForRetake] = useState(false)

  // Refs to store functions that will be defined later
  const blockStudentFromRetakeRef = React.useRef<(() => Promise<void>) | null>(null)
  const submitTestRef = React.useRef<(() => Promise<void>) | null>(null)

  // Memoize the onAutoSubmit callback - will use refs to call functions
  const handleAutoSubmit = React.useCallback(async () => {
    // Auto-submit test when window is switched
    console.log('[handleAutoSubmit] Window switch detected, auto-submitting test...')
    console.log('[handleAutoSubmit] Current state:', { testStarted, showResults })
    
    if (testStarted && !showResults) {
      console.log('[handleAutoSubmit] Test is active, blocking student and submitting...')
      try {
        setBlockedForRetake(true)
        // Mark as blocked in backend FIRST
        if (blockStudentFromRetakeRef.current) {
          await blockStudentFromRetakeRef.current()
          console.log('[handleAutoSubmit] Student blocked, now submitting test...')
        } else {
          console.error('[handleAutoSubmit] blockStudentFromRetake function not available!')
        }
        // Submit the test
        if (submitTestRef.current) {
          await submitTestRef.current()
          console.log('[handleAutoSubmit] Test submitted successfully')
        } else {
          console.error('[handleAutoSubmit] submitTest function not available!')
        }
      } catch (error) {
        console.error('[handleAutoSubmit] Error during auto-submit:', error)
      }
    } else {
      console.log('[handleAutoSubmit] Test not active, skipping:', { testStarted, showResults })
    }
  }, [testStarted, showResults])

  // Strict security validations for test window - MUST be at top level
  const security = useTestSecurity({
    enforceFullscreen: true,
    maxTabSwitches: 1, // Limit 1: single tab switch → block and Dept TPC approval for retake
    autoSubmitOnViolation: false,
    autoSubmitOnWindowSwitch: true,
    logToServer: true,
    onViolation: (violation) => {
      console.warn('[Security] Violation detected:', violation)
      // No alert; blocked state and results banner direct student to Dept TPC Test Approvals
    },
    onAutoSubmit: handleAutoSubmit,
  })

  // Update refs when functions are defined (runs on every render to keep refs current)
  useEffect(() => {
    blockStudentFromRetakeRef.current = blockStudentFromRetake
    submitTestRef.current = submitTest
  })

  // Check eligibility on mount
  useEffect(() => {
    checkEligibility()
    // Set loading to false since we'll use dummy data
    setIsLoading(false)
  }, [])

  // Disable copy-paste during test (removed screenshot prevention overlays)
  useEffect(() => {
    if (testStarted && !showResults) {

      const handleContextMenu = (e: MouseEvent) => e.preventDefault()
      const handleCopy = (e: ClipboardEvent) => e.preventDefault()
      const handleCut = (e: ClipboardEvent) => e.preventDefault()
      const handlePaste = (e: ClipboardEvent) => e.preventDefault()
      const handleSelectAll = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') e.preventDefault()
      }
      const handleF12 = (e: KeyboardEvent) => {
        if (e.key === 'F12') e.preventDefault()
      }
      const handleDevTools = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) e.preventDefault()
      }

      // Add event listeners for copy-paste prevention only
      document.addEventListener('contextmenu', handleContextMenu, true)
      document.addEventListener('copy', handleCopy, true)
      document.addEventListener('cut', handleCut, true)
      document.addEventListener('paste', handlePaste, true)
      document.addEventListener('keydown', handleSelectAll, true)
      document.addEventListener('keydown', handleF12, true)
      document.addEventListener('keydown', handleDevTools, true)
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
      
      // Prevent drag and drop
      document.addEventListener('dragstart', (e) => e.preventDefault(), true)
      document.addEventListener('drop', (e) => e.preventDefault(), true)

      return () => {
        // Remove all event listeners
        document.removeEventListener('contextmenu', handleContextMenu, true)
        document.removeEventListener('copy', handleCopy, true)
        document.removeEventListener('cut', handleCut, true)
        document.removeEventListener('paste', handlePaste, true)
        document.removeEventListener('keydown', handleSelectAll, true)
        document.removeEventListener('keydown', handleF12, true)
        document.removeEventListener('keydown', handleDevTools, true)
        document.removeEventListener('dragstart', (e) => e.preventDefault(), true)
        document.removeEventListener('drop', (e) => e.preventDefault(), true)
        
        // Restore styles
        document.body.style.userSelect = 'auto'
        document.body.style.webkitUserSelect = 'auto'
      }
    }
  }, [testStarted, showResults])


  // Timer
  useEffect(() => {
    if (testStarted && startTime && !showResults) {
      const interval = setInterval(() => {
        setTotalTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [testStarted, startTime, showResults])

  // Track question start time
  useEffect(() => {
    if (testStarted && questions.length > 0) {
      const currentQuestion = questions[currentQuestionIndex]
      if (currentQuestion && !questionStartTimes[currentQuestion.question_id]) {
        setQuestionStartTimes(prev => ({
          ...prev,
          [currentQuestion.question_id]: Date.now()
        }))
      }
    }
  }, [currentQuestionIndex, testStarted, questions])

  // Check if student is blocked from retaking test
  const checkBlockedStatus = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      
      if (!authHeader) {
        return null
      }

      const response = await fetch(`${apiBaseUrl}/student-progress/check-blocked-retake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          week: 1,
          test_type: 'weekly',
        }),
      })

      if (response.ok) {
        const result = await response.json()
        return result.data
      }
    } catch (error) {
      console.error('Error checking blocked status:', error)
    }
    return null
  }

  const checkEligibility = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      
      if (!authHeader) {
        console.error('[WeeklyTestEligibility] No auth token found')
        return
      }
      
      // Check blocked status first
      const blockedStatus = await checkBlockedStatus()
      if (blockedStatus && blockedStatus.blocked && !blockedStatus.approved) {
        setEligibility({
          eligible: false,
          blocked: true,
          message: 'You are blocked from retaking this test. Please contact your Department TPC for approval.'
        })
        return
      }
      
      const response = await fetch(`${apiBaseUrl}/student-progress/check-weekly-test-eligibility`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ week: 1 }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setEligibility(data.data)
          if (!data.data.eligible) {
            // Still allow viewing but show warning
          }
        }
      }
    } catch (error) {
      console.error('Error checking eligibility:', error)
    }
  }

  // Dummy data for preview
  const getDummyQuestions = (): Question[] => {
    return [
      {
        question_id: 'q1',
        question: 'What is the correct way to declare a variable in C?',
        options: ['var x;', 'int x;', 'variable x;', 'declare x;'],
        answer: 'int x;',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Variables', 'Data Types'],
        question_subtopic: 'Variable Declaration',
        explanation: 'In C, variables are declared using the syntax: data_type variable_name;',
        day: 'pre-week'
      },
      {
        question_id: 'q2',
        question: 'Which operator is used for input in C?',
        options: ['cin', 'scanf', 'input', 'read'],
        answer: 'scanf',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Input/Output'],
        question_subtopic: 'Input Functions',
        explanation: 'scanf() is the standard input function in C for reading formatted input.',
        day: 'pre-week'
      },
      {
        question_id: 'q3',
        question: 'What is the size of an int in C (typically)?',
        options: ['2 bytes', '4 bytes', '8 bytes', '1 byte'],
        answer: '4 bytes',
        question_type: 'intermediate',
        time_taken: '0',
        question_topic: ['Data Types'],
        question_subtopic: 'Memory Size',
        explanation: 'An int typically occupies 4 bytes (32 bits) in most modern systems.',
        day: 'day-1'
      },
      {
        question_id: 'q4',
        question: 'Which of the following is a valid variable name?',
        options: ['2variable', 'var-name', 'variable_name', 'var name'],
        answer: 'variable_name',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Variables'],
        question_subtopic: 'Naming Conventions',
        explanation: 'Variable names can contain letters, digits, and underscores, but cannot start with a digit.',
        day: 'day-1'
      },
      {
        question_id: 'q5',
        question: 'What does the == operator do?',
        options: ['Assignment', 'Equality comparison', 'Addition', 'Division'],
        answer: 'Equality comparison',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Operators'],
        question_subtopic: 'Comparison Operators',
        explanation: '== is the equality operator used to compare two values.',
        day: 'day-2'
      },
      {
        question_id: 'q6',
        question: 'Which loop executes at least once?',
        options: ['for loop', 'while loop', 'do-while loop', 'if statement'],
        answer: 'do-while loop',
        question_type: 'intermediate',
        time_taken: '0',
        question_topic: ['Loops'],
        question_subtopic: 'Loop Types',
        explanation: 'do-while loop checks the condition after executing the body, so it runs at least once.',
        day: 'day-3'
      },
      {
        question_id: 'q7',
        question: 'What is the index of the first element in an array?',
        options: ['1', '0', '-1', '2'],
        answer: '0',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Arrays'],
        question_subtopic: 'Array Indexing',
        explanation: 'Array indexing in C starts from 0, so the first element is at index 0.',
        day: 'day-4'
      },
      {
        question_id: 'q8',
        question: 'How do you access the third element of an array named arr?',
        options: ['arr[3]', 'arr[2]', 'arr(3)', 'arr.3'],
        answer: 'arr[2]',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Arrays'],
        question_subtopic: 'Array Access',
        explanation: 'Since arrays are 0-indexed, the third element is at index 2.',
        day: 'day-4'
      },
      {
        question_id: 'q9',
        question: 'What keyword is used to define a function in C?',
        options: ['function', 'def', 'void', 'No keyword needed'],
        answer: 'No keyword needed',
        question_type: 'intermediate',
        time_taken: '0',
        question_topic: ['Functions'],
        question_subtopic: 'Function Definition',
        explanation: 'In C, functions are defined by specifying the return type followed by the function name.',
        day: 'day-5'
      },
      {
        question_id: 'q10',
        question: 'What does printf() return?',
        options: ['void', 'int', 'char', 'string'],
        answer: 'int',
        question_type: 'difficult',
        time_taken: '0',
        question_topic: ['Functions', 'Input/Output'],
        question_subtopic: 'Return Values',
        explanation: 'printf() returns the number of characters printed (as an int).',
        day: 'pre-week'
      },
      {
        question_id: 'q11',
        question: 'Which data type is used for storing a single character?',
        options: ['string', 'char', 'character', 'chr'],
        answer: 'char',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Data Types'],
        question_subtopic: 'Character Type',
        explanation: 'char is the data type used to store a single character in C.',
        day: 'day-1'
      },
      {
        question_id: 'q12',
        question: 'What is the result of 5 / 2 in C?',
        options: ['2.5', '2', '3', '2.0'],
        answer: '2',
        question_type: 'intermediate',
        time_taken: '0',
        question_topic: ['Operators'],
        question_subtopic: 'Division Operator',
        explanation: 'Integer division in C truncates the decimal part, so 5/2 = 2.',
        day: 'day-2'
      },
      {
        question_id: 'q13',
        question: 'How many times will a for loop with condition i < 5 execute if i starts at 0?',
        options: ['4 times', '5 times', '6 times', 'Infinite'],
        answer: '5 times',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Loops'],
        question_subtopic: 'For Loop',
        explanation: 'The loop executes for i = 0, 1, 2, 3, 4 (5 iterations total).',
        day: 'day-3'
      },
      {
        question_id: 'q14',
        question: 'What is the correct way to declare an array of 10 integers?',
        options: ['int arr[10];', 'array int[10];', 'int[10] arr;', 'arr[10] int;'],
        answer: 'int arr[10];',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Arrays'],
        question_subtopic: 'Array Declaration',
        explanation: 'The syntax for array declaration is: data_type array_name[size];',
        day: 'day-4'
      },
      {
        question_id: 'q15',
        question: 'What happens if a function doesn\'t return a value?',
        options: ['Compilation error', 'Runtime error', 'Returns void', 'Returns 0'],
        answer: 'Returns void',
        question_type: 'intermediate',
        time_taken: '0',
        question_topic: ['Functions'],
        question_subtopic: 'Return Types',
        explanation: 'Functions that don\'t return a value should have void as the return type.',
        day: 'day-5'
      },
      {
        question_id: 'q16',
        question: 'Which escape sequence is used for a new line?',
        options: ['\\n', '\\new', '\\nl', '/n'],
        answer: '\\n',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Input/Output'],
        question_subtopic: 'Escape Sequences',
        explanation: '\\n is the escape sequence for a newline character.',
        day: 'pre-week'
      },
      {
        question_id: 'q17',
        question: 'What is the value of x after: int x = 5; x++;',
        options: ['5', '6', '4', '7'],
        answer: '6',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Operators'],
        question_subtopic: 'Increment Operator',
        explanation: 'The ++ operator increments the value by 1, so x becomes 6.',
        day: 'day-2'
      },
      {
        question_id: 'q18',
        question: 'Which loop is best when you know the exact number of iterations?',
        options: ['while loop', 'for loop', 'do-while loop', 'All are equal'],
        answer: 'for loop',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Loops'],
        question_subtopic: 'Loop Selection',
        explanation: 'for loop is ideal when you know the exact number of iterations beforehand.',
        day: 'day-3'
      },
      {
        question_id: 'q19',
        question: 'What is the maximum index for an array of size 10?',
        options: ['10', '9', '11', '8'],
        answer: '9',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Arrays'],
        question_subtopic: 'Array Bounds',
        explanation: 'Since arrays are 0-indexed, an array of size 10 has indices 0 to 9.',
        day: 'day-4'
      },
      {
        question_id: 'q20',
        question: 'Can a function call itself in C?',
        options: ['No, never', 'Yes, it\'s called recursion', 'Only in loops', 'Only once'],
        answer: 'Yes, it\'s called recursion',
        question_type: 'intermediate',
        time_taken: '0',
        question_topic: ['Functions'],
        question_subtopic: 'Recursion',
        explanation: 'Yes, a function can call itself. This is called recursion.',
        day: 'day-5'
      },
      {
        question_id: 'q21',
        question: 'What is the output of: printf("%d", 10 % 3);',
        options: ['3', '1', '0', 'Error'],
        answer: '1',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Operators'],
        question_subtopic: 'Modulus Operator',
        explanation: '% is the modulus operator. 10 % 3 = 1 (remainder when 10 is divided by 3).',
        day: 'day-2'
      },
      {
        question_id: 'q22',
        question: 'Which is the correct syntax for a while loop?',
        options: ['while (condition) { }', 'while condition { }', 'while { condition }', 'while: condition'],
        answer: 'while (condition) { }',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Loops'],
        question_subtopic: 'While Loop Syntax',
        explanation: 'The correct syntax is: while (condition) { statements }',
        day: 'day-3'
      },
      {
        question_id: 'q23',
        question: 'What does sizeof() operator return?',
        options: ['Value of variable', 'Size in bytes', 'Memory address', 'Type name'],
        answer: 'Size in bytes',
        question_type: 'intermediate',
        time_taken: '0',
        question_topic: ['Operators'],
        question_subtopic: 'Sizeof Operator',
        explanation: 'sizeof() returns the size of a variable or data type in bytes.',
        day: 'day-2'
      },
      {
        question_id: 'q24',
        question: 'How do you initialize all elements of an array to 0?',
        options: ['int arr[5] = {0};', 'int arr[5] = 0;', 'arr[5] = {0};', 'Cannot be done'],
        answer: 'int arr[5] = {0};',
        question_type: 'intermediate',
        time_taken: '0',
        question_topic: ['Arrays'],
        question_subtopic: 'Array Initialization',
        explanation: 'int arr[5] = {0}; initializes all elements to 0.',
        day: 'day-4'
      },
      {
        question_id: 'q25',
        question: 'What is a function prototype?',
        options: ['Function definition', 'Function declaration', 'Function call', 'Function body'],
        answer: 'Function declaration',
        question_type: 'intermediate',
        time_taken: '0',
        question_topic: ['Functions'],
        question_subtopic: 'Function Prototypes',
        explanation: 'A function prototype is a declaration that tells the compiler about the function\'s signature.',
        day: 'day-5'
      },
      {
        question_id: 'q26',
        question: 'Which format specifier is used for integers in printf?',
        options: ['%i', '%d', '%int', 'Both %d and %i'],
        answer: 'Both %d and %i',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Input/Output'],
        question_subtopic: 'Format Specifiers',
        explanation: 'Both %d and %i can be used to print integers in printf().',
        day: 'pre-week'
      },
      {
        question_id: 'q27',
        question: 'What is the result of: int x = 3; x *= 2;',
        options: ['5', '6', '9', '1'],
        answer: '6',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Operators'],
        question_subtopic: 'Compound Assignment',
        explanation: 'x *= 2 is equivalent to x = x * 2, so x becomes 6.',
        day: 'day-2'
      },
      {
        question_id: 'q28',
        question: 'What is an infinite loop?',
        options: ['Loop that never executes', 'Loop that executes forever', 'Loop with no condition', 'Loop that runs once'],
        answer: 'Loop that executes forever',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Loops'],
        question_subtopic: 'Infinite Loops',
        explanation: 'An infinite loop is a loop that continues executing indefinitely because its condition never becomes false.',
        day: 'day-3'
      },
      {
        question_id: 'q29',
        question: 'Can you have an array of arrays in C?',
        options: ['No', 'Yes, it\'s called 2D array', 'Only in some compilers', 'Only for characters'],
        answer: 'Yes, it\'s called 2D array',
        question_type: 'intermediate',
        time_taken: '0',
        question_topic: ['Arrays'],
        question_subtopic: 'Multi-dimensional Arrays',
        explanation: 'Yes, you can have arrays of arrays, which are called multi-dimensional arrays (e.g., 2D arrays).',
        day: 'day-4'
      },
      {
        question_id: 'q30',
        question: 'What is the purpose of return statement in a function?',
        options: ['To exit the program', 'To return a value to caller', 'To print output', 'To declare variables'],
        answer: 'To return a value to caller',
        question_type: 'easy',
        time_taken: '0',
        question_topic: ['Functions'],
        question_subtopic: 'Return Statement',
        explanation: 'The return statement is used to return a value from a function to its caller.',
        day: 'day-5'
      }
    ]
  }

  const fetchWeeklyTestQuestions = async () => {
    try {
      setIsLoading(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      // Fetch questions from all days
      const allDays = ['pre-week', 'day-1', 'day-2', 'day-3', 'day-4', 'day-5']
      const allQuestions: Question[] = []
      let hasQuestions = false

      for (const day of allDays) {
        try {
          const response = await fetch(`${apiBaseUrl}/questions/week1`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ day }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data && data.data.questions) {
              // Take 5 questions from each day (30 total)
              const dayQuestions = data.data.questions.slice(0, 5)
              allQuestions.push(...dayQuestions)
              hasQuestions = true
            }
          }
        } catch (error) {
          console.error(`Error fetching questions for ${day}:`, error)
        }
      }

      // Use dummy data if no questions fetched from API
      let finalQuestions = allQuestions
      if (!hasQuestions || allQuestions.length === 0) {
        console.log('Using dummy data for weekly test preview')
        finalQuestions = getDummyQuestions()
      }

      // Shuffle all questions
      const shuffled = finalQuestions.sort(() => Math.random() - 0.5)
      setQuestions(shuffled)

      // Initialize answer state
      const initialAnswers: AnswerState = {}
      shuffled.forEach(q => {
        initialAnswers[q.question_id] = {
          selected: '',
          isCorrect: null,
          timeSpent: 0,
        }
      })
      setAnswers(initialAnswers)
    } catch (error) {
      console.error('Error fetching weekly test questions:', error)
      // Use dummy data on error
      const dummyQuestions = getDummyQuestions()
      const shuffled = dummyQuestions.sort(() => Math.random() - 0.5)
      setQuestions(shuffled)
      
      const initialAnswers: AnswerState = {}
      shuffled.forEach(q => {
        initialAnswers[q.question_id] = {
          selected: '',
          isCorrect: null,
          timeSpent: 0,
        }
      })
      setAnswers(initialAnswers)
    } finally {
      setIsLoading(false)
    }
  }

  const startTest = () => {
    // Load dummy data immediately for preview
    const dummyQuestions = getDummyQuestions()
    const shuffled = dummyQuestions.sort(() => Math.random() - 0.5)
    setQuestions(shuffled)
    
    const initialAnswers: AnswerState = {}
    shuffled.forEach(q => {
      initialAnswers[q.question_id] = {
        selected: '',
        isCorrect: null,
        timeSpent: 0,
      }
    })
    setAnswers(initialAnswers)
    
    setTestStarted(true)
    setStartTime(Date.now())
    setTotalTime(0)
    setIsLoading(false)
    
    // Optionally try to fetch from API in background (for future use)
    // fetchWeeklyTestQuestions()
  }

  const handleAnswerSelect = (questionId: string, answer: string) => {
    const currentQuestion = questions.find(q => q.question_id === questionId)
    if (!currentQuestion) return

    const isCorrect = answer === currentQuestion.answer
    
    // Calculate time spent on this question
    const startTime = questionStartTimes[questionId] || Date.now()
    const timeSpent = Math.floor((Date.now() - startTime) / 1000)

    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        selected: answer,
        isCorrect,
        timeSpent,
      }
    }))
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      // Reset hint when changing questions
      handleCloseHint()
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      // Reset hint when changing questions
      handleCloseHint()
    }
  }

  // Block student from retaking test after window switch violation
  const blockStudentFromRetake = async () => {
    try {
      console.log('[blockStudentFromRetake] Starting blocking process...')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      
      if (!authHeader) {
        console.error('[blockStudentFromRetake] No auth token found')
        return
      }

      console.log('[blockStudentFromRetake] Calling API to block student...')
      const response = await fetch(`${apiBaseUrl}/student-progress/block-test-retake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          week: 1,
          test_type: 'weekly',
          reason: 'window_switch_violation',
        }),
      })

      const result = await response.json()
      console.log('[blockStudentFromRetake] API Response:', result)

      if (!response.ok) {
        console.error('[blockStudentFromRetake] Failed to block student from retake:', result)
      } else {
        console.log('[blockStudentFromRetake] Student blocked successfully')
      }
    } catch (error) {
      console.error('[blockStudentFromRetake] Error blocking student from retake:', error)
    }
  }

  const submitTest = async () => {
    // Calculate time spent for current question
    const currentQuestion = questions[currentQuestionIndex]
    if (currentQuestion && questionStartTimes[currentQuestion.question_id]) {
      const startTime = questionStartTimes[currentQuestion.question_id]
      const timeSpent = Math.floor((Date.now() - startTime) / 1000)
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.question_id]: {
          ...prev[currentQuestion.question_id],
          timeSpent,
        }
      }))
    }

    setShowResults(true)
    
    // Calculate score
    const correct = Object.values(answers).filter(a => a.isCorrect === true).length
    const total = questions.length
    const percentage = Math.round((correct / total) * 100)
    const timeSpentMinutes = Math.floor(totalTime / 60)

    // Build questions_attempted array
    const questionsAttempted = questions.map((q) => {
      const answerState = answers[q.question_id]
      return {
        question_id: q.question_id,
        question: q.question,
        selected_answer: answerState?.selected || '',
        correct_answer: q.answer,
        is_correct: answerState?.isCorrect || false,
        time_spent: answerState?.timeSpent || 0,
        question_type: q.question_type || 'multiple-choice',
        question_topic: q.question_topic || [],
        question_subtopic: q.question_subtopic || '',
        explanation: q.explanation || '',
        options: q.options || []
      }
    })

    // Save weekly test and generate AI analysis
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      
      // Generate a test ID (use timestamp + student ID for uniqueness)
      const testId = `weekly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Save weekly test analysis (this will generate AI guidance)
      const analysisResponse = await fetch(`${apiBaseUrl}/test-analysis/weekly`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_id: testId,
          week: 1,
          score: percentage,
          questions_attempted: questionsAttempted,
          time_spent: timeSpentMinutes
        }),
      })

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json()
        if (analysisData.success && analysisData.data) {
          setTestAnalysis(analysisData.data)
        }
      }
    } catch (error) {
      console.error('Error generating weekly test analysis:', error)
    }
  }


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleGetHint = async () => {
    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion) return

    setLoadingHint(true)
    setHintError(null)
    setShowHint(true)

    try {
      // Create a context for the AI
      const context = `Question: ${currentQuestion.question}\nOptions: ${currentQuestion.options.join(', ')}\nTopic: ${currentQuestion.question_topic?.join(', ') || 'General'}\nSubtopic: ${currentQuestion.question_subtopic || 'N/A'}`

      // Use the AI answer service to get a hint
      const response = await AIService.answerQuestion({
        question: `Provide a helpful hint for this question without giving away the answer: ${currentQuestion.question}`,
        context: {
          current_week: 1,
          current_topic: currentQuestion.question_topic?.join(', ') || 'General',
        }
      })

      if (response.success && response.data && response.data.answer) {
        setHint(response.data.answer)
      } else {
        setHintError('Unable to generate hint. Please try again.')
      }
    } catch (error: any) {
      console.error('Error getting hint:', error)
      setHintError(error.message || 'Failed to get hint. Please try again.')
    } finally {
      setLoadingHint(false)
    }
  }

  const handleCloseHint = () => {
    setShowHint(false)
    setHint(null)
    setHintError(null)
  }

  const getScore = () => {
    const correct = Object.values(answers).filter(a => a.isCorrect === true).length
    const total = questions.length
    const percentage = Math.round((correct / total) * 100)
    return { correct, total, percentage }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/20 text-green-600 border-green-500/30'
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
      case 'difficult':
        return 'bg-red-500/20 text-red-600 border-red-500/30'
      default:
        return 'bg-neutral-light/20 text-neutral-light'
    }
  }

  if (isLoading && !testStarted) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-background z-50">
        <Card className="p-12 text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-light">Loading weekly test...</p>
        </Card>
      </div>
    )
  }

  // Pre-test screen
  if (!testStarted) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-background overflow-y-auto z-50">
        <div className="min-h-screen flex flex-col">
          {/* Header with Back Button */}
          <div className="w-full px-6 py-4 border-b border-neutral-light/10 bg-background-surface">
            <div className="max-w-5xl mx-auto">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-neutral-light hover:text-neutral transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="max-w-4xl w-full space-y-6">
              {/* Title Card */}
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-lg">
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 mb-6 shadow-md">
                    <Trophy className="w-12 h-12 text-primary" />
                  </div>
                  
                  <h1 className="text-4xl font-bold text-neutral mb-3">
                    Week 1 Weekly Test
                  </h1>
                  
                  <p className="text-lg text-neutral-light">
                    Comprehensive assessment covering all topics from Week 1
                  </p>
                </div>
              </Card>

              {/* Blocked Status Check */}
              {eligibility && eligibility.blocked && (
                <Card className="bg-red-500/10 border-2 border-red-500/30 shadow-md">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-red-500/20 flex-shrink-0">
                        <Shield className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-red-600 mb-2">
                          Test Access Blocked
                        </h3>
                        <p className="text-sm text-red-700 mb-2 leading-relaxed">
                          {eligibility.message || 'You are blocked from retaking this test due to a security violation.'}
                        </p>
                        <p className="text-xs text-red-600">
                          Please contact your Department TPC to request approval for retaking the test.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Eligibility Check */}
              {eligibility && !eligibility.eligible && !eligibility.blocked && (
                <Card className="bg-yellow-500/10 border-2 border-yellow-500/30 shadow-md">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-yellow-500/20 flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-yellow-600 mb-4">
                          Requirements Not Met
                        </h3>
                        <div className="space-y-4 text-sm">
                          {eligibility.practice_tests && !eligibility.practice_tests.eligible && (
                            <div className="bg-yellow-500/5 rounded-lg p-3 border border-yellow-500/20">
                              <p className="font-semibold text-yellow-700 mb-2">Practice Tests:</p>
                              <ul className="list-disc list-inside ml-2 space-y-1 text-neutral-light">
                                {eligibility.practice_tests.missing && eligibility.practice_tests.missing.length > 0 && (
                                  <li className="text-yellow-700">Missing tests for: <span className="font-medium">{eligibility.practice_tests.missing.join(', ')}</span></li>
                                )}
                                {eligibility.practice_tests.failed && eligibility.practice_tests.failed.length > 0 && (
                                  <li className="text-yellow-700">Need ≥70% on: <span className="font-medium">{eligibility.practice_tests.failed.map((f: any) => `${f.day} (current: ${f.score}%)`).join(', ')}</span></li>
                                )}
                              </ul>
                            </div>
                          )}
                          {eligibility.coding_problems && !eligibility.coding_problems.eligible && (
                            <div className="bg-yellow-500/5 rounded-lg p-3 border border-yellow-500/20">
                              <p className="font-semibold text-yellow-700 mb-1">Coding Problems:</p>
                              <p className="text-neutral-light">Complete all coding problems <span className="font-medium text-yellow-700">({eligibility.coding_problems.completed || 0}/{eligibility.coding_problems.total || 0} completed)</span></p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Test Instructions */}
              <Card className="bg-background-elevated border-2 border-neutral-light/20 shadow-lg">
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-light/20">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral">Test Instructions</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-background-surface border border-neutral-light/10 hover:border-primary/20 transition-colors">
                      <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-neutral mb-1">Total Questions: 30</p>
                        <p className="text-sm text-neutral-light">5 questions from each day (pre-week to day-5)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-background-surface border border-neutral-light/10 hover:border-primary/20 transition-colors">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-neutral mb-1">Duration: 60 minutes</p>
                        <p className="text-sm text-neutral-light">Timer starts when you click &quot;Start Test&quot;</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-background-surface border border-neutral-light/10 hover:border-secondary/20 transition-colors">
                      <div className="p-2 rounded-lg bg-secondary/10 flex-shrink-0">
                        <Brain className="w-6 h-6 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-neutral mb-1">Question Types</p>
                        <p className="text-sm text-neutral-light">Mix of Easy, Intermediate, and Difficult questions</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-background-surface border border-neutral-light/10 hover:border-yellow-500/20 transition-colors">
                      <div className="p-2 rounded-lg bg-yellow-500/10 flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-neutral mb-2">Important Notes</p>
                        <ul className="text-sm text-neutral-light list-disc list-inside space-y-1">
                          <li>You can navigate between questions</li>
                          <li>Review your answers before submitting</li>
                          <li>Copy-paste is disabled during the test</li>
                          <li>Results will be shown immediately after submission</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Start Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={startTest}
                  variant="primary"
                  className="px-12 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={eligibility?.blocked === true || (eligibility && !eligibility.eligible)}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {eligibility?.blocked 
                    ? 'Test Blocked - Contact DeptTPC' 
                    : (eligibility && !eligibility.eligible)
                    ? 'Complete Requirements to Start'
                    : 'Start Weekly Test'
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Test screen
  if (!showResults) {
    const currentQuestion = questions[currentQuestionIndex]
    const answeredQuestions = Object.keys(answers).filter(id => answers[id].selected !== '')
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col bg-background overflow-hidden z-50">
        {/* Header - No navigation, test is isolated */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-light/20 bg-background-surface flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-neutral">Week 1 Weekly Test</h1>
            <p className="text-xs text-neutral-light">
              {answeredQuestions.length} / {questions.length} answered
            </p>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden w-full">
            {/* Left Sidebar - Question Numbers */}
            <div className="w-64 border-r border-neutral-light/20 bg-background-elevated overflow-y-auto">
              <div className="p-3">
                <h3 className="text-xs font-semibold text-neutral mb-3">Questions</h3>
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q.question_id]?.selected !== ''
                    const isCurrent = idx === currentQuestionIndex
                    
                    return (
                      <button
                        key={q.question_id}
                        onClick={() => {
                          setCurrentQuestionIndex(idx)
                          handleCloseHint()
                        }}
                        className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${
                          isCurrent
                            ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                            : isAnswered
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-neutral-light/20 text-neutral-light hover:bg-neutral-light/30 hover:text-neutral'
                        }`}
                        title={`Question ${idx + 1}${isAnswered ? ' (Answered)' : ''}`}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Center - Question and Options */}
            <div className="flex-1 overflow-y-auto bg-background-surface">
              <div className="max-w-3xl mx-auto px-5 py-4">
                {/* Question Card */}
                {currentQuestion && (
                  <Card className="mb-4 relative">
                    {/* Small AI Hint Button - Top right corner, very subtle */}
                    <button
                      onClick={handleGetHint}
                      className="absolute top-2 right-2 p-1.5 rounded-md text-neutral-light/60 hover:text-primary hover:bg-primary/5 transition-all duration-200 z-10"
                      title="Get AI hint"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="p-5">
                {/* Question Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge className={getDifficultyColor(currentQuestion.question_type)}>
                      {currentQuestion.question_type}
                    </Badge>
                    {currentQuestion.question_topic && currentQuestion.question_topic.length > 0 && (
                      <span className="text-xs text-neutral-light">
                        Topic: {currentQuestion.question_topic.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-neutral leading-relaxed">
                    {currentQuestion.question}
                  </h2>
                </div>

                {/* AI Hint Display */}
                {showHint && (
                  <Card className="mb-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                    <div className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <h3 className="text-xs font-semibold text-primary">AI Hint</h3>
                        </div>
                        <button
                          onClick={handleCloseHint}
                          className="p-1 rounded hover:bg-primary/10 transition-colors"
                          title="Close hint"
                        >
                          <X className="w-3.5 h-3.5 text-neutral-light" />
                        </button>
                      </div>
                      
                      {loadingHint ? (
                        <div className="flex items-center gap-2 text-xs text-neutral-light">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Getting hint...</span>
                        </div>
                      ) : hintError ? (
                        <div className="flex items-center gap-2 text-xs text-red-500">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{hintError}</span>
                        </div>
                      ) : hint ? (
                        <p className="text-xs text-neutral leading-relaxed">{hint}</p>
                      ) : null}
                    </div>
                  </Card>
                )}

                {/* Answer Options */}
                <div className="space-y-2 mb-6">
                  {currentQuestion.options.map((option, idx) => {
                    const optionId = `${currentQuestion.question_id}-${idx}`
                    const isSelected = answers[currentQuestion.question_id]?.selected === option
                    const optionLabel = String.fromCharCode(65 + idx) // A, B, C, D
                    
                    return (
                      <button
                        key={optionId}
                        onClick={() => handleAnswerSelect(currentQuestion.question_id, option)}
                        className={`w-full text-left p-3.5 rounded-lg border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                            : 'border-neutral-light/20 hover:border-primary/50 hover:bg-primary/5 bg-background-elevated'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold text-xs transition-all ${
                            isSelected
                              ? 'border-primary bg-primary text-white'
                              : 'border-neutral-light/30 bg-background-surface text-neutral-light'
                          }`}>
                            {optionLabel}
                          </div>
                          <span className={`text-sm font-medium flex-1 ${
                            isSelected ? 'text-neutral' : 'text-neutral'
                          }`}>
                            {option}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="pt-4 border-t border-neutral-light/20 flex items-center justify-between">
                  <Button
                    onClick={goToPreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    variant="secondary"
                    className="px-4 py-2 text-sm"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1.5" />
                    Previous
                  </Button>
                  
                  {currentQuestionIndex < questions.length - 1 && (
                    <Button
                      onClick={goToNextQuestion}
                      variant="primary"
                      className="px-6 py-2 text-sm"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  )}
                    </div>
                  </div>
                </Card>
                )}
              </div>
            </div>

            {/* Right Sidebar - Timer and Submit */}
            <div className="w-72 border-l border-neutral-light/20 bg-background-elevated flex flex-col">
              <div className="p-4">
                {/* Security Status */}
                {security.violations.length > 0 && (
                  <Card className="mb-4 bg-yellow-500/10 border-yellow-500/30">
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs font-semibold text-yellow-600">
                          Security Alert
                        </span>
                      </div>
                      <p className="text-xs text-neutral-light">
                        {security.violations.length} violation{security.violations.length > 1 ? 's' : ''} detected
                      </p>
                      {security.tabSwitchCount > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Tab switches: {security.tabSwitchCount}/1
                        </p>
                      )}
                    </div>
                  </Card>
                )}

                {/* Timer */}
                <Card className="mb-4">
                  <div className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-xl font-bold text-primary mb-1.5">
                      <Clock className="w-5 h-5" />
                      {formatTime(totalTime)}
                    </div>
                    <p className="text-xs text-neutral-light">
                      Remaining: {formatTime(Math.max(0, 3600 - totalTime))}
                    </p>
                  </div>
                </Card>

                {/* Progress */}
                <Card className="mb-4">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-neutral">Progress</span>
                      <span className="text-xs text-neutral-light">
                        {answeredQuestions.length} / {questions.length}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-light/10 rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(answeredQuestions.length / questions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </Card>

                {/* Submit Button */}
                <Button
                  onClick={submitTest}
                  variant="primary"
                  className="w-full bg-green-600 hover:bg-green-700 px-4 py-2.5 text-sm font-semibold"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Submit Test
                </Button>
              </div>
            </div>
          </div>
      </div>
    )
  }

  // Results screen
  const { correct, total, percentage } = getScore()
  const timeSpentMinutes = Math.floor(totalTime / 60)

  return (
    <div className="fixed inset-0 w-screen h-screen bg-background overflow-y-auto z-50">
      <div className="min-h-screen flex flex-col">
        {/* Header with Back Button */}
        <div className="w-full px-6 py-4 border-b border-neutral-light/10 bg-background-surface flex-shrink-0">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => router.push('/student/tests')}
              className="flex items-center gap-2 text-neutral-light hover:text-neutral transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back to Tests</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-4xl w-full space-y-4">
            {/* Blocked banner: request Dept TPC Test Approvals (no alert) */}
            {blockedForRetake && (
              <Card className="bg-red-500/10 border-2 border-red-500/30">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-red-500/20 flex-shrink-0">
                      <Shield className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-600 mb-2">Test blocked</h3>
                      <p className="text-sm text-red-700 mb-2">
                        You have been blocked due to a tab switch. Request retake approval from your Department TPC via Test Approvals.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
        <Card className="border-2 border-secondary/30 bg-gradient-to-br from-secondary/5 to-primary/5">
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/20 mb-6">
              {percentage >= 70 ? (
                <Trophy className="w-10 h-10 text-secondary" />
              ) : (
                <AlertCircle className="w-10 h-10 text-yellow-600" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-neutral mb-2">
              {percentage >= 70 ? 'Congratulations!' : 'Test Completed'}
            </h1>
            
            <p className="text-lg text-neutral-light mb-8">
              {percentage >= 70 
                ? 'You have passed the Weekly Test!' 
                : 'Keep practicing to improve your score'}
            </p>

            {/* Score Card */}
            <Card className="bg-background-elevated mb-6">
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{percentage}%</p>
                    <p className="text-sm text-neutral-light mt-1">Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{correct}</p>
                    <p className="text-sm text-neutral-light mt-1">Correct</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-600">{total - correct}</p>
                    <p className="text-sm text-neutral-light mt-1">Incorrect</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-light">
                  <Clock className="w-4 h-4" />
                  <span>Time Spent: {timeSpentMinutes} minutes</span>
                </div>
              </div>
            </Card>

            {/* AI Guidance */}
            {testAnalysis && (
              <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Brain className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-neutral">Personalized Guidance</h2>
                  </div>
                  
                  <div className="mb-4 p-4 rounded-xl bg-background-surface border border-primary/10">
                    <p className="text-neutral leading-relaxed">{testAnalysis.guidance}</p>
                  </div>

                  {testAnalysis.strengths && testAnalysis.strengths.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Your Strengths
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {testAnalysis.strengths.map((s: string, i: number) => (
                          <span key={i} className="px-3 py-1 rounded-lg bg-green-500/10 text-green-700 text-sm border border-green-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {testAnalysis.weak_areas && testAnalysis.weak_areas.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Areas to Improve
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {testAnalysis.weak_areas.map((w: string, i: number) => (
                          <span key={i} className="px-3 py-1 rounded-lg bg-orange-500/10 text-orange-700 text-sm border border-orange-500/20">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {testAnalysis.recommendations && testAnalysis.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Recommendations
                      </h3>
                      <ul className="space-y-2">
                        {testAnalysis.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-neutral-light">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {testAnalysis.comparison && (
                    <div className="mt-4 pt-4 border-t border-neutral-light/20">
                      <p className="text-xs text-neutral-light">
                        {testAnalysis.comparison.improvement > 0 
                          ? `📈 Improved by ${testAnalysis.comparison.improvement}% from your last attempt!`
                          : testAnalysis.comparison.improvement < 0
                          ? `📉 Score decreased by ${Math.abs(testAnalysis.comparison.improvement)}% - review the material and try again.`
                          : 'Score is similar to your last attempt. Keep practicing!'}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Question Review */}
            <Card className="bg-background-elevated mb-6 text-left">
              <div className="p-6">
                <h3 className="font-semibold text-neutral mb-4">Question Review</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {questions.map((question, idx) => {
                    const answer = answers[question.question_id]
                    const isCorrect = answer?.isCorrect === true
                    
                    return (
                      <div
                        key={question.question_id}
                        className={`p-4 rounded-lg border-2 ${
                          isCorrect
                            ? 'border-green-500/30 bg-green-500/10'
                            : 'border-red-500/30 bg-red-500/10'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            <span className="font-semibold text-neutral">
                              Question {idx + 1}
                            </span>
                            <Badge className={getDifficultyColor(question.question_type)}>
                              {question.question_type}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-neutral mb-3">{question.question}</p>
                        
                        <div className="space-y-1 text-sm">
                          <p className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                            <strong>Your Answer:</strong> {answer?.selected || 'Not answered'}
                          </p>
                          {!isCorrect && (
                            <p className="text-green-600">
                              <strong>Correct Answer:</strong> {question.answer}
                            </p>
                          )}
                          <p className="text-neutral-light text-xs mt-2">
                            {question.explanation}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => router.push('/student/study/week-1')}
                variant="secondary"
                className="px-6 py-2.5"
              >
                Back to Learning
              </Button>
              <Button
                onClick={() => router.push('/student/tests')}
                variant="primary"
                className="px-6 py-2.5"
              >
                View All Tests
              </Button>
            </div>
          </div>
        </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
