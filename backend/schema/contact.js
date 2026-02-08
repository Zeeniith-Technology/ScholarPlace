/**
 * Contact Schema
 * Collection: contact
 * Purpose: Store contact form submissions
 */

const contactSchema = {
    name: {
        type: 'string',
        required: true,
        description: 'Name of the person contacting'
    },
    email: {
        type: 'string',
        required: true,
        description: 'Email of the person contacting'
    },
    subject: {
        type: 'string',
        required: true,
        description: 'Subject of the message'
    },
    message: {
        type: 'string',
        required: true,
        description: 'Content of the message'
    },
    status: {
        type: 'string',
        required: true,
        enum: ['new', 'read', 'replied'],
        default: 'new',
        description: 'Status of the inquiry'
    },
    created_at: {
        type: 'date',
        default: () => new Date(),
        description: 'Creation timestamp'
    }
};

export default contactSchema;
