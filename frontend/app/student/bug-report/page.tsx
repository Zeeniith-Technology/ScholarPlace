'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { getAuthHeader } from '@/utils/auth'
import {
    Bug,
    Upload,
    X,
    CheckCircle2,
    AlertCircle,
    Image as ImageIcon,
    Video as VideoIcon,
    FileText,
} from 'lucide-react'

interface MediaFile {
    data: string
    type: string
    preview: string
    name: string
}

export default function BugReportPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        page_url: '',
        page_name: '',
        bug_description: '',
        how_to_reproduce: '',
    })
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [error, setError] = useState('')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError('')
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        if (mediaFiles.length + files.length > 5) {
            setError('Maximum 5 files allowed')
            return
        }

        Array.from(files).forEach(file => {
            // Check file size (10MB for images, 50MB for videos)
            const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 50 * 1024 * 1024
            if (file.size > maxSize) {
                setError(`${file.name} exceeds maximum size (${file.type.startsWith('image/') ? '10MB' : '50MB'})`)
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                const base64 = reader.result as string
                setMediaFiles(prev => [...prev, {
                    data: base64,
                    type: file.type.startsWith('image/') ? 'image' : 'video',
                    preview: base64,
                    name: file.name
                }])
            }
            reader.readAsDataURL(file)
        })
    }

    const removeFile = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Validation
        if (!formData.page_url || !formData.page_name || !formData.bug_description) {
            setError('Please fill in all required fields')
            return
        }

        if (formData.bug_description.length < 10) {
            setError('Bug description must be at least 10 characters')
            return
        }

        try {
            setIsSubmitting(true)
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) {
                setError('Please log in to submit a bug report')
                return
            }

            const response = await fetch(`${apiBaseUrl}/bug-report/submit`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                },
                body: JSON.stringify({
                    page_url: formData.page_url,
                    page_name: formData.page_name,
                    bug_description: formData.bug_description,
                    how_to_reproduce: formData.how_to_reproduce || undefined,
                    media_files: mediaFiles.length > 0 ? mediaFiles : undefined,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setShowSuccessModal(true)
                // Reset form
                setFormData({
                    page_url: '',
                    page_name: '',
                    bug_description: '',
                    how_to_reproduce: '',
                })
                setMediaFiles([])
            } else {
                setError(data.message || 'Failed to submit bug report')
            }
        } catch (error) {
            console.error('Error submitting bug report:', error)
            setError('An error occurred while submitting the bug report')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <StudentLayout>
            <div className="min-h-screen bg-background p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 rounded-lg bg-red-500/20">
                                <Bug className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-neutral">Report a Bug</h1>
                                <p className="text-sm text-neutral-light">Help us improve by reporting issues you encounter</p>
                            </div>
                        </div>
                    </div>

                    {/* Info Banner */}
                    <Card className="mb-6 p-4 border-2 border-blue-500/20 bg-blue-500/5">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-neutral-light">
                                <p className="font-semibold text-neutral mb-1">Before reporting:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Make sure you&apos;re on the correct page where the bug occurred</li>
                                    <li>Include screenshots or screen recordings if possible (max 5 files)</li>
                                    <li>Describe the steps to reproduce the issue</li>
                                    <li>Images must be under 10MB, videos under 50MB</li>
                                </ul>
                            </div>
                        </div>
                    </Card>

                    {/* Error Message */}
                    {error && (
                        <Card className="mb-6 p-4 border-2 border-red-500/20 bg-red-500/5">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <p className="text-sm text-red-500 font-medium">{error}</p>
                            </div>
                        </Card>
                    )}

                    {/* Bug Report Form */}
                    <Card className="p-6 border-2 border-neutral-light/10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Page URL */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral mb-2">
                                    Page URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    name="page_url"
                                    value={formData.page_url}
                                    onChange={handleInputChange}
                                    placeholder="https://scholarplace.com/student/..."
                                    className="w-full px-4 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50"
                                    required
                                />
                                <p className="text-xs text-neutral-light mt-1">The URL where you encountered the bug</p>
                            </div>

                            {/* Page Name */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral mb-2">
                                    Page Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="page_name"
                                    value={formData.page_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Student Dashboard, Test Page, etc."
                                    className="w-full px-4 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50"
                                    required
                                />
                            </div>

                            {/* Bug Description */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral mb-2">
                                    Bug Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="bug_description"
                                    value={formData.bug_description}
                                    onChange={handleInputChange}
                                    placeholder="Describe the bug in detail..."
                                    rows={4}
                                    className="w-full px-4 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50 resize-none"
                                    required
                                    minLength={10}
                                />
                                <p className="text-xs text-neutral-light mt-1">
                                    {formData.bug_description.length}/500 characters (minimum 10)
                                </p>
                            </div>

                            {/* How to Reproduce */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral mb-2">
                                    Steps to Reproduce (Optional)
                                </label>
                                <textarea
                                    name="how_to_reproduce"
                                    value={formData.how_to_reproduce}
                                    onChange={handleInputChange}
                                    placeholder="1. Go to...\n2. Click on...\n3. See the error..."
                                    rows={4}
                                    className="w-full px-4 py-2 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50 resize-none"
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral mb-2">
                                    Screenshots / Videos (Optional)
                                </label>
                                <div className="border-2 border-dashed border-neutral-light/20 rounded-lg p-6 text-center">
                                    <input
                                        type="file"
                                        id="media-upload"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={mediaFiles.length >= 5}
                                    />
                                    <label
                                        htmlFor="media-upload"
                                        className={`cursor-pointer ${mediaFiles.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <Upload className="w-12 h-12 text-neutral-light mx-auto mb-3" />
                                        <p className="text-sm font-medium text-neutral mb-1">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-neutral-light">
                                            PNG, JPG, MP4, WebM (max {mediaFiles.length}/5 files)
                                        </p>
                                    </label>
                                </div>

                                {/* Preview uploaded files */}
                                {mediaFiles.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                        {mediaFiles.map((file, index) => (
                                            <div key={index} className="relative group">
                                                <div className="aspect-video bg-background-elevated rounded-lg overflow-hidden border border-neutral-light/20">
                                                    {file.type === 'image' ? (
                                                        <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <VideoIcon className="w-8 h-8 text-neutral-light" />
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <p className="text-xs text-neutral-light mt-1 truncate">{file.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex items-center justify-between pt-4 border-t border-neutral-light/10">
                                <button
                                    type="button"
                                    onClick={() => router.push('/student/my-bug-reports')}
                                    className="text-sm text-accent hover:underline flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4" />
                                    View My Reports
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({
                                                page_url: '',
                                                page_name: '',
                                                bug_description: '',
                                                how_to_reproduce: '',
                                            })
                                            setMediaFiles([])
                                            setError('')
                                        }}
                                        className="px-4 py-2 text-neutral-light hover:text-neutral transition-colors"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Bug className="w-5 h-5" />
                                                Submit Bug Report
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <Modal
                    isOpen={showSuccessModal}
                    onClose={() => setShowSuccessModal(false)}
                    title="Bug Report Submitted"
                >
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral mb-2">Thank You!</h3>
                        <p className="text-neutral-light mb-6">
                            Your bug report has been submitted successfully. Our team will review it soon.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="px-4 py-2 bg-background-elevated text-neutral-light rounded-lg hover:bg-neutral-light/10 transition-colors"
                            >
                                Report Another
                            </button>
                            <button
                                onClick={() => router.push('/student/my-bug-reports')}
                                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
                            >
                                View My Reports
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </StudentLayout>
    )
}
