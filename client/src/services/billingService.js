const API_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const request = async (path, token, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    return response.json();
};

export const billingService = {
    getSnapshot: async (token) => request('/api/billing/subscription', token),
    getHistory: async (token) => request('/api/billing/history', token),
    getInvoices: async (token) => request('/api/billing/invoices', token),
    getPaymentMethods: async (token) => request('/api/billing/payment-methods', token),
    refresh: async (token) => request('/api/billing/refresh', token, { method: 'POST' }),
    addPaymentMethod: async (payload, token) => request('/api/billing/payment-methods', token, {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    setDefaultPaymentMethod: async (paymentMethodId, token) => request('/api/billing/payment-methods/default', token, {
        method: 'POST',
        body: JSON.stringify({ paymentMethodId })
    }),
    removePaymentMethod: async (paymentMethodId, token) => request(`/api/billing/payment-methods/${paymentMethodId}`, token, {
        method: 'DELETE'
    }),
    retryPayment: async (token) => request('/api/billing/retry-payment', token, { method: 'POST' }),
    cancelSubscription: async (cancelAtPeriodEnd, token) => request('/api/billing/cancel', token, {
        method: 'POST',
        body: JSON.stringify({ cancelAtPeriodEnd })
    }),
    switchPlan: async (planId, token) => request('/api/billing/switch-plan', token, {
        method: 'POST',
        body: JSON.stringify({ planId })
    })
};
