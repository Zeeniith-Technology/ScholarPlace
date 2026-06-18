'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCRMAuth } from '@/hooks/useCRMAuth';

export default function CRMIndex() {
    const router = useRouter();
    const { user, isLoading } = useCRMAuth();

    useEffect(() => {
        if (!isLoading) {
            if (user) {
                router.replace('/crm/dashboard');
            } else {
                router.replace('/crm/login');
            }
        }
    }, [isLoading, user, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
}
