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
        <div className="h-screen w-full bg-gray-50 overflow-hidden">
            <CRMSidebar />
            <div className="flex flex-col h-full ml-64 w-[calc(100%-16rem)]">
                <CRMTopBar />
                <main className="flex-1 p-6 overflow-hidden flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    );
}
