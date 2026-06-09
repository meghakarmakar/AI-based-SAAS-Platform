import mongoose from 'mongoose';

const billingEventSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    eventType: {
        type: String,
        required: true,
        index: true
    },
    source: {
        type: String,
        default: 'profile'
    },
    status: {
        type: String,
        default: 'recorded',
        enum: ['recorded', 'processed', 'failed']
    },
    referenceId: {
        type: String,
        default: null,
        index: true
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    errorMessage: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

const BillingEvent = mongoose.model('BillingEvent', billingEventSchema);

export default BillingEvent;
