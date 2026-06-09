import mongoose from 'mongoose';

const retryJobSchema = new mongoose.Schema({
    kind: {
        type: String,
        required: true,
        index: true
    },
    resourceId: {
        type: String,
        default: null,
        index: true
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'running', 'succeeded', 'failed']
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0
    },
    nextAttemptAt: {
        type: Date,
        default: null,
        index: true
    },
    lastError: {
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

const RetryJob = mongoose.model('RetryJob', retryJobSchema);

export default RetryJob;
