import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware, requireAuth } from '@clerk/express'
import aiRouter from './routes/aiRoutes.js';
import connectCloudinary from './configs/cloudinary.js';
import connectDB from './configs/db.js';
import userRouter from './routes/userRoutes.js';
import userAdminRouter from './routes/userAdminRoutes.js';
import promptAdminRouter from './routes/promptAdminRoutes.js';
import promptSellerRouter from './routes/promptSellerRoutes.js';
import promptMarketplaceRouter from './routes/promptMarketplaceRoutes.js';

const app = express()

await connectCloudinary()
await connectDB()

app.use(cors())
app.use(express.json())
app.use(clerkMiddleware())

app.get('/', (req, res)=>res.send('Server is Live!'))

app.use('/api/ai', requireAuth(), aiRouter)
app.use('/api/user', requireAuth(), userRouter)
app.use('/api/user', requireAuth(), userAdminRouter)
app.use('/api/admin/prompts', requireAuth(), promptAdminRouter)
app.use('/api/prompts', requireAuth(), promptSellerRouter)
app.use('/api/marketplace', requireAuth(), promptMarketplaceRouter)

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('Server is running on port', PORT);
})