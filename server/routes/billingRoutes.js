import express from 'express';
import { auth } from '../middlewares/auth.js';
import {
	cancelSubscription,
	createPaymentMethod,
	getBillingHistory,
	getBillingSnapshot,
	getInvoices,
	getPaymentMethods,
	refreshBillingSnapshot,
	removePaymentMethod,
	retryPayment,
	setDefaultPaymentMethod,
	switchPlan
} from '../controllers/billingController.js';

const billingRouter = express.Router();

billingRouter.get('/subscription', auth, getBillingSnapshot);
billingRouter.get('/history', auth, getBillingHistory);
billingRouter.get('/invoices', auth, getInvoices);
billingRouter.get('/payment-methods', auth, getPaymentMethods);
billingRouter.post('/payment-methods', auth, createPaymentMethod);
billingRouter.post('/payment-methods/default', auth, setDefaultPaymentMethod);
billingRouter.delete('/payment-methods/:paymentMethodId', auth, removePaymentMethod);
billingRouter.post('/retry-payment', auth, retryPayment);
billingRouter.post('/cancel', auth, cancelSubscription);
billingRouter.post('/switch-plan', auth, switchPlan);
billingRouter.post('/refresh', auth, refreshBillingSnapshot);

export default billingRouter;
