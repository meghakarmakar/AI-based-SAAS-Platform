import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { clerkMiddleware, requireAuth } from '@clerk/express';

import aiRouter from './routes/aiRoutes.js';
import connectCloudinary from './configs/cloudinary.js';
import connectDB from './configs/db.js';
import userRouter from './routes/userRoutes.js';
import userAdminRouter from './routes/userAdminRoutes.js';
import billingRouter from './routes/billingRoutes.js';
import webhookRouter from './routes/webhookRoutes.js';
import promptAdminRouter from './routes/promptAdminRoutes.js';
import promptSellerRouter from './routes/promptSellerRoutes.js';
import promptMarketplaceRouter from './routes/promptMarketplaceRoutes.js';

const app = express();

await connectCloudinary();
await connectDB();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.get('/', (req, res) => {
    res.send('Server is Live!');
});

app.use('/api/webhooks', webhookRouter);
app.use('/api/ai', requireAuth(), aiRouter);
app.use('/api/user', requireAuth(), userRouter);
app.use('/api/user', requireAuth(), userAdminRouter);
app.use('/api/billing', requireAuth(), billingRouter);
app.use('/api/admin/prompts', requireAuth(), promptAdminRouter);
app.use('/api/prompts', requireAuth(), promptSellerRouter);
app.use('/api/marketplace', requireAuth(), promptMarketplaceRouter);

export default app;