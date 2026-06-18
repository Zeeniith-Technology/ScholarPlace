'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { CRMUser } from '@/types/crm.types';

// H-04: Client-side expiry check prevents stale JWT dashboard flash
function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch { return true; }
}

export function useCRMAuth() {
    const [user, setUser] = useState<CRMUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('crm_token');
            const userDataStr = localStorage.getItem('crm_user');

            if (!token || !userDataStr || isTokenExpired(token)) {
                localStorage.removeItem('crm_token');
                localStorage.removeItem('crm_user');
                document.cookie = 'crm_token=; path=/; max-age=0; SameSite=Strict';
                if (pathname !== '/crm/login') {
                    router.replace('/crm/login');
                }
                setIsLoading(false);
                return;
            }

            try {
                const userData = JSON.parse(userDataStr);
                const role = (userData.person_role || userData.role)?.toLowerCase();

                if (role !== 'superadmin' && role !== 'crmexec') {
                    // Not a CRM user
                    if (pathname !== '/crm/login') {
                        router.replace('/crm/login');
                    }
                    setIsLoading(false);
                    return;
                }

                setUser(userData);
                
                // Redirect away from login if already authenticated
                if (pathname === '/crm/login') {
                    router.replace('/crm/dashboard');
                }
            } catch (e) {
                if (pathname !== '/crm/login') {
                    router.replace('/crm/login');
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [pathname, router]);

    const finalRole = user?.person_role?.toLowerCase() || user?.role?.toLowerCase();

    return {
        user,
        role: finalRole,
        isSuperAdmin: finalRole === 'superadmin',
        isLoading
    };
}
