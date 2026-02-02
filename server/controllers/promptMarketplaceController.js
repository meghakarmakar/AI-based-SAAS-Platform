import Prompt from '../models/Prompt.js';
import Image from '../models/Image.js';
import PromptFile from '../models/PromptFile.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';

export const getLivePrompts = async (req, res) => {
    try {
        const prompts = await Prompt.find({ status: 'Live' })
            .populate('previewImage')
            .populate('images')
            .populate('promptFiles')
            .populate('reviews')
            .populate('orders')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, prompts });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getPromptDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const prompt = await Prompt.findOne({ _id: id, status: 'Live' })
            .populate('previewImage')
            .populate('images')
            .populate('promptFiles')
            .populate('reviews')
            .populate('orders')
            .lean();

        if (!prompt) {
            return res.json({ success: false, message: 'Prompt not found or not available' });
        }

        res.json({ success: true, prompt });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
