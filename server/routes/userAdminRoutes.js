import express from 'express';
import { getAllUsers, promoteToAdmin, demoteToUser } from '../controllers/userAdminController.js';
import { auth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/admin/all-users', auth, requireAdmin, getAllUsers);
router.patch('/admin/:userId/promote', auth, requireAdmin, promoteToAdmin);
router.patch('/admin/:userId/demote', auth, requireAdmin, demoteToUser);

export default router;
