'use client';

import { useState, useEffect } from 'react';
import crmApi from '@/lib/crmApi';
import { useCRMAuth } from '@/hooks/useCRMAuth';
import { CRMStatus } from '@/types/crm.types';
import { Settings2, ShieldAlert, Plus, GripVertical, Archive } from 'lucide-react';

export default function PipelineSetupPage() {
    const { isSuperAdmin, isLoading: authLoading } = useCRMAuth();
    const [statuses, setStatuses] = useState<CRMStatus[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form state
    const [name, setName] = useState('');
    const [color, setColor] = useState('#3b82f6');
    const [description, setDescription] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchStatuses = async () => {
        try {
            setLoading(true);
            const res: any = await crmApi.post('/crm/statuses/list');
            if (res.success) setStatuses(res.data);
        } catch (err) {
            console.error("Failed to fetch statuses", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSuperAdmin) {
            fetchStatuses();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [isSuperAdmin, authLoading]);

    const handleCreateStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');

        try {
            const res: any = await crmApi.post('/crm/statuses/create', { name, color, description, is_default: statuses.length === 0 });
            if (res.success) {
                setName('');
                setColor('#3b82f6');
                setDescription('');
                fetchStatuses();
            } else {
                setError(res.message || 'Failed to create stage');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setFormLoading(false);
        }
    };

    const handleArchive = async (id: string, stageName: string) => {
        if (!confirm(`Are you sure you want to archive "${stageName}"? This stage will no longer appear on the board.`)) return;
        
        try {
            const res: any = await crmApi.post('/crm/statuses/archive', { id });
            if (res.success) {
                fetchStatuses();
            } else {
                alert(res.message || 'Failed to archive stage');
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Cannot archive. Make sure no colleges are currently in this stage.');
        }
    };

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
                    <p className="text-red-600">You do not have permission to modify the pipeline setup.</p>
                </div>
            
        );
    }

    return (
        
            <div className="grid grid-cols-3 gap-6">
                
                {/* Left Col: Status List */}
                <div className="col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-gray-600" />
                                <h2 className="text-lg font-semibold text-gray-800">Pipeline Stages</h2>
                            </div>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 border border-gray-200 rounded-md">
                                Rendered left-to-right on Kanban
                            </span>
                        </div>
                        
                        <div className="p-4 space-y-3">
                            {statuses.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No pipeline stages defined. Add one to get started.</div>
                            ) : (
                                statuses.map((status, index) => (
                                    <div key={status._id} className="p-4 border border-gray-200 rounded-lg flex items-center justify-between bg-white hover:border-gray-300 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="text-gray-300 cursor-grab hover:text-gray-500">
                                                <GripVertical className="h-5 w-5" />
                                            </div>
                                            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: status.color }}></div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                                    {status.name}
                                                    {status.is_default && (
                                                        <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Default</span>
                                                    )}
                                                </h4>
                                                {status.description && <p className="text-sm text-gray-500">{status.description}</p>}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">Order: {status.order || index + 1}</span>
                                            {!status.is_default && (
                                                <button 
                                                    onClick={() => handleArchive(status._id, status.name)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-2"
                                                    title="Archive Stage"
                                                >
                                                    <Archive className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Col: Add Form */}
                <div className="col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                        <div className="flex items-center gap-2 mb-6">
                            <Plus className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-800">Add Stage</h2>
                        </div>
                        
                        <form onSubmit={handleCreateStatus} className="space-y-4 text-sm">
                            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">{error}</div>}
                            
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Stage Name *</label>
                                <input 
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Initial Contact"
                                />
                            </div>
                            
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Color *</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        required
                                        type="color"
                                        value={color}
                                        onChange={e => setColor(e.target.value)}
                                        className="h-10 w-14 p-1 border border-gray-300 rounded cursor-pointer"
                                    />
                                    <input 
                                        type="text"
                                        value={color}
                                        onChange={e => setColor(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Description</label>
                                <textarea 
                                    rows={2}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="What does this stage mean?"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={formLoading}
                                className="w-full py-2.5 mt-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-70 flex justify-center items-center"
                            >
                                {formLoading ? 'Adding...' : 'Add Stage'}
                            </button>
                        </form>
                    </div>
                </div>
                
            </div>
        
    );
}
