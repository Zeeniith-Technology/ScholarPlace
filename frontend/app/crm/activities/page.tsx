'use client';

import { useState, useEffect } from 'react';
import crmApi from '@/lib/crmApi';
import { ActivitySquare, Phone, Mail, FileText, Calendar } from 'lucide-react';

export default function ActivitiesPage() {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            const res: any = await crmApi.post('/crm/activities/list', {});
            if (res.success) {
                setActivities(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'call': return <Phone className="h-4 w-4 text-blue-500" />;
            case 'email': return <Mail className="h-4 w-4 text-emerald-500" />;
            case 'meeting': return <ActivitySquare className="h-4 w-4 text-purple-500" />;
            default: return <FileText className="h-4 w-4 text-slate-500" />;
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading activities...</div>;

    return (
        
            <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Activity History</h1>
                <p className="text-slate-500 text-sm mt-1">A timeline of all your interactions and updates</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                {activities.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">No recent activity.</div>
                ) : (
                    <div className="relative border-l border-slate-200 ml-3 space-y-6">
                        {activities.map((activity) => (
                            <div key={activity._id} className="relative pl-6">
                                <div className="absolute -left-3.5 top-1 bg-white p-1 rounded-full border border-slate-200">
                                    {getIcon(activity.type)}
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-semibold text-slate-900">{activity.title}</h4>
                                        <span className="text-xs text-slate-400 flex items-center">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2">{activity.description}</p>
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
                                        <span>User: <span className="font-medium text-slate-700">{activity.user_name}</span></span>
                                        {activity.college_name && (
                                            <>
                                                <span>•</span>
                                                <span>College: <span className="font-medium text-slate-700">{activity.college_name}</span></span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        
    );
}
