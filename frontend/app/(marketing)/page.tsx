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

/**
 * Marketing Home Page
 * Public landing page showcasing Scholarplace features, pricing, and CTAs
 * Route: /
 */
export default function MarketingHomePage() {
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




