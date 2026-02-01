'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText, Scale, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-neutral-50">
            {/* Header */}
            <header className="bg-white border-b border-neutral-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-neutral-200 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-neutral-600" />
                        </div>
                        <span className="font-medium text-neutral-600 group-hover:text-black transition-colors">Back to Home</span>
                    </Link>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Scholarplace
                    </h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 sm:p-12">

                    <div className="text-center mb-12">
                        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                            <Scale className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">Terms of Service</h1>
                        <p className="text-lg text-neutral-500">Last updated: January 29, 2026</p>
                    </div>

                    <div className="space-y-12 text-neutral-700 leading-relaxed">

                        {/* 1. Introduction */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-neutral-900 mb-6 border-b pb-2">
                                <Globe className="w-6 h-6 text-blue-500" />
                                1. Introduction
                            </h2>
                            <p className="mb-4">
                                Welcome to Scholarplace. By accessing or using our website, platform, and services, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not access or use our services.
                            </p>
                            <p>
                                Scholarplace provides an educational platform for engineering colleges, offering structured roadmaps, assessments, and analytics for student placement preparation.
                            </p>
                        </section>

                        {/* 2. User Accounts */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-neutral-900 mb-6 border-b pb-2">
                                <Shield className="w-6 h-6 text-green-500" />
                                2. User Accounts
                            </h2>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>You must provide accurate and complete information when creating an account.</li>
                                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                                <li>You notify us immediately of any unauthorized use of your account.</li>
                                <li>We reserve the right to suspend or terminate accounts that violate our policies.</li>
                            </ul>
                        </section>

                        {/* 3. Acceptable Use */}
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-neutral-900 mb-6 border-b pb-2">
                                <FileText className="w-6 h-6 text-orange-500" />
                                3. Acceptable Use
                            </h2>
                            <p className="mb-4">
                                You agree not to misuse our services. Prohibited actions include:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Sharing account access with unauthorized users.</li>
                                <li>Attempting to disrupt or compromise the integrity of our platform.</li>
                                <li>Copying, distributing, or modifying any proprietary content without permission.</li>
                                <li>Cheating or using unfair means during assessments.</li>
                            </ul>
                        </section>

                        {/* 4. Intellectual Property */}
                        <section>
                            <h2 className="text-xl font-bold text-neutral-900 mb-4">4. Intellectual Property</h2>
                            <p>
                                All content, including text, graphics, logos, and software, is the property of Scholarplace or its content suppliers and is protected by intellectual property laws. You are granted a limited license to access and use the platform for educational purposes only.
                            </p>
                        </section>

                        {/* 5. Limitation of Liability */}
                        <section>
                            <h2 className="text-xl font-bold text-neutral-900 mb-4">5. Limitation of Liability</h2>
                            <p>
                                Scholarplace is provided on an &quot;as-is&quot; basis. We do not guarantee that the platform will be error-free or uninterrupted. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
                            </p>
                        </section>

                        {/* 6. Changes to Terms */}
                        <section>
                            <h2 className="text-xl font-bold text-neutral-900 mb-4">6. Changes to Terms</h2>
                            <p>
                                We may modify these terms at any time. We will notify users of significant changes. continued use of the platform constitutes usage of the new terms.
                            </p>
                        </section>

                        {/* Contact */}
                        <section className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 mt-8">
                            <h2 className="text-lg font-bold text-neutral-900 mb-2">Have Questions?</h2>
                            <p className="text-neutral-600 mb-4">
                                If you have any questions about these Terms, please contact us.
                            </p>
                            <Button variant="primary" onClick={() => window.location.href = 'mailto:support@scholarplace.com'}>
                                Contact Support
                            </Button>
                        </section>

                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-neutral-200 py-8">
                <div className="max-w-7xl mx-auto px-4 text-center text-neutral-500 text-sm">
                    &copy; {new Date().getFullYear()} Scholarplace. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
