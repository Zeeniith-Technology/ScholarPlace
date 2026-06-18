'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import crmApi from '@/lib/crmApi';

interface AssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    collegeId: string;
}

export default function AssignModal({ isOpen, onClose, onSuccess, collegeId }: AssignModalProps) {
    const [team, setTeam] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            crmApi.post('/crm/team/list').then((res: any) => {
                if (res.success) setTeam(res.data);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) {
            setError('Please select an executive');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const user = team.find(t => t._id === selectedUser);
            
            const res: any = await crmApi.post('/crm/colleges/assign', {
                college_id: collegeId,
                to_user_id: selectedUser,
                to_user_name: user?.person_name || 'Unknown',
                reason
            });
            
            if (res.success) {
                onSuccess();
            } else {
                setError(res.message || 'Failed to assign college');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-800">Assign College</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4 text-sm">
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Assign To *</label>
                            <select 
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 outline-none"
                                value={selectedUser}
                                onChange={e => setSelectedUser(e.target.value)}
                            >
                                <option value="">Select Executive...</option>
                                {team.map(t => (
                                    <option key={t._id} value={t._id}>{t.person_name} ({t.person_role})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Reason / Note</label>
                            <textarea 
                                rows={3}
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Why is this being assigned?"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading || team.length === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-70"
                        >
                            {loading ? 'Assigning...' : 'Confirm Assignment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
