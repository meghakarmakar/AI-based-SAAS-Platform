import OpenAI from "openai";

/**
 * Prompt Optimizer Service
 * 
 * Centralized service for enhancing user prompts using Gemini API.
 * Reuses existing Gemini client configuration from the project.
 */

// Reuse existing Gemini client configuration
const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

// Configuration constants
const OPTIMIZATION_CONFIG = {
    MODEL: 'gemini-3-flash-preview',
    TEMPERATURE: 0.5,
    MAX_TOKENS: 200,
    MIN_PROMPT_LENGTH: 10,
    MAX_PROMPT_LENGTH: 2000,
};

/**
 * Optimizes a user prompt using Gemini AI
 * 
 * @param {string} rawPrompt - The raw prompt from user
 * @returns {Promise<string>} - Enhanced prompt text
 * @throws {Error} - If validation fails or API error occurs
 */
export const optimizePrompt = async (rawPrompt) => {
    // 1. Validate input type
    if (typeof rawPrompt !== 'string') {
        throw new Error('Invalid prompt type - must be a string');
    }

    // 2. Trim whitespace
    const trimmedPrompt = rawPrompt.trim();

    // 3. Validate length constraints
    if (trimmedPrompt.length < OPTIMIZATION_CONFIG.MIN_PROMPT_LENGTH) {
        throw new Error(`Prompt too short - minimum ${OPTIMIZATION_CONFIG.MIN_PROMPT_LENGTH} characters required`);
    }

    if (trimmedPrompt.length > OPTIMIZATION_CONFIG.MAX_PROMPT_LENGTH) {
        throw new Error(`Prompt exceeds maximum length of ${OPTIMIZATION_CONFIG.MAX_PROMPT_LENGTH} characters`);
    }

    // 4. Construct optimization instruction
    const systemPrompt = "Rewrite and improve the following user prompt to be clearer, more descriptive, and more effective for AI generation. Preserve intent. Return ONLY the improved prompt.";
    const userMessage = trimmedPrompt;

    try {
        // 5. Call Gemini API using existing pattern
        const response = await AI.chat.completions.create({
            model: OPTIMIZATION_CONFIG.MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature: OPTIMIZATION_CONFIG.TEMPERATURE,
            max_tokens: OPTIMIZATION_CONFIG.MAX_TOKENS,
        });

        // 6. Extract optimized content
        const optimizedPrompt = response.choices[0].message.content.trim();

        // 7. Remove any surrounding quotes if Gemini added them
        const cleanedPrompt = optimizedPrompt.replace(/^["']|["']$/g, '');

        // 8. Validate response is reasonable
        if (!cleanedPrompt || cleanedPrompt.length < trimmedPrompt.length / 2) {
            throw new Error('Optimization produced invalid result');
        }

        return cleanedPrompt;

    } catch (error) {
        // Enhanced error context for debugging
        console.error('[PromptOptimizer] Optimization failed:', error.message);
        
        // Re-throw with context
        if (error.message.includes('Optimization produced invalid result')) {
            throw error;
        }
        
        throw new Error(`Optimization failed: ${error.message}`);
    }
};
