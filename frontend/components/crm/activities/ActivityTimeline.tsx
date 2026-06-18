'use client';

import { CRMActivity } from '@/types/crm.types';
import { Phone, Mail, MessageCircle, CalendarDays, FileText, CheckCircle, RefreshCcw } from 'lucide-react';

interface ActivityTimelineProps {
    activities: CRMActivity[];
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
    if (activities.length === 0) {
        return <div className="text-gray-500 text-sm py-4">No activities logged yet.</div>;
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'call': return <Phone className="h-4 w-4" />;
            case 'email': return <Mail className="h-4 w-4" />;
            case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
            case 'meeting': return <CalendarDays className="h-4 w-4" />;
            case 'assigned': return <CheckCircle className="h-4 w-4" />;
            case 'status_change': return <RefreshCcw className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'call': return 'bg-blue-100 text-blue-600';
            case 'email': return 'bg-purple-100 text-purple-600';
            case 'whatsapp': return 'bg-green-100 text-green-600';
            case 'meeting': return 'bg-orange-100 text-orange-600';
            case 'assigned': return 'bg-emerald-100 text-emerald-600';
            case 'status_change': return 'bg-gray-100 text-gray-600';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="space-y-6">
            {activities.map((activity, index) => (
                <div key={activity._id} className="relative pl-8">
                    {/* Vertical line */}
                    {index !== activities.length - 1 && (
                        <div className="absolute top-8 bottom-[-24px] left-[15px] w-px bg-gray-200"></div>
                    )}
                    
                    <div className={`absolute left-0 top-1 h-8 w-8 rounded-full flex items-center justify-center ${getBgColor(activity.type)} ring-4 ring-white`}>
                        {getIcon(activity.type)}
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-sm font-semibold text-gray-800">{activity.title}</h4>
                            <span className="text-xs text-gray-500">
                                {new Date(activity.activity_date || activity.created_at || Date.now()).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-xs text-blue-600 font-medium mb-2">{activity.user_name}</p>
                        
                        {activity.description && (
                            <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
                        )}
                        
                        {(activity.outcome !== 'na' || activity.next_follow_up_date) && (
                            <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-4 text-xs">
                                {activity.outcome !== 'na' && (
                                    <span className="text-gray-500">
                                        Outcome: <strong className="text-gray-700 capitalize">{activity.outcome.replace('_', ' ')}</strong>
                                    </span>
                                )}
                                {activity.next_follow_up_date && (
                                    <span className="text-gray-500">
                                        Next Follow-up: <strong className="text-gray-700">{new Date(activity.next_follow_up_date).toLocaleDateString()}</strong>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
