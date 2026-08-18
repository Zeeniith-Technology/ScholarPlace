'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Modal } from '@/components/ui/Modal'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader } from '@/utils/auth'
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Globe,
  Building2,
} from 'lucide-react'

interface Announcement {
  _id: string
  title: string
  message: string
  severity: 'info' | 'success' | 'warning' | 'critical'
  target_college_id: string | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  created_at: string
  created_by_email?: string | null
}

const SEVERITY_META: Record<string, { label: string; icon: any; badge: string; bar: string }> = {
  info: { label: 'Info', icon: Info, badge: 'bg-blue-500/10 text-blue-600', bar: 'bg-blue-500' },
  success: { label: 'Success', icon: CheckCircle2, badge: 'bg-green-500/10 text-green-600', bar: 'bg-green-500' },
  warning: { label: 'Warning', icon: AlertTriangle, badge: 'bg-amber-500/10 text-amber-700', bar: 'bg-amber-500' },
  critical: { label: 'Critical', icon: AlertOctagon, badge: 'bg-red-500/10 text-red-600', bar: 'bg-red-500' },
}

const emptyForm = {
  title: '',
  message: '',
  severity: 'info' as Announcement['severity'],
  target_college_id: '',
  starts_at: '',
  ends_at: '',
  active: true,
}
type Form = typeof emptyForm

