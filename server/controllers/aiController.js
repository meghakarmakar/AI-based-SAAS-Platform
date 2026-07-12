import OpenAI from "openai";
import Creation from "../models/Creation.js";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { optimizePrompt as optimizePromptService } from '../services/ai/promptOptimizerService.js';
import User from "../models/User.js";

const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

const uploadBufferToCloudinary = (file, options = {}) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(result);
        });

        stream.end(file.buffer);
    });
};

export const generateArticle = async (req, res)=>{
    try {
        const { userId } = req.auth();
        const { prompt, length } = req.body;
        const plan = req.plan;
        const freeUsage = Number(req.free_usage ?? 0);

        if(plan !== 'premium' && freeUsage >= 10){
            return res.json({ success: false, message: "Limit reached. Upgrade to continue."})
        }

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
            await User.updateOne(
                { _id: userId },
                {
                    $inc: { 'usage.freeUsage': 1 },
                    $set: { 'billing.lastSyncedAt': new Date() }
                }
            )
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
        const freeUsage = Number(req.free_usage ?? 0);

        if(plan !== 'premium' && freeUsage >= 10){
            return res.json({ success: false, message: "Limit reached. Upgrade to continue."})
        }

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
            await User.updateOne(
                { _id: userId },
                {
                    $inc: { 'usage.freeUsage': 1 },
                    $set: { 'billing.lastSyncedAt': new Date() }
                }
            )
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

        if (!image) {
            return res.status(400).json({ success: false, message: "Image file is required" })
        }

        if(plan !== 'premium'){
            return res.json({ success: false, message: "This feature is only available for premium subscriptions"})
        }

        const {secure_url} = await uploadBufferToCloudinary(image, {
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

        if (!image) {
            return res.status(400).json({ success: false, message: "Image file is required" })
        }

        if(plan !== 'premium'){
            return res.json({ success: false, message: "This feature is only available for premium subscriptions"})
        }

        const {public_id} = await uploadBufferToCloudinary(image)

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

        if (!resume) {
            return res.status(400).json({ success: false, message: "Resume file is required" })
        }

        if(plan !== 'premium'){
            return res.json({ success: false, message: "This feature is only available for premium subscriptions"})
        }

        if(resume.size > 5 * 1024 * 1024){
            return res.json({success: false, message: "Resume file size exceeds allowed size (5MB)."})
        }

        const pdfData = await pdf(resume.buffer)

        const prompt = `Review the following resume and provide constructive feedback on its strengths, weaknesses, and areas for improvement. Resume Content:\n\n${pdfData.text}`

        // Retry with exponential backoff on 429 rate-limit responses
        let response;
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                response = await AI.chat.completions.create({
                    model: "gemini-3-flash-preview",
                    messages: [{ role: "user", content: prompt, } ],
                    temperature: 0.7,
                    max_tokens: 1000,
                });
                break; // success
            } catch (err) {
                console.log(`[ResumeReview] Attempt ${attempt} failed:`, err.message || err);
                const isRateLimit = err.status === 429 || (err.response && err.response.status === 429) || (err.message && err.message.includes('429'));
                if (isRateLimit && attempt < maxAttempts) {
                    // exponential backoff: 1s, 2s, 4s
                    const delay = 1000 * Math.pow(2, attempt - 1);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                // rethrow to be handled by outer catch
                throw err;
            }
        }

        if (!response) {
            throw new Error('No response from AI service');
        }

        const content = response.choices[0].message.content

        await Creation.create({
            user_id: userId,
            prompt: 'Review the uploaded resume',
            content,
            type: 'resume-review'
        });

        res.json({ success: true, content})

    } catch (error) {
        console.log('[ResumeReview] Error:', error.message || error);

        // Handle rate limiting explicitly with proper status code and message
        if (error.status === 429 || (error.response && error.response.status === 429) || (error.message && error.message.includes('429'))) {
            return res.status(429).json({
                success: false,
                message: 'API rate limit exceeded. Please wait a moment and try again.'
            });
        }

        // Handle quota exceeded
        if (error.message && (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED'))) {
            return res.status(429).json({
                success: false,
                message: 'API quota exceeded. Please try again later.'
            });
        }

        // Generic server error
        return res.status(500).json({success: false, message: error.message || 'Failed to review resume'});
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
