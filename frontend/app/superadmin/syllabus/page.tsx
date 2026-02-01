'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthHeader, clearAuth } from '@/utils/auth'
import * as XLSX from 'xlsx'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

/**
 * Superadmin Syllabus Management Page
 * Route: /superadmin/syllabus
 * 
 * Allows superadmin to:
 * - Upload Excel file to import syllabus data
 * - View existing syllabus data
 * - Edit/Delete syllabus entries
 */
export default function SyllabusManagementPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })
  const [syllabusData, setSyllabusData] = useState<any[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Week-specific content update states
  const [selectedWeek, setSelectedWeek] = useState<string>('1')
  const [contentType, setContentType] = useState<'DSA' | 'Aptitude'>('DSA')
  const [topicsInput, setTopicsInput] = useState<string>('')
  const [moduleName, setModuleName] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  // Check authentication on mount
  useEffect(() => {
    // Verify authentication via API, not localStorage
    const verifyAuth = async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
        
        const authHeader = getAuthHeader()
        if (!authHeader) {
          router.push('/superadmin/login')
          return
        }

        // Verify authentication by fetching profile (requires valid JWT token)
        const profileRes = await fetch(`${apiBaseUrl}/profile/get`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
        })
        
        // Only redirect on 401/403 (authentication errors)
        if (profileRes.status === 401 || profileRes.status === 403) {
          console.log('[Syllabus Page] Authentication failed, clearing token and redirecting to login')
          clearAuth()
          window.location.href = '/superadmin/login'
          return
        }

        if (!profileRes.ok) {
          console.error('[Syllabus Page] Profile fetch failed with status:', profileRes.status)
          // Don't redirect on other errors
          return
        }

        const profileResult = await profileRes.json()
        const userRole = profileResult.data?.role || profileResult.data?.person_role
        if (!profileResult.success || userRole !== 'superadmin') {
          console.log('[Syllabus Page] Invalid role or failed profile check, clearing token and redirecting to login')
          clearAuth()
          window.location.href = '/superadmin/login'
          return
        }
      } catch (error) {
        console.error('[Syllabus Page] Auth verification error:', error)
        // Only redirect if we have no token
        const authHeader = getAuthHeader()
        if (!authHeader) {
          clearAuth()
          window.location.href = '/superadmin/login'
        }
      }
    }
    
    verifyAuth()
  }, [router])

  // Fetch existing syllabus data
  useEffect(() => {
    fetchSyllabus()
  }, [])

  const fetchSyllabus = async () => {
    try {
      setIsFetching(true)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) {
        console.error('No auth token for syllabus fetch')
        return
      }

      const response = await fetch(`${apiBaseUrl}/syllabus/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          filter: {},
          projection: {},
          options: { sort: { week: 1 } }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setSyllabusData(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching syllabus:', error)
    } finally {
      setIsFetching(false)
    }
  }

  /**
   * Parse topic sheet (Aptitude or DSA) to get module details
   */
  const parseTopicSheet = (workbook: XLSX.WorkBook, sheetName: string) => {
    const modules: any[] = []
    const worksheet = workbook.Sheets[sheetName]
    
    if (!worksheet) return modules
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false })
    
    jsonData.forEach((row: any) => {
      if (row.Module) {
        const topics = row.Topics ? row.Topics.split(',').map((t: string) => t.trim()) : []
        modules.push({
          module: row.Module,
          topics: topics,
          duration: row.Duration || '',
          questions: row.Questions || row['MCQs'] || row['Coding Q'] || '',
          miniTest: row['Mini-Test'] || '',
          passPercent: row['Pass %'] || ''
        })
      }
    })
    
    return modules
  }

  /**
   * Parse array field (comma-separated string to array)
   */
  const parseArrayField = (value: string | undefined): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0)
  }

  /**
   * Parse week sheet to create syllabus entry
   */
  const parseWeekSheet = (
    workbook: XLSX.WorkBook,
    sheetName: string,
    weekNum: number,
    aptitudeModules: any[],
    dsaModules: any[]
  ) => {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) return null
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false })
    
    if (jsonData.length === 0) return null
    
    // Collect all modules and topics from the week
    const weekAptitudeModules = new Set<string>()
    const weekDsaModules = new Set<string>()
    const allTopics = new Set<string>()
    const dailyFlows: string[] = []
    const testsDue: string[] = []
    
    jsonData.forEach((row: any) => {
      // Extract aptitude modules
      if (row['Aptitude Module'] || row['Aptitude']) {
        const aptModule = row['Aptitude Module'] || row['Aptitude']
        if (aptModule && aptModule !== '-') {
          if (weekNum >= 7) {
            if (aptModule.toLowerCase().includes('mock') || aptModule.toLowerCase().includes('test')) {
              weekAptitudeModules.add('Mock Tests')
            } else if (aptModule.toLowerCase().includes('revision') || aptModule.toLowerCase().includes('all')) {
              weekAptitudeModules.add('Revision')
            } else {
              const cleanModule = aptModule.split('(')[0].trim()
              if (cleanModule.length > 2) {
                weekAptitudeModules.add(cleanModule)
              }
            }
          } else {
            const moduleMatch = aptModule.match(/(\d+[a-z]?\.?\s*[^\(]+)/)
            if (moduleMatch) {
              weekAptitudeModules.add(moduleMatch[1].trim())
            } else if (aptModule.trim().length > 0 && !aptModule.includes('(')) {
              weekAptitudeModules.add(aptModule.trim())
            }
          }
        }
      }
      
      // Extract DSA modules
      if (row['DSA Module'] || row['DSA']) {
        const dsaModule = row['DSA Module'] || row['DSA']
        if (dsaModule && dsaModule !== '-') {
          if (weekNum >= 7) {
            if (dsaModule.toLowerCase().includes('mock') || dsaModule.toLowerCase().includes('test') || dsaModule.toLowerCase().includes('coding')) {
              weekDsaModules.add('Mock Tests')
            } else if (dsaModule.toLowerCase().includes('revision') || dsaModule.toLowerCase().includes('all')) {
              weekDsaModules.add('Revision')
            } else {
              const cleanModule = dsaModule.split('(')[0].trim()
              if (cleanModule.length > 2) {
                weekDsaModules.add(cleanModule)
              }
            }
          } else {
            const moduleMatch = dsaModule.match(/(\d+[a-z]?\.?\s*[^\(]+)/)
            if (moduleMatch) {
              weekDsaModules.add(moduleMatch[1].trim())
            } else if (dsaModule.trim().length > 0 && !dsaModule.includes('(')) {
              weekDsaModules.add(dsaModule.trim())
            }
          }
        }
      }
      
      // Extract topics from modules
      const aptModuleText = row['Aptitude Module'] || row['Aptitude'] || ''
      const dsaModuleText = row['DSA Module'] || row['DSA'] || ''
      
      // Find matching topics from reference modules
      aptitudeModules.forEach(mod => {
        if (aptModuleText.includes(mod.module.split('.')[0]) || aptModuleText.includes(mod.module)) {
          mod.topics.forEach((topic: string) => allTopics.add(topic))
        }
      })
      
      dsaModules.forEach(mod => {
        if (dsaModuleText.includes(mod.module.split('.')[0]) || dsaModuleText.includes(mod.module)) {
          mod.topics.forEach((topic: string) => allTopics.add(topic))
        }
      })
      
      // Collect daily flows and tests
      if (row['Daily Flow'] && row['Daily Flow'] !== '-') {
        dailyFlows.push(row['Daily Flow'])
      }
      if (row['Tests Due'] && row['Tests Due'] !== '-') {
        testsDue.push(row['Tests Due'])
      }
    })
    
    const aptitudeModuleList = Array.from(weekAptitudeModules)
    const dsaModuleList = Array.from(weekDsaModules)
    const allModules = [...aptitudeModuleList, ...dsaModuleList]
    
    // Create title
    let title = `Week ${weekNum}`
    if (weekNum <= 6) {
      const aptTitle = aptitudeModuleList.length > 0 ? aptitudeModuleList[0] : ''
      const dsaTitle = dsaModuleList.length > 0 ? dsaModuleList[0] : ''
      if (aptTitle && dsaTitle) {
        title = `Week ${weekNum}: ${aptTitle} & ${dsaTitle}`
      } else if (aptTitle) {
        title = `Week ${weekNum}: ${aptTitle}`
      } else if (dsaTitle) {
        title = `Week ${weekNum}: ${dsaTitle}`
      }
    } else if (weekNum === 7) {
      title = 'Week 7: Mock Tests & Practice'
    } else if (weekNum === 8) {
      title = 'Week 8: Final Preparation & Placement Simulation'
    }
    
    // Create description from daily flows
    const description = dailyFlows.join(' | ')
    
    // Determine status
    let status = 'locked'
    if (weekNum === 1) status = 'upcoming'
    else if (weekNum > 1) status = 'locked'
    
    return {
      week: weekNum,
      title: title,
      modules: allModules,
      topics: Array.from(allTopics),
      assignments: 0,
      tests: testsDue.length,
      duration: '2 hours',
      status: status,
      description: description,
      learning_objectives: [],
      resources: [],
      is_deleted: false
    }
  }

  /**
   * Handle file selection
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Accept Excel files by extension or MIME type, or .file extension (we'll detect the actual type)
      const isExcelByExtension = file.name.endsWith('.xlsx') || 
                                 file.name.endsWith('.xls') || 
                                 file.name.endsWith('.file')
      const isExcelByMime = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                           file.type === 'application/vnd.ms-excel' ||
                           file.type === 'application/octet-stream' // Often used for .file extensions
      
      if (isExcelByExtension || isExcelByMime) {
        setSelectedFile(file)
        setUploadStatus({ type: null, message: '' })
      } else {
        setUploadStatus({ 
          type: 'error', 
          message: 'Please select an Excel file (.xlsx, .xls, or .file extension). The system will try to detect the file type automatically.' 
        })
      }
    }
  }

  /**
   * Handle Excel file upload and import
   */
  const handleImport = async () => {
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Please select a file first' })
      return
    }

    setIsLoading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      // Read Excel file - XLSX library can detect Excel files even with wrong extensions
      const arrayBuffer = await selectedFile.arrayBuffer()
      
      // Try to read as Excel file (works even with .file extension)
      let workbook
      try {
        workbook = XLSX.read(arrayBuffer, { type: 'array' })
      } catch (readError) {
        setUploadStatus({ 
          type: 'error', 
          message: 'Failed to read file as Excel. Please ensure it is a valid Excel file (.xlsx or .xls format).' 
        })
        setIsLoading(false)
        return
      }
      
      // Verify it's actually an Excel file by checking for sheets
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setUploadStatus({ 
          type: 'error', 
          message: 'File does not appear to be a valid Excel file. No sheets found.' 
        })
        setIsLoading(false)
        return
      }
      
      // Get reference data from topic sheets
      const aptitudeModules = parseTopicSheet(workbook, 'Aptitude_topics_indepth')
      const dsaModules = parseTopicSheet(workbook, 'DSA_topics_indepth')
      
      // Process week sheets (Week1 through Week8)
      const allSyllabusData: any[] = []
      const weekSheets = workbook.SheetNames.filter(name => name.startsWith('Week'))
      
      for (const sheetName of weekSheets.sort()) {
        const weekNum = parseInt(sheetName.replace('Week', ''))
        if (isNaN(weekNum)) continue
        
        const weekData = parseWeekSheet(workbook, sheetName, weekNum, aptitudeModules, dsaModules)
        
        if (weekData) {
          allSyllabusData.push(weekData)
        }
      }

      if (allSyllabusData.length === 0) {
        setUploadStatus({ type: 'error', message: 'No valid syllabus data found in the Excel file' })
        setIsLoading(false)
        return
      }

      // Send to backend
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const authHeader = getAuthHeader()
      if (!authHeader) {
        setUploadStatus({ type: 'error', message: 'Authentication required. Please login again.' })
        return
      }

      const response = await fetch(`${apiBaseUrl}/syllabus/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(allSyllabusData),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUploadStatus({
            type: 'success',
            message: `Successfully imported ${allSyllabusData.length} weeks of syllabus data!`
          })
          setSelectedFile(null)
          // Reset file input
          const fileInput = document.getElementById('excel-file') as HTMLInputElement
          if (fileInput) fileInput.value = ''
          // Refresh syllabus list
          fetchSyllabus()
        } else {
          setUploadStatus({ type: 'error', message: data.message || 'Import failed' })
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Import failed' }))
        setUploadStatus({ type: 'error', message: errorData.message || 'Import failed' })
      }
    } catch (error: any) {
      console.error('Import error:', error)
      setUploadStatus({ type: 'error', message: error.message || 'Failed to process Excel file' })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle updating specific week content (DSA or Aptitude topics)
   */
  const handleUpdateWeekContent = async () => {
    if (!moduleName.trim() || !topicsInput.trim()) {
      setUpdateStatus({ type: 'error', message: 'Please provide both module name and topics' })
      return
    }

    setIsUpdating(true)
    setUpdateStatus({ type: null, message: '' })

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
      const weekNum = parseInt(selectedWeek)

      // Parse topics (comma-separated or newline-separated)
      const topics = topicsInput
        .split(/[,\n]/)
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const authHeader = getAuthHeader()
      if (!authHeader) {
        setUpdateStatus({ type: 'error', message: 'Authentication required. Please login again.' })
        return
      }

      // First, fetch existing week data
      const fetchResponse = await fetch(`${apiBaseUrl}/syllabus/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          filter: { week: weekNum },
          projection: {},
          options: {}
        }),
      })

      let existingWeek: any = null
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json()
        if (fetchData.success && fetchData.data && fetchData.data.length > 0) {
          existingWeek = fetchData.data[0]
        }
      }

      // Prepare update data
      let updatedModules: string[] = []
      let updatedTopics: string[] = []

      if (existingWeek) {
        // Update existing week
        updatedModules = [...(existingWeek.modules || [])]
        updatedTopics = [...(existingWeek.topics || [])]

        // Add module if not exists
        if (!updatedModules.includes(moduleName)) {
          updatedModules.push(moduleName)
        }

        // Add topics if not exists
        topics.forEach(topic => {
          if (!updatedTopics.includes(topic)) {
            updatedTopics.push(topic)
          }
        })
      } else {
        // Create new week entry
        updatedModules = [moduleName]
        updatedTopics = topics
      }

      // Update or insert
      const updateData = {
        week: weekNum,
        title: existingWeek?.title || `Week ${weekNum}: ${moduleName}`,
        modules: updatedModules,
        topics: updatedTopics,
        assignments: existingWeek?.assignments || 0,
        tests: existingWeek?.tests || 0,
        duration: existingWeek?.duration || '2 hours',
        status: existingWeek?.status || (weekNum === 1 ? 'start' : 'locked'),
        description: existingWeek?.description || `Week ${weekNum} ${contentType} content`,
        learning_objectives: existingWeek?.learning_objectives || [],
        resources: existingWeek?.resources || [],
      }

      if (existingWeek) {
        // Update existing
        const updateResponse = await fetch(`${apiBaseUrl}/syllabus/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            filter: { week: weekNum },
            data: updateData
          }),
        })

        if (updateResponse.ok) {
          const data = await updateResponse.json()
          if (data.success) {
            setUpdateStatus({
              type: 'success',
              message: `Successfully updated Week ${weekNum} ${contentType} content!`
            })
            setTopicsInput('')
            setModuleName('')
            fetchSyllabus()
          } else {
            setUpdateStatus({ type: 'error', message: data.message || 'Update failed' })
          }
        } else {
          const errorData = await updateResponse.json().catch(() => ({ message: 'Update failed' }))
          setUpdateStatus({ type: 'error', message: errorData.message || 'Update failed' })
        }
      } else {
        // Insert new
        const insertResponse = await fetch(`${apiBaseUrl}/syllabus/insert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(updateData),
        })

        if (insertResponse.ok) {
          const data = await insertResponse.json()
          if (data.success) {
            setUpdateStatus({
              type: 'success',
              message: `Successfully created Week ${weekNum} ${contentType} content!`
            })
            setTopicsInput('')
            setModuleName('')
            fetchSyllabus()
          } else {
            setUpdateStatus({ type: 'error', message: data.message || 'Insert failed' })
          }
        } else {
          const errorData = await insertResponse.json().catch(() => ({ message: 'Insert failed' }))
          setUpdateStatus({ type: 'error', message: errorData.message || 'Insert failed' })
        }
      }
    } catch (error: any) {
      console.error('Update error:', error)
      setUpdateStatus({ type: 'error', message: error.message || 'Failed to update content' })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-neutral">
                Syllabus Management
              </h1>
              <p className="text-neutral-dark">
                Import and manage syllabus data from Excel files
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => router.push('/superadmin/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </header>

        {/* Upload Section */}
        <Card className="p-6 space-y-4 border border-neutral-light/40">
          <div>
            <h2 className="text-xl font-semibold text-neutral mb-2">Import Syllabus from Excel</h2>
            <p className="text-sm text-neutral-dark mb-4">
              Upload an Excel file (.xlsx, .xls, or .file extension) with syllabus data. The file should contain sheets named &quot;Week1&quot; through &quot;Week8&quot; 
              and reference sheets &quot;Aptitude_topics_indepth&quot; and &quot;DSA_topics_indepth&quot;. 
              <br />
              <span className="text-xs text-neutral-dark mt-1 block">
                Note: Files with .file extension will be automatically detected if they are Excel files.
              </span>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="excel-file" className="block text-sm font-medium text-neutral mb-2">
                Select Excel File
              </label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls,.file,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/octet-stream"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-neutral-dark">
                  Selected: <span className="font-medium">{selectedFile.name}</span>
                </p>
              )}
            </div>

            {uploadStatus.type && (
              <div
                className={`rounded-md px-4 py-3 text-sm ${
                  uploadStatus.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {uploadStatus.message}
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleImport}
              disabled={isLoading || !selectedFile}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Importing...' : 'Import Syllabus'}
            </Button>
          </div>
        </Card>

        {/* Week-Specific Content Update */}
        <Card className="p-6 space-y-4 border border-neutral-light/40">
          <div>
            <h2 className="text-xl font-semibold text-neutral mb-2">Update Week-Specific Content</h2>
            <p className="text-sm text-neutral-dark mb-4">
              Add or update content for a specific week and type (DSA or Aptitude). 
              This is useful when you want to add detailed topics for a particular week.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Select Week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              options={[
                { value: '1', label: 'Week 1' },
                { value: '2', label: 'Week 2' },
                { value: '3', label: 'Week 3' },
                { value: '4', label: 'Week 4' },
                { value: '5', label: 'Week 5' },
                { value: '6', label: 'Week 6' },
                { value: '7', label: 'Week 7' },
                { value: '8', label: 'Week 8' },
              ]}
            />

            <Select
              label="Content Type"
              value={contentType}
              onChange={(e) => setContentType(e.target.value as 'DSA' | 'Aptitude')}
              options={[
                { value: 'DSA', label: 'DSA Topics' },
                { value: 'Aptitude', label: 'Aptitude Topics' },
              ]}
            />
          </div>

          <div className="space-y-4">
            <Input
              label="Module Name"
              placeholder={`e.g., 1. Fundamentals (for DSA) or 1. Numbers (for Aptitude)`}
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
            />

            <div>
              <label htmlFor="topics-input" className="block text-sm font-medium text-neutral mb-2">
                Topics (comma-separated or one per line)
              </label>
              <textarea
                id="topics-input"
                rows={6}
                className="w-full px-4 py-3 rounded-lg bg-background-surface border border-neutral-light/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder={`Enter topics separated by commas or new lines, e.g.:\nI/O, syntax, complexity\nVariables, Data types\nOperators`}
                value={topicsInput}
                onChange={(e) => setTopicsInput(e.target.value)}
              />
              <p className="mt-1 text-xs text-neutral-dark">
                Separate topics with commas or put each topic on a new line
              </p>
            </div>

            {updateStatus.type && (
              <div
                className={`rounded-md px-4 py-3 text-sm ${
                  updateStatus.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {updateStatus.message}
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleUpdateWeekContent}
              disabled={isUpdating || !moduleName.trim() || !topicsInput.trim()}
              className="w-full sm:w-auto"
            >
              {isUpdating ? 'Updating...' : `Update Week ${selectedWeek} ${contentType} Content`}
            </Button>
          </div>
        </Card>

        {/* Existing Syllabus Data */}
        <Card className="p-6 space-y-4 border border-neutral-light/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral mb-2">Existing Syllabus Data</h2>
              <p className="text-sm text-neutral-dark">
                {syllabusData.length} week{syllabusData.length !== 1 ? 's' : ''} in database
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchSyllabus}
              disabled={isFetching}
            >
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {isFetching ? (
            <div className="text-center py-8 text-neutral-dark">Loading...</div>
          ) : syllabusData.length === 0 ? (
            <div className="text-center py-8 text-neutral-dark">
              No syllabus data found. Import an Excel file to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {syllabusData.map((week) => (
                <div
                  key={week._id || week.week}
                  className="border border-neutral-light/40 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-neutral">{week.title}</span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            week.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : week.status === 'upcoming'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {week.status}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-dark mb-2">{week.description?.substring(0, 150)}...</p>
                      <div className="flex flex-wrap gap-2 text-xs text-neutral-dark">
                        <span>Modules: {week.modules?.length || 0}</span>
                        <span>•</span>
                        <span>Topics: {week.topics?.length || 0}</span>
                        <span>•</span>
                        <span>Tests: {week.tests || 0}</span>
                        <span>•</span>
                        <span>Assignments: {week.assignments || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

