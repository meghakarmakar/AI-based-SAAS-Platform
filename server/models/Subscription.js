import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    provider: {
        type: String,
        default: 'clerk'
    },
    providerCustomerId: {
        type: String,
        default: null,
        index: true,
        sparse: true
    },
    providerSubscriptionId: {
        type: String,
        default: null,
        index: true,
        sparse: true
    },
    planId: {
        type: String,
        default: 'free'
    },
    status: {
        type: String,
        default: 'free',
        enum: ['free', 'active', 'trialing', 'past_due', 'canceled', 'paused', 'retrying', 'grace_period', 'overdue', 'unpaid', 'expired', 'incomplete']
    },
    currentPeriodStart: {
        type: Date,
        default: null
    },
    currentPeriodEnd: {
        type: Date,
        default: null
    },
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false
    },
    trialEndsAt: {
        type: Date,
        default: null
    },
    lastEventId: {
        type: String,
        default: null,
        index: true,
        sparse: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    versionKey: false
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
