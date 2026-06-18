export default {
    college_id: { type: 'string', required: true },
    user_id: { type: 'string', required: true },
    user_name: { type: 'string', required: true },
    type: { type: 'string', enum: ['call', 'email', 'whatsapp', 'meeting', 'note', 'assigned', 'status_change'], required: true },
    title: { type: 'string', default: '' },
    description: { type: 'string', default: '' },
    outcome: { type: 'string', enum: ['positive', 'neutral', 'negative', 'no_response', 'na'], default: 'na' },
    activity_date: { type: 'date', default: () => new Date().toISOString() },
    next_follow_up_date: { type: 'date', default: null },
    meta: { type: 'object', default: () => ({}) },
    deleted: { type: 'boolean', default: false }
};
