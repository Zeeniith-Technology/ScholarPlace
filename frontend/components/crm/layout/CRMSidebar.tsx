'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Building2, 
    Users, 
    ActivitySquare, 
    CheckSquare, 
    FileText,
    Settings,
    BarChart3,
    LogOut,
    Bell
} from 'lucide-react';
import { useCRMAuth } from '@/hooks/useCRMAuth';

export default function CRMSidebar() {
    const pathname = usePathname();
    const { user, isSuperAdmin } = useCRMAuth();

    const handleLogout = () => {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        document.cookie = 'crm_token=; path=/; max-age=0; SameSite=Strict';
        window.location.href = '/crm/login';
    };

    const navItems = [
        { name: 'Dashboard', href: '/crm/dashboard', icon: LayoutDashboard },
        { name: 'Colleges', href: '/crm/colleges', icon: Building2 },
        { name: 'Contacts', href: '/crm/contacts', icon: Users },
        { name: 'Activities', href: '/crm/activities', icon: ActivitySquare },
        { name: 'Tasks', href: '/crm/tasks', icon: CheckSquare },
        { name: 'Proposals', href: '/crm/deals', icon: FileText },
    ];

    const adminItems = [
        { name: 'Team', href: '/crm/team', icon: Users },
        { name: 'Reports', href: '/crm/reports', icon: BarChart3 },
        { name: 'Pipeline Setup', href: '/crm/pipeline-setup', icon: Settings },
    ];

    return (
        <div className="w-64 bg-[#1e3a5f] text-white h-screen flex flex-col fixed left-0 top-0">
            <div className="p-6">
                <h1 className="text-xl font-bold tracking-wider">ScholarPlace</h1>
                <p className="text-xs text-blue-300 font-medium tracking-widest mt-1 uppercase">Internal CRM</p>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <Link 
                                key={item.name} 
                                href={item.href}
                                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    isActive 
                                        ? 'bg-blue-600/30 text-white' 
                                        : 'text-slate-300 hover:bg-[#2a4d7c] hover:text-white'
                                }`}
                            >
                                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                                {item.name}
                            </Link>
                        );
                    })}

                    {isSuperAdmin && (
                        <>
                            <div className="pt-6 pb-2 px-3">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Administration
                                </p>
                            </div>
                            {adminItems.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                const Icon = item.icon;
                                return (
                                    <Link 
                                        key={item.name} 
                                        href={item.href}
                                        className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                            isActive 
                                                ? 'bg-blue-600/30 text-white' 
                                                : 'text-slate-300 hover:bg-[#2a4d7c] hover:text-white'
                                        }`}
                                    >
                                        <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </>
                    )}
                </nav>
            </div>

            <div className="p-4 bg-[#172d4a]">
                <button className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-[#2a4d7c] hover:text-white transition-colors mb-2">
                    <Bell className="mr-3 h-5 w-5 text-slate-400" />
                    Notifications
                    <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">3</span>
                </button>
                <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white truncate max-w-[120px]">
                            {user?.person_name}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                            {isSuperAdmin ? 'Super Admin' : 'CRM Executive'}
                        </span>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2a4d7c] transition-colors"
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
