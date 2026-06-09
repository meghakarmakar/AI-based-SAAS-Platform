import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    email: {
        type: String,
        default: null,
        index: true
    },
    name: {
        type: String,
        default: null
    },
    imageUrl: {
        type: String,
        default: null
    },
    role: {
        type: String,
        default: 'user',
        enum: ['user', 'admin']
    },
    billing: {
        plan: {
            type: String,
            default: 'free',
            enum: ['free', 'premium', 'trial']
        },
        status: {
            type: String,
            default: 'free',
            enum: ['free', 'active', 'trialing', 'past_due', 'canceled', 'paused', 'retrying', 'grace_period', 'overdue', 'unpaid', 'expired', 'incomplete']
        },
        provider: {
            type: String,
            default: 'clerk'
        },
        currentPeriodEnd: {
            type: Date,
            default: null
        },
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false
        },
        subscriptionId: {
            type: String,
            default: null
        },
        defaultPaymentMethodId: {
            type: String,
            default: null
        },
        lastSyncedAt: {
            type: Date,
            default: null
        }
    },
    usage: {
        freeUsage: {
            type: Number,
            default: 0,
            min: 0
        },
        periodUsage: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    entitlements: {
        isPremium: {
            type: Boolean,
            default: false
        },
        lastSyncedAt: {
            type: Date,
            default: null
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

userSchema.index({ 'billing.plan': 1, 'billing.status': 1 });

const User = mongoose.model('User', userSchema);

export default User;
