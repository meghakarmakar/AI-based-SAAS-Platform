import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
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
    invoiceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    amountDue: {
        type: Number,
        default: 0
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'usd'
    },
    status: {
        type: String,
        default: 'draft',
        enum: ['draft', 'open', 'paid', 'void', 'uncollectible']
    },
    hostedInvoiceUrl: {
        type: String,
        default: null
    },
    pdfUrl: {
        type: String,
        default: null
    },
    issuedAt: {
        type: Date,
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

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
