export default {
    college_id: { type: 'string', required: true },
    created_by: { type: 'string', required: true },
    pricing_tier: { type: 'string', default: '' },
    student_count_estimate: { type: 'number', default: 0 },
    price_per_student: { type: 'number', default: 0 },
    total_value: { type: 'number', default: 0 },
    semester_start: { type: 'string', default: '' },
    status: { type: 'string', enum: ['draft', 'sent', 'accepted', 'rejected', 'negotiating'], default: 'draft' },
    notes: { type: 'string', default: '' },
    deleted: { type: 'boolean', default: false }
};
