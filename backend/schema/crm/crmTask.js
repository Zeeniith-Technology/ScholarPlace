export default {
    college_id: { type: 'string', required: true },
    assigned_to: { type: 'string', required: true },
    assigned_to_name: { type: 'string', default: '' },
    title: { type: 'string', required: true },
    description: { type: 'string', default: '' },
    due_date: { type: 'date', required: true },
    priority: { type: 'string', enum: ['high', 'medium', 'low'], default: 'medium' },
    is_completed: { type: 'boolean', default: false },
    completed_at: { type: 'date', default: null },
    created_by: { type: 'string', required: true },
    deleted: { type: 'boolean', default: false }
};
