'use client';

import { useState, useEffect } from 'react';
import crmApi from '@/lib/crmApi';
import { CRMCollege, CRMStatus } from '@/types/crm.types';
import KanbanBoard from '@/components/crm/colleges/KanbanBoard';
import CollegeTable from '@/components/crm/colleges/CollegeTable';
import QuickAddModal from '@/components/crm/colleges/QuickAddModal';
import AssignModal from '@/components/crm/colleges/AssignModal';
import { useCRMAuth } from '@/hooks/useCRMAuth';
import { LayoutGrid, List } from 'lucide-react';

export default function CollegesPage() {
    const { isSuperAdmin } = useCRMAuth();
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [colleges, setColleges] = useState<CRMCollege[]>([]);
    const [statuses, setStatuses] = useState<CRMStatus[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [assignCollegeId, setAssignCollegeId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statusesRes, collegesRes]: any[] = await Promise.all([
                crmApi.post('/crm/statuses/list'),
                crmApi.post('/crm/colleges/list')
            ]);
            if (statusesRes.success) setStatuses(statusesRes.data);
            if (collegesRes.success) setColleges(collegesRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                    <button
                        onClick={() => setView('kanban')}
                        className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <LayoutGrid className="w-4 h-4 mr-2" />
                        Board
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <List className="w-4 h-4 mr-2" />
                        List
                    </button>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                    + Add College
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : view === 'kanban' ? (
                <KanbanBoard
                    colleges={colleges}
                    statuses={statuses}
                    onStageChange={fetchData}
                    isSuperAdmin={isSuperAdmin}
                    onAssign={(collegeId) => setAssignCollegeId(collegeId)}
                />
            ) : (
                <CollegeTable colleges={colleges} statuses={statuses} />
            )}

            <QuickAddModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => { setIsAddModalOpen(false); fetchData(); }}
            />

            {assignCollegeId && (
                <AssignModal
                    isOpen={true}
                    collegeId={assignCollegeId}
                    onClose={() => setAssignCollegeId(null)}
                    onSuccess={() => { setAssignCollegeId(null); fetchData(); }}
                />
            )}
        </>
    );
}
