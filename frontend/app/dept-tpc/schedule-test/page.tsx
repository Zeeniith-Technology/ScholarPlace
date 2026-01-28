'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
    ChevronDown
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
    const router = useRouter()
    const { toast, showToast, hideToast } = useToast()

    // State
    const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual')
    const [isLoading, setIsLoading] = useState(false)
    const [bulkData, setBulkData] = useState<any[]>([])

    // Manual Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignment_type: 'department',
        target_value: '', // Used for Batch/Email raw input
        target_emails: [] as string[], // Used for Student Selector
        topic: '',
        question_count: 10,
        difficulty: 'Medium',
        duration_minutes: 60,
        scheduled_start: '',
        scheduled_end: '',
        content_source: 'auto', // auto | manual
        manual_questions: [] as any[]
    })

    // Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const apiBaseUrl = getApiBaseUrl()
            const authHeader = getAuthHeader()

            const payload: any = { ...formData }

            // Format Assignment
            if (payload.assignment_type === 'student') {
                // Use target_emails from Selector
                payload.assigned_to = payload.target_emails
            } else if (payload.assignment_type === 'batch') {
                payload.assigned_to = payload.target_value ? payload.target_value.split(',').map((s: string) => s.trim()) : []
            }

            // Validate Manual Questions
            if (payload.content_source === 'manual' && payload.manual_questions.length === 0) {
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
                setFormData(prev => ({ ...prev, title: '', description: '', manual_questions: [], target_emails: [] }))
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

                {activeTab === 'manual' ? (
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
                                            {['department', 'batch', 'student'].map(type => (
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
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Topic (Optional)</label>
                                            <input name="topic" value={formData.topic} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" placeholder="e.g. Data Structures" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">No. of Questions</label>
                                            <input type="number" name="question_count" value={formData.question_count} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" min="1" max="50" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Difficulty</label>
                                            <select name="difficulty" value={formData.difficulty} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none">
                                                <option>Easy</option>
                                                <option>Medium</option>
                                                <option>Hard</option>
                                                <option>Mixed</option>
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <ManualQuestionEditor
                                        questions={formData.manual_questions}
                                        onChange={(qs) => setFormData(p => ({ ...p, manual_questions: qs }))}
                                    />
                                )}
                            </div>

                            {/* Schedule */}
                            <div className="space-y-4 pt-4 border-t border-dashed border-gray-200">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-accent" /> Schedule
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start Time *</label>
                                        <input type="datetime-local" name="scheduled_start" required value={formData.scheduled_start} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">End Time *</label>
                                        <input type="datetime-local" name="scheduled_end" required value={formData.scheduled_end} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Duration (mins)</label>
                                        <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-neutral-light/20 bg-background-main outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button type="submit" disabled={isLoading} className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                    {isLoading ? 'Scheduling...' : <><CheckCircle className="w-5 h-5" /> Schedule Test</>}
                                </button>
                            </div>
                        </form>
                    </Card>
                ) : (
                    // Bulk Upload View
                    <div className="space-y-6 animate-smooth-appear">
                        <Card className="p-8 border border-dashed border-primary/20 bg-primary/5">
                            <div className="flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Upload className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-neutral">Upload Excel File</h3>
                                <div className="flex gap-4">
                                    <button onClick={downloadTemplate} className="px-4 py-2 rounded-lg border border-neutral-light/20 bg-white hover:bg-gray-50 flex items-center gap-2 text-sm font-medium">
                                        <Download className="w-4 h-4" /> Download Template
                                    </button>
                                    <label className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark cursor-pointer flex items-center gap-2 text-sm font-medium">
                                        <Plus className="w-4 h-4" /> Select File
                                        <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
                                    </label>
                                </div>
                            </div>
                        </Card>
                        {bulkData.length > 0 && (
                            <Card className="p-6">
                                <h3 className="text-lg font-bold mb-4">Preview ({bulkData.length} records)</h3>
                                <button onClick={handleBulkSubmit} disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
                                    {isLoading ? 'Uploading...' : 'Confirm Upload'}
                                </button>
                            </Card>
                        )}
                    </div>
                )}
                {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
            </div>
        </DepartmentTPCLayout>
    )
}
