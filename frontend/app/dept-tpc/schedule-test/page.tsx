'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DepartmentTPCLayout } from '@/components/layouts/DepartmentTPCLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader } from '@/utils/auth'
import { getApiBaseUrl } from '@/utils/api'
import * as XLSX from 'xlsx'
import {
    Calendar,
    Clock,
    FileText,
    Upload,
    Download,
    Plus,
    Users,
    CheckCircle,
    AlertCircle,
    X,
    Target,
    Search,
    Trash2,
    PlusCircle,
    ChevronDown,
    BarChart,
    Table
} from 'lucide-react'

// --- Components ---

/** 
 * Student Search Dropdown Component 
 */
function StudentSelector({ onSelect, selectedEmails = [] }: { onSelect: (emails: string[]) => void, selectedEmails: string[] }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [hasFetched, setHasFetched] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (!isOpen) return

        const fetchStudents = async () => {
            setLoading(true)
            try {
                const apiBaseUrl = getApiBaseUrl()
                const authHeader = getAuthHeader()
                const res = await fetch(`${apiBaseUrl}/dept-tpc/students/search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': authHeader || '' },
                    body: JSON.stringify({ search: searchTerm })
                })
                const data = await res.json()
                if (data.success) {
                    setStudents(data.data || [])
                }
            } catch (error) {
                console.error('Failed to fetch students', error)
            } finally {
                setLoading(false)
                setHasFetched(true)
            }
        }

        const delayDebounceFn = setTimeout(() => {
            fetchStudents()
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [searchTerm, isOpen])

    const toggleStudent = (email: string) => {
        if (selectedEmails.includes(email)) {
            onSelect(selectedEmails.filter(e => e !== email))
        } else {
            onSelect([...selectedEmails, email])
        }
    }

    const removeStudent = (email: string) => {
        onSelect(selectedEmails.filter(e => e !== email))
    }

    return (
        <div className="w-full relative" ref={wrapperRef}>
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedEmails.map(email => (
                    <Badge key={email} variant="primary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                        {email}
                        <button type="button" onClick={() => removeStudent(email)} className="hover:text-red-200"><X className="w-3 h-3" /></button>
                    </Badge>
                ))}
            </div>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Search or Select Students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-sm text-gray-500">Loading students...</div>
                    ) : students.length > 0 ? (
                        students.map((student) => {
                            const isSelected = selectedEmails.includes(student.person_email);
                            return (
                                <div
                                    key={student._id}
                                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between group ${isSelected ? 'bg-primary/5' : ''}`}
                                    onClick={() => toggleStudent(student.person_email)}
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{student.person_name}</p>
                                        <p className="text-xs text-gray-500">{student.person_email}</p>
                                    </div>
                                    {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                                </div>
                            )
                        })
                    ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                            {hasFetched ? 'No students found' : 'Searching...'}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/** 
 * Manual Question Editor Component 
 */
function ManualQuestionEditor({ questions, onChange }: { questions: any[], onChange: (qs: any[]) => void }) {
    const addQuestion = () => {
        onChange([
            ...questions,
            { text: '', options: ['', '', '', ''], correct_option: 0, marks: 1 }
        ])
    }

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQs = [...questions]
        newQs[index] = { ...newQs[index], [field]: value }
        onChange(newQs)
    }

    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const newQs = [...questions]
        const newOpts = [...newQs[qIndex].options]
        newOpts[optIndex] = value
        newQs[qIndex] = { ...newQs[qIndex], options: newOpts }
        onChange(newQs)
    }

    const removeQuestion = (index: number) => {
        onChange(questions.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-4">
            {questions.map((q, i) => (
                <div key={i} className="p-4 border rounded-lg bg-gray-50 relative group">
                    <button type="button" onClick={() => removeQuestion(i)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="mb-3">
                        <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Question {i + 1}</label>
                        <textarea
                            className="w-full p-2 border rounded text-sm focus:ring-1 outline-none"
                            placeholder="Type question here..."
                            rows={2}
                            value={q.text}
                            onChange={(e) => updateQuestion(i, 'text', e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        {q.options.map((opt: string, optIdx: number) => (
                            <div key={optIdx} className="flex gap-2 items-center">
                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${q.correct_option === optIdx ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {String.fromCharCode(65 + optIdx)}
                                </span>
                                <input
                                    type="text"
                                    className="flex-1 p-2 border rounded text-sm outline-none focus:border-primary"
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    value={opt}
                                    onChange={(e) => updateOption(i, optIdx, e.target.value)}
                                />
                                <input
                                    type="radio"
                                    name={`correct_${i}`}
                                    checked={q.correct_option === optIdx}
                                    onChange={() => updateQuestion(i, 'correct_option', optIdx)}
                                    className="cursor-pointer"
                                    title="Mark as correct answer"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <button
                type="button"
                onClick={addQuestion}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
                <PlusCircle className="w-5 h-5" /> Add Question
            </button>
        </div>
    )
}

export default function ScheduleTestPage() {
    return (
        <Suspense fallback={null}>
            <ScheduleTestContent />
        </Suspense>
    )
}

function ScheduleTestContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast, showToast, hideToast } = useToast()

    // State — initialise tab from ?tab= URL param
    const [activeTab, setActiveTab] = useState<'manual' | 'bulk' | 'results'>(
        (searchParams.get('tab') as 'manual' | 'bulk' | 'results') || 'manual'
    )
    const [isLoading, setIsLoading] = useState(false)
    const [bulkData, setBulkData] = useState<any[]>([])

    // Manual Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignment_type: 'batch', // Changed default from 'department' to 'batch'
        target_value: '', // Used for Batch/Email raw input
        target_emails: [] as string[], // Used for Student Selector
        module: '', // NEW: DSA or Aptitude
        topic: '',
        question_count: 10,
        difficulty: 'Medium',
        duration_minutes: 60,
        scheduled_start: '',
        scheduled_end: '',
        content_source: 'auto', // auto | manual
        manual_questions: [] as any[]
    })

    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([])

    // Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleGenerateQuestions = async () => {
        if (!formData.module || !formData.topic) {
            showToast('Please select module and enter topic', 'error')
            return
        }

        setIsGenerating(true)
        try {
            const apiBaseUrl = getApiBaseUrl()
            const authHeader = getAuthHeader()

            const res = await fetch(`${apiBaseUrl}/dept-tpc/test/generate-questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || ''
                },
                body: JSON.stringify({
                    module: formData.module,
                    topic: formData.topic,
                    difficulty: formData.difficulty,
                    count: formData.question_count
                })
            })

            const result = await res.json()
            if (result.success) {
                setGeneratedQuestions(result.data.questions)
                showToast(`${result.data.questions.length} questions generated!`, 'success')
            } else {
                showToast(result.message || 'Failed to generate questions', 'error')
            }
        } catch (error) {
            console.error('Generation Error:', error)
            showToast('AI generation failed. Please try again.', 'error')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const apiBaseUrl = getApiBaseUrl()
            const authHeader = getAuthHeader()

            const payload: any = { ...formData }

            // Use generated questions if auto mode
            if (payload.content_source === 'auto') {
                if (generatedQuestions.length === 0) {
                    showToast('Please generate questions first', 'error')
                    setIsLoading(false)
                    return
                }
                payload.manual_questions = generatedQuestions
            }

            // Format Assignment
            if (payload.assignment_type === 'student') {
                // Use target_emails from Selector
                payload.assigned_to = payload.target_emails
            } else if (payload.assignment_type === 'batch') {
                payload.assigned_to = payload.target_value ? payload.target_value.split(',').map((s: string) => s.trim()) : []
            }

            // Validate Manual Questions
            if (payload.manual_questions.length === 0) {
                showToast('Please add at least one question', 'error')
                setIsLoading(false)
                return
            }

            const res = await fetch(`${apiBaseUrl}/dept-tpc/test/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || ''
                },
                body: JSON.stringify(payload)
            })

            const result = await res.json()
            if (result.success) {
                showToast('Test scheduled successfully!', 'success')
                setFormData(prev => ({
                    ...prev,
                    title: '',
                    description: '',
                    manual_questions: [],
                    target_emails: [],
                    content_source: 'auto', // Reset to default
                    topic: '',
                    question_count: 5 // Reset to default
                }))
                setGeneratedQuestions([]) // Clear generated questions
            } else {
                showToast(result.message || 'Failed to schedule test', 'error')
            }
        } catch (error) {
            console.error('Submit Error:', error)
            showToast('An error occurred', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    // --- Test Analytics State ---
    const [viewTests, setViewTests] = useState<any[]>([])
    const [selectedTestId, setSelectedTestId] = useState<string>('')
    const [testAnalytics, setTestAnalytics] = useState<any>(null)
    const [loadingAnalytics, setLoadingAnalytics] = useState(false)

    // --- Helper Functions for Analytics ---
    const fetchViewTests = async () => {
        setIsLoading(true)
        try {
            const apiBaseUrl = getApiBaseUrl()
            const authHeader = getAuthHeader()
            const res = await fetch(`${apiBaseUrl}/dept-tpc/test/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader || '' },
                body: JSON.stringify({})
            })
            const result = await res.json()
            if (result.success) {
                setViewTests(result.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch tests', error)
            showToast('Failed to fetch tests', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    const fetchTestAnalytics = async (testId: string) => {
        if (!testId) return
        setLoadingAnalytics(true)
        try {
            const apiBaseUrl = getApiBaseUrl()
            const authHeader = getAuthHeader()
            const res = await fetch(`${apiBaseUrl}/dept-tpc/test/analytics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader || '' },
                body: JSON.stringify({ test_id: testId })
            })
            const result = await res.json()
            if (result.success) {
                setTestAnalytics(result.data)
            } else {
                showToast(result.message || 'Failed to fetch analytics', 'error')
                setTestAnalytics(null)
            }
        } catch (error) {
            console.error('Failed to fetch analytics', error)
            showToast('Failed to fetch analytics', 'error')
            setTestAnalytics(null)
        } finally {
            setLoadingAnalytics(false)
        }
    }

    // Effect to fetch tests when switching to Results tab
    useEffect(() => {
        if (activeTab === 'results') {
            fetchViewTests()
        }
    }, [activeTab])

    // ... Bulk Upload Handlers (Keep Existing) ...
    const downloadTemplate = () => {
        const template = [
            { "Title": "Sample Test 1", "Description": "Desc", "Target_Type": "student", "Target_Value": "s@e.com", "Topic": "Java", "Question_Count": 20, "Difficulty": "Medium", "Duration_Minutes": 60, "Start_Time": "2024-02-01 10:00", "End_Time": "2024-02-01 12:00" }
        ]
        const ws = XLSX.utils.json_to_sheet(template)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Template")
        XLSX.writeFile(wb, "Test_Schedule_Template.xlsx")
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (evt) => {
            const bstr = evt.target?.result
            if (typeof bstr !== 'string') return
            const wb = XLSX.read(bstr, { type: 'binary' })
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]
            const data = XLSX.utils.sheet_to_json(ws)
            setBulkData(data)
        }
        reader.readAsBinaryString(file)
    }

    const handleBulkSubmit = async () => {
        if (bulkData.length === 0) return
        setIsLoading(true)
        try {
            const apiBaseUrl = getApiBaseUrl()
            const authHeader = getAuthHeader()
            const res = await fetch(`${apiBaseUrl}/dept-tpc/test/bulk-upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader || '' },
                body: JSON.stringify({ tests: bulkData })
            })
            const result = await res.json()
            if (result.success) {
                showToast(result.message, 'success')
                setBulkData([])
            } else {
                showToast(result.message || 'Upload failed', 'error')
            }
        } catch (err) {
            showToast('Error uploading data', 'error')
        } finally {
            setIsLoading(false)
        }
    }


    return (
        <DepartmentTPCLayout>
            <div className="w-full max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-neutral">Schedule Practice Tests</h1>
                        <p className="text-neutral-light mt-1">Create and assign tests to students, batches, or your department</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'manual'
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-background-elevated text-neutralHover hover:bg-background-surface'
                                }`}
                        >
                            Manual Entry
                        </button>
                        <button
                            onClick={() => setActiveTab('bulk')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'bulk'
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-background-elevated text-neutralHover hover:bg-background-surface'
                                }`}
                        >
                            Bulk Upload
                        </button>

                    </div>
                </div>

                {activeTab === 'manual' && (
                    <Card className="p-6 animate-smooth-appear max-w-3xl">
                        <form onSubmit={handleManualSubmit} className="space-y-6">
                            {/* Test Details */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" /> Test Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Test Title *</label>
                                        <input name="title" required value={formData.title} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" placeholder="e.g. Weekly Java Assessment" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Description</label>
                                        <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" rows={2} />
                                    </div>
                                </div>
                            </div>

                            {/* Audience */}
                            <div className="space-y-4 pt-4 border-t border-dashed border-gray-200">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Users className="w-5 h-5 text-secondary" /> Audience is Who?
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Assign To *</label>
                                        <div className="flex gap-4">
                                            {['batch', 'student'].map(type => (
                                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="assignment_type"
                                                        value={type}
                                                        checked={formData.assignment_type === type}
                                                        onChange={handleInputChange}
                                                        className="text-primary focus:ring-primary"
                                                    />
                                                    <span className="capitalize">{type}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {formData.assignment_type === 'batch' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1">Semester/Batch Number</label>
                                            <input name="target_value" value={formData.target_value} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" placeholder="e.g. 6" />
                                        </div>
                                    )}

                                    {formData.assignment_type === 'student' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1">Select Students</label>
                                            <StudentSelector
                                                selectedEmails={formData.target_emails}
                                                onSelect={(emails) => setFormData(prev => ({ ...prev, target_emails: emails }))}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Search by name or scroll to select. Selected: {formData.target_emails.length}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content Configuration */}
                            <div className="space-y-4 pt-4 border-t border-dashed border-gray-200">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Target className="w-5 h-5 text-secondary" /> Content & Questions
                                </h3>

                                <div className="flex gap-4 mb-4 bg-gray-50 p-2 rounded-lg inline-flex">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, content_source: 'auto' }))}
                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${formData.content_source === 'auto' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Auto-Generate
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, content_source: 'manual' }))}
                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${formData.content_source === 'manual' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Manual Entry
                                    </button>
                                </div>

                                {formData.content_source === 'auto' ? (
                                    <div className="space-y-4">
                                        {/* Module Selection */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Module *</label>
                                            <select
                                                name="module"
                                                required
                                                value={formData.module}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none"
                                            >
                                                <option value="">Select Module</option>
                                                <option value="DSA">DSA (Data Structures & Algorithms)</option>
                                                <option value="Aptitude">Aptitude</option>
                                            </select>
                                        </div>

                                        {/* Topic Input */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Topic *</label>
                                            <input
                                                name="topic"
                                                required
                                                value={formData.topic}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none"
                                                placeholder="e.g., Arrays, Graphs, Logical Reasoning"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Be specific. Examples: &quot;Binary Trees&quot;, &quot;Permutations & Combinations&quot;, &quot;String Manipulation&quot;
                                            </p>
                                        </div>

                                        {/* Difficulty & Count */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Difficulty *</label>
                                                <select name="difficulty" value={formData.difficulty} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none">
                                                    <option value="Easy">Easy</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="Hard">Hard</option>
                                                    <option value="Mixed">Mixed</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">No. of Questions *</label>
                                                <input
                                                    type="number"
                                                    name="question_count"
                                                    required
                                                    value={formData.question_count}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none"
                                                    min="1"
                                                    max="50"
                                                />
                                            </div>
                                        </div>

                                        {/* Generate Button */}
                                        <button
                                            type="button"
                                            onClick={handleGenerateQuestions}
                                            disabled={isGenerating || !formData.module || !formData.topic}
                                            className="w-full py-3 bg-secondary text-white rounded-lg font-semibold hover:bg-secondary-dark disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Clock className="w-5 h-5 animate-spin" />
                                                    Generating Questions...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-5 h-5" />
                                                    Generate Questions with AI
                                                </>
                                            )}
                                        </button>

                                        {/* Generated Questions Preview (Editable) */}
                                        {generatedQuestions.length > 0 && (
                                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                    <p className="text-sm font-semibold text-green-800">
                                                        {generatedQuestions.length} Questions Generated! Review and edit if needed.
                                                    </p>
                                                </div>
                                                <ManualQuestionEditor
                                                    questions={generatedQuestions}
                                                    onChange={setGeneratedQuestions}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <ManualQuestionEditor
                                        questions={formData.manual_questions}
                                        onChange={(qs) => setFormData(p => ({ ...p, manual_questions: qs }))}
                                    />
                                )}
                            </div>

                            {/* Scheduling */}
                            <div className="space-y-4 pt-4 border-t border-dashed border-gray-200">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-neutral-light" /> Scheduling
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Duration (Minutes) *</label>
                                        <input type="number" name="duration_minutes" required value={formData.duration_minutes} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" min="10" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start Time *</label>
                                        <input type="datetime-local" name="scheduled_start" required value={formData.scheduled_start} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">End Time *</label>
                                        <input type="datetime-local" name="scheduled_end" required value={formData.scheduled_end} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-primary-dark shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Clock className="w-5 h-5 animate-spin" /> Scheduling...
                                    </span>
                                ) : 'Schedule Test'}
                            </button>
                        </form>
                    </Card>
                )}

                {activeTab === 'bulk' && (
                    <Card className="p-6 animate-smooth-appear max-w-3xl">
                        <div className="space-y-8">
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-bold">Bulk Upload Tests</h2>
                                <p className="text-gray-500 mt-2">Upload an Excel file to schedule multiple tests at once.</p>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex flex-col items-center">
                                <button
                                    onClick={downloadTemplate}
                                    className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium mb-4"
                                >
                                    <Download className="w-5 h-5" /> Download Template
                                </button>
                                <label className="w-full max-w-sm cursor-pointer group">
                                    <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-white group-hover:border-primary transition-colors">
                                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-primary mb-2" />
                                        <span className="text-sm text-gray-500 group-hover:text-primary">Click to upload .xlsx file</span>
                                    </div>
                                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>

                            {bulkData.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold">{bulkData.length} Tests Found</h3>
                                        <button
                                            onClick={handleBulkSubmit}
                                            disabled={isLoading}
                                            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                                        >
                                            {isLoading ? 'Uploading...' : 'Confirm Upload'}
                                        </button>
                                    </div>
                                    <div className="bg-gray-800 text-white rounded-lg p-4 font-mono text-sm max-h-60 overflow-y-auto">
                                        <pre>{JSON.stringify(bulkData, null, 2)}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {activeTab === 'results' && (
                    <Card className="p-6 animate-smooth-appear">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <BarChart className="w-6 h-6 text-primary" />
                                    Test Results & Analytics
                                </h2>
                                <p className="text-neutral-light text-sm mt-1">View student performance and detailed reports</p>
                            </div>

                            <div className="w-full md:w-64">
                                <select
                                    value={selectedTestId}
                                    onChange={(e) => {
                                        setSelectedTestId(e.target.value)
                                        fetchTestAnalytics(e.target.value)
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="">Select a Test to View Results</option>
                                    {viewTests.map((test: any) => (
                                        <option key={test._id} value={test._id}>
                                            {test.title} ({new Date(test.created_at).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {loadingAnalytics ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Clock className="w-8 h-8 text-primary animate-spin mb-2" />
                                <p className="text-neutral-light">Loading analytics data...</p>
                            </div>
                        ) : testAnalytics ? (
                            <div className="space-y-6">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <p className="text-xs text-blue-600 font-semibold uppercase">Total Attempts</p>
                                        <p className="text-2xl font-bold text-blue-900">{testAnalytics.total_attempts}</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                        <p className="text-xs text-green-600 font-semibold uppercase">Average Score</p>
                                        <p className="text-2xl font-bold text-green-900">
                                            {testAnalytics.results.length > 0
                                                ? Math.round(testAnalytics.results.reduce((a: any, b: any) => a + (b.score || 0), 0) / testAnalytics.results.length)
                                                : 0}
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                        <p className="text-xs text-purple-600 font-semibold uppercase">Pass Rate</p>
                                        <p className="text-2xl font-bold text-purple-900">
                                            {testAnalytics.results.length > 0
                                                ? Math.round((testAnalytics.results.filter((r: any) => r.percentage >= 40).length / testAnalytics.results.length) * 100)
                                                : 0}%
                                        </p>
                                    </div>
                                </div>

                                {/* Results Table */}
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Student Name</th>
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Score</th>
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Percentage</th>
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                                                    <th className="px-4 py-3 font-semibold text-gray-700">Submitted At</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {testAnalytics.results.length > 0 ? (
                                                    testAnalytics.results.map((result: any) => (
                                                        <tr key={result.attempt_id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 font-medium">{result.student_name}</td>
                                                            <td className="px-4 py-3 text-gray-500">{result.student_email}</td>
                                                            <td className="px-4 py-3 font-medium">{result.score} / {result.total_marks}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${result.percentage >= 70 ? 'bg-green-100 text-green-700' :
                                                                    result.percentage >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {result.percentage}%
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 capitalize">{result.status}</td>
                                                            <td className="px-4 py-3 text-gray-500">
                                                                {new Date(result.submitted_at).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                                            No attempts found for this test.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                <Table className="w-12 h-12 text-gray-300 mb-3" />
                                <h3 className="text-lg font-medium text-gray-900">Select a test to view results</h3>
                                <p className="text-gray-500 max-w-xs text-center">
                                    Choose a test from the dropdown above to see detailed student analytics.
                                </p>
                            </div>
                        )}
                    </Card>
                )}
                {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
            </div>
        </DepartmentTPCLayout>
    )
}
