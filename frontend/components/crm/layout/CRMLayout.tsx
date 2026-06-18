'use client';

import { useCRMAuth } from '@/hooks/useCRMAuth';
import CRMSidebar from './CRMSidebar';
import CRMTopBar from './CRMTopBar';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
    const { isLoading, user } = useCRMAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in useCRMAuth
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <CRMSidebar />
            <div className="flex-1 ml-64 flex flex-col">
                <CRMTopBar />
                <main className="flex-1 p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
