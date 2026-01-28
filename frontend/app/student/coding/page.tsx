'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Code2, ChevronRight, Calculator, Terminal, Braces, Binary, Network } from 'lucide-react'

// Week Configuration
const WEEKS = [
    {
        id: 'week-1',
        title: 'Foundations',
        description: 'Master the basics of programming: I/O, variables, operators, loops, and control flow.',
        icon: Calculator,
        topics: ['Input/Output', 'Data Types', 'Loops', 'Arrays'],
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10'
    },
    {
        id: 'week-2',
        title: 'Data Structures - I',
        description: 'Deep dive into fundamental data structures like Strings, Arrays, and Matrices.',
        icon: Braces,
        topics: ['Strings', '2D Arrays', 'Sliding Window', 'Two Pointers'],
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10'
    },
    {
        id: 'week-3',
        title: 'Data Structures - II',
        description: 'Explore linear data structures and recursion: Linked Lists, Stacks, Queues, and Backtracking.',
        icon: Terminal,
        topics: ['Linked Lists', 'Stacks', 'Queues', 'Recursion'],
        color: 'text-green-500',
        bgColor: 'bg-green-500/10'
    },
    {
        id: 'week-4',
        title: 'Trees & Graphs',
        description: 'Understand hierarchical data structures: Binary Trees, BST, Heaps, and Graph algorithms.',
        icon: Network,
        topics: ['Binary Trees', 'BST', 'Graphs', 'BFS/DFS'],
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10'
    },
    {
        id: 'week-5',
        title: 'Advanced Algorithms',
        description: 'Tackle complex problems with Dynamic Programming, Greedy approaches, and Advanced Data Structures.',
        icon: Binary,
        topics: ['Dynamic Programming', 'Greedy', 'Trie', 'Bit Manipulation'],
        color: 'text-red-500',
        bgColor: 'bg-red-500/10'
    }
]

export default function CodingDashboardPage() {
    const router = useRouter()

    return (
        <StudentLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-10">
                    <h1 className="text-3xl font-heading font-bold text-neutral mb-3">DSA Practice Roadmap</h1>
                    <p className="text-neutral-light text-lg">Your comprehensive 5-week journey to mastering Data Structures and Algorithms.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {WEEKS.map((week) => {
                        const Icon = week.icon
                        return (
                            <Card
                                key={week.id}
                                className="p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-transparent hover:border-primary/20 group relative overflow-hidden h-full flex flex-col"
                                onClick={() => router.push(`/student/coding/${week.id}`)}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Icon className="w-32 h-32 transform rotate-12" />
                                </div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${week.bgColor}`}>
                                            <Icon className={`w-6 h-6 ${week.color}`} />
                                        </div>
                                        <Badge variant="secondary" className="bg-neutral-100 text-neutral-600 group-hover:bg-white/80 transition-colors uppercase tracking-wider text-[10px]">
                                            {week.id.replace('-', ' ')}
                                        </Badge>
                                    </div>

                                    <h3 className="text-xl font-bold text-neutral mb-2 group-hover:text-primary transition-colors">{week.title}</h3>
                                    <p className="text-sm text-gray-500 mb-6 flex-grow">{week.description}</p>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            {week.topics.slice(0, 3).map(topic => (
                                                <span key={topic} className="text-[10px] px-2 py-1 bg-gray-50 text-gray-500 rounded-md border border-gray-100">
                                                    {topic}
                                                </span>
                                            ))}
                                            {week.topics.length > 3 && (
                                                <span className="text-[10px] px-2 py-1 bg-gray-50 text-gray-500 rounded-md border border-gray-100">
                                                    +{week.topics.length - 3}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center text-primary font-medium text-sm group/btn pt-2">
                                            Start Practice
                                            <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </StudentLayout>
    )
}
