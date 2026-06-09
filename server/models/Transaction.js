import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    subscriptionId: {
        type: String,
        default: null,
        index: true
    },
    provider: {
        type: String,
        default: 'clerk'
    },
    providerTransactionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    amount: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'usd'
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'succeeded', 'failed', 'refunded', 'disputed']
    },
    type: {
        type: String,
        default: 'payment',
        enum: ['payment', 'refund', 'adjustment']
    },
    errorCode: {
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

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
