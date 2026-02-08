'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { getAuthHeader } from '@/utils/auth'
import {
    Bug,
    Upload,
    X,
    AlertCircle,
    CheckCircle2,
    Image as ImageIcon,
    Video as VideoIcon,
    Send,
    FileText,
    Link as LinkIcon,
} from 'lucide-react'

interface MediaFile {
    id: string
    data: string // base64
    type: 'image' | 'video'
    name: string
    preview: string
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
    const [errorMessage, setErrorMessage] = useState('')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const newFiles: MediaFile[] = []

        for (let i = 0; i < files.length; i++) {
            const file = files[i]

            // Validate file type
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                setErrorMessage('Only images and videos are allowed')
                continue
            }

            // Validate file size (10MB for images, 50MB for videos)
            const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 50 * 1024 * 1024
            if (file.size > maxSize) {
                setErrorMessage(`File too large: ${file.name}. Max ${file.type.startsWith('image/') ? '10MB' : '50MB'}`)
                continue
            }

            // Convert to base64
            const reader = new FileReader()
            reader.onload = (event) => {
                const base64 = event.target?.result as string
                newFiles.push({
                    id: `${Date.now()}-${i}`,
                    data: base64,
                    type: file.type.startsWith('image/') ? 'image' : 'video',
                    name: file.name,
                    preview: base64,
                })

                // Add after all files are processed
                if (newFiles.length + mediaFiles.length <= 5) {
                    setMediaFiles(prev => [...prev, ...newFiles])
                } else {
                    setErrorMessage('Maximum 5 files allowed')
                }
            }
            reader.readAsDataURL(file)
        }

        // Reset input
        e.target.value = ''
    }

    const removeFile = (id: string) => {
        setMediaFiles(prev => prev.filter(f => f.id !== id))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage('')

        // Validation
        if (!formData.page_url || !formData.page_name || !formData.bug_description) {
            setErrorMessage('Please fill in all required fields')
            return
        }

        if (formData.bug_description.length < 10) {
            setErrorMessage('Bug description must be at least 10 characters')
            return
        }

        setIsSubmitting(true)

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            if (!authHeader) {
                setErrorMessage('Authentication required. Please log in again.')
                setIsSubmitting(false)
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
                    ...formData,
                    media_files: mediaFiles,
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
                setErrorMessage(data.message || 'Failed to submit bug report')
            }
        } catch (error) {
            console.error('Bug report submission error:', error)
            setErrorMessage('Network error. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
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

                {/* Form Card */}
                <Card className="border-2 border-neutral-light/10">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Error Message */}
                        {errorMessage && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <p className="text-sm text-red-500">{errorMessage}</p>
                            </div>
                        )}

                        {/* Page URL */}
                        <div>
                            <label className="block text-sm font-semibold text-neutral mb-2">
                                Page URL / Path <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-light" />
                                <input
                                    type="text"
                                    name="page_url"
                                    value={formData.page_url}
                                    onChange={handleInputChange}
                                    placeholder="e.g., /dept-tpc/analytics"
                                    className="w-full pl-10 pr-4 py-3 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50"
                                    required
                                />
                            </div>
                        </div>

                        {/* Page Name */}
                        <div>
                            <label className="block text-sm font-semibold text-neutral mb-2">
                                Page Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-light" />
                                <input
                                    type="text"
                                    name="page_name"
                                    value={formData.page_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Analytics Dashboard"
                                    className="w-full pl-10 pr-4 py-3 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50"
                                    required
                                />
                            </div>
                        </div>

                        {/* Bug Description */}
                        <div>
                            <label className="block text-sm font-semibold text-neutral mb-2">
                                Bug Description <span className="text-red-500">*</span>
                                <span className="ml-2 text-xs text-neutral-light font-normal">(min 10 characters)</span>
                            </label>
                            <textarea
                                name="bug_description"
                                value={formData.bug_description}
                                onChange={handleInputChange}
                                placeholder="Describe the bug in detail. What happened? What did you expect to happen?"
                                rows={4}
                                className="w-full px-4 py-3 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50 resize-none"
                                required
                                minLength={10}
                            />
                            <p className="text-xs text-neutral-light mt-1">
                                {formData.bug_description.length}/500 characters
                            </p>
                        </div>

                        {/* How to Reproduce */}
                        <div>
                            <label className="block text-sm font-semibold text-neutral mb-2">
                                How to Reproduce <span className="text-xs text-neutral-light font-normal">(optional)</span>
                            </label>
                            <textarea
                                name="how_to_reproduce"
                                value={formData.how_to_reproduce}
                                onChange={handleInputChange}
                                placeholder={'Steps to reproduce the bug:\\n1. Go to...\\n2. Click on...\\n3. See error...'}
                                rows={4}
                                className="w-full px-4 py-3 bg-background-elevated border border-neutral-light/20 rounded-lg text-neutral placeholder-neutral-light/50 focus:outline-none focus:border-accent/50 resize-none"
                            />
                        </div>

                        {/* Media Upload */}
                        <div>
                            <label className="block text-sm font-semibold text-neutral mb-2">
                                Attachments <span className="text-xs text-neutral-light font-normal">(optional, max 5 files)</span>
                            </label>
                            <div className="space-y-3">
                                {/* Upload Button */}
                                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-background-elevated border-2 border-dashed border-neutral-light/30 rounded-lg cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all">
                                    <Upload className="w-5 h-5 text-neutral-light" />
                                    <span className="text-sm text-neutral-light">
                                        Upload Image or Video (Images: 10MB max, Videos: 50MB max)
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        multiple
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={mediaFiles.length >= 5}
                                    />
                                </label>

                                {/* Media Preview */}
                                {mediaFiles.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {mediaFiles.map(file => (
                                            <div key={file.id} className="relative group">
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
                                                    onClick={() => removeFile(file.id)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-4 h-4 text-white" />
                                                </button>
                                                <p className="text-xs text-neutral-light mt-1 truncate">{file.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex items-center justify-between pt-4 border-t border-neutral-light/20">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-4 py-2 text-neutral-light hover:text-neutral transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Submit Bug Report
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Card>

                {/* View My Reports Link */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/dept-tpc/my-bug-reports')}
                        className="text-accent hover:text-accent/80 text-sm font-medium transition-colors"
                    >
                        View My Bug Reports →
                    </button>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <Modal
                    isOpen={showSuccessModal}
                    onClose={() => {
                        setShowSuccessModal(false)
                        router.push('/dept-tpc/my-bug-reports')
                    }}
                    title="Bug Report Submitted"
                >
                    <div className="text-center py-6">
                        <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <p className="text-neutral mb-6">
                            Thank you for reporting this bug! Our team will review it soon and update you on the progress.
                        </p>
                        <button
                            onClick={() => {
                                setShowSuccessModal(false)
                                router.push('/dept-tpc/my-bug-reports')
                            }}
                            className="px-6 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all"
                        >
                            View My Reports
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    )
}
