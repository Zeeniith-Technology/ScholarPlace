export default {
    user_id: { type: 'string', required: true },
    type: { type: 'string', enum: ['assigned', 'task_due', 'reassigned', 'system'], default: 'system' },
    title: { type: 'string', required: true },
    message: { type: 'string', default: '' },
    is_read: { type: 'boolean', default: false },
    related_college_id: { type: 'string', default: null },
    related_college_name: { type: 'string', default: '' },
    deleted: { type: 'boolean', default: false }
};
