export default {
    name: { type: 'string', required: true },
    color: { type: 'string', default: '#e2e8f0' },
    order: { type: 'number', required: true },
    description: { type: 'string', default: '' },
    is_default: { type: 'boolean', default: false },
    is_archived: { type: 'boolean', default: false },
    created_by: { type: 'string', required: true },
    deleted: { type: 'boolean', default: false }
};
