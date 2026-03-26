'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Users, BarChart3, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background-surface to-primary/5">
        <div className="gradient-orb w-[600px] h-[600px] bg-primary/5 top-0 left-1/4" style={{ animationDelay: '0s' }} />
        <div className="gradient-orb w-[500px] h-[500px] bg-secondary/5 bottom-0 right-1/4" style={{ animationDelay: '3s' }} />
        <div className="gradient-orb w-[400px] h-[400px] bg-accent/5 top-1/2 left-1/2" style={{ animationDelay: '6s' }} />
        {/* Additional subtle orbs for depth */}
        <div className="gradient-orb w-[300px] h-[300px] bg-primary/3 top-1/3 right-1/3" style={{ animationDelay: '1.5s' }} />
        <div className="gradient-orb w-[350px] h-[350px] bg-secondary/3 bottom-1/3 left-1/3" style={{ animationDelay: '4.5s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          {/* Left Column - Enhanced Content */}
          <div className="space-y-8 animate-fade-up">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-base sm:text-lg md:text-xl font-medium text-primary italic">
                  &quot;Your dream our Stairs&quot;
                </p>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold text-neutral leading-tight">
                  Lets crack placement together
                </h1>
              </div>
              <div className="text-lg sm:text-xl text-neutral-dark leading-relaxed max-w-2xl font-medium space-y-4">
                <p className="text-xl md:text-2xl font-semibold text-neutral-dark">
                  Empower your college TPC teams with an all-in-one placement ecosystem.
                </p>
                <ul className="space-y-3 mt-4 text-base sm:text-lg">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Structured Roadmaps</strong> for flawless Aptitude & DSA mastery.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-secondary flex-shrink-0 mt-0.5" />
                    <span><strong>Automated Assessments</strong> to track real-time progress effortlessly.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                    <span><strong>Smart Analytics</strong> to guide students from 3rd semester straight to their dream offer letter.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="#contact">
                <Button variant="primary" className="w-full sm:w-auto px-8 py-4 text-lg group shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40">
                  Book a Demo
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#student-experience">
                <Button variant="secondary" className="w-full sm:w-auto px-8 py-4 text-lg shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-secondary/30">
                  Explore Student Experience
                </Button>
              </Link>
            </div>


            <p className="text-sm text-neutral-dark flex items-center gap-2">
              <Users className="w-4 h-4" />
              Built for 3rd–7th sem students and TPC teams
            </p>
          </div>

          {/* Right Column - Enhanced Dashboard Mockup */}
          <div className="relative animate-slide-in hidden lg:block">
            {/* Main Dashboard Card */}
            <div className="glass rounded-3xl p-6 transform rotate-2 hover:rotate-0 transition-all duration-500 shadow-2xl hover:shadow-primary/20 border border-primary/10">
              {/* Header with glassmorphism and curvy borders */}
              <div className="glass rounded-3xl p-4 mb-6 flex items-center justify-between border border-primary/20 backdrop-blur-md">
                <div>
                  <div className="h-5 bg-gradient-to-r from-primary to-secondary rounded-2xl w-40 mb-2"></div>
                  <div className="h-3 bg-neutral-dark/20 rounded-xl w-28"></div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent shadow-lg flex items-center justify-center backdrop-blur-sm">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Progress and Analytics Cards - Above Semester Progress */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Progress Card - Green */}
                <div className="glass rounded-2xl p-4 border border-secondary/20 backdrop-blur-md">
                  <div className="h-10 bg-secondary/30 rounded-xl mb-2 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="h-2 bg-secondary/20 rounded-full w-full"></div>
                  <div className="h-2 bg-secondary/20 rounded-full w-2/3 mt-1"></div>
                </div>
                {/* Analytics Card - Blue */}
                <div className="glass rounded-2xl p-4 border border-primary/20 backdrop-blur-md">
                  <div className="h-10 bg-primary/30 rounded-xl mb-2 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="h-2 bg-primary/20 rounded-full w-full"></div>
                  <div className="h-2 bg-primary/20 rounded-full w-3/4 mt-1"></div>
                </div>
              </div>

              {/* Progress Section with animation */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-dark">Semester Progress</span>
                  <span className="text-lg font-bold text-accent">75%</span>
                </div>
                <div className="h-4 bg-background-elevated rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-accent rounded-full w-3/4 flex items-center justify-end pr-2">
                    <div className="w-2 h-2 rounded-full bg-white/80"></div>
                  </div>
                </div>
              </div>

              {/* Enhanced Chart Area */}
              <div className="h-40 bg-gradient-to-br from-primary/5 via-primary/3 to-primary/5 rounded-xl p-4 mb-6 border border-neutral-light/10">
                <div className="h-full flex items-end justify-around gap-2 group">
                  {[20, 35, 30, 50, 65, 75, 92].map((height, i) => (
                    <div
                      key={i}
                      className={`bg-primary rounded-t flex-1 shadow-lg transition-all duration-500 hover:scale-x-105 hover:-translate-y-1 ${
                        i === 6 ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Test Schedule with icons */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 bg-primary/30 rounded w-32"></div>
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center text-xs text-secondary">
                      ✓
                    </div>
                    <div className="h-2 bg-neutral-dark/20 rounded flex-1"></div>
                    <div className="h-2 bg-neutral-dark/10 rounded w-12"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center text-xs text-secondary">
                      ✓
                    </div>
                    <div className="h-2 bg-neutral-dark/20 rounded flex-1"></div>
                    <div className="h-2 bg-neutral-dark/10 rounded w-12"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-dark/20 flex items-center justify-center text-xs text-neutral-dark">
                      ○
                    </div>
                    <div className="h-2 bg-neutral-dark/20 rounded flex-1"></div>
                    <div className="h-2 bg-neutral-dark/10 rounded w-12"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}














