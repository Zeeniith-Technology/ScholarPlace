'use client';

import { CRMCollege, CRMStatus } from '@/types/crm.types';
import Link from 'next/link';
import { Building2, MapPin, Calendar, User } from 'lucide-react';

interface CollegeTableProps {
    colleges: CRMCollege[];
    statuses: CRMStatus[];
}

export default function CollegeTable({ colleges, statuses }: CollegeTableProps) {
    const getStatusInfo = (id: string) => {
        const status = statuses.find(s => s._id === id);
        return status || { name: 'Unknown', color: '#cbd5e1' };
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4">College</th>
                            <th className="px-6 py-4">Location</th>
                            <th className="px-6 py-4">Stage</th>
                            <th className="px-6 py-4">Assigned To</th>
                            <th className="px-6 py-4">Last Activity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {colleges.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No colleges found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            colleges.map(college => {
                                const status = getStatusInfo(college.pipeline_status_id);
                                return (
                                    <tr key={college._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <Link href={`/crm/colleges/${college._id}`} className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {college.name}
                                                    </Link>
                                                    <div className="text-xs text-gray-500 mt-0.5">{college.type || 'University'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-gray-600">
                                                <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                                {college.city}{college.state ? `, ${college.state}` : ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span 
                                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
                                                style={{ 
                                                    backgroundColor: `${status.color}15`, 
                                                    color: status.color,
                                                    borderColor: `${status.color}30`
                                                }}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: status.color }}></span>
                                                {status.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-gray-600">
                                                <User className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                                {college.assigned_to_name || 'Unassigned'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-gray-600">
                                                <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                                {college.last_activity_at ? new Date(college.last_activity_at).toLocaleDateString() : '-'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
