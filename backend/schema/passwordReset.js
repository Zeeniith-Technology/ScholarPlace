const passwordResetSchema = {
    email: { type: 'string', required: true },
    otp: { type: 'string', required: true },
    token: { type: 'string', required: true },
    expires_at: { type: 'date', required: true },
    used: { type: 'boolean', default: false },
    attempts: { type: 'number', default: 0 },
    created_at: { type: 'string', default: () => new Date().toISOString() }
};

export default passwordResetSchema;
