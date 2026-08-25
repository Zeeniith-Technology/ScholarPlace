'use client';

import { useState } from 'react';
import { FilterSelect } from '@/components/ui/FilterSelect'
import { DatePicker } from '@/components/ui/DatePicker'
import { X } from 'lucide-react';
import crmApi from '@/lib/crmApi';

interface QuickAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const EMPTY_FORM = {
    name: '',
    city: '',
    state: '',
    type: 'University',
    student_strength_approx: '',
    source: '',
    priority: 'medium',
    website: '',
    contact_name: '',
    contact_phone: '',
    follow_up_date: '',
    notes: '',
};

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all bg-white';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

export default function QuickAddModal({ isOpen, onClose, onSuccess }: QuickAddModalProps) {
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const set = (field: string, value: string) => setFormData(p => ({ ...p, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload: any = {
                name: formData.name,
                city: formData.city,
                state: formData.state || undefined,
                type: formData.type,
                student_strength_approx: formData.student_strength_approx ? parseInt(formData.student_strength_approx) : undefined,
                source: formData.source || undefined,
                priority: formData.priority,
                website: formData.website || undefined,
                contact_name: formData.contact_name || undefined,
                contact_phone: formData.contact_phone || undefined,
                notes: formData.notes || undefined,
                follow_up_date: formData.follow_up_date || undefined,
            };
            const res: any = await crmApi.post('/crm/colleges/create', payload);
            if (res.success) {
                setFormData({ ...EMPTY_FORM });
                onSuccess();
            } else {
                setError(res.message || 'Failed to create college');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Add College</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Fill in the details to track this lead</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* College Name */}
                        <div>
                            <label className={labelCls}>College Name <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => set('name', e.target.value)}
                                className={inputCls}
                                placeholder="e.g. Shankalchand University"
                            />
                        </div>

                        {/* City + State */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>City <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    value={formData.city}
                                    onChange={e => set('city', e.target.value)}
                                    className={inputCls}
                                    placeholder="e.g. Visnagar"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>State</label>
                                <input
                                    type="text"
                                    value={formData.state}
                                    onChange={e => set('state', e.target.value)}
                                    className={inputCls}
                                    placeholder="e.g. Gujarat"
                                />
                            </div>
                        </div>

                        {/* Type + Priority */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>College Type</label>
                                <div className="relative">
                                    <FilterSelect
                                        value={formData.type}
                                        onChange={v => set('type', v)}
                                        options={[
                                            { value: 'University', label: 'University' },
                                            { value: 'College', label: 'College' },
                                            { value: 'Institute', label: 'Institute' },
                                            { value: 'Polytechnic', label: 'Polytechnic' },
                                            { value: 'Other', label: 'Other' },
                                        ]}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Priority</label>
                                <div className="relative">
                                    <FilterSelect
                                        value={formData.priority}
                                        onChange={v => set('priority', v)}
                                        options={[
                                            { value: 'high', label: '🔴 High' },
                                            { value: 'medium', label: '🟡 Medium' },
                                            { value: 'low', label: '🟢 Low' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Student Strength + Source */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Student Strength</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.student_strength_approx}
                                    onChange={e => set('student_strength_approx', e.target.value)}
                                    className={inputCls}
                                    placeholder="e.g. 2000"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Source</label>
                                <div className="relative">
                                    <FilterSelect
                                        value={formData.source}
                                        onChange={v => set('source', v)}
                                        placeholder="Select source"
                                        options={[
                                            { value: '', label: 'Select source' },
                                            { value: 'Cold Call', label: 'Cold Call' },
                                            { value: 'Reference', label: 'Reference' },
                                            { value: 'LinkedIn', label: 'LinkedIn' },
                                            { value: 'Website', label: 'Website' },
                                            { value: 'Event', label: 'Event' },
                                            { value: 'Email Campaign', label: 'Email Campaign' },
                                            { value: 'Other', label: 'Other' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Website */}
                        <div>
                            <label className={labelCls}>Website</label>
                            <input
                                type="url"
                                value={formData.website}
                                onChange={e => set('website', e.target.value)}
                                className={inputCls}
                                placeholder="https://college.edu"
                            />
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 pt-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Primary Contact</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Contact Name</label>
                                    <input
                                        type="text"
                                        value={formData.contact_name}
                                        onChange={e => set('contact_name', e.target.value)}
                                        className={inputCls}
                                        placeholder="e.g. Rahul Patel"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Contact Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.contact_phone}
                                        onChange={e => set('contact_phone', e.target.value)}
                                        className={inputCls}
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Follow-up Date */}
                        <div className="border-t border-gray-100 pt-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Follow-up</p>
                            <div>
                                <label className={labelCls}>Follow-up Date</label>
                                <DatePicker
                                    value={formData.follow_up_date}
                                    onChange={v => set('follow_up_date', v)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className={labelCls}>Notes</label>
                            <textarea
                                rows={2}
                                value={formData.notes}
                                onChange={e => set('notes', e.target.value)}
                                className={inputCls + ' resize-none'}
                                placeholder="Any initial notes about this college..."
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex justify-end gap-3 flex-shrink-0">
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
                            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-70"
                        >
                            {loading ? 'Saving...' : 'Save College'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
