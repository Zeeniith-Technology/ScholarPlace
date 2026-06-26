'use client';

import { useState, useRef, useEffect } from 'react';
import { CRMCollege, CRMStatus } from '@/types/crm.types';
import crmApi from '@/lib/crmApi';
import { MoreVertical, Calendar, Clock, Users, Building, PhoneCall, UserCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface KanbanBoardProps {
    colleges: CRMCollege[];
    statuses: CRMStatus[];
    onStageChange: () => void;
    isSuperAdmin?: boolean;
    onAssign?: (collegeId: string) => void;
}

function CardMenu({ college, isSuperAdmin, onAssign }: {
    college: CRMCollege;
    isSuperAdmin?: boolean;
    onAssign?: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative flex-shrink-0">
            <button
                onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded p-0.5 transition-colors"
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {open && (
                <div className="absolute right-0 top-6 z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-sm">
                    <button
                        onClick={() => { setOpen(false); router.push(`/crm/colleges/${college._id}`); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                        View Details
                    </button>

                    {isSuperAdmin && onAssign && (
                        <button
                            onClick={() => { setOpen(false); onAssign(college._id); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                            <UserCheck className="h-4 w-4 text-blue-500" />
                            Assign Lead
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default function KanbanBoard({ colleges, statuses, onStageChange, isSuperAdmin, onAssign }: KanbanBoardProps) {
    const [draggedCollegeId, setDraggedCollegeId] = useState<string | null>(null);
    const [isMoving, setIsMoving] = useState(false);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedCollegeId(id);
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, toStatusId: string) => {
        e.preventDefault();
        if (isMoving || !draggedCollegeId) return;

        const college = colleges.find(c => c._id === draggedCollegeId);
        if (!college || college.pipeline_status_id === toStatusId) {
            setDraggedCollegeId(null);
            return;
        }

        setIsMoving(true);
        try {
            await crmApi.post('/crm/colleges/move-stage', {
                college_id: draggedCollegeId,
                to_status_id: toStatusId
            });
            onStageChange();
        } catch {
            window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message: 'Failed to move college. Please try again.', type: 'error' } }));
        } finally {
            setDraggedCollegeId(null);
            setIsMoving(false);
        }
    };

    const getCollegesForStatus = (statusId: string) =>
        colleges.filter(c => c.pipeline_status_id === statusId);

    return (
        <div className="flex flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-4 gap-4 scroll-smooth [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
            {statuses.map(status => (
                <div
                    key={status._id}
                    className="flex-shrink-0 w-80 bg-gray-100 rounded-xl flex flex-col max-h-full"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status._id)}
                >
                    {/* Column header */}
                    <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color || '#cbd5e1' }} />
                            <h3 className="font-semibold text-gray-700 text-sm">{status.name}</h3>
                            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                {getCollegesForStatus(status._id).length}
                            </span>
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-3">
                        {getCollegesForStatus(status._id).map(college => {
                            const isOverdue = college.next_follow_up_date && new Date(college.next_follow_up_date) < new Date();
                            return (
                                <div
                                    key={college._id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, college._id)}
                                    className={`bg-white rounded-lg shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                                        draggedCollegeId === college._id ? 'opacity-50 scale-95' : ''
                                    } ${isOverdue ? 'border-red-200' : 'border-gray-200 hover:border-blue-300'}`}
                                >
                                    {/* Priority bar */}
                                    {college.priority === 'high' && <div className="h-0.5 w-full bg-red-400 rounded-t-lg" />}
                                    {college.priority === 'medium' && <div className="h-0.5 w-full bg-yellow-400 rounded-t-lg" />}

                                    <div className="p-4">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-1 gap-2">
                                            <Link
                                                href={`/crm/colleges/${college._id}`}
                                                className="font-semibold text-gray-800 text-sm hover:text-blue-600 line-clamp-1 flex-1"
                                            >
                                                {college.name}
                                            </Link>
                                            <CardMenu
                                                college={college}
                                                isSuperAdmin={isSuperAdmin}
                                                onAssign={onAssign}
                                            />
                                        </div>

                                        {/* Location + Type */}
                                        <p className="text-xs text-gray-500 mb-2">
                                            {[college.city, college.state].filter(Boolean).join(', ')}
                                            {college.type && <span className="ml-1 text-gray-400">· {college.type}</span>}
                                        </p>

                                        {/* Student strength */}
                                        {college.student_strength_approx ? (
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                                <Users className="h-3 w-3 text-gray-400" />
                                                <span>~{college.student_strength_approx.toLocaleString()} students</span>
                                            </div>
                                        ) : null}

                                        {/* Source */}
                                        {college.source ? (
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                                <PhoneCall className="h-3 w-3 text-gray-400" />
                                                <span>Source: {college.source}</span>
                                            </div>
                                        ) : null}

                                        {/* Tags */}
                                        {college.tags && college.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {college.tags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {college.tags.length > 3 && (
                                                    <span className="text-xs text-gray-400">+{college.tags.length - 3}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Follow-up date */}
                                        {college.next_follow_up_date && (
                                            <div className={`flex items-center gap-1 text-xs mb-2 font-medium ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                    {isOverdue ? 'Overdue: ' : 'Follow-up: '}
                                                    {new Date(college.next_follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        )}

                                        {/* Notes preview */}
                                        {college.notes && (
                                            <p className="text-xs text-gray-400 italic line-clamp-1 mb-2">"{college.notes}"</p>
                                        )}

                                        {/* Footer */}
                                        <div className="border-t border-gray-100 mt-2 pt-2 flex items-center justify-between">
                                            <div className="flex items-center text-xs text-gray-400">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {college.last_activity_at
                                                    ? <>Last: {new Date(college.last_activity_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>
                                                    : college.created_at
                                                        ? <>Added: {new Date(college.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                                                        : 'No activity'}
                                            </div>

                                            {college.assigned_to_name ? (
                                                <div className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full max-w-[120px]">
                                                    <Building className="h-3 w-3 flex-shrink-0" />
                                                    <span className="truncate">{college.assigned_to_name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Unassigned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {getCollegesForStatus(status._id).length === 0 && (
                            <div className="h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                                <p className="text-xs text-gray-400">Drop here</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
