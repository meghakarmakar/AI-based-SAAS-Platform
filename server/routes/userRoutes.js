import express from "express";
import { auth, requireAdmin } from "../middlewares/auth.js";
import { 
    getPublishedCreations, 
    getUserCreations, 
    toggleLikeCreation,
    getAllUsers,
    promoteToAdmin,
    demoteToUser
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get('/get-user-creations', auth, getUserCreations)
userRouter.get('/get-published-creations', auth, getPublishedCreations)
userRouter.post('/toggle-like-creation', auth, toggleLikeCreation)

// Admin-only routes for user management
userRouter.get('/admin/all-users', auth, requireAdmin, getAllUsers)
userRouter.patch('/admin/:userId/promote', auth, requireAdmin, promoteToAdmin)
userRouter.patch('/admin/:userId/demote', auth, requireAdmin, demoteToUser)

export default userRouter;