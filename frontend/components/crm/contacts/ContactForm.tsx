'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import crmApi from '@/lib/crmApi';

interface ContactFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    collegeId: string;
}

export default function ContactForm({ isOpen, onClose, onSuccess, collegeId }: ContactFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        designation: '',
        email: '',
        phone: '',
        whatsapp: '',
        is_primary: false
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
            };

            const res: any = await crmApi.post('/crm/contacts/create', payload);
            if (res.success) {
                setFormData({ name: '', designation: '', email: '', phone: '', whatsapp: '', is_primary: false });
                onSuccess();
            } else {
                setError(res.message || 'Failed to create contact');
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
                    <h3 className="text-lg font-semibold text-gray-800">Add Contact</h3>
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
                            <label className="block font-medium text-gray-700 mb-1">Name *</label>
                            <input 
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Designation</label>
                            <input 
                                type="text"
                                value={formData.designation}
                                onChange={e => setFormData({...formData, designation: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. TPO / Principal"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Email</label>
                                <input 
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Phone</label>
                                <input 
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <label className="flex items-center space-x-2 mt-4">
                            <input 
                                type="checkbox" 
                                checked={formData.is_primary}
                                onChange={e => setFormData({...formData, is_primary: e.target.checked})}
                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <span className="font-medium text-gray-700">Set as Primary Contact</span>
                        </label>
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
                            {loading ? 'Adding...' : 'Add Contact'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
