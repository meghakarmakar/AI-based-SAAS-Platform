import express from 'express';
import { 
    createPrompt, 
    getMyPrompts, 
    updateMyPrompt, 
    deleteMyPrompt,
    uploadPreviewImage
} from '../controllers/promptSellerController.js';
import { auth } from '../middlewares/auth.js';
import { upload } from '../configs/multer.js';

const router = express.Router();

router.post('/', auth, createPrompt);
router.get('/my', auth, getMyPrompts);
router.put('/:id', auth, updateMyPrompt);
router.delete('/:id', auth, deleteMyPrompt);
router.post('/:id/upload-preview', auth, upload.single('previewImage'), uploadPreviewImage);

export default router;
