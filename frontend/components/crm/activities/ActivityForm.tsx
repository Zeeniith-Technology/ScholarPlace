'use client';

import { useState } from 'react';
import { FilterSelect } from '@/components/ui/FilterSelect'
import { X } from 'lucide-react';
import crmApi from '@/lib/crmApi';

interface ActivityFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    collegeId: string;
}

export default function ActivityForm({ isOpen, onClose, onSuccess, collegeId }: ActivityFormProps) {
    const [formData, setFormData] = useState({
        type: 'call',
        title: '',
        description: '',
        outcome: 'na',
        next_follow_up_date: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                ...formData,
                college_id: collegeId,
                next_follow_up_date: formData.next_follow_up_date ? new Date(formData.next_follow_up_date).toISOString() : null
            };

            const res: any = await crmApi.post('/crm/activities/create', payload);
            if (res.success) {
                setFormData({ type: 'call', title: '', description: '', outcome: 'na', next_follow_up_date: '' });
                onSuccess();
            } else {
                setError(res.message || 'Failed to log activity');
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
                    <h3 className="text-lg font-semibold text-gray-800">Log Activity</h3>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Type *</label>
                                <FilterSelect
                                    value={formData.type}
                                    onChange={v => setFormData({...formData, type: v})}
                                    options={[
                                        { value: 'call', label: 'Call' },
                                        { value: 'email', label: 'Email' },
                                        { value: 'whatsapp', label: 'WhatsApp' },
                                        { value: 'meeting', label: 'Meeting' },
                                        { value: 'note', label: 'Internal Note' },
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Outcome</label>
                                <FilterSelect
                                    value={formData.outcome}
                                    onChange={v => setFormData({...formData, outcome: v})}
                                    options={[
                                        { value: 'na', label: 'N/A' },
                                        { value: 'positive', label: 'Positive' },
                                        { value: 'neutral', label: 'Neutral' },
                                        { value: 'negative', label: 'Negative' },
                                        { value: 'no_response', label: 'No Response' },
                                    ]}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Title *</label>
                            <input 
                                required
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Initial pitch call"
                            />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Description</label>
                            <textarea 
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Summary of the interaction..."
                            />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Next Follow-up Date</label>
                            <input 
                                type="date"
                                value={formData.next_follow_up_date}
                                onChange={e => setFormData({...formData, next_follow_up_date: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-70"
                        >
                            {loading ? 'Logging...' : 'Log Activity'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
