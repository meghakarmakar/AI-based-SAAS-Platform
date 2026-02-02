import OpenAI from "openai";
import Creation from "../models/Creation.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { optimizePrompt as optimizePromptService } from '../services/ai/promptOptimizerService.js';

const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export const generateArticle = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        // TEMPORARILY DISABLED FOR TESTING - Remove this comment and uncomment below for production
        // if(plan !== 'premium' && free_usage >= 10){
        //     return res.json({ success: false, message: "Limit reached. Upgrade to continue."})
        // }

        const response = await AI.chat.completions.create({
            model: "gemini-3-flash-preview",
            messages: [{
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: length,
        });

        const content = response.choices[0].message.content

        await Creation.create({
            user_id: userId,
            prompt,
            content,
            type: 'article'
        });

        if(plan !== 'premium'){
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata:{
                    free_usage: free_usage + 1
                }
            })
        }

        res.json({ success: true, content})


    } catch (error) {
        console.log(error.message)
        
        // Handle rate limiting
        if (error.status === 429 || error.message.includes('429')) {
            return res.json({
                success: false, 
                message: "API rate limit exceeded. Please wait a moment and try again.."
            })
        }
        
        // Handle quota exceeded
        if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
            return res.json({
                success: false, 
                message: "API quota exceeded. Please try again later or contact support."
            })
        }
        
        res.json({success: false, message: error.message || "Failed to generate article"})
    }
}

/**
 * Sanitizes LLM blog title response by removing common prefixes, numbering, and extra formatting
 * @param {string} rawContent - Raw LLM response
 * @returns {string} - Cleaned blog title
 */
function sanitizeBlogTitle(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') {
        return '';
    }
    
    // Remove common prefixes that LLMs add
    let cleaned = rawContent
        .replace(/^(Blog Title:|Title:|Here (?:is|are).+?:|Suggested Title:|Blog Post Title:)/i, '')
        .replace(/^\d+\.\s*/, '') // Remove numbering (1. 2. etc)
        .replace(/^[\"']|[\"']$/g, '') // Remove surrounding quotes
        .trim();
    
    // If response contains multiple lines, take the first non-empty line
    // This handles cases where LLM returns explanations after the title
    const lines = cleaned.split('\n').filter(line => line.trim().length > 0);
    const firstLine = lines[0] || cleaned;
    
    // Final cleanup
    return firstLine.trim();
}

export const generateBlogTitle = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt } = req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        // TEMPORARILY DISABLED FOR TESTING - Remove this comment and uncomment below for production
        // if(plan !== 'premium' && free_usage >= 10){
        //     return res.json({ success: false, message: "Limit reached. Upgrade to continue."})
        // }

        const response = await AI.chat.completions.create({
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: prompt, } ],
            temperature: 0.7,
            max_tokens: 500, // Increased to 500 to account for longer prompt + full title generation
        });

        const rawContent = response.choices[0].message.content
        
        // Debug logging to track actual LLM responses
        console.log('[GenerateBlogTitle] Raw LLM response:', rawContent);
        console.log('[GenerateBlogTitle] Finish reason:', response.choices[0].finish_reason);
        
        // Check if response was truncated
        if (response.choices[0].finish_reason === 'length') {
            console.warn('⚠️  [GenerateBlogTitle] WARNING: Response truncated due to max_tokens limit!');
            console.warn('⚠️  Consider increasing max_tokens or simplifying the prompt.');
        }
        
        // Sanitize the blog title to remove prefixes, numbering, and extra text
        const content = sanitizeBlogTitle(rawContent);
        
        console.log('[GenerateBlogTitle] Sanitized title:', content);

        await Creation.create({
            user_id: userId,
            prompt,
            content,
            type: 'blog-title'
        });

        if(plan !== 'premium'){
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata:{
                    free_usage: free_usage + 1
                }
            })
        }

        res.json({ success: true, content})


    } catch (error) {
        console.log(error.message)
        
        // Handle rate limiting
        if (error.status === 429 || error.message.includes('429')) {
            return res.json({
                success: false, 
                message: "API rate limit exceeded. Please wait a moment and try again."
            })
        }
        
        // Handle quota exceeded
        if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
            return res.json({
                success: false, 
                message: "API quota exceeded. Please try again later or contact support."
            })
        }
        
        res.json({success: false, message: error.message || "Failed to generate blog title"})
    }
}


