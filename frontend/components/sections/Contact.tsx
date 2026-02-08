'use client'

import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function Contact() {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    })

    // Since we don't have a backend implementation for this yet, 
    // we'll simulate a submission for now.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/contact/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                alert('Message sent successfully! We will get back to you soon.')
                setFormData({ name: '', email: '', subject: '', message: '' })
            } else {
                alert(data.message || 'Failed to send message. Please try again.')
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An error occurred. Please try again later.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    return (
        <section id="contact" className="py-20 relative overflow-hidden">
            {/* Background blobs similar to other sections */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/3"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 animate-fade-up">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral mb-4">
                        Get in Touch
                    </h2>
                    <p className="text-lg text-neutral-dark max-w-2xl mx-auto">
                        Have questions about Scholarplace? We're here to help you transform your placement process.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
                    {/* Contact Info */}
                    <div className="space-y-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                        <div className="glass p-8 rounded-2xl relative overflow-hidden group hover:border-primary/20 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Mail className="w-24 h-24 text-primary" />
                            </div>
                            <div className="flex items-start space-x-4 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-neutral mb-1">Email Us</h3>
                                    <p className="text-neutral-dark mb-2">Our friendly team is here to help.</p>
                                    <a href="mailto:zeeniithinfo@gmail.com" className="text-primary font-medium hover:text-primary-dark transition-colors">
                                        zeeniithinfo@gmail.com
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="glass p-8 rounded-2xl relative overflow-hidden group hover:border-primary/20 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <MapPin className="w-24 h-24 text-secondary" />
                            </div>
                            <div className="flex items-start space-x-4 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                                    <MapPin className="w-6 h-6 text-secondary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-neutral mb-1">Visit Us</h3>
                                    <p className="text-neutral-dark mb-2">Come say hello at our office.</p>
                                    <p className="text-neutral font-medium">
                                        Zeeniith Technology<br />
                                        Anand, Gujarat, India
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="glass p-8 rounded-2xl relative overflow-hidden group hover:border-primary/20 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Phone className="w-24 h-24 text-accent" />
                            </div>
                            <div className="flex items-start space-x-4 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                                    <Phone className="w-6 h-6 text-accent" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-neutral mb-1">Call Us</h3>
                                    <p className="text-neutral-dark mb-2">Mon-Fri from 9am to 6pm.</p>
                                    <a href="tel:+916357120971" className="text-primary font-medium hover:text-primary-dark transition-colors">
                                        +91 63571 20971
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="glass p-8 md:p-10 rounded-3xl animate-fade-up relative" style={{ animationDelay: '0.2s' }}>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium text-neutral-dark">Full Name</label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="Your name "
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="bg-white/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-neutral-dark">Email Address</label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="Your email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="bg-white/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="subject" className="text-sm font-medium text-neutral-dark">Subject</label>
                                <Input
                                    id="subject"
                                    name="subject"
                                    placeholder="How can we help?"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className="bg-white/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium text-neutral-dark">Message</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows={5}
                                    placeholder="Tell us about your requirements..."
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-neutral-light/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-neutral placeholder:text-neutral-light/70"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full py-3 font-medium"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Send Message"
                                )}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}
