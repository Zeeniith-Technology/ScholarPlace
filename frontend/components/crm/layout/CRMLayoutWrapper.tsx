'use client';

import { usePathname } from 'next/navigation';
import CRMLayout from './CRMLayout';

export default function CRMLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Skip layout for login page
    if (pathname && pathname.includes('/login')) {
        return <>{children}</>;
    }

    return <CRMLayout>{children}</CRMLayout>;
}
