'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MarketingLayout } from '@/components/layouts/MarketingLayout'
import { Navbar } from '@/components/sections/Navbar'
import { Hero } from '@/components/sections/Hero'
import { Features } from '@/components/sections/Features'
import { Roadmap } from '@/components/sections/Roadmap'
import { ForColleges } from '@/components/sections/ForColleges'
import { StudentExperience } from '@/components/sections/StudentExperience'
import { Pricing } from '@/components/sections/Pricing'
import { FAQ } from '@/components/sections/FAQ'
import { CTA } from '@/components/sections/CTA'
import { Contact } from '@/components/sections/Contact'
import { Footer } from '@/components/sections/Footer'
import { getAuthData, clearAuth } from '@/utils/auth'

/**
 * Marketing Home Page
 * Public landing page showcasing Scholarplace features, pricing, and CTAs
 * Route: /
 */
export default function MarketingHomePage() {
  const router = useRouter()

  // Check for existing session on mount
  useEffect(() => {
    const authData = getAuthData()
    if (authData?.isAuthenticated && authData?.token) {
      // Basic token expiry check
      try {
        const payload = JSON.parse(atob(authData.token.split('.')[1]))
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          clearAuth()
          return
        }
      } catch (e) {
        clearAuth()
        return
      }

      console.log('[Home] User already logged in, redirecting to dashboard')
      const userRole = authData.role || 'Student'
      const normalizedRole = userRole.toLowerCase()

      if (normalizedRole === 'student') {
        router.replace('/student/dashboard')
      } else if (normalizedRole === 'depttpc' || normalizedRole === 'dept-tpc') {
        router.replace('/dept-tpc/dashboard')
      } else if (normalizedRole === 'tpc') {
        router.replace('/tpc/dashboard')
      } else if (normalizedRole === 'superadmin') {
        router.replace('/superadmin/dashboard')
      } else {
        router.replace('/student/dashboard')
      }
    }
  }, [router])

  return (
    <MarketingLayout>
      <Navbar />
      <Hero />
      <Features />
      <Roadmap />
      <ForColleges />
      <StudentExperience />
      <Pricing />
      <FAQ />
      <CTA />
      <Contact />
      <Footer />
    </MarketingLayout>
  )
}