export const generateImage = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt, publish } = req.body;
        const plan = req.plan;

        if(plan !== 'premium'){
            return res.json({ success: false, message: "This feature is only available for premium subscriptions"})
        }

        
        const formData = new FormData()
        formData.append('prompt', prompt)
        const {data} = await axios.post("https://clipdrop-api.co/text-to-image/v1", formData, {
            headers: {'x-api-key': process.env.CLIPDROP_API_KEY,},
            responseType: "arraybuffer",
        })

        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;

        const {secure_url} = await cloudinary.uploader.upload(base64Image)
        

        await Creation.create({
            user_id: userId,
            prompt,
            content: secure_url,
            type: 'image',
            publish: publish ?? false
        });

        res.json({ success: true, content: secure_url})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

export const removeImageBackground = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const image = req.file;
        const plan = req.plan;

        if(plan !== 'premium'){
            return res.json({ success: false, message: "This feature is only available for premium subscriptions"})
        }

        const {secure_url} = await cloudinary.uploader.upload(image.path, {
            transformation: [
                {
                    effect: 'background_removal',
                    background_removal: 'remove_the_background'
                }
            ]
        })

        await Creation.create({
            user_id: userId,
            prompt: 'Remove background from image',
            content: secure_url,
            type: 'image'
        });

        res.json({ success: true, content: secure_url})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

export const removeImageObject = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const { object } = req.body;
        const image = req.file;
        const plan = req.plan;

        if(plan !== 'premium'){
            return res.json({ success: false, message: "This feature is only available for premium subscriptions"})
        }

        const {public_id} = await cloudinary.uploader.upload(image.path)

        const imageUrl = cloudinary.url(public_id, {
            transformation: [{effect: `gen_remove:${object}`}],
            resource_type: 'image'
        })

        await Creation.create({
            user_id: userId,
            prompt: `Removed ${object} from image`,
            content: imageUrl,
            type: 'image'
        });

        res.json({ success: true, content: imageUrl})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

export const resumeReview = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const resume = req.file;
        const plan = req.plan;

        if(plan !== 'premium'){
            return res.json({ success: false, message: "This feature is only available for premium subscriptions"})
        }

        if(resume.size > 5 * 1024 * 1024){
            return res.json({success: false, message: "Resume file size exceeds allowed size (5MB)."})
        }

        const dataBuffer = fs.readFileSync(resume.path)
        const pdfData = await pdf(dataBuffer)

        const prompt = `Review the following resume and provide constructive feedback on its strengths, weaknesses, and areas for improvement. Resume Content:\n\n${pdfData.text}`

       const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [{ role: "user", content: prompt, } ],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const content = response.choices[0].message.content

        await Creation.create({
            user_id: userId,
            prompt: 'Review the uploaded resume',
            content,
            type: 'resume-review'
        });

        res.json({ success: true, content})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

/**
 * Optimize Prompt Controller
 * 
 * Handles prompt optimization requests using Gemini API.
 * Validates input and returns enhanced prompt text.
 * 
 * @route POST /api/ai/optimize-prompt
 * @access Private (requires authentication)
 */
export const optimizePromptController = async (req, res) => {
    try {
        // 1. Extract prompt from request body
        const { prompt } = req.body;

        // 2. Validate prompt presence
        if (!prompt) {
            return res.status(400).json({ 
                success: false, 
                message: "Prompt is required" 
            });
        }

        // 3. Call optimization service
        const optimizedPrompt = await optimizePromptService(prompt);

        // 4. Return success response
        res.status(200).json({ 
            success: true, 
            optimizedPrompt 
        });

    } catch (error) {
        console.error('[OptimizePrompt] Error:', error.message);
        
        // Handle rate limiting errors
        if (error.status === 429 || error.message.includes('429')) {
            return res.status(429).json({
                success: false, 
                message: "Too many requests. Please wait a moment and try again."
            });
        }
        
        // Handle quota exceeded errors
        if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
            return res.status(429).json({
                success: false, 
                message: "API quota exceeded. Please try again later."
            });
        }

        // Handle validation errors (400)
        if (error.message.includes('too short') || 
            error.message.includes('exceeds') || 
            error.message.includes('must be a string')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        // Generic server error (500)
        res.status(500).json({
            success: false, 
            message: error.message || "Failed to optimize prompt"
        });
    }
};
