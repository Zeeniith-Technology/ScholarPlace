'use client'

import React, { useState, useEffect } from 'react'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toast } from '@/components/ui/Toast'
import { getAuthHeader } from '@/utils/auth'
import {
    Bell,
    User,
    Mail,
    Lock,
    Save,
    Eye,
    EyeOff,
    Loader2
} from 'lucide-react'

interface Settings {
    notifications: {
        email: boolean
        practiceReminders: boolean
        weeklyTestReminders: boolean
        progressUpdates: boolean
    }
    preferences: {
        darkMode: boolean
        language: string
    }
}

export default function StudentSettingsPage() {
    const [settings, setSettings] = useState<Settings>({
        notifications: {
            email: true,
            practiceReminders: true,
            weeklyTestReminders: true,
            progressUpdates: false
        },
        preferences: {
            darkMode: false,
            language: 'en'
        }
    })

    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Password change
    const [showPasswords, setShowPasswords] = useState(false)
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        // Settings would be loaded from backend in real implementation
        // For now, using localStorage
        const saved = localStorage.getItem('studentSettings')
        if (saved) {
            setSettings(JSON.parse(saved))
        }
    }

    const handleSaveSettings = async () => {
        try {
            setIsSaving(true)

            // In real implementation, this would save to backend
            localStorage.setItem('studentSettings', JSON.stringify(settings))

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500))

            setToast({ message: 'Settings saved successfully!', type: 'success' })
        } catch (error) {
            setToast({ message: 'Failed to save settings', type: 'error' })
        } finally {
            setIsSaving(false)
        }
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setToast({ message: 'Passwords do not match', type: 'error' })
            return
        }

        if (passwordData.newPassword.length < 8) {
            setToast({ message: 'Password must be at least 8 characters', type: 'error' })
            return
        }

        try {
            setIsLoading(true)

            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const authHeader = getAuthHeader()

            const response = await fetch(`${apiBaseUrl}/profile/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || '',
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            })

            const result = await response.json()

            if (result.success) {
                setToast({ message: 'Password changed successfully!', type: 'success' })
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
            } else {
                setToast({ message: result.message || 'Failed to change password', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Failed to change password', type: 'error' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <StudentLayout>
            <div className="min-h-screen bg-background">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-neutral mb-2">Settings</h1>
                        <p className="text-neutral-light">Manage your account preferences and notifications</p>
                    </div>

                    {/* Notifications Settings */}
                    <Card className="p-6 mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-neutral">Notifications</h2>
                                <p className="text-sm text-neutral-light">Choose what you want to be notified about</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-neutral-light/10">
                                <div>
                                    <p className="font-medium text-neutral">Email Notifications</p>
                                    <p className="text-sm text-neutral-light">Receive email updates</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.email}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            notifications: { ...settings.notifications, email: e.target.checked }
                                        })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-neutral-light/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-light after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-neutral-light/10">
                                <div>
                                    <p className="font-medium text-neutral">Practice Reminders</p>
                                    <p className="text-sm text-neutral-light">Daily practice reminders</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.practiceReminders}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            notifications: { ...settings.notifications, practiceReminders: e.target.checked }
                                        })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-neutral-light/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-light after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-neutral-light/10">
                                <div>
                                    <p className="font-medium text-neutral">Weekly Test Reminders</p>
                                    <p className="text-sm text-neutral-light">Reminders for upcoming tests</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.weeklyTestReminders}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            notifications: { ...settings.notifications, weeklyTestReminders: e.target.checked }
                                        })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-neutral-light/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-light after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="font-medium text-neutral">Progress Updates</p>
                                    <p className="text-sm text-neutral-light">Weekly progress summaries</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.progressUpdates}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            notifications: { ...settings.notifications, progressUpdates: e.target.checked }
                                        })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-neutral-light/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-light after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>
                    </Card>

                    {/* Password Change */}
                    <Card className="p-6 mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-neutral">Change Password</h2>
                                <p className="text-sm text-neutral-light">Update your account password</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral mb-2">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="w-full px-4 py-2 pr-10 rounded-lg border border-neutral-light/20 bg-background-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-light hover:text-neutral"
                                    >
                                        {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral mb-2">
                                    New Password
                                </label>
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-neutral-light/20 bg-background-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-neutral-light/20 bg-background-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Changing Password...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4 mr-2" />
                                        Change Password
                                    </>
                                )}
                            </Button>
                        </form>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            size="lg"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 mr-2" />
                                    Save Settings
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </StudentLayout>
    )
}
