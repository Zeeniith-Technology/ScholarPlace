'use client';

import { Search, Plus } from 'lucide-react';

import { usePathname } from 'next/navigation';

export default function CRMTopBar() {
    const pathname = usePathname();
    
    // Determine title from pathname
    let title = 'Dashboard';
    if (pathname.includes('/colleges')) title = 'College Management';
    if (pathname.includes('/team')) title = 'Team Management';
    if (pathname.includes('/pipeline-setup')) title = 'Pipeline Settings';
    if (pathname.includes('/reports')) title = 'Analytics & Reports';
    if (pathname.includes('/tasks')) title = 'Tasks';
    if (pathname.includes('/contacts')) title = 'Directory';
    if (pathname.includes('/activities')) title = 'Activities';
    if (pathname.includes('/deals')) title = 'Proposals';

    return (
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
            <h1 className="text-xl font-semibold text-gray-800">{title}</h1>

            <div className="flex items-center gap-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search colleges, contacts..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 bg-gray-50"
                    />
                </div>

                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Add
                </button>
            </div>
        </header>
    );
}
