import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    provider: {
        type: String,
        default: 'clerk'
    },
    providerPaymentMethodId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    brand: {
        type: String,
        default: 'card'
    },
    last4: {
        type: String,
        default: '0000'
    },
    expMonth: {
        type: Number,
        default: null
    },
    expYear: {
        type: Number,
        default: null
    },
    isDefault: {
        type: Boolean,
        default: false,
        index: true
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'expired', 'disabled']
    },
    label: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    versionKey: false
});

paymentMethodSchema.index({ userId: 1, isDefault: -1, createdAt: -1 });

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

export default PaymentMethod;
