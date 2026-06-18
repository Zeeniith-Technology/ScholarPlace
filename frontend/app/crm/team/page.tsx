'use client';

import { useState, useEffect } from 'react';
import crmApi from '@/lib/crmApi';
import { useCRMAuth } from '@/hooks/useCRMAuth';
import { Users, UserX, UserPlus, ShieldAlert } from 'lucide-react';

export default function TeamPage() {
    const { isSuperAdmin, isLoading: authLoading } = useCRMAuth();
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchTeam = async () => {
        try {
            setLoading(true);
            const res: any = await crmApi.post('/crm/team/list');
            if (res.success) setTeam(res.data);
        } catch (err) {
            console.error("Failed to fetch team", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSuperAdmin) {
            fetchTeam();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [isSuperAdmin, authLoading]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');
        setSuccess('');

        try {
            const res: any = await crmApi.post('/crm/team/create', { name, email, password });
            if (res.success) {
                setSuccess('Team member created successfully!');
                setName('');
                setEmail('');
                setPassword('');
                fetchTeam();
            } else {
                setError(res.message || 'Failed to create user');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeactivate = async (id: string, currentName: string) => {
        if (!confirm(`Are you sure you want to deactivate ${currentName}? This will unassign all their active colleges.`)) return;
        
        try {
            const res: any = await crmApi.post('/crm/team/deactivate', { id });
            if (res.success) {
                fetchTeam();
            } else {
                alert(res.message || 'Failed to deactivate user');
            }
        } catch (err) {
            console.error(err);
            alert('Something went wrong');
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
                    <p className="text-red-600">You do not have permission to view or manage the CRM team.</p>
                </div>
            
        );
    }

    return (
        
            <div className="grid grid-cols-3 gap-6">
                
                {/* Left Col: Create Form */}
                <div className="col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                        <div className="flex items-center gap-2 mb-6">
                            <UserPlus className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-800">Add Executive</h2>
                        </div>
                        
                        <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
                            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">{error}</div>}
                            {success && <div className="p-3 bg-green-50 text-green-700 rounded-lg border border-green-100">{success}</div>}
                            
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Full Name</label>
                                <input 
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Email Address</label>
                                <input 
                                    required
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="john@scholarplace.in"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Temporary Password</label>
                                <input 
                                    required
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Min 6 characters"
                                    minLength={6}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={formLoading}
                                className="w-full py-2.5 mt-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-70"
                            >
                                {formLoading ? 'Creating...' : 'Create Account'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Col: Team List */}
                <div className="col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-gray-600" />
                                <h2 className="text-lg font-semibold text-gray-800">Active Team ({team.length})</h2>
                            </div>
                        </div>
                        
                        <div className="divide-y divide-gray-100">
                            {team.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No team members found.</div>
                            ) : (
                                team.map(user => (
                                    <div key={user._id} className={`p-5 flex items-center justify-between ${user.person_status === 'inactive' ? 'opacity-60 bg-gray-50' : 'bg-white hover:bg-gray-50/50'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                                {user.person_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                                    {user.person_name}
                                                    {user.person_role === 'Superadmin' && (
                                                        <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">SuperAdmin</span>
                                                    )}
                                                    {user.person_status === 'inactive' && (
                                                        <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Deactivated</span>
                                                    )}
                                                </h4>
                                                <p className="text-sm text-gray-500">{user.person_email}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <div className="text-right text-xs text-gray-500">
                                                <div className="mb-0.5">Last Login</div>
                                                <div className="font-medium text-gray-700">
                                                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                                </div>
                                            </div>
                                            
                                            {user.person_role !== 'Superadmin' && user.person_status !== 'inactive' && (
                                                <button 
                                                    onClick={() => handleDeactivate(user._id, user.person_name)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Deactivate User"
                                                >
                                                    <UserX className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
                
            </div>
        
    );
}
