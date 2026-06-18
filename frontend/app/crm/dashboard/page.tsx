'use client';

import { useCRMAuth } from '@/hooks/useCRMAuth';

export default function CRMDashboard() {
    const { isLoading } = useCRMAuth();

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><div className="text-gray-500 text-sm">Loading...</div></div>;
    }

    return (
        
            <div className="grid gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome to ScholarPlace CRM</h2>
                    <p className="text-gray-600">
                        Your dashboard is being set up. This is Sprint 2 foundational UI.
                    </p>
                </div>
            </div>
        
    );
}

