'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Modal } from '@/components/ui/Modal'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader } from '@/utils/auth'
import { exportToCSV } from '@/utils/exportUtils'
import {
  Library,
  Search,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'

interface QuestionOption {
  key: string
  text: string
  is_correct: boolean
}

interface Question {
  _id: string
  question_id: string
  question_text: string
  options: QuestionOption[]
  correct_answer: string
  difficulty: string
  week: number
  day: number
  explanation?: string
  question_type: string
  category?: string
  status?: string
  tags?: string[]
}

const PAGE_SIZE = 25
const WEEKS = ['1', '2', '3', '4', '5', '6']
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert']
const OPTION_KEYS = ['A', 'B', 'C', 'D']

const emptyForm = {
  question_id: '',
  question_text: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correct_answer: 'A',
  difficulty: 'Medium',
  week: '1',
  day: '1',
  explanation: '',
  question_type: 'aptitude',
}

type QuestionForm = typeof emptyForm

function difficultyBadge(difficulty: string) {
  const styles: Record<string, string> = {
    Easy: 'bg-green-500/10 text-green-600',
    Medium: 'bg-yellow-500/10 text-yellow-700',
    Hard: 'bg-orange-500/10 text-orange-600',
    Expert: 'bg-red-500/10 text-red-600',
  }
  return styles[difficulty] || 'bg-neutral-light/10 text-neutral-light'
}

export default function SuperadminQuestionsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [weekFilter, setWeekFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Edit/create modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null) // _id when editing, null when creating
  const [form, setForm] = useState<QuestionForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Bulk import
  const [importOpen, setImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { toast, showToast, hideToast } = useToast()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  // Debounce search so we don't hit the API per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, weekFilter, difficultyFilter, typeFilter])

  const buildFilter = useCallback(() => {
    const filter: Record<string, any> = {}
    if (debouncedSearch.trim()) {
      const escaped = debouncedSearch.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { question_text: { $regex: escaped, $options: 'i' } },
        { question_id: { $regex: escaped, $options: 'i' } },
      ]
    }
    if (weekFilter) filter.week = parseInt(weekFilter)
    if (difficultyFilter) filter.difficulty = difficultyFilter
    if (typeFilter) filter.question_type = typeFilter
    return filter
  }, [debouncedSearch, weekFilter, difficultyFilter, typeFilter])

  const fetchQuestions = useCallback(async () => {
    try {
      setIsLoading(true)
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const res = await fetch(`${apiBaseUrl}/questions/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          filter: buildFilter(),
          options: {
            limit: PAGE_SIZE,
            skip: (page - 1) * PAGE_SIZE,
            count: true,
            sort: { week: 1, day: 1, question_id: 1 },
          },
        }),
      })
      const result = await res.json()
      if (result.success && result.data) {
        // With options.count the backend returns { questions, total }
        setQuestions(result.data.questions || [])
        setTotal(result.data.total || 0)
      } else {
        showToast(result.message || 'Failed to load questions', 'error')
      }
    } catch (e) {
      console.error('Error fetching questions:', e)
      showToast('Failed to load questions', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl, buildFilter, page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (q: Question) => {
    setEditingId(q._id)
    const byKey = (key: string) => q.options?.find(o => o.key === key)?.text || ''
    setForm({
      question_id: q.question_id || '',
      question_text: q.question_text || '',
      optionA: byKey('A'),
      optionB: byKey('B'),
      optionC: byKey('C'),
      optionD: byKey('D'),
      correct_answer: q.correct_answer || 'A',
      difficulty: q.difficulty || 'Medium',
      week: String(q.week ?? 1),
      day: String(q.day ?? 1),
      explanation: q.explanation || '',
      question_type: q.question_type || 'aptitude',
    })
    setModalOpen(true)
  }

  const formToPayload = (f: QuestionForm) => ({
    question_id: f.question_id.trim(),
    question_text: f.question_text.trim(),
    options: OPTION_KEYS.map(key => ({
      key,
      text: (f as any)[`option${key}`].trim(),
      is_correct: f.correct_answer === key,
    })),
    correct_answer: f.correct_answer,
    difficulty: f.difficulty,
    week: parseInt(f.week) || 1,
    day: parseInt(f.day) || 1,
    explanation: f.explanation.trim(),
    question_type: f.question_type,
  })

  const validateForm = (f: QuestionForm): string | null => {
    if (!f.question_id.trim()) return 'Question ID is required'
    if (!f.question_text.trim()) return 'Question text is required'
    for (const key of OPTION_KEYS) {
      if (!(f as any)[`option${key}`].trim()) return `Option ${key} is required`
    }
    return null
  }

  const handleSave = async () => {
    const validationError = validateForm(form)
    if (validationError) {
      showToast(validationError, 'warning')
      return
    }
    try {
      setIsSaving(true)
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const endpoint = editingId ? '/questions/update' : '/questions/insert'
      const payload = editingId
        ? { _id: editingId, ...formToPayload(form) }
        : formToPayload(form)

      const res = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (result.success) {
        showToast(editingId ? 'Question updated' : 'Question created', 'success')
        setModalOpen(false)
        fetchQuestions()
      } else {
        showToast(result.message || 'Save failed', 'error')
      }
    } catch (e) {
      console.error('Error saving question:', e)
      showToast('Save failed', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const res = await fetch(`${apiBaseUrl}/questions/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ _id: deleteTarget._id }),
      })
      const result = await res.json()
      if (result.success) {
        showToast(`Deleted ${deleteTarget.question_id}`, 'success')
        setDeleteTarget(null)
        fetchQuestions()
      } else {
        showToast(result.message || 'Delete failed', 'error')
      }
    } catch (e) {
      console.error('Error deleting question:', e)
      showToast('Delete failed', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * Parse an uploaded Excel/CSV file into bulk-insert payload rows.
   * Expected columns: question_id, question_text, option_a..option_d,
   * correct_answer (A-D), difficulty, week, day, explanation, question_type
   */
  const handleFile = async (file: File) => {
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      const errors: string[] = []
      const parsed = rows.map((row, i) => {
        // Tolerate header variations: "Option A", "option_a", "optionA"
        const get = (...names: string[]) => {
          for (const n of names) {
            const hit = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_]/g, '') === n.toLowerCase().replace(/[\s_]/g, ''))
            if (hit !== undefined && String(row[hit]).trim() !== '') return String(row[hit]).trim()
          }
          return ''
        }
        const qid = get('question_id', 'id')
        const text = get('question_text', 'question')
        const correct = get('correct_answer', 'answer').toUpperCase()
        const optionTexts: Record<string, string> = {
          A: get('option_a', 'optiona', 'a'),
          B: get('option_b', 'optionb', 'b'),
          C: get('option_c', 'optionc', 'c'),
          D: get('option_d', 'optiond', 'd'),
        }

        const rowNum = i + 2 // 1-based + header row
        if (!qid) errors.push(`Row ${rowNum}: missing question_id`)
        if (!text) errors.push(`Row ${rowNum}: missing question_text`)
        if (!OPTION_KEYS.includes(correct)) errors.push(`Row ${rowNum}: correct_answer must be A, B, C or D`)
        for (const key of OPTION_KEYS) {
          if (!optionTexts[key]) errors.push(`Row ${rowNum}: missing option ${key}`)
        }

        return {
          question_id: qid,
          question_text: text,
          options: OPTION_KEYS.map(key => ({ key, text: optionTexts[key], is_correct: key === correct })),
          correct_answer: correct,
          difficulty: get('difficulty') || 'Medium',
          week: parseInt(get('week')) || 1,
          day: parseInt(get('day')) || 1,
          explanation: get('explanation'),
          question_type: get('question_type', 'type') || 'aptitude',
        }
      })

      // Duplicate ids inside the file itself
      const seen = new Set<string>()
      parsed.forEach((p, i) => {
        if (p.question_id && seen.has(p.question_id)) errors.push(`Row ${i + 2}: duplicate question_id "${p.question_id}" in file`)
        seen.add(p.question_id)
      })

      setImportRows(parsed)
      setImportErrors(errors)
      if (parsed.length === 0) setImportErrors(['File contains no data rows'])
    } catch (e) {
      console.error('Error parsing file:', e)
      setImportRows([])
      setImportErrors(['Could not parse this file. Upload .xlsx, .xls or .csv with a header row.'])
    }
  }

  const handleImport = async () => {
    if (importRows.length === 0 || importErrors.length > 0) return
    try {
      setIsImporting(true)
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const res = await fetch(`${apiBaseUrl}/questions/bulk-insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ questions: importRows }),
      })
      const result = await res.json()
      if (result.success) {
        showToast(result.message || `Imported ${importRows.length} questions`, 'success')
        setImportOpen(false)
        setImportRows([])
        setImportErrors([])
        fetchQuestions()
      } else {
        showToast(result.message || 'Import failed', 'error')
      }
    } catch (e) {
      console.error('Error importing questions:', e)
      showToast('Import failed', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = () => {
    if (questions.length === 0) {
      showToast('Nothing to export on this page', 'warning')
      return
    }
    const rows = questions.map(q => ({
      question_id: q.question_id,
      question_text: q.question_text,
      option_a: q.options?.find(o => o.key === 'A')?.text || '',
      option_b: q.options?.find(o => o.key === 'B')?.text || '',
      option_c: q.options?.find(o => o.key === 'C')?.text || '',
      option_d: q.options?.find(o => o.key === 'D')?.text || '',
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
      week: q.week,
      day: q.day,
      question_type: q.question_type,
      explanation: q.explanation || '',
    }))
    exportToCSV(rows, `questions_page${page}_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, total)

  return (
    <SuperadminLayout>
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral flex items-center gap-3">
                <Library className="w-8 h-8 text-primary" />
                Question Bank
              </h1>
              <p className="text-neutral-light mt-1">
                {total} question{total !== 1 ? 's' : ''} across all weeks — search, edit, and bulk import
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2 text-sm font-medium">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button variant="secondary" onClick={() => { setImportRows([]); setImportErrors([]); setImportOpen(true) }} className="flex items-center gap-2 text-sm font-medium">
                <Upload className="w-4 h-4" />
                Bulk Import
              </Button>
              <Button onClick={openCreate} className="flex items-center gap-2 text-sm font-medium">
                <Plus className="w-4 h-4" />
                Add Question
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" />
                <input
                  type="text"
                  placeholder="Search question text or ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-light/30 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="w-full sm:w-32 shrink-0">
                <FilterSelect
                  value={weekFilter}
                  onChange={setWeekFilter}
                  options={[{ value: '', label: 'All Weeks' }, ...WEEKS.map(w => ({ value: w, label: `Week ${w}` }))]}
                />
              </div>
              <div className="w-full sm:w-36 shrink-0">
                <FilterSelect
                  value={difficultyFilter}
                  onChange={setDifficultyFilter}
                  options={[{ value: '', label: 'All Difficulty' }, ...DIFFICULTIES.map(d => ({ value: d, label: d }))]}
                />
              </div>
              <div className="w-full sm:w-36 shrink-0">
                <FilterSelect
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'aptitude', label: 'Aptitude' },
                    { value: 'coding', label: 'Coding' },
                  ]}
                />
              </div>
              <Button variant="secondary" onClick={fetchQuestions} className="flex items-center gap-2 text-sm font-medium shrink-0">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : questions.length === 0 ? (
              <div className="p-16 text-center">
                <Library className="w-12 h-12 text-neutral-light mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-semibold text-neutral mb-2">No questions found</h3>
                <p className="text-neutral-light">Try adjusting the filters, or add a question.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-light/20 bg-background-elevated">
                        <th className="text-left py-3 px-4 font-semibold text-neutral">ID</th>
                        <th className="text-left py-3 px-4 font-semibold text-neutral">Question</th>
                        <th className="text-center py-3 px-4 font-semibold text-neutral">Week / Day</th>
                        <th className="text-center py-3 px-4 font-semibold text-neutral">Difficulty</th>
                        <th className="text-center py-3 px-4 font-semibold text-neutral">Type</th>
                        <th className="text-center py-3 px-4 font-semibold text-neutral">Answer</th>
                        <th className="text-right py-3 px-4 font-semibold text-neutral">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map(q => (
                        <tr key={q._id} className="border-b border-neutral-light/10 hover:bg-background-elevated">
                          <td className="py-3 px-4 font-medium text-neutral whitespace-nowrap">{q.question_id}</td>
                          <td className="py-3 px-4 text-neutral max-w-[380px]">
                            <span className="line-clamp-2" title={q.question_text}>{q.question_text}</span>
                          </td>
                          <td className="py-3 px-4 text-center text-neutral-light whitespace-nowrap">W{q.week} · D{q.day}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${difficultyBadge(q.difficulty)}`}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-neutral-light capitalize">{q.question_type}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {q.correct_answer}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(q)}
                                className="p-2 rounded-lg text-neutral-light hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Edit question"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(q)}
                                className="p-2 rounded-lg text-neutral-light hover:text-red-600 hover:bg-red-500/10 transition-colors"
                                title="Delete question"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-light/20">
                  <p className="text-sm text-neutral-light">
                    Showing {showingFrom}–{showingTo} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                      className="flex items-center gap-1 text-sm font-medium"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-neutral px-2">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                      className="flex items-center gap-1 text-sm font-medium"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Question' : 'Add Question'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Question ID *"
              value={form.question_id}
              onChange={e => setForm(f => ({ ...f, question_id: e.target.value }))}
              placeholder="e.g. Q201"
              disabled={!!editingId}
            />
            <FilterSelect
              label="Week"
              value={form.week}
              onChange={v => setForm(f => ({ ...f, week: v }))}
              options={WEEKS.map(w => ({ value: w, label: `Week ${w}` }))}
            />
            <Input
              label="Day"
              type="number"
              min={1}
              max={7}
              value={form.day}
              onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral mb-1">Question Text *</label>
            <textarea
              value={form.question_text}
              onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-light/30 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
              placeholder="Enter the question..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral">Options * <span className="text-neutral-light font-normal">(select the correct one)</span></label>
            {OPTION_KEYS.map(key => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct_answer"
                  checked={form.correct_answer === key}
                  onChange={() => setForm(f => ({ ...f, correct_answer: key }))}
                  className="w-4 h-4 accent-green-600 shrink-0"
                  title={`Mark ${key} as correct`}
                />
                <span className="w-5 text-sm font-semibold text-neutral shrink-0">{key}</span>
                <input
                  type="text"
                  value={(form as any)[`option${key}`]}
                  onChange={e => setForm(f => ({ ...f, [`option${key}`]: e.target.value }))}
                  className={`flex-1 px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    form.correct_answer === key ? 'border-green-500/50' : 'border-neutral-light/30'
                  }`}
                  placeholder={`Option ${key}`}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FilterSelect
              label="Difficulty"
              value={form.difficulty}
              onChange={v => setForm(f => ({ ...f, difficulty: v }))}
              options={DIFFICULTIES.map(d => ({ value: d, label: d }))}
            />
            <FilterSelect
              label="Type"
              value={form.question_type}
              onChange={v => setForm(f => ({ ...f, question_type: v }))}
              options={[
                { value: 'aptitude', label: 'Aptitude' },
                { value: 'coding', label: 'Coding' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral mb-1">Explanation</label>
            <textarea
              value={form.explanation}
              onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-neutral-light/30 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
              placeholder="Why is this answer correct? (shown to students after the test)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="text-sm font-medium">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="text-sm font-medium">
              {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Question'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Question"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral">
            Delete <span className="font-semibold">{deleteTarget?.question_id}</span>? Students will no longer
            see it in tests. This is a soft delete — the record stays in the database.
          </p>
          <p className="text-sm text-neutral-light line-clamp-2">{deleteTarget?.question_text}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="text-sm font-medium">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm font-medium bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk import modal */}
      <Modal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title="Bulk Import Questions"
        size="lg"
      >
        <div className="space-y-4">
          <div className="text-sm text-neutral-light space-y-1">
            <p>Upload an <span className="font-medium text-neutral">.xlsx, .xls or .csv</span> file with a header row and these columns:</p>
            <p className="font-mono text-xs bg-background-elevated rounded-lg p-3 overflow-x-auto whitespace-nowrap">
              question_id, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty, week, day, explanation, question_type
            </p>
            <p>correct_answer is the letter A–D. difficulty defaults to Medium, type to aptitude. Existing question_ids are skipped by the server.</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
            className="block w-full text-sm text-neutral-light file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm file:font-medium file:cursor-pointer hover:file:bg-primary/90"
          />

          {importErrors.length > 0 && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 max-h-40 overflow-y-auto">
              <p className="text-sm font-semibold text-red-600 mb-1">Fix these before importing:</p>
              <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                {importErrors.slice(0, 20).map((err, i) => <li key={i}>{err}</li>)}
                {importErrors.length > 20 && <li>...and {importErrors.length - 20} more</li>}
              </ul>
            </div>
          )}

          {importRows.length > 0 && importErrors.length === 0 && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-sm font-semibold text-green-600">
                {importRows.length} question{importRows.length !== 1 ? 's' : ''} ready to import
              </p>
              <p className="text-xs text-neutral-light mt-1">
                Preview: {importRows.slice(0, 3).map(r => r.question_id).join(', ')}
                {importRows.length > 3 ? `, +${importRows.length - 3} more` : ''}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(false)} className="text-sm font-medium">
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || importRows.length === 0 || importErrors.length > 0}
              className="text-sm font-medium"
            >
              {isImporting ? 'Importing...' : `Import ${importRows.length || ''} Questions`}
            </Button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </SuperadminLayout>
  )
}
