import { randomUUID } from 'crypto';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Transaction from '../models/Transaction.js';
import Invoice from '../models/Invoice.js';
import PaymentMethod from '../models/PaymentMethod.js';
import RetryJob from '../models/RetryJob.js';
import BillingEvent from '../models/BillingEvent.js';

const PREMIUM_AMOUNT_CENTS = 1900;
const BILLING_PERIOD_DAYS = 30;
const PREMIUM_STATUSES = new Set(['active', 'trialing', 'grace_period']);

const nextPeriodEnd = () => new Date(Date.now() + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);

const normalizeBillingFromSubscription = (subscription) => {
    if (!subscription) {
        return {
            plan: 'free',
            status: 'free',
            provider: 'clerk',
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            subscriptionId: null,
            defaultPaymentMethodId: null,
            lastSyncedAt: new Date()
        };
    }

    const isPremium = subscription.planId === 'premium' && PREMIUM_STATUSES.has(subscription.status);

    return {
        plan: isPremium ? 'premium' : 'free',
        status: subscription.status,
        provider: subscription.provider || 'clerk',
        currentPeriodEnd: subscription.currentPeriodEnd || null,
        cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
        subscriptionId: subscription.providerSubscriptionId || subscription._id?.toString() || null,
        defaultPaymentMethodId: subscription.metadata?.defaultPaymentMethodId || null,
        lastSyncedAt: new Date()
    };
};

