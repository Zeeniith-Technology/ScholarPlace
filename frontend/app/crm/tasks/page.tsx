'use client';

import { useState, useEffect } from 'react';
import crmApi from '@/lib/crmApi';
import { CheckSquare, Calendar, AlertCircle } from 'lucide-react';

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const res: any = await crmApi.post('/crm/tasks/list', {});
            if (res.success) {
                setTasks(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTask = async (task: any) => {
        try {
            await crmApi.post('/crm/tasks/mark-complete', {
                id: task._id,
                is_completed: !task.is_completed
            });
            fetchTasks();
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading tasks...</div>;

    return (

            <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage all your pending actions across your pipeline</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {tasks.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No tasks found.</div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task._id} className={`p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors ${task.is_completed ? 'opacity-60' : ''}`}>
                                <button
                                    onClick={() => toggleTask(task)}
                                    className={`mt-1 h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                                        task.is_completed
                                            ? 'bg-blue-500 border-blue-500 text-white'
                                            : 'border-slate-300 text-transparent hover:border-blue-500'
                                    }`}
                                >
                                    <CheckSquare className="h-4 w-4" />
                                </button>

                                <div className="flex-1">
                                    <h3 className={`font-medium ${task.is_completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                        {task.title}
                                    </h3>
                                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                                        {task.due_date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        )}
                                        {task.priority && (
                                            <span className={`px-2 py-0.5 rounded-full font-medium flex items-center gap-1
                                                ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-green-100 text-green-700'}
                                            `}>
                                                <AlertCircle className="h-3 w-3" />
                                                {task.priority}
                                            </span>
                                        )}
                                        {task.college_name && (
                                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                                                {task.college_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

    );
}
