import Prompt from '../models/Prompt.js';
import Image from '../models/Image.js';
import PromptFile from '../models/PromptFile.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import { clerkClient } from '@clerk/express';

export const getAllPrompts = async (req, res) => {
    try {
        const prompts = await Prompt.find()
            .populate('previewImage')
            .populate('images')
            .populate('promptFiles')
            .populate('reviews')
            .populate('orders')
            .sort({ createdAt: -1 })
            .lean();

        // Fetch seller emails for all prompts
        const promptsWithEmails = await Promise.all(
            prompts.map(async (prompt) => {
                try {
                    const user = await clerkClient.users.getUser(prompt.sellerId);
                    return {
                        ...prompt,
                        sellerEmail: user.emailAddresses?.[0]?.emailAddress || 'N/A'
                    };
                } catch (error) {
                    return {
                        ...prompt,
                        sellerEmail: 'N/A'
                    };
                }
            })
        );

        res.json({ success: true, prompts: promptsWithEmails });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getPromptById = async (req, res) => {
    try {
        const { id } = req.params;

        const prompt = await Prompt.findById(id)
            .populate('previewImage')
            .populate('images')
            .populate('promptFiles')
            .populate('reviews')
            .populate('orders')
            .lean();

        if (!prompt) {
            return res.json({ success: false, message: 'Prompt not found' });
        }

        res.json({ success: true, prompt });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const updatePromptStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending', 'Live', 'Declined'];
        if (!validStatuses.includes(status)) {
            return res.json({ 
                success: false, 
                message: 'Invalid status. Must be Pending, Live, or Declined' 
            });
        }

        const prompt = await Prompt.findById(id);

        if (!prompt) {
            return res.json({ success: false, message: 'Prompt not found' });
        }

        prompt.status = status;
        await prompt.save();

        res.json({ 
            success: true, 
            message: `Prompt status updated to ${status}`,
            prompt 
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const deletePrompt = async (req, res) => {
    try {
        const { id } = req.params;

        const prompt = await Prompt.findByIdAndDelete(id);

        if (!prompt) {
            return res.json({ success: false, message: 'Prompt not found' });
        }

        res.json({ success: true, message: 'Prompt deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getPromptStats = async (req, res) => {
    try {
        const total = await Prompt.countDocuments();
        const pending = await Prompt.countDocuments({ status: 'Pending' });
        const live = await Prompt.countDocuments({ status: 'Live' });
        const declined = await Prompt.countDocuments({ status: 'Declined' });

        res.json({
            success: true,
            stats: {
                total,
                pending,
                live,
                declined
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
