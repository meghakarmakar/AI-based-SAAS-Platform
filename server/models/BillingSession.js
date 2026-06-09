import mongoose from 'mongoose';

const billingSessionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    provider: {
        type: String,
        default: 'clerk'
    },
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    sessionType: {
        type: String,
        default: 'checkout',
        enum: ['checkout', 'portal']
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'active', 'expired', 'canceled', 'failed']
    },
    successUrl: {
        type: String,
        default: null
    },
    cancelUrl: {
        type: String,
        default: null
    },
    expiresAt: {
        type: Date,
        default: null,
        index: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    versionKey: false
});

const BillingSession = mongoose.model('BillingSession', billingSessionSchema);

export default BillingSession;
