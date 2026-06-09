import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Invoice from '../models/Invoice.js';
import WebhookLog from '../models/WebhookLog.js';

const allowedEventTypes = new Set([
    'subscription.created',
    'subscription.updated',
    'subscription.canceled',
    'payment_succeeded',
    'payment_failed',
    'invoice.paid',
    'invoice.payment_failed'
]);

const verifyWebhookSecret = (req) => {
    const secret = process.env.BILLING_WEBHOOK_SECRET;

    if (!secret) {
        return false;
    }

    return req.headers['x-billing-webhook-secret'] === secret;
};

const upsertEntitlementState = async (eventType, data = {}) => {
    const userId = data.userId || data.user_id;

    if (!userId) {
        return;
    }

    const plan = data.planId || data.plan || (eventType === 'subscription.canceled' ? 'free' : 'premium');
    const status = data.status || (eventType === 'subscription.canceled' ? 'canceled' : 'active');

    await Subscription.findOneAndUpdate(
        { userId },
        {
            $set: {
                userId,
                provider: data.provider || 'clerk',
                providerCustomerId: data.providerCustomerId || null,
                providerSubscriptionId: data.providerSubscriptionId || null,
                planId: plan,
                status,
                currentPeriodStart: data.currentPeriodStart || null,
                currentPeriodEnd: data.currentPeriodEnd || null,
                cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
                trialEndsAt: data.trialEndsAt || null,
                lastEventId: data.eventId || null,
                metadata: data.metadata || {}
            }
        },
        { upsert: true, new: true }
    );

    await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                _id: userId,
                'billing.plan': plan,
                'billing.status': status,
                'billing.provider': data.provider || 'clerk',
                'billing.currentPeriodEnd': data.currentPeriodEnd || null,
                'billing.cancelAtPeriodEnd': Boolean(data.cancelAtPeriodEnd),
                'billing.subscriptionId': data.providerSubscriptionId || null,
                'billing.lastSyncedAt': new Date(),
                'entitlements.isPremium': plan === 'premium' && status === 'active',
                'entitlements.lastSyncedAt': new Date()
            }
        },
        { upsert: true }
    );

    if (plan === 'premium' && status === 'active') {
        await User.updateOne({ _id: userId }, { $set: { 'usage.freeUsage': 0 } });
    }
};

const createAncillaryRecords = async (eventType, data = {}) => {
    const userId = data.userId || data.user_id;

    if (eventType === 'payment_succeeded' && data.providerTransactionId) {
        await Transaction.findOneAndUpdate(
            { providerTransactionId: data.providerTransactionId },
            {
                $set: {
                    userId,
                    subscriptionId: data.subscriptionId || null,
                    provider: data.provider || 'clerk',
                    providerTransactionId: data.providerTransactionId,
                    amount: data.amount || 0,
                    currency: data.currency || 'usd',
                    status: 'succeeded',
                    type: 'payment',
                    errorCode: null,
                    metadata: data.metadata || {}
                }
            },
            { upsert: true, new: true }
        );
    }

    if ((eventType === 'payment_failed' || eventType === 'invoice.payment_failed') && data.providerTransactionId) {
        await Transaction.findOneAndUpdate(
            { providerTransactionId: data.providerTransactionId },
            {
                $set: {
                    userId,
                    subscriptionId: data.subscriptionId || null,
                    provider: data.provider || 'clerk',
                    providerTransactionId: data.providerTransactionId,
                    amount: data.amount || 0,
                    currency: data.currency || 'usd',
                    status: 'failed',
                    type: 'payment',
                    errorCode: data.errorCode || 'payment_failed',
                    metadata: data.metadata || {}
                }
            },
            { upsert: true, new: true }
        );
    }

    if (data.invoiceId) {
        await Invoice.findOneAndUpdate(
            { invoiceId: data.invoiceId },
            {
                $set: {
                    userId,
                    subscriptionId: data.subscriptionId || null,
                    provider: data.provider || 'clerk',
                    invoiceId: data.invoiceId,
                    amountDue: data.amountDue || 0,
                    amountPaid: data.amountPaid || 0,
                    currency: data.currency || 'usd',
                    status: data.invoiceStatus || data.status || 'open',
                    hostedInvoiceUrl: data.hostedInvoiceUrl || null,
                    pdfUrl: data.pdfUrl || null,
                    issuedAt: data.issuedAt || null,
                    metadata: data.metadata || {}
                }
            },
            { upsert: true, new: true }
        );
    }
};

export const handleBillingWebhook = async (req, res) => {
    try {
        if (!verifyWebhookSecret(req)) {
            return res.status(401).json({ success: false, message: 'Invalid webhook secret' });
        }

        const { eventId, eventType, data = {} } = req.body || {};

        if (!eventId || !eventType) {
            return res.status(400).json({ success: false, message: 'eventId and eventType are required' });
        }

        const existingLog = await WebhookLog.findOne({ eventId });
        if (existingLog?.processed) {
            return res.json({ success: true, message: 'Event already processed' });
        }

        const logRecord = await WebhookLog.findOneAndUpdate(
            { eventId },
            {
                $setOnInsert: {
                    eventId,
                    provider: data.provider || 'clerk',
                    eventType,
                    payload: req.body,
                    processed: false,
                    retryCount: 0
                }
            },
            { upsert: true, new: true }
        );

        if (!allowedEventTypes.has(eventType)) {
            await WebhookLog.updateOne(
                { eventId },
                {
                    $set: {
                        processed: true,
                        processedAt: new Date(),
                        eventType,
                        payload: req.body
                    }
                }
            );

            return res.json({ success: true, message: 'Event recorded' });
        }

        await upsertEntitlementState(eventType, { ...data, eventId });
        await createAncillaryRecords(eventType, { ...data, eventId });

        await WebhookLog.updateOne(
            { eventId },
            {
                $set: {
                    processed: true,
                    processedAt: new Date(),
                    eventType,
                    payload: req.body,
                    errorMessage: null
                }
            }
        );

        res.json({ success: true, message: 'Webhook processed', logId: logRecord._id });
    } catch (error) {
        if (req.body?.eventId) {
            await WebhookLog.updateOne(
                { eventId: req.body.eventId },
                {
                    $inc: { retryCount: 1 },
                    $set: { errorMessage: error.message, processed: false }
                }
            );
        }

        res.status(500).json({ success: false, message: error.message });
    }
};
