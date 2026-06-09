import express from 'express';
import { handleBillingWebhook } from '../controllers/webhookController.js';

const webhookRouter = express.Router();

webhookRouter.post('/billing', handleBillingWebhook);

export default webhookRouter;