const syncUserBilling = async (userId, billing, paymentMethodId = null) => {
    const update = {
        _id: userId,
        'billing.plan': billing.plan,
        'billing.status': billing.status,
        'billing.provider': billing.provider || 'clerk',
        'billing.currentPeriodEnd': billing.currentPeriodEnd || null,
        'billing.cancelAtPeriodEnd': Boolean(billing.cancelAtPeriodEnd),
        'billing.subscriptionId': billing.subscriptionId || null,
        'billing.defaultPaymentMethodId': paymentMethodId || billing.defaultPaymentMethodId || null,
        'billing.lastSyncedAt': billing.lastSyncedAt || new Date(),
        'entitlements.isPremium': billing.plan === 'premium' && PREMIUM_STATUSES.has(billing.status),
        'entitlements.lastSyncedAt': new Date()
    };

    return User.findByIdAndUpdate(
        userId,
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
};

const logBillingEvent = async ({ userId, eventType, source = 'profile', status = 'recorded', referenceId = null, payload = {}, errorMessage = null }) => {
    return BillingEvent.create({
        userId,
        eventType,
        source,
        status,
        referenceId,
        payload,
        errorMessage
    });
};

const buildBillingSnapshot = async (userId) => {
    const [user, subscription, paymentMethods, recentTransactions, recentInvoices, retryStates, billingEvents] = await Promise.all([
        User.findById(userId).lean(),
        Subscription.findOne({ userId }).lean(),
        PaymentMethod.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean(),
        Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
        Invoice.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
        RetryJob.find({ resourceId: userId }).sort({ createdAt: -1 }).limit(10).lean(),
        BillingEvent.find({ userId }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    const billing = normalizeBillingFromSubscription(subscription);

    return {
        user,
        subscription,
        billing,
        paymentMethods,
        recentTransactions,
        recentInvoices,
        retryStates,
        billingEvents
    };
};

const getUserId = (req) => req.auth().userId;

const getDefaultPaymentMethod = async (userId) => PaymentMethod.findOne({ userId, isDefault: true }).lean();

const upsertPaidBillingArtifacts = async ({ userId, subscriptionId, invoiceId, amount = PREMIUM_AMOUNT_CENTS, currency = 'usd', metadata = {} }) => {
    const transactionId = `txn_${randomUUID()}`;

    const invoice = await Invoice.findOneAndUpdate(
        { invoiceId },
        {
            $set: {
                userId,
                subscriptionId,
                provider: 'clerk',
                invoiceId,
                amountDue: amount,
                amountPaid: amount,
                currency,
                status: 'paid',
                hostedInvoiceUrl: metadata.hostedInvoiceUrl || null,
                pdfUrl: metadata.pdfUrl || null,
                issuedAt: new Date(),
                metadata
            }
        },
        { upsert: true, new: true }
    ).lean();

    const transaction = await Transaction.findOneAndUpdate(
        { providerTransactionId: transactionId },
        {
            $set: {
                userId,
                subscriptionId,
                provider: 'clerk',
                providerTransactionId: transactionId,
                amount,
                currency,
                status: 'succeeded',
                type: 'payment',
                errorCode: null,
                metadata: { invoiceId, ...metadata }
            }
        },
        { upsert: true, new: true }
    ).lean();

    return { invoice, transaction };
};

export const getBillingSnapshot = async (req, res) => {
    try {
        const snapshot = await buildBillingSnapshot(getUserId(req));

        res.json({
            success: true,
            billing: snapshot.user?.billing || snapshot.billing || req.billing,
            usage: snapshot.user?.usage || { freeUsage: req.free_usage ?? 0, periodUsage: 0 },
            subscription: snapshot.subscription || null,
            paymentMethods: snapshot.paymentMethods,
            recentTransactions: snapshot.recentTransactions,
            recentInvoices: snapshot.recentInvoices,
            retryStates: snapshot.retryStates,
            billingEvents: snapshot.billingEvents
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getBillingHistory = async (req, res) => {
    try {
        const userId = getUserId(req);

        const [transactions, invoices, retryStates, billingEvents] = await Promise.all([
            Transaction.find({ userId }).sort({ createdAt: -1 }).lean(),
            Invoice.find({ userId }).sort({ createdAt: -1 }).lean(),
            RetryJob.find({ resourceId: userId }).sort({ createdAt: -1 }).lean(),
            BillingEvent.find({ userId }).sort({ createdAt: -1 }).lean()
        ]);

        res.json({
            success: true,
            transactions,
            invoices,
            retryStates,
            billingEvents
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find({ userId: getUserId(req) }).sort({ createdAt: -1 }).lean();
        res.json({ success: true, invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPaymentMethods = async (req, res) => {
    try {
        const paymentMethods = await PaymentMethod.find({ userId: getUserId(req) }).sort({ isDefault: -1, createdAt: -1 }).lean();
        res.json({ success: true, paymentMethods });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPaymentMethod = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { providerPaymentMethodId, brand = 'card', last4 = '0000', expMonth = null, expYear = null, label = null, isDefault = false } = req.body || {};
        const generatedPaymentMethodId = providerPaymentMethodId || `pm_${randomUUID()}`;

        const existingMethod = await PaymentMethod.findOne({ providerPaymentMethodId: generatedPaymentMethodId }).lean();
        if (existingMethod && existingMethod.userId !== userId) {
            return res.status(409).json({ success: false, message: 'Payment method already belongs to another account' });
        }

        if (isDefault) {
            await PaymentMethod.updateMany({ userId }, { $set: { isDefault: false } });
        }

        const paymentMethod = await PaymentMethod.findOneAndUpdate(
            { providerPaymentMethodId: generatedPaymentMethodId, userId },
            {
                $set: {
                    userId,
                    provider: 'clerk',
                    providerPaymentMethodId: generatedPaymentMethodId,
                    brand,
                    last4,
                    expMonth,
                    expYear,
                    isDefault: Boolean(isDefault),
                    status: 'active',
                    label,
                    metadata: { source: 'profile' }
                }
            },
            { upsert: true, new: true }
        ).lean();

        if (paymentMethod.isDefault || isDefault) {
            const subscription = await Subscription.findOne({ userId }).lean();
            const billing = normalizeBillingFromSubscription(subscription);
            billing.defaultPaymentMethodId = paymentMethod.providerPaymentMethodId;
            await syncUserBilling(userId, billing, paymentMethod.providerPaymentMethodId);
        }

        await logBillingEvent({
            userId,
            eventType: 'payment_method.created',
            referenceId: paymentMethod.providerPaymentMethodId,
            payload: paymentMethod
        });

        res.json({ success: true, paymentMethod });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const setDefaultPaymentMethod = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { paymentMethodId } = req.body || {};

        if (!paymentMethodId) {
            return res.status(400).json({ success: false, message: 'paymentMethodId is required' });
        }

        const paymentMethod = await PaymentMethod.findOne({ _id: paymentMethodId, userId }).lean();
        if (!paymentMethod) {
            return res.status(404).json({ success: false, message: 'Payment method not found' });
        }

        await PaymentMethod.updateMany({ userId }, { $set: { isDefault: false } });
        await PaymentMethod.updateOne({ _id: paymentMethodId, userId }, { $set: { isDefault: true } });

        const subscription = await Subscription.findOne({ userId }).lean();
        const billing = normalizeBillingFromSubscription(subscription);
        billing.defaultPaymentMethodId = paymentMethod.providerPaymentMethodId;
        await syncUserBilling(userId, billing, paymentMethod.providerPaymentMethodId);

        await logBillingEvent({
            userId,
            eventType: 'payment_method.default_updated',
            referenceId: paymentMethod.providerPaymentMethodId,
            payload: paymentMethod
        });

        res.json({ success: true, message: 'Default payment method updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deletePaymentMethod = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { paymentMethodId } = req.params;

        const paymentMethod = await PaymentMethod.findOne({ _id: paymentMethodId, userId }).lean();
        if (!paymentMethod) {
            return res.status(404).json({ success: false, message: 'Payment method not found' });
        }

        await PaymentMethod.deleteOne({ _id: paymentMethodId, userId });

        const remainingPaymentMethods = await PaymentMethod.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
        if (remainingPaymentMethods.length > 0 && paymentMethod.isDefault) {
            const nextDefault = remainingPaymentMethods[0];
            await PaymentMethod.updateOne({ _id: nextDefault._id, userId }, { $set: { isDefault: true } });
        }

        const subscription = await Subscription.findOne({ userId }).lean();
        const billing = normalizeBillingFromSubscription(subscription);
        billing.defaultPaymentMethodId = remainingPaymentMethods.length > 0 ? (paymentMethod.isDefault ? remainingPaymentMethods[0].providerPaymentMethodId : billing.defaultPaymentMethodId) : null;
        await syncUserBilling(userId, billing, billing.defaultPaymentMethodId);

        await logBillingEvent({
            userId,
            eventType: 'payment_method.deleted',
            referenceId: paymentMethod.providerPaymentMethodId,
            payload: paymentMethod
        });

        res.json({ success: true, message: 'Payment method removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const retryPayment = async (req, res) => {
    try {
        const userId = getUserId(req);
        const defaultPaymentMethod = await getDefaultPaymentMethod(userId);
        const subscription = await Subscription.findOne({ userId }).lean();
        const latestFailedTransaction = await Transaction.findOne({ userId, status: 'failed' }).sort({ createdAt: -1 }).lean();
        const latestOpenInvoice = await Invoice.findOne({ userId, status: { $in: ['draft', 'open', 'uncollectible'] } }).sort({ createdAt: -1 }).lean();

        if (!defaultPaymentMethod) {
            const retryJob = await RetryJob.create({
                kind: 'payment_retry',
                resourceId: userId,
                status: 'pending',
                attempts: 1,
                nextAttemptAt: new Date(Date.now() + 15 * 60 * 1000),
                lastError: 'No default payment method'
            });

            const billing = normalizeBillingFromSubscription(subscription);
            billing.status = 'retrying';
            await syncUserBilling(userId, billing, null);

            return res.status(409).json({
                success: false,
                message: 'Add a default payment method before retrying payment.',
                retryJob
            });
        }

        const activeSubscription = subscription || await Subscription.create({
            userId,
            provider: 'clerk',
            planId: 'premium',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: nextPeriodEnd(),
            cancelAtPeriodEnd: false,
            metadata: {}
        });

        const invoiceId = latestOpenInvoice?.invoiceId || `inv_${randomUUID()}`;
        const transactionId = `txn_${randomUUID()}`;

        const invoice = await Invoice.findOneAndUpdate(
            { invoiceId },
            {
                $set: {
                    userId,
                    subscriptionId: activeSubscription.providerSubscriptionId || activeSubscription._id?.toString() || null,
                    provider: 'clerk',
                    invoiceId,
                    amountDue: PREMIUM_AMOUNT_CENTS,
                    amountPaid: PREMIUM_AMOUNT_CENTS,
                    currency: 'usd',
                    status: 'paid',
                    hostedInvoiceUrl: latestOpenInvoice?.hostedInvoiceUrl || null,
                    pdfUrl: latestOpenInvoice?.pdfUrl || null,
                    issuedAt: new Date(),
                    metadata: {
                        ...(latestOpenInvoice?.metadata || {}),
                        retrySource: 'profile'
                    }
                }
            },
            { upsert: true, new: true }
        ).lean();

        const transaction = await Transaction.findOneAndUpdate(
            { providerTransactionId: transactionId },
            {
                $set: {
                    userId,
                    subscriptionId: activeSubscription.providerSubscriptionId || activeSubscription._id?.toString() || null,
                    provider: 'clerk',
                    providerTransactionId: transactionId,
                    amount: PREMIUM_AMOUNT_CENTS,
                    currency: 'usd',
                    status: 'succeeded',
                    type: 'payment',
                    errorCode: null,
                    metadata: {
                        invoiceId,
                        retriedFromTransactionId: latestFailedTransaction?.providerTransactionId || null
                    }
                }
            },
            { upsert: true, new: true }
        ).lean();

        await RetryJob.updateMany(
            { resourceId: userId, kind: 'payment_retry', status: 'pending' },
            { $set: { status: 'succeeded', attempts: 2, lastError: null } }
        );

        const subscriptionData = activeSubscription.toObject ? activeSubscription.toObject() : activeSubscription;
        subscriptionData.planId = 'premium';
        subscriptionData.status = 'active';
        subscriptionData.cancelAtPeriodEnd = false;
        subscriptionData.currentPeriodStart = new Date();
        subscriptionData.currentPeriodEnd = nextPeriodEnd();
        await Subscription.findOneAndUpdate(
            { userId },
            {
                $set: {
                    userId,
                    provider: subscriptionData.provider || 'clerk',
                    providerCustomerId: subscriptionData.providerCustomerId || null,
                    providerSubscriptionId: subscriptionData.providerSubscriptionId || `sub_${userId}`,
                    planId: 'premium',
                    status: 'active',
                    currentPeriodStart: subscriptionData.currentPeriodStart,
                    currentPeriodEnd: subscriptionData.currentPeriodEnd,
                    cancelAtPeriodEnd: false,
                    trialEndsAt: subscriptionData.trialEndsAt || null,
                    metadata: {
                        ...(subscriptionData.metadata || {}),
                        lastRetryTransactionId: transaction.providerTransactionId,
                        lastRetryInvoiceId: invoice.invoiceId
                    }
                }
            },
            { upsert: true, new: true }
        );

        const billing = normalizeBillingFromSubscription({
            ...subscriptionData,
            planId: 'premium',
            status: 'active',
            currentPeriodEnd: subscriptionData.currentPeriodEnd
        });
        billing.defaultPaymentMethodId = defaultPaymentMethod.providerPaymentMethodId;
        await syncUserBilling(userId, billing, defaultPaymentMethod.providerPaymentMethodId);

        await logBillingEvent({
            userId,
            eventType: 'payment.retry_succeeded',
            referenceId: transaction.providerTransactionId,
            payload: { invoiceId: invoice.invoiceId, transactionId: transaction.providerTransactionId }
        });

        res.json({
            success: true,
            message: 'Payment retried successfully',
            invoice,
            transaction
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const cancelSubscription = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { cancelAtPeriodEnd = true } = req.body || {};
        const existingSubscription = await Subscription.findOne({ userId }).lean();

        const subscription = await Subscription.findOneAndUpdate(
            { userId },
            {
                $set: {
                    userId,
                    provider: existingSubscription?.provider || 'clerk',
                    providerCustomerId: existingSubscription?.providerCustomerId || null,
                    providerSubscriptionId: existingSubscription?.providerSubscriptionId || `sub_${userId}`,
                    planId: cancelAtPeriodEnd ? 'premium' : 'free',
                    status: cancelAtPeriodEnd ? 'active' : 'canceled',
                    currentPeriodStart: existingSubscription?.currentPeriodStart || new Date(),
                    currentPeriodEnd: cancelAtPeriodEnd ? (existingSubscription?.currentPeriodEnd || nextPeriodEnd()) : null,
                    cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd),
                    trialEndsAt: existingSubscription?.trialEndsAt || null,
                    metadata: {
                        ...(existingSubscription?.metadata || {}),
                        cancellationRequestedAt: new Date()
                    }
                }
            },
            { upsert: true, new: true }
        ).lean();

        const billing = normalizeBillingFromSubscription(subscription);
        if (!cancelAtPeriodEnd) {
            billing.plan = 'free';
            billing.status = 'canceled';
        }

        await syncUserBilling(userId, billing, billing.defaultPaymentMethodId || null);

        await logBillingEvent({
            userId,
            eventType: 'subscription.canceled',
            referenceId: subscription.providerSubscriptionId || subscription._id?.toString() || null,
            payload: { cancelAtPeriodEnd }
        });

        res.json({
            success: true,
            message: cancelAtPeriodEnd ? 'Subscription will cancel at the end of the billing period' : 'Subscription canceled',
            subscription
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const switchPlan = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { planId } = req.body || {};

        if (!['free', 'premium'].includes(planId)) {
            return res.status(400).json({ success: false, message: 'planId must be free or premium' });
        }

        if (planId === 'free') {
            const subscription = await Subscription.findOneAndUpdate(
                { userId },
                {
                    $set: {
                        userId,
                        provider: 'clerk',
                        providerSubscriptionId: `sub_${userId}`,
                        planId: 'free',
                        status: 'canceled',
                        currentPeriodEnd: null,
                        cancelAtPeriodEnd: false,
                        metadata: {
                            lastPlanChangeAt: new Date(),
                            planId: 'free'
                        }
                    }
                },
                { upsert: true, new: true }
            ).lean();

            const billing = normalizeBillingFromSubscription(subscription);
            billing.plan = 'free';
            billing.status = 'free';
            await syncUserBilling(userId, billing, billing.defaultPaymentMethodId || null);

            await logBillingEvent({
                userId,
                eventType: 'subscription.switched_to_free',
                referenceId: subscription.providerSubscriptionId || subscription._id?.toString() || null,
                payload: { planId: 'free' }
            });

            return res.json({ success: true, message: 'Plan switched to Free', subscription });
        }

        const defaultPaymentMethod = await getDefaultPaymentMethod(userId);
        if (!defaultPaymentMethod) {
            return res.status(409).json({ success: false, message: 'Add a default payment method before switching to Premium' });
        }

        const subscription = await Subscription.findOneAndUpdate(
            { userId },
            {
                $set: {
                    userId,
                    provider: 'clerk',
                    providerCustomerId: `cus_${userId}`,
                    providerSubscriptionId: `sub_${userId}`,
                    planId: 'premium',
                    status: 'active',
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: nextPeriodEnd(),
                    cancelAtPeriodEnd: false,
                    trialEndsAt: null,
                    metadata: {
                        lastPlanChangeAt: new Date(),
                        planId: 'premium',
                        defaultPaymentMethodId: defaultPaymentMethod.providerPaymentMethodId
                    }
                }
            },
            { upsert: true, new: true }
        ).lean();

        const invoiceId = `inv_${randomUUID()}`;
        const { invoice, transaction } = await upsertPaidBillingArtifacts({
            userId,
            subscriptionId: subscription.providerSubscriptionId || subscription._id?.toString() || null,
            invoiceId,
            amount: PREMIUM_AMOUNT_CENTS,
            metadata: {
                planId: 'premium',
                source: 'profile-switch'
            }
        });

        const billing = normalizeBillingFromSubscription(subscription);
        billing.plan = 'premium';
        billing.status = 'active';
        billing.currentPeriodEnd = subscription.currentPeriodEnd;
        billing.defaultPaymentMethodId = defaultPaymentMethod.providerPaymentMethodId;
        await syncUserBilling(userId, billing, defaultPaymentMethod.providerPaymentMethodId);

        await logBillingEvent({
            userId,
            eventType: 'subscription.switched_to_premium',
            referenceId: subscription.providerSubscriptionId || subscription._id?.toString() || null,
            payload: { planId: 'premium', invoiceId, transactionId: transaction.providerTransactionId }
        });

        res.json({
            success: true,
            message: 'Plan switched to Premium',
            subscription,
            invoice,
            transaction
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const removePaymentMethod = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { paymentMethodId } = req.params;
        const paymentMethod = await PaymentMethod.findOne({ _id: paymentMethodId, userId }).lean();

        if (!paymentMethod) {
            return res.status(404).json({ success: false, message: 'Payment method not found' });
        }

        await PaymentMethod.deleteOne({ _id: paymentMethodId, userId });

        const [remainingMethods, subscription] = await Promise.all([
            PaymentMethod.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean(),
            Subscription.findOne({ userId }).lean()
        ]);

        if (remainingMethods.length > 0 && paymentMethod.isDefault) {
            await PaymentMethod.updateOne({ _id: remainingMethods[0]._id, userId }, { $set: { isDefault: true } });
        }

        const billing = normalizeBillingFromSubscription(subscription);
        billing.defaultPaymentMethodId = remainingMethods.length > 0 ? remainingMethods[0].providerPaymentMethodId : null;
        await syncUserBilling(userId, billing, billing.defaultPaymentMethodId);

        await logBillingEvent({
            userId,
            eventType: 'payment_method.deleted',
            referenceId: paymentMethod.providerPaymentMethodId,
            payload: paymentMethod
        });

        res.json({ success: true, message: 'Payment method removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const refreshBillingSnapshot = async (req, res) => {
    try {
        const userId = getUserId(req);
        const snapshot = await buildBillingSnapshot(userId);

        await syncUserBilling(userId, snapshot.billing, snapshot.billing.defaultPaymentMethodId || null);

        res.json({
            success: true,
            message: 'Billing state refreshed',
            billing: snapshot.user?.billing || snapshot.billing || req.billing,
            usage: snapshot.user?.usage || { freeUsage: req.free_usage ?? 0, periodUsage: 0 },
            subscription: snapshot.subscription || null,
            paymentMethods: snapshot.paymentMethods,
            recentTransactions: snapshot.recentTransactions,
            recentInvoices: snapshot.recentInvoices,
            retryStates: snapshot.retryStates,
            billingEvents: snapshot.billingEvents
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSubscriptionStatus = async (req, res) => {
    try {
        const snapshot = await buildBillingSnapshot(getUserId(req));
        res.json({ success: true, subscription: snapshot.subscription || null, billing: snapshot.billing });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
