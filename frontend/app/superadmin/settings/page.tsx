'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { SuperadminLayout } from '@/components/layouts/SuperadminLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Toast, useToast } from '@/components/ui/Toast'
import { getAuthHeader } from '@/utils/auth'
import { Settings2, RefreshCw, Save, AlertTriangle } from 'lucide-react'

interface SettingDef {
  key: string
  type: 'boolean' | 'string'
  label: string
  description: string
  options: string[] | null
  default: any
}

type Values = Record<string, any>

export default function SuperadminSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [schema, setSchema] = useState<SettingDef[]>([])
  const [values, setValues] = useState<Values>({})
  const [original, setOriginal] = useState<Values>({})

  const { toast, showToast, hideToast } = useToast()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const authHeader = getAuthHeader()
      if (!authHeader) return
      const res = await fetch(`${apiBaseUrl}/superadmin/settings/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      if (result.success && result.data) {
        setSchema(result.data.schema || [])
        setValues(result.data.values || {})
        setOriginal(result.data.values || {})
      } else {
        showToast(result.message || 'Failed to load settings', 'error')
      }
    } catch (e) {
      console.error('Error loading settings:', e)
      showToast('Failed to load settings', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const dirty = JSON.stringify(values) !== JSON.stringify(original)

  const setValue = (key: string, val: any) => setValues(v => ({ ...v, [key]: val }))

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const authHeader = getAuthHeader()
      if (!authHeader) return
      // Only send the keys that actually changed
      const changed: Values = {}
      for (const k of Object.keys(values)) {
        if (values[k] !== original[k]) changed[k] = values[k]
      }
      const res = await fetch(`${apiBaseUrl}/superadmin/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ values: changed }),
      })
      const result = await res.json()
      if (result.success && result.data) {
        setValues(result.data.values)
        setOriginal(result.data.values)
        showToast('Settings saved — changes are live', 'success')
      } else {
        showToast(result.message || 'Save failed', 'error')
      }
    } catch (e) {
      console.error('Error saving settings:', e)
      showToast('Save failed', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SuperadminLayout>
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral flex items-center gap-3">
                <Settings2 className="w-8 h-8 text-primary" />
                Platform Settings
              </h1>
              <p className="text-neutral-light mt-1">Runtime toggles — changes take effect immediately, no redeploy</p>
            </div>
            <Button variant="secondary" onClick={load} className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="w-4 h-4" />
              Reload
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {schema.map(def => (
                  <Card key={def.key} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-neutral">{def.label}</h3>
                        <p className="text-sm text-neutral-light mt-0.5">{def.description}</p>
                        <p className="text-xs text-neutral-light/70 mt-1 font-mono">{def.key}</p>
                      </div>
                      <div className="shrink-0">
                        {def.type === 'boolean' ? (
                          // Toggle switch
                          <button
                            role="switch"
                            aria-checked={!!values[def.key]}
                            onClick={() => setValue(def.key, !values[def.key])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              values[def.key] ? 'bg-primary' : 'bg-neutral-light/40'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                values[def.key] ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        ) : def.options ? (
                          <div className="w-52">
                            <FilterSelect
                              value={values[def.key] ?? ''}
                              onChange={v => setValue(def.key, v)}
                              options={def.options.map((o: string) => ({ value: o, label: o }))}
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={values[def.key] ?? ''}
                            onChange={e => setValue(def.key, e.target.value)}
                            className="w-52 px-3 py-2 text-sm border border-neutral-light/30 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Save bar */}
              <div className="flex items-center justify-between gap-4 sticky bottom-4">
                <div className="flex items-center gap-2 text-sm text-neutral-light">
                  {dirty && (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Unsaved changes
                    </>
                  )}
                </div>
                <Button onClick={handleSave} disabled={!dirty || isSaving} className="flex items-center gap-2 text-sm font-medium shadow-lg">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>

              <Card className="p-4 bg-amber-500/5 border-amber-500/20">
                <p className="text-sm text-neutral-dark">
                  <span className="font-semibold">Note:</span> These override the matching <span className="font-mono text-xs">.env</span> values
                  at runtime and persist in the database. Turning the AI master switch off immediately blocks all Gemini calls
                  (students see &quot;AI temporarily unavailable&quot;); the model change applies on the next AI request; question
                  shuffling applies on the next test load.
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </SuperadminLayout>
  )
}
