export default {
    college_id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    designation: { type: 'string', default: '' },
    email: { type: 'string', default: '' },
    phone: { type: 'string', default: '' },
    whatsapp: { type: 'string', default: '' },
    is_primary: { type: 'boolean', default: false },
    linkedin_url: { type: 'string', default: '' },
    notes: { type: 'string', default: '' },
    deleted: { type: 'boolean', default: false }
};
