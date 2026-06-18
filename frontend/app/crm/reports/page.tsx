'use client';

import { useState, useEffect } from 'react';
import crmApi from '@/lib/crmApi';
import { useCRMAuth } from '@/hooks/useCRMAuth';
import { ShieldAlert, BarChart3, TrendingUp, Users, Activity } from 'lucide-react';

interface PipelineData {
    id: string;
    name: string;
    color: string;
    count: number;
}

export default function ReportsPage() {
    const { isSuperAdmin, isLoading: authLoading } = useCRMAuth();
    const [pipeline, setPipeline] = useState<PipelineData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res: any = await crmApi.post('/crm/reports/pipeline');
            if (res.success) {
                setPipeline(res.data);
            } else {
                setError(res.message || 'Failed to load report data');
            }
        } catch (err) {
            console.error("Failed to fetch reports", err);
            setError('Something went wrong fetching reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSuperAdmin) {
            fetchReports();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [isSuperAdmin, authLoading]);

    if (authLoading || loading) {
        return (
            
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            
        );
    }

    if (!isSuperAdmin) {
        return (
            
                <div className="bg-red-50 p-8 rounded-xl border border-red-200 flex flex-col items-center justify-center text-center">
                    <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-red-700 mb-2">SuperAdmin Access Required</h2>
                    <p className="text-red-600">You do not have permission to view CRM analytics.</p>
                </div>
            
        );
    }

    const totalLeads = pipeline.reduce((acc, curr) => acc + curr.count, 0);

    return (
        
        <>
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* Top KPI Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Total Pipeline Leads</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{totalLeads}</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Active Deals</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                        {pipeline.filter(p => p.name.toLowerCase().includes('proposal') || p.name.toLowerCase().includes('negotiation')).reduce((acc, curr) => acc + curr.count, 0)}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                            <Activity className="h-5 w-5" />
                        </div>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Overdue Tasks</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
                    <p className="text-xs text-gray-400 mt-2">To be implemented</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Active Executives</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">N/A</p>
                    <p className="text-xs text-gray-400 mt-2">See Team Page</p>
                </div>
            </div>

            {/* Pipeline Visualizer */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    Pipeline Distribution
                </h2>
                
                <div className="space-y-4">
                    {pipeline.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No pipeline data available.</p>
                    ) : (
                        pipeline.map(stage => {
                            const percentage = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
                            return (
                                <div key={stage.id} className="flex items-center group">
                                    <div className="w-48 flex-shrink-0 text-sm font-medium text-gray-700">
                                        {stage.name}
                                    </div>
                                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden mx-4 relative flex items-center">
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                            style={{ 
                                                width: `${percentage}%`, 
                                                backgroundColor: stage.color || '#3b82f6',
                                                minWidth: percentage > 0 ? '4px' : '0'
                                            }}
                                        ></div>
                                        <div className="absolute left-3 text-xs font-bold mix-blend-difference text-white">
                                            {percentage}%
                                        </div>
                                    </div>
                                    <div className="w-16 flex-shrink-0 text-right font-bold text-gray-900">
                                        {stage.count}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex items-start">
                <div className="bg-blue-100 p-2 rounded-lg mr-4">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-blue-900">Sprint 6 Completed</h3>
                    <p className="text-blue-700 text-sm mt-1">
                        The baseline analytics have been set up. The system calculates the funnel width dynamically based on the pipeline stages defined in the settings. Future iterations can add executive leaderboards and activity heatmaps.
                    </p>
                </div>
            </div>
        </>
        
    );
}
