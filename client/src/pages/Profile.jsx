import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { billingService } from '../services/billingService';
import toast from 'react-hot-toast';
import {
    AlertTriangle,
    ArrowLeft,
    BadgeInfo,
    CreditCard,
    Download,
    History,
    RefreshCcw,
    Shield,
    Sparkles,
    UserRound,
    RotateCcw,
    Trash2,
    CheckCircle2,
    CalendarClock,
    CircleDollarSign
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const tabs = [
    { id: 'account', label: 'Account', Icon: UserRound },
    { id: 'security', label: 'Security', Icon: Shield },
    { id: 'billing', label: 'Billing', Icon: CreditCard },
];

const tabIds = new Set(tabs.map((tab) => tab.id));

const money = (value) => {
    if (typeof value !== 'number') return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
};

const formatDate = (value) => {
    if (!value) return 'Not set';
    return new Date(value).toLocaleDateString();
};

const Profile = () => {
    const navigate = useNavigate();
    const { section } = useParams();
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const { openUserProfile } = useClerk();
    const [activeTab, setActiveTab] = useState(tabIds.has(section) ? section : 'account');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [billing, setBilling] = useState(null);
    const [usage, setUsage] = useState({ freeUsage: 0, periodUsage: 0 });
    const [subscription, setSubscription] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [retryStates, setRetryStates] = useState([]);
    const [billingEvents, setBillingEvents] = useState([]);
    const [paymentForm, setPaymentForm] = useState({
        label: '',
        brand: 'visa',
        last4: '',
        expMonth: '',
        expYear: '',
        isDefault: true
    });

    const loadBilling = useCallback(async () => {
        try {
            const token = await getToken();
            const [snapshot, history, methods, invoiceResponse] = await Promise.all([
                billingService.getSnapshot(token),
                billingService.getHistory(token),
                billingService.getPaymentMethods(token),
                billingService.getInvoices(token)
            ]);

            if (snapshot.success) {
                setBilling(snapshot.billing);
                setUsage(snapshot.usage || { freeUsage: 0, periodUsage: 0 });
                setSubscription(snapshot.subscription);
            }

            if (history.success) {
                setTransactions(history.transactions || []);
                setInvoices(history.invoices || []);
                setRetryStates(history.retryStates || []);
                setBillingEvents(history.billingEvents || []);
            }

            if (methods.success) {
                setPaymentMethods(methods.paymentMethods || []);
            }

            if (invoiceResponse.success) {
                setInvoices(invoiceResponse.invoices || []);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        if (user && isLoaded) {
            loadBilling();
        }
    }, [user, isLoaded, loadBilling]);

    useEffect(() => {
        if (!section) {
            setActiveTab('account');
            return;
        }

        if (!tabIds.has(section)) {
            setActiveTab('account');
            navigate('/ai/profile', { replace: true });
            return;
        }

        setActiveTab(section);
    }, [section, navigate]);

    const defaultPaymentMethod = useMemo(
        () => paymentMethods.find((method) => method.isDefault) || null,
        [paymentMethods]
    );

    const handleRefresh = async () => {
        setSaving(true);
        try {
            const token = await getToken();
            const data = await billingService.refresh(token);
            if (data.success) {
                toast.success(data.message || 'Billing refreshed');
                await loadBilling();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddPaymentMethod = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const token = await getToken();
            const data = await billingService.addPaymentMethod({
                label: paymentForm.label,
                brand: paymentForm.brand,
                last4: paymentForm.last4,
                expMonth: paymentForm.expMonth ? Number(paymentForm.expMonth) : null,
                expYear: paymentForm.expYear ? Number(paymentForm.expYear) : null,
                isDefault: paymentForm.isDefault
            }, token);

            if (data.success) {
                toast.success('Payment method saved');
                setPaymentForm({ label: '', brand: 'visa', last4: '', expMonth: '', expYear: '', isDefault: true });
                await loadBilling();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSetDefault = async (paymentMethodId) => {
        setSaving(true);
        try {
            const token = await getToken();
            const data = await billingService.setDefaultPaymentMethod(paymentMethodId, token);
            if (data.success) {
                toast.success(data.message);
                await loadBilling();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteMethod = async (paymentMethodId) => {
        if (!window.confirm('Remove this payment method?')) return;

        setSaving(true);
        try {
            const token = await getToken();
            const data = await billingService.removePaymentMethod(paymentMethodId, token);
            if (data.success) {
                toast.success(data.message);
                await loadBilling();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRetryPayment = async () => {
        setSaving(true);
        try {
            const token = await getToken();
            const data = await billingService.retryPayment(token);
            if (data.success) {
                toast.success(data.message);
                await loadBilling();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async (cancelAtPeriodEnd) => {
        if (!window.confirm(cancelAtPeriodEnd ? 'Cancel at the end of the billing period?' : 'Cancel subscription immediately?')) return;

        setSaving(true);
        try {
            const token = await getToken();
            const data = await billingService.cancelSubscription(cancelAtPeriodEnd, token);
            if (data.success) {
                toast.success(data.message);
                await loadBilling();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSwitchPlan = async (planId) => {
        setSaving(true);
        try {
            const token = await getToken();
            const data = await billingService.switchPlan(planId, token);
            if (data.success) {
                toast.success(data.message);
                await loadBilling();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        navigate(tabId === 'account' ? '/ai/profile' : `/ai/profile/${tabId}`);
    };

    if (!isLoaded || loading) {
        return (
            <div className='flex items-center justify-center h-full'>
                <div className='animate-spin rounded-full h-11 w-11 border-3 border-purple-500 border-t-transparent'></div>
            </div>
        );
    }

    const renewalDate = billing?.currentPeriodEnd || subscription?.currentPeriodEnd;
    const isPremium = billing?.plan === 'premium';
    const isPastDue = billing?.status === 'past_due' || billing?.status === 'retrying' || billing?.status === 'overdue';
    const isCanceled = billing?.status === 'canceled';

    return (
        <div className='h-full overflow-y-auto p-6'>
            <div className='flex items-center justify-between gap-4 flex-wrap'>
                <div className='flex items-center gap-3'>
                    <button
                        type='button'
                        onClick={() => navigate('/ai')}
                        className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                    >
                        <ArrowLeft className='h-4 w-4' />
                        Back to app
                    </button>
                    <div>
                        <h1 className='text-2xl font-semibold text-slate-800'>My Profile</h1>
                        <p className='text-sm text-gray-500'>Manage your account, security, and billing in one place.</p>
                    </div>
                </div>
                <div className='flex items-center gap-3'>
                    <button
                        type='button'
                        onClick={openUserProfile}
                        className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#3C81F6] to-[#9234EA] px-4 py-2 text-sm font-medium text-white shadow-sm'
                    >
                        <BadgeInfo className='h-4 w-4' />
                        Clerk profile
                    </button>
                    <button
                        type='button'
                        onClick={handleRefresh}
                        disabled={saving}
                        className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
                    >
                        <RefreshCcw className='h-4 w-4' />
                        Refresh billing
                    </button>
                </div>
            </div>

            <div className='mt-6 grid gap-6 lg:grid-cols-[240px_1fr]'>
                <aside className='rounded-2xl border border-gray-200 bg-white p-3 h-fit'>
                    <div className='flex items-center gap-3 rounded-2xl bg-slate-50 p-4'>
                        <img src={user.imageUrl} alt={user.fullName} className='h-14 w-14 rounded-full object-cover' />
                        <div>
                            <p className='font-medium text-slate-800'>{user.fullName}</p>
                            <p className='text-xs text-gray-500'>{user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress}</p>
                        </div>
                    </div>
                    <div className='mt-4 space-y-2'>
                        {tabs.map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                type='button'
                                onClick={() => handleTabChange(id)}
                                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition flex items-center gap-3 ${activeTab === id ? 'bg-gradient-to-r from-[#3C81F6] to-[#9234EA] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}
                            >
                                <Icon className='h-4 w-4' />
                                {label}
                            </button>
                        ))}
                    </div>
                </aside>

                <section className='space-y-6'>
                    {activeTab === 'account' && (
                        <div className='space-y-6'>
                            <div className='grid gap-4 md:grid-cols-3'>
                                <div className='rounded-2xl border border-gray-200 bg-white p-5'>
                                    <p className='text-sm text-gray-500'>Account status</p>
                                    <p className='mt-2 text-xl font-semibold text-slate-800'>{isPremium ? 'Premium' : 'Free'}</p>
                                </div>
                                <div className='rounded-2xl border border-gray-200 bg-white p-5'>
                                    <p className='text-sm text-gray-500'>Billing status</p>
                                    <p className='mt-2 text-xl font-semibold text-slate-800 capitalize'>{billing?.status || 'syncing'}</p>
                                </div>
                                <div className='rounded-2xl border border-gray-200 bg-white p-5'>
                                    <p className='text-sm text-gray-500'>Renewal date</p>
                                    <p className='mt-2 text-xl font-semibold text-slate-800'>{formatDate(renewalDate)}</p>
                                </div>
                            </div>

                            <div className='rounded-3xl border border-gray-200 bg-white p-6'>
                                <div className='flex items-start justify-between gap-4 flex-wrap'>
                                    <div>
                                        <h2 className='text-lg font-semibold text-slate-800'>Profile summary</h2>
                                        <p className='mt-1 text-sm text-gray-500'>Quick overview of the signed-in account.</p>
                                    </div>
                                    <div className='inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600'>
                                        <Sparkles className='h-3.5 w-3.5' />
                                        Signed in via Clerk
                                    </div>
                                </div>
                                <div className='mt-6 grid gap-4 md:grid-cols-2'>
                                    <div className='rounded-2xl border border-gray-200 bg-slate-50 p-4'>
                                        <p className='text-xs uppercase tracking-wide text-gray-500'>Email</p>
                                        <p className='mt-2 font-medium text-slate-800'>{user.primaryEmailAddress?.emailAddress || 'Not available'}</p>
                                    </div>
                                    <div className='rounded-2xl border border-gray-200 bg-slate-50 p-4'>
                                        <p className='text-xs uppercase tracking-wide text-gray-500'>Role</p>
                                        <p className='mt-2 font-medium text-slate-800 capitalize'>{user.publicMetadata?.role || 'user'}</p>
                                    </div>
                                    <div className='rounded-2xl border border-gray-200 bg-slate-50 p-4'>
                                        <p className='text-xs uppercase tracking-wide text-gray-500'>Free usage</p>
                                        <p className='mt-2 font-medium text-slate-800'>{usage.freeUsage ?? 0}</p>
                                    </div>
                                    <div className='rounded-2xl border border-gray-200 bg-slate-50 p-4'>
                                        <p className='text-xs uppercase tracking-wide text-gray-500'>Default payment method</p>
                                        <p className='mt-2 font-medium text-slate-800'>{defaultPaymentMethod ? `${defaultPaymentMethod.brand} •••• ${defaultPaymentMethod.last4}` : 'None'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className='space-y-6'>
                            <div className='rounded-3xl border border-gray-200 bg-white p-6'>
                                <div className='flex items-start justify-between gap-4 flex-wrap'>
                                    <div>
                                        <h2 className='text-lg font-semibold text-slate-800'>Security settings</h2>
                                        <p className='mt-1 text-sm text-gray-500'>Password, MFA, active sessions, and sign-in methods remain managed by Clerk.</p>
                                    </div>
                                    <button
                                        type='button'
                                        onClick={openUserProfile}
                                        className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                                    >
                                        <Shield className='h-4 w-4' />
                                        Open security center
                                    </button>
                                </div>

                                <div className='mt-6 grid gap-4 md:grid-cols-3'>
                                    <div className='rounded-2xl border border-gray-200 bg-slate-50 p-4'>
                                        <p className='text-xs uppercase tracking-wide text-gray-500'>Session</p>
                                        <p className='mt-2 font-medium text-slate-800'>Active</p>
                                    </div>
                                    <div className='rounded-2xl border border-gray-200 bg-slate-50 p-4'>
                                        <p className='text-xs uppercase tracking-wide text-gray-500'>Profile access</p>
                                        <p className='mt-2 font-medium text-slate-800'>Protected</p>
                                    </div>
                                    <div className='rounded-2xl border border-gray-200 bg-slate-50 p-4'>
                                        <p className='text-xs uppercase tracking-wide text-gray-500'>Billing access</p>
                                        <p className='mt-2 font-medium text-slate-800'>Server authorized</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className='space-y-6'>
                            {(isPastDue || isCanceled) && (
                                <div className='rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900'>
                                    <div className='flex items-start gap-3'>
                                        <AlertTriangle className='mt-0.5 h-5 w-5' />
                                        <div>
                                            <p className='font-semibold'>Billing attention required</p>
                                            <p className='mt-1 text-sm'>{isCanceled ? 'Your subscription is canceled.' : 'A payment retry or billing update is required to restore premium access.'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className='grid gap-4 md:grid-cols-4'>
                                <div className='rounded-2xl border border-gray-200 bg-white p-5'>
                                    <p className='text-sm text-gray-500'>Current plan</p>
                                    <p className='mt-2 text-xl font-semibold text-slate-800'>{isPremium ? 'Premium' : 'Free'}</p>
                                </div>
                                <div className='rounded-2xl border border-gray-200 bg-white p-5'>
                                    <p className='text-sm text-gray-500'>Billing status</p>
                                    <p className='mt-2 text-xl font-semibold text-slate-800 capitalize'>{billing?.status || 'syncing'}</p>
                                </div>
                                <div className='rounded-2xl border border-gray-200 bg-white p-5'>
                                    <p className='text-sm text-gray-500'>Renewal date</p>
                                    <p className='mt-2 text-xl font-semibold text-slate-800'>{formatDate(renewalDate)}</p>
                                </div>
                                <div className='rounded-2xl border border-gray-200 bg-white p-5'>
                                    <p className='text-sm text-gray-500'>Default method</p>
                                    <p className='mt-2 text-xl font-semibold text-slate-800'>{defaultPaymentMethod ? `${defaultPaymentMethod.brand} •••• ${defaultPaymentMethod.last4}` : 'None'}</p>
                                </div>
                            </div>

                            <div className='grid gap-6 xl:grid-cols-[1.3fr_0.9fr]'>
                                <div className='rounded-3xl border border-gray-200 bg-white p-6'>
                                    <div className='flex items-center justify-between gap-3 flex-wrap'>
                                        <div>
                                            <h3 className='text-lg font-semibold text-slate-800'>Payment methods</h3>
                                            <p className='text-sm text-gray-500'>Saved methods are stored as tokenized metadata only.</p>
                                        </div>
                                        <button
                                            type='button'
                                            onClick={handleRetryPayment}
                                            disabled={saving}
                                            className='inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'
                                        >
                                            <RotateCcw className='h-4 w-4' />
                                            Retry payment
                                        </button>
                                    </div>

                                    <form onSubmit={handleAddPaymentMethod} className='mt-5 grid gap-3 md:grid-cols-2'>
                                        <input
                                            value={paymentForm.label}
                                            onChange={(event) => setPaymentForm((current) => ({ ...current, label: event.target.value }))}
                                            className='rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#3C81F6]'
                                            placeholder='Card label'
                                        />
                                        <input
                                            value={paymentForm.brand}
                                            onChange={(event) => setPaymentForm((current) => ({ ...current, brand: event.target.value }))}
                                            className='rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#3C81F6]'
                                            placeholder='Brand e.g. visa'
                                        />
                                        <input
                                            value={paymentForm.last4}
                                            onChange={(event) => setPaymentForm((current) => ({ ...current, last4: event.target.value }))}
                                            className='rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#3C81F6]'
                                            placeholder='Last 4 digits'
                                            maxLength={4}
                                        />
                                        <input
                                            value={paymentForm.expMonth}
                                            onChange={(event) => setPaymentForm((current) => ({ ...current, expMonth: event.target.value }))}
                                            className='rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#3C81F6]'
                                            placeholder='Exp month'
                                            type='number'
                                            min='1'
                                            max='12'
                                        />
                                        <input
                                            value={paymentForm.expYear}
                                            onChange={(event) => setPaymentForm((current) => ({ ...current, expYear: event.target.value }))}
                                            className='rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#3C81F6]'
                                            placeholder='Exp year'
                                            type='number'
                                        />
                                        <label className='flex items-center gap-2 text-sm text-slate-600 md:col-span-1'>
                                            <input
                                                type='checkbox'
                                                checked={paymentForm.isDefault}
                                                onChange={(event) => setPaymentForm((current) => ({ ...current, isDefault: event.target.checked }))}
                                            />
                                            Make default
                                        </label>
                                        <button
                                            type='submit'
                                            disabled={saving}
                                            className='md:col-span-2 rounded-2xl bg-gradient-to-r from-[#3C81F6] to-[#9234EA] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60'
                                        >
                                            Save payment method
                                        </button>
                                    </form>

                                    <div className='mt-6 space-y-3'>
                                        {paymentMethods.length === 0 ? (
                                            <div className='rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500'>
                                                No saved payment methods yet.
                                            </div>
                                        ) : paymentMethods.map((method) => (
                                            <div key={method._id} className='flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4'>
                                                <div>
                                                    <div className='flex items-center gap-2'>
                                                        <CreditCard className='h-4 w-4 text-[#3C81F6]' />
                                                        <p className='font-medium text-slate-800 capitalize'>{method.label || method.brand}</p>
                                                        {method.isDefault && (
                                                            <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700'>Default</span>
                                                        )}
                                                    </div>
                                                    <p className='mt-1 text-sm text-gray-500'>{method.brand} •••• {method.last4} {method.expMonth && method.expYear ? `· ${method.expMonth}/${method.expYear}` : ''}</p>
                                                </div>
                                                <div className='flex flex-wrap gap-2'>
                                                    {!method.isDefault && (
                                                        <button
                                                            type='button'
                                                            onClick={() => handleSetDefault(method._id)}
                                                            className='rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50'
                                                        >
                                                            Set default
                                                        </button>
                                                    )}
                                                    <button
                                                        type='button'
                                                        onClick={() => handleDeleteMethod(method._id)}
                                                        className='inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50'
                                                    >
                                                        <Trash2 className='h-3.5 w-3.5' />
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className='space-y-6'>
                                    <div className='rounded-3xl border border-gray-200 bg-white p-6'>
                                        <div className='flex items-center justify-between gap-3 flex-wrap'>
                                            <div>
                                                <h3 className='text-lg font-semibold text-slate-800'>Plan controls</h3>
                                                <p className='text-sm text-gray-500'>Upgrade, downgrade, or cancel from the profile area.</p>
                                            </div>
                                            <CircleDollarSign className='h-5 w-5 text-[#9234EA]' />
                                        </div>
                                        <div className='mt-5 space-y-3'>
                                            <button
                                                type='button'
                                                onClick={() => handleSwitchPlan('premium')}
                                                disabled={saving || isPremium}
                                                className='w-full rounded-2xl bg-gradient-to-r from-[#3C81F6] to-[#9234EA] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60'
                                            >
                                                Switch to Premium
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => handleSwitchPlan('free')}
                                                disabled={saving || !isPremium}
                                                className='w-full rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60'
                                            >
                                                Downgrade to Free
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => handleCancel(true)}
                                                disabled={saving || !isPremium}
                                                className='w-full rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60'
                                            >
                                                Cancel at period end
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => handleCancel(false)}
                                                disabled={saving || !isPremium}
                                                className='w-full rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60'
                                            >
                                                Cancel immediately
                                            </button>
                                        </div>
                                    </div>

                                    <div className='rounded-3xl border border-gray-200 bg-white p-6'>
                                        <div className='flex items-center gap-2 text-slate-800'>
                                            <History className='h-5 w-5 text-[#3C81F6]' />
                                            <h3 className='text-lg font-semibold'>Billing alerts</h3>
                                        </div>
                                        <div className='mt-4 space-y-3 text-sm text-gray-600'>
                                            <div className='flex items-start gap-3 rounded-2xl bg-slate-50 p-4'>
                                                <CheckCircle2 className='mt-0.5 h-4 w-4 text-emerald-500' />
                                                <p>Server-authenticated billing state keeps profile access isolated per user.</p>
                                            </div>
                                            <div className='flex items-start gap-3 rounded-2xl bg-slate-50 p-4'>
                                                <CalendarClock className='mt-0.5 h-4 w-4 text-[#9234EA]' />
                                                <p>Renewal and cancellation status are synchronized from the local MongoDB billing snapshot.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='grid gap-6 xl:grid-cols-2'>
                                <div className='rounded-3xl border border-gray-200 bg-white p-6'>
                                    <div className='flex items-center gap-2 text-slate-800'>
                                        <Download className='h-5 w-5 text-[#3C81F6]' />
                                        <h3 className='text-lg font-semibold'>Invoice history</h3>
                                    </div>
                                    <div className='mt-4 overflow-x-auto'>
                                        <table className='w-full text-sm'>
                                            <thead className='text-left text-gray-500'>
                                                <tr>
                                                    <th className='py-2'>Invoice</th>
                                                    <th className='py-2'>Status</th>
                                                    <th className='py-2'>Amount</th>
                                                    <th className='py-2'>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invoices.length === 0 ? (
                                                    <tr>
                                                        <td colSpan='4' className='py-6 text-gray-500'>No invoices yet.</td>
                                                    </tr>
                                                ) : invoices.map((invoice) => (
                                                    <tr key={invoice._id || invoice.invoiceId} className='border-t border-gray-100'>
                                                        <td className='py-3 font-medium text-slate-800'>{invoice.invoiceId}</td>
                                                        <td className='py-3 capitalize text-gray-600'>{invoice.status}</td>
                                                        <td className='py-3 text-gray-600'>{money(invoice.amountPaid || invoice.amountDue || 0)}</td>
                                                        <td className='py-3'>
                                                            <a
                                                                href={invoice.pdfUrl || invoice.hostedInvoiceUrl || '#'}
                                                                target='_blank'
                                                                rel='noreferrer'
                                                                className='text-[#3C81F6] hover:underline'
                                                            >
                                                                Download
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className='rounded-3xl border border-gray-200 bg-white p-6'>
                                    <div className='flex items-center gap-2 text-slate-800'>
                                        <Sparkles className='h-5 w-5 text-[#9234EA]' />
                                        <h3 className='text-lg font-semibold'>Transaction history</h3>
                                    </div>
                                    <div className='mt-4 overflow-x-auto'>
                                        <table className='w-full text-sm'>
                                            <thead className='text-left text-gray-500'>
                                                <tr>
                                                    <th className='py-2'>Transaction</th>
                                                    <th className='py-2'>Status</th>
                                                    <th className='py-2'>Amount</th>
                                                    <th className='py-2'>Type</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transactions.length === 0 ? (
                                                    <tr>
                                                        <td colSpan='4' className='py-6 text-gray-500'>No transactions yet.</td>
                                                    </tr>
                                                ) : transactions.map((transaction) => (
                                                    <tr key={transaction._id || transaction.providerTransactionId} className='border-t border-gray-100'>
                                                        <td className='py-3 font-medium text-slate-800'>{transaction.providerTransactionId}</td>
                                                        <td className='py-3 capitalize text-gray-600'>{transaction.status}</td>
                                                        <td className='py-3 text-gray-600'>{money(transaction.amount || 0)}</td>
                                                        <td className='py-3 capitalize text-gray-600'>{transaction.type}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className='grid gap-6 xl:grid-cols-2'>
                                <div className='rounded-3xl border border-gray-200 bg-white p-6'>
                                    <div className='flex items-center gap-2 text-slate-800'>
                                        <RotateCcw className='h-5 w-5 text-[#3C81F6]' />
                                        <h3 className='text-lg font-semibold'>Retry states</h3>
                                    </div>
                                    <div className='mt-4 space-y-3'>
                                        {retryStates.length === 0 ? (
                                            <p className='text-sm text-gray-500'>No retry jobs recorded.</p>
                                        ) : retryStates.map((retryState) => (
                                            <div key={retryState._id} className='rounded-2xl border border-gray-200 bg-slate-50 p-4 text-sm text-slate-700'>
                                                <p className='font-medium capitalize'>{retryState.kind}</p>
                                                <p className='text-gray-500'>Status: {retryState.status} • Attempts: {retryState.attempts}</p>
                                                <p className='text-gray-500'>Next attempt: {formatDate(retryState.nextAttemptAt)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className='rounded-3xl border border-gray-200 bg-white p-6'>
                                    <div className='flex items-center gap-2 text-slate-800'>
                                        <History className='h-5 w-5 text-[#9234EA]' />
                                        <h3 className='text-lg font-semibold'>Billing events</h3>
                                    </div>
                                    <div className='mt-4 space-y-3'>
                                        {billingEvents.length === 0 ? (
                                            <p className='text-sm text-gray-500'>No billing events yet.</p>
                                        ) : billingEvents.map((event) => (
                                            <div key={event._id} className='rounded-2xl border border-gray-200 bg-slate-50 p-4 text-sm text-slate-700'>
                                                <p className='font-medium'>{event.eventType}</p>
                                                <p className='text-gray-500 capitalize'>{event.status} • {event.source}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Profile;