export default function SuperadminAnnouncementsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [colleges, setColleges] = useState<{ _id: string; collage_name: string }[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast, showToast, hideToast } = useToast()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  const collegeName = useCallback(
    (id: string | null) => (id ? colleges.find(c => String(c._id) === String(id))?.collage_name || 'Unknown college' : null),
    [colleges]
  )

  const fetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true)
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/superadmin/announcements/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      if (result.success) setAnnouncements(result.data || [])
      else showToast(result.message || 'Failed to load announcements', 'error')
    } catch (e) {
      console.error('Error fetching announcements:', e)
      showToast('Failed to load announcements', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchColleges = useCallback(async () => {
    try {
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/collage/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ projection: { collage_name: 1 } }),
      })
      const result = await res.json()
      if (result.success) setColleges((result.data || []).map((c: any) => ({ _id: String(c._id), collage_name: c.collage_name })))
    } catch (e) {
      console.error('Error fetching colleges:', e)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    fetchAnnouncements()
    fetchColleges()
  }, [fetchAnnouncements, fetchColleges])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditingId(a._id)
    setForm({
      title: a.title,
      message: a.message,
      severity: a.severity,
      target_college_id: a.target_college_id || '',
      starts_at: a.starts_at ? a.starts_at.slice(0, 10) : '',
      ends_at: a.ends_at ? a.ends_at.slice(0, 10) : '',
      active: a.active,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      showToast('Title and message are required', 'warning')
      return
    }
    if (form.starts_at && form.ends_at && form.ends_at < form.starts_at) {
      showToast('End date cannot be before start date', 'warning')
      return
    }
    try {
      setIsSaving(true)
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const payload: any = {
        title: form.title.trim(),
        message: form.message.trim(),
        severity: form.severity,
        target_college_id: form.target_college_id || null,
        // store as end-of-day for ends_at so it stays visible through the whole day
        starts_at: form.starts_at ? new Date(form.starts_at + 'T00:00:00').toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at + 'T23:59:59').toISOString() : null,
        active: form.active,
      }
      if (editingId) payload._id = editingId

      const endpoint = editingId ? '/superadmin/announcements/update' : '/superadmin/announcements/create'
      const res = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (result.success) {
        showToast(editingId ? 'Announcement updated' : 'Announcement published', 'success')
        setModalOpen(false)
        fetchAnnouncements()
      } else {
        showToast(result.message || 'Save failed', 'error')
      }
    } catch (e) {
      console.error('Error saving announcement:', e)
      showToast('Save failed', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleActive = async (a: Announcement) => {
    try {
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/superadmin/announcements/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ _id: a._id, active: !a.active }),
      })
      const result = await res.json()
      if (result.success) {
        showToast(a.active ? 'Announcement paused' : 'Announcement is now live', 'success')
        fetchAnnouncements()
      } else {
        showToast(result.message || 'Update failed', 'error')
      }
    } catch (e) {
      console.error('Error toggling announcement:', e)
      showToast('Update failed', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/superadmin/announcements/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ _id: deleteTarget._id }),
      })
      const result = await res.json()
      if (result.success) {
        showToast('Announcement deleted', 'success')
        setDeleteTarget(null)
        fetchAnnouncements()
      } else {
        showToast(result.message || 'Delete failed', 'error')
      }
    } catch (e) {
      console.error('Error deleting announcement:', e)
      showToast('Delete failed', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  /** Live / Scheduled / Ended / Paused, from active flag + date window */
  const statusOf = (a: Announcement): { label: string; cls: string } => {
    if (!a.active) return { label: 'Paused', cls: 'bg-neutral-light/20 text-neutral-light' }
    const now = Date.now()
    if (a.starts_at && new Date(a.starts_at).getTime() > now) return { label: 'Scheduled', cls: 'bg-blue-500/10 text-blue-600' }
    if (a.ends_at && new Date(a.ends_at).getTime() < now) return { label: 'Ended', cls: 'bg-neutral-light/20 text-neutral-light' }
    return { label: 'Live', cls: 'bg-green-500/10 text-green-600' }
  }

  return (
    <SuperadminLayout>
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral flex items-center gap-3">
                <Megaphone className="w-8 h-8 text-primary" />
                Announcements
              </h1>
              <p className="text-neutral-light mt-1">Broadcast a banner to students — platform-wide or for one college</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={fetchAnnouncements} className="flex items-center gap-2 text-sm font-medium">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button onClick={openCreate} className="flex items-center gap-2 text-sm font-medium">
                <Plus className="w-4 h-4" />
                New Announcement
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : announcements.length === 0 ? (
            <Card className="p-16 text-center">
              <Megaphone className="w-12 h-12 text-neutral-light mx-auto mb-4 opacity-40" />
              <h3 className="text-xl font-semibold text-neutral mb-2">No announcements yet</h3>
              <p className="text-neutral-light max-w-md mx-auto">
                Create one to show a banner on every student&apos;s dashboard — great for maintenance windows,
                new features, or deadline reminders.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => {
                const meta = SEVERITY_META[a.severity] || SEVERITY_META.info
                const Icon = meta.icon
                const status = statusOf(a)
                return (
                  <Card key={a._id} className="overflow-hidden">
                    <div className="flex">
                      <div className={`w-1.5 shrink-0 ${meta.bar}`} />
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-lg font-semibold text-neutral">{a.title}</h3>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badge}`}>
                                <Icon className="w-3 h-3" />
                                {meta.label}
                              </span>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${status.cls}`}>
                                {status.label}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-dark whitespace-pre-line">{a.message}</p>
                            <div className="flex items-center gap-3 mt-3 text-xs text-neutral-light flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                {a.target_college_id ? <Building2 className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                                {a.target_college_id ? collegeName(a.target_college_id) : 'All colleges'}
                              </span>
                              {a.starts_at && <span>From {new Date(a.starts_at).toLocaleDateString()}</span>}
                              {a.ends_at && <span>Until {new Date(a.ends_at).toLocaleDateString()}</span>}
                              <span>Created {new Date(a.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => toggleActive(a)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-light hover:text-neutral hover:bg-background-elevated transition-colors"
                              title={a.active ? 'Pause (hide from students)' : 'Make live'}
                            >
                              {a.active ? 'Pause' : 'Make live'}
                            </button>
                            <button
                              onClick={() => openEdit(a)}
                              className="p-2 rounded-lg text-neutral-light hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(a)}
                              className="p-2 rounded-lg text-neutral-light hover:text-red-600 hover:bg-red-500/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Announcement' : 'New Announcement'} size="lg">
        <div className="space-y-4">
          <Input
            label="Title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Scheduled maintenance Sunday 10 PM"
          />
          <div>
            <label className="block text-sm font-medium text-neutral mb-1">Message *</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-light/30 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
              placeholder="What do students need to know?"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FilterSelect
              label="Severity"
              value={form.severity}
              onChange={v => setForm(f => ({ ...f, severity: v as Announcement['severity'] }))}
              options={[
                { value: 'info', label: 'Info (blue)' },
                { value: 'success', label: 'Success (green)' },
                { value: 'warning', label: 'Warning (amber)' },
                { value: 'critical', label: 'Critical (red)' },
              ]}
            />
            <FilterSelect
              label="Audience"
              value={form.target_college_id}
              onChange={v => setForm(f => ({ ...f, target_college_id: v }))}
              options={[
                { value: '', label: 'All colleges' },
                ...colleges.map(c => ({ value: c._id, label: c.collage_name })),
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Start date (optional)"
                type="date"
                value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
              />
              <p className="text-xs text-neutral-light mt-1">Leave empty to show immediately.</p>
            </div>
            <div>
              <Input
                label="End date (optional)"
                type="date"
                value={form.ends_at}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
              />
              <p className="text-xs text-neutral-light mt-1">Leave empty to show until paused.</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            Publish immediately (uncheck to save as paused)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="text-sm font-medium">Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="text-sm font-medium">
              {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Publish'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Announcement" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-neutral">
            Delete <span className="font-semibold">{deleteTarget?.title}</span>? Students will stop seeing it immediately.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="text-sm font-medium">Cancel</Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="text-sm font-medium bg-red-600 hover:bg-red-700">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </SuperadminLayout>
  )
}
