'use client';

import { useState, useEffect } from 'react';
import crmApi from '@/lib/crmApi';
import { DollarSign, Building } from 'lucide-react';

export default function DealsPage() {
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDeals();
    }, []);

    const fetchDeals = async () => {
        try {
            const res: any = await crmApi.post('/crm/deals/list', {});
            if (res.success) {
                setDeals(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch deals:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        if (status === 'accepted') return { bar: 'bg-green-500', badge: 'bg-green-100 text-green-700' };
        if (status === 'rejected') return { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' };
        return { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' };
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading proposals...</div>;

    return (

            <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Active Proposals & Deals</h1>
                    <p className="text-slate-500 text-sm mt-1">Track financial value across your pipeline</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deals.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
                        No active proposals found.
                    </div>
                ) : (
                    deals.map((deal) => {
                        const style = getStatusStyle(deal.status);
                        return (
                            <div key={deal._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-full h-1 ${style.bar}`} />

                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-semibold text-slate-900 truncate pr-4">
                                        {deal.pricing_tier || 'Unnamed Proposal'}
                                    </h3>
                                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${style.badge}`}>
                                        {deal.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-2xl font-bold text-slate-900 mb-4">
                                    <DollarSign className="h-6 w-6 text-slate-400" />
                                    {(deal.total_value ?? 0).toLocaleString()}
                                </div>

                                <div className="space-y-2 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-slate-400" />
                                        <span className="truncate">{deal.college_name || 'N/A'}</span>
                                    </div>
                                    {deal.semester_start && (
                                        <div className="pt-2 border-t border-slate-100 mt-2">
                                            Semester Start: <span className="font-medium text-slate-900">{deal.semester_start}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

    );
}
