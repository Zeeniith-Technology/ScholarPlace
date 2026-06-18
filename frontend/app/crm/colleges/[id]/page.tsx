'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import crmApi from '@/lib/crmApi';
import { CRMCollege, CRMActivity, CRMContact, CRMTask } from '@/types/crm.types';
import { Building2, MapPin, Phone, Mail, Plus, CheckCircle, Circle } from 'lucide-react';
import { useCRMAuth } from '@/hooks/useCRMAuth';

// Components
import ActivityTimeline from '@/components/crm/activities/ActivityTimeline';
import ActivityForm from '@/components/crm/activities/ActivityForm';
import ContactForm from '@/components/crm/contacts/ContactForm';
import TaskForm from '@/components/crm/tasks/TaskForm';
import AssignModal from '@/components/crm/colleges/AssignModal';

export default function CollegeDetailPage() {
    const { id } = useParams();
    const { isSuperAdmin } = useCRMAuth();
    const collegeId = id as string;

    const [college, setCollege] = useState<CRMCollege | null>(null);
    const [activities, setActivities] = useState<CRMActivity[]>([]);
    const [contacts, setContacts] = useState<CRMContact[]>([]);
    const [tasks, setTasks] = useState<CRMTask[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'activities' | 'contacts' | 'tasks'>('activities');

    // Modals
    const [isActivityOpen, setIsActivityOpen] = useState(false);
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [isTaskOpen, setIsTaskOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);

    const fetchData = async () => {
        try {
            const [colRes, actRes, conRes, taskRes] = await Promise.all([
                crmApi.post('/crm/colleges/get', { id: collegeId }),
                crmApi.post('/crm/activities/list', { college_id: collegeId }),
                crmApi.post('/crm/contacts/list', { college_id: collegeId }),
                // Assuming you have an endpoint for this, if not we will fetch all tasks and filter
                crmApi.post('/crm/tasks/list', { college_id: collegeId }) 
            ]);

            if (colRes.success) setCollege(colRes.data);
            if (actRes.success) setActivities(actRes.data);
            if (conRes.success) setContacts(conRes.data);
            
            // Temporary simple task filter if API doesn't support college_id directly yet
            if (taskRes.success) {
                const collegeTasks = taskRes.data.filter((t: any) => t.college_id === collegeId);
                setTasks(collegeTasks);
            }
        } catch (err) {
            console.error("Failed to fetch college data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [collegeId]);

    const toggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
        try {
            await crmApi.post('/crm/tasks/mark-complete', { id: taskId, is_completed: !isCompleted });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            
        );
    }

    if (!college) {
        return (
            
                <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-red-600 font-medium">College not found or access denied.</div>
            
        );
    }

    return (
        
        <>
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center">
                        <div className="h-16 w-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mr-5">
                            <Building2 className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{college.name}</h1>
                            <div className="flex items-center mt-2 text-gray-500 text-sm">
                                <MapPin className="h-4 w-4 mr-1.5" />
                                {college.city}{college.state ? `, ${college.state}` : ''}
                            </div>
                        </div>
                    </div>
                    {isSuperAdmin && (
                        <button 
                            onClick={() => setIsAssignOpen(true)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                        >
                            Reassign College
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="border-b border-gray-200 bg-gray-50/50 px-2 flex">
                            <button 
                                onClick={() => setActiveTab('activities')}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activities' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Activities
                            </button>
                            <button 
                                onClick={() => setActiveTab('tasks')}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Tasks
                            </button>
                            <button 
                                onClick={() => setActiveTab('contacts')}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'contacts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Contacts
                            </button>
                        </div>
                        
                        <div className="p-6">
                            {/* Activities Tab */}
                            {activeTab === 'activities' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-semibold text-gray-800">Timeline</h3>
                                        <button 
                                            onClick={() => setIsActivityOpen(true)}
                                            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                                        >
                                            <Plus className="h-4 w-4 mr-1" /> Log Activity
                                        </button>
                                    </div>
                                    <ActivityTimeline activities={activities} />
                                </div>
                            )}

                            {/* Tasks Tab */}
                            {activeTab === 'tasks' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-semibold text-gray-800">Pending Tasks</h3>
                                        <button 
                                            onClick={() => setIsTaskOpen(true)}
                                            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                                        >
                                            <Plus className="h-4 w-4 mr-1" /> New Task
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {tasks.length === 0 ? (
                                            <p className="text-gray-500 text-sm py-4">No tasks pending.</p>
                                        ) : (
                                            tasks.map(task => (
                                                <div key={task._id} className={`flex items-start p-4 rounded-lg border ${task.is_completed ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                                                    <button onClick={() => toggleTaskComplete(task._id, task.is_completed)} className="mt-0.5 mr-3 text-blue-600">
                                                        {task.is_completed ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                                    </button>
                                                    <div>
                                                        <h4 className={`text-sm font-medium ${task.is_completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{task.title}</h4>
                                                        {task.description && <p className="text-xs text-gray-500 mt-1">{task.description}</p>}
                                                        <div className="flex items-center gap-3 mt-2 text-xs font-medium">
                                                            <span className={task.is_completed ? 'text-gray-400' : 'text-orange-600'}>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                                                            <span className={`px-2 py-0.5 rounded uppercase ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{task.priority}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Contacts Tab */}
                            {activeTab === 'contacts' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-semibold text-gray-800">Directory</h3>
                                        <button 
                                            onClick={() => setIsContactOpen(true)}
                                            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                                        >
                                            <Plus className="h-4 w-4 mr-1" /> Add Contact
                                        </button>
                                    </div>
                                    <div className="grid gap-4">
                                        {contacts.length === 0 ? (
                                            <p className="text-gray-500 text-sm py-4">No contacts added yet.</p>
                                        ) : (
                                            contacts.map(contact => (
                                                <div key={contact._id} className="p-4 rounded-lg border border-gray-200 flex justify-between items-center bg-gray-50/50">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-semibold text-gray-800">{contact.name}</h4>
                                                            {contact.is_primary && (
                                                                <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Primary</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-500">{contact.designation || 'Staff'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        {contact.phone && (
                                                            <a href={`tel:${contact.phone}`} className="flex items-center text-gray-600 hover:text-blue-600">
                                                                <Phone className="h-4 w-4 mr-1.5" /> {contact.phone}
                                                            </a>
                                                        )}
                                                        {contact.email && (
                                                            <a href={`mailto:${contact.email}`} className="flex items-center text-gray-600 hover:text-blue-600">
                                                                <Mail className="h-4 w-4 mr-1.5" /> Email
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info Area */}
                <div className="col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span className="text-gray-500">Assigned To:</span>
                                <span className="font-medium text-gray-900">{college.assigned_to_name || 'Unassigned'}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-2">
                                <span className="text-gray-500">Priority:</span>
                                <span className="font-medium capitalize text-gray-900">{college.priority}</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-gray-500">Type:</span>
                                <span className="font-medium text-gray-900">{college.type || 'University'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ActivityForm isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} onSuccess={() => { setIsActivityOpen(false); fetchData(); }} collegeId={collegeId} />
            <ContactForm isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} onSuccess={() => { setIsContactOpen(false); fetchData(); }} collegeId={collegeId} />
            <TaskForm isOpen={isTaskOpen} onClose={() => setIsTaskOpen(false)} onSuccess={() => { setIsTaskOpen(false); fetchData(); }} collegeId={collegeId} />
            <AssignModal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} onSuccess={() => { setIsAssignOpen(false); fetchData(); }} collegeId={collegeId} />
        </>
        
    );
}
