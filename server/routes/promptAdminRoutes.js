import express from 'express';
import { 
    getAllPrompts, 
    getPromptById, 
    updatePromptStatus, 
    deletePrompt, 
    getPromptStats 
} from '../controllers/promptAdminController.js';
import { auth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/stats', auth, requireAdmin, getPromptStats);
router.get('/', auth, requireAdmin, getAllPrompts);
router.get('/:id', auth, requireAdmin, getPromptById);
router.patch('/:id/status', auth, requireAdmin, updatePromptStatus);
router.delete('/:id', auth, requireAdmin, deletePrompt);

export default router;
