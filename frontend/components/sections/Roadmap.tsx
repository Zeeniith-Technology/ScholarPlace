'use client'

import React, { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const weeks = [
  {
    week: 1,
    title: "Foundation & Logic Building",
    track: "DSA & Aptitude",
    modules: ["Basics of Programming", "Control Structures"],
    topics: ["Input/Output", "Data Types", "Operators", "Conditional Statements", "Loops (For, While)", "Pattern Printing", "Functions"],
    duration: "10-12 Hours"
  },
  {
    week: 2,
    title: "Arrays & Strings",
    track: "DSA & Aptitude",
    modules: ["Data Structures I", "Problem Solving"],
    topics: ["Introduction to Arrays", "Linear Search", "Binary Search", "Two Pointer Technique", "Sliding Window", "Introduction to Strings", "2D Arrays"],
    duration: "12-15 Hours"
  },
  {
    week: 3,
    title: "Recursion & Sorting",
    track: "DSA & Aptitude",
    modules: ["Algorithms I", "Recursion Depth"],
    topics: ["Recursion Basics", "Recursion on Arrays", "Merge Sort", "Quick Sort", "Backtracking Introduction", "Space Complexity"],
    duration: "14-16 Hours"
  },
  {
    week: 4,
    title: "Linked Lists",
    track: "DSA & Aptitude",
    modules: ["Data Structures II", "Pointers"],
    topics: ["Singly Linked List", "Doubly Linked List", "Circular Linked List", "Fast & Slow Pointers", "Reversing a Linked List", "Intersection Point"],
    duration: "12-14 Hours"
  },
  {
    week: 5,
    title: "Stacks & Queues",
    track: "DSA & Aptitude",
    modules: ["Data Structures III", "LIFO & FIFO"],
    topics: ["Stack Implementation", "Queue Implementation", "Monotonic Stack", "Priority Queue Basics", "Circular Queue", "Applications of Stack"],
    duration: "12-14 Hours"
  },
  {
    week: 6,
    title: "DSA Mock & Aptitude Prep - I",
    track: "DSA & Aptitude",
    modules: ["Trees & Quant"],
    topics: ["Introduction to Trees", "Binary Trees", "Tree Traversals", "Height & Depth", "Number Systems", "Percentages", "Ratio & Proportion"],
    duration: "14-16 Hours"
  },
  {
    week: 7,
    title: "DSA Mock & Aptitude Prep - II",
    track: "DSA & Aptitude",
    modules: ["Graphs & Reasoning"],
    topics: ["Introduction to Graphs", "BFS & DFS", "Connected Components", "Blood Relations", "Coding-Decoding", "Direction Sense", "Seating Arrangement"],
    duration: "14-16 Hours"
  },
  {
    week: 8,
    title: "Final Mocks & Placement Ready",
    track: "DSA & Aptitude",
    modules: [],
    topics: ["Mock Tests", "Comprehensive DSA Revision", "Verbal Ability: Reading Comprehension", "Sentence Correction", "System Design Basics"],
    duration: "15-18 Hours"
  }
]

export function Roadmap() {
  const [showAll, setShowAll] = useState(false)



  return (
    <section id="roadmap" className="py-20 px-4 sm:px-6 lg:px-8 bg-background-surface">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-up">
          {/* <Badge variant="secondary" className="mb-4">Curriculum Outline</Badge> */}
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-neutral mb-4">
            Structured Learning Path
          </h2>
          <p className="text-xl text-neutral-dark max-w-2xl mx-auto">
            A comprehensive week-by-week roadmap designed to take you from basics to placement ready.
          </p>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 to-secondary/30"></div>

          <div
            className={`space-y-8 relative transition-all duration-1000 ease-in-out overflow-hidden ${showAll ? 'max-h-[5000px]' : 'max-h-[600px] md:max-h-[850px]'}`}
          >
            {weeks.map((week, index) => (
              <div key={week.week} className="relative animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                {/* Timeline Dot */}
                <div className="hidden md:flex absolute left-0 w-16 h-16 items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-background-surface border-4 border-primary z-10 flex items-center justify-center font-bold text-sm text-primary">
                    {week.week}
                  </div>
                </div>

                <div className="md:ml-24">
                  <Card hover className="overflow-hidden border-l-4 border-l-primary/50">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <Badge variant="primary">Week {week.week}</Badge>
                          <Badge variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20">
                            {week.duration}
                          </Badge>
                        </div>
                        <h3 className="text-2xl font-heading font-semibold text-neutral mb-2">
                          {week.title}
                        </h3>
                        <p className="text-sm text-neutral-dark mb-4">
                          Focus areas: {week.modules.join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      {week.topics.map((topic, topicIndex) => (
                        <div key={topicIndex} className="flex items-start gap-2 text-neutral-dark text-sm">
                          <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            ))}
          </div>

          {/* Blur Overlay */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background-surface via-background-surface/80 to-transparent z-10 transition-opacity duration-1000 pointer-events-none ${showAll ? 'opacity-0' : 'opacity-100'}`}
          />

          {/* Toggle Button */}
          <div className="relative z-20 text-center mt-[-28px] pt-8">
            <Button
              onClick={() => setShowAll(!showAll)}
              className="group relative px-6 py-2.5 rounded-full bg-background/80 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-primary/20 hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center gap-2">
                <span className="font-semibold text-sm text-black uppercase tracking-wide">
                  {showAll ? 'Show Less Weeks' : 'View Full Roadmap'}
                </span>
                {showAll ? (
                  <ChevronUp className="w-4 h-4 text-black group-hover:-translate-y-1 transition-transform" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-black group-hover:translate-y-1 transition-transform" />
                )}
              </div>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}














