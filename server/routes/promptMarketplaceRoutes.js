import express from 'express';
import { getLivePrompts, getPromptDetails } from '../controllers/promptMarketplaceController.js';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', auth, getLivePrompts);
router.get('/:id', auth, getPromptDetails);

export default router;
