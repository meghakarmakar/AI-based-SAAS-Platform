import mongoose from 'mongoose';

const webhookLogSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    provider: {
        type: String,
        default: 'clerk'
    },
    eventType: {
        type: String,
        required: true,
        index: true
    },
    processed: {
        type: Boolean,
        default: false,
        index: true
    },
    processedAt: {
        type: Date,
        default: null
    },
    payloadHash: {
        type: String,
        default: null
    },
    errorMessage: {
        type: String,
        default: null
    },
    retryCount: {
        type: Number,
        default: 0,
        min: 0
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    versionKey: false
});

const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema);

export default WebhookLog;
