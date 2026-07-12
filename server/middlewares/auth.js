import { clerkClient } from '@clerk/express';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import PaymentMethod from '../models/PaymentMethod.js';

export const auth = async (req, res, next) => {
    try {
        const { userId, has } = await req.auth();
        const hasPremiumPlan = await has({ plan: 'premium' });
        const user = await clerkClient.users.getUser(userId);
        const existingUser = await User.findById(userId).lean();
        const resolvedRole = user.publicMetadata?.role || existingUser?.role || 'user';

        const [subscription, defaultPaymentMethod] = await Promise.all([
            Subscription.findOne({ userId }).lean(),
            PaymentMethod.findOne({ userId, isDefault: true }).lean()
        ]);

        const subscriptionPlan = subscription?.planId || 'free';
        const subscriptionStatus = subscription?.status || 'free';
        const subscriptionIsPremium = subscriptionPlan === 'premium' && ['active', 'trialing', 'grace_period'].includes(subscriptionStatus);
        const resolvedPlan = subscription ? (subscriptionIsPremium ? 'premium' : 'free') : (hasPremiumPlan ? 'premium' : 'free');
        const resolvedStatus = subscription ? subscriptionStatus : (hasPremiumPlan ? 'active' : 'free');

        let userRecord = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    _id: userId,
                    email: user.emailAddresses[0]?.emailAddress,
                    name: user.fullName,
                    imageUrl: user.imageUrl,
                    role: resolvedRole,
                    'billing.plan': resolvedPlan,
                    'billing.status': resolvedStatus,
                    'billing.provider': subscription?.provider || 'clerk',
                    'billing.currentPeriodEnd': subscription?.currentPeriodEnd || null,
                    'billing.cancelAtPeriodEnd': Boolean(subscription?.cancelAtPeriodEnd),
                    'billing.subscriptionId': subscription?.providerSubscriptionId || subscription?._id?.toString() || null,
                    'billing.defaultPaymentMethodId': defaultPaymentMethod?.providerPaymentMethodId || null,
                    'billing.lastSyncedAt': new Date(),
                    'entitlements.isPremium': resolvedPlan === 'premium' && ['active', 'trialing', 'grace_period'].includes(resolvedStatus),
                    'entitlements.lastSyncedAt': new Date()
                },
                $setOnInsert: {
                    usage: {
                        freeUsage: 0,
                        periodUsage: 0
                    }
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        ).lean();

        if (resolvedPlan === 'premium' && (userRecord?.usage?.freeUsage ?? 0) !== 0) {
            await User.updateOne({ _id: userId }, { $set: { 'usage.freeUsage': 0 } });
            userRecord.usage.freeUsage = 0;
        }

        req.plan = resolvedPlan;
        req.free_usage = Number(userRecord?.usage?.freeUsage ?? 0);
        req.billing = {
            ...userRecord?.billing,
            plan: resolvedPlan,
            status: resolvedStatus,
            defaultPaymentMethodId: defaultPaymentMethod?.providerPaymentMethodId || null
        };

        req.user = {
            id: userId,
            email: user.emailAddresses[0]?.emailAddress,
            role: resolvedRole
        };

        next();
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const requireAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        next();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};