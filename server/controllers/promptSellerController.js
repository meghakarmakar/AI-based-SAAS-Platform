import Prompt from '../models/Prompt.js';
import Image from '../models/Image.js';
import PromptFile from '../models/PromptFile.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

export const createPrompt = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { name, shortDescription, description, price, estimatedPrice, category, tags } = req.body;

        const newPrompt = new Prompt({
            name,
            shortDescription,
            description,
            price,
            estimatedPrice,
            category,
            tags,
            sellerId,
            status: 'Pending'
        });

        await newPrompt.save();

        res.json({ 
            success: true, 
            message: 'Prompt submitted for review',
            prompt: newPrompt 
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getMyPrompts = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const prompts = await Prompt.find({ sellerId })
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

export const updateMyPrompt = async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;
        const { name, shortDescription, description, price, estimatedPrice, category, tags } = req.body;

        const prompt = await Prompt.findOne({ _id: id, sellerId });

        if (!prompt) {
            return res.json({ success: false, message: 'Prompt not found or unauthorized' });
        }

        if (prompt.status === 'Live') {
            return res.json({ 
                success: false, 
                message: 'Cannot edit a live prompt. Please contact admin.' 
            });
        }

        if (name) prompt.name = name;
        if (shortDescription) prompt.shortDescription = shortDescription;
        if (description) prompt.description = description;
        if (price !== undefined) prompt.price = price;
        if (estimatedPrice !== undefined) prompt.estimatedPrice = estimatedPrice;
        if (category) prompt.category = category;
        if (tags !== undefined) prompt.tags = tags;

        await prompt.save();

        res.json({ 
            success: true, 
            message: 'Prompt updated successfully',
            prompt 
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const deleteMyPrompt = async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;

        const prompt = await Prompt.findOne({ _id: id, sellerId });

        if (!prompt) {
            return res.json({ success: false, message: 'Prompt not found or unauthorized' });
        }

        if (prompt.status === 'Live') {
            return res.json({ 
                success: false, 
                message: 'Cannot delete a live prompt. Please contact admin.' 
            });
        }

        await Prompt.findByIdAndDelete(id);

        res.json({ success: true, message: 'Prompt deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const uploadPreviewImage = async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;

        if (!req.file) {
            return res.json({ success: false, message: 'No image file provided' });
        }

        const prompt = await Prompt.findOne({ _id: id, sellerId });

        if (!prompt) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.json({ success: false, message: 'Prompt not found or unauthorized' });
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'prompt-previews',
            transformation: [
                { width: 800, height: 450, crop: 'limit' },
                { quality: 'auto:good' }
            ]
        });

        // Clean up temporary file
        fs.unlinkSync(req.file.path);

        // Delete old preview image if exists
        if (prompt.previewImage) {
            const oldImage = await Image.findById(prompt.previewImage);
            if (oldImage) {
                await cloudinary.uploader.destroy(oldImage.public_id);
                await Image.findByIdAndDelete(oldImage._id);
            }
        }

        // Create new Image document
        const newImage = await Image.create({
            public_id: result.public_id,
            url: result.secure_url,
            promptId: prompt._id
        });

        // Update prompt with new preview image
        prompt.previewImage = newImage._id;
        await prompt.save();

        res.json({ 
            success: true, 
            message: 'Preview image uploaded successfully',
            image: newImage
        });
    } catch (error) {
        // Clean up file if upload failed
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('File cleanup error:', cleanupError);
            }
        }
        res.json({ success: false, message: error.message });
    }
};
