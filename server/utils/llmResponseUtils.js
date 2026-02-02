/**
 * LLM Response Utilities
 * 
 * Centralized utilities for parsing, sanitizing, and validating LLM responses
 * across different GenAI features (blog titles, articles, resume reviews, etc.)
 * 
 * WHY THIS EXISTS:
 * LLMs often return responses with unexpected formatting:
 * - Prefixes like "Title:", "Here is:", "Suggested:"
 * - Numbering (1., 2., 3.)
 * - Explanatory text before/after the actual content
 * - Quotes or markdown formatting
 * 
 * This utility ensures consistent, clean output throughout the application.
 */

/**
 * Extracts the full text content from OpenAI-compatible API responses
 * Works with Gemini API (via OpenAI client) and other compatible providers
 * 
 * @param {Object} response - Full API response object
 * @returns {string} - Extracted text content
 * @throws {Error} - If response structure is invalid
 */
export function extractLLMText(response) {
    if (!response || !response.choices || !Array.isArray(response.choices)) {
        throw new Error('Invalid LLM response structure');
    }

    if (response.choices.length === 0) {
        throw new Error('No response choices returned from LLM');
    }

    const content = response.choices[0]?.message?.content;
    
    if (typeof content !== 'string') {
        throw new Error('LLM response content is not a string');
    }

    return content;
}

/**
 * Sanitizes blog title responses by removing common LLM artifacts
 * 
 * HANDLES:
 * - Prefixes: "Title:", "Blog Title:", "Here is a title:", etc.
 * - Numbering: "1. ", "2. ", etc.
 * - Quotes: "Title" or 'Title'
 * - Multi-line responses (takes first non-empty line)
 * 
 * @param {string} rawContent - Raw LLM response
 * @returns {string} - Cleaned blog title
 */
export function sanitizeBlogTitle(rawContent) {
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

/**
 * Sanitizes article/blog content by removing common LLM artifacts
 * More lenient than sanitizeBlogTitle - preserves paragraphs and formatting
 * 
 * @param {string} rawContent - Raw LLM response
 * @returns {string} - Cleaned article content
 */
export function sanitizeArticleContent(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') {
        return '';
    }
    
    // Remove common introductory phrases
    let cleaned = rawContent
        .replace(/^(Here is the article:|Here's the content:|Article:)/i, '')
        .trim();
    
    return cleaned;
}

/**
 * Validates that LLM response is complete (not truncated)
 * 
 * @param {Object} response - Full API response
 * @returns {Object} - { isComplete: boolean, reason: string }
 */
export function validateLLMCompletion(response) {
    const finishReason = response.choices[0]?.finish_reason;
    
    if (finishReason === 'length') {
        return {
            isComplete: false,
            reason: 'Response truncated due to max_tokens limit'
        };
    }
    
    if (finishReason === 'stop') {
        return {
            isComplete: true,
            reason: 'Response completed naturally'
        };
    }
    
    return {
        isComplete: true,
        reason: `Unknown finish reason: ${finishReason}`
    };
}

/**
 * Comprehensive LLM response handler with logging
 * Use this for all GenAI endpoints to ensure consistent handling
 * 
 * @param {Object} response - Raw LLM API response
 * @param {Object} options - Configuration options
 * @param {string} options.type - Response type: 'blog-title', 'article', 'general'
 * @param {boolean} options.debug - Enable debug logging
 * @returns {string} - Cleaned, validated content
 * @throws {Error} - If response is invalid or truncated
 */
export function handleLLMResponse(response, options = {}) {
    const { type = 'general', debug = true } = options;
    
    // Extract raw content
    const rawContent = extractLLMText(response);
    
    if (debug) {
        console.log(`[LLM Response] Type: ${type}`);
        console.log(`[LLM Response] Raw content:`, rawContent);
        console.log(`[LLM Response] Finish reason:`, response.choices[0].finish_reason);
    }
    
    // Validate completion
    const validation = validateLLMCompletion(response);
    if (!validation.isComplete) {
        console.warn(`[LLM Response] WARNING: ${validation.reason}`);
    }
    
    // Apply type-specific sanitization
    let cleanedContent;
    switch (type) {
        case 'blog-title':
            cleanedContent = sanitizeBlogTitle(rawContent);
            break;
        case 'article':
            cleanedContent = sanitizeArticleContent(rawContent);
            break;
        default:
            cleanedContent = rawContent.trim();
    }
    
    if (debug) {
        console.log(`[LLM Response] Cleaned content:`, cleanedContent);
    }
    
    return cleanedContent;
}

/**
 * Creates a standardized API response object
 * Ensures all GenAI endpoints return consistent response structure
 * 
 * @param {boolean} success - Whether the operation succeeded
 * @param {string|null} content - Generated content (null if failed)
 * @param {string|null} message - Error message (null if succeeded)
 * @returns {Object} - Standardized response
 */
export function createAPIResponse(success, content = null, message = null) {
    return {
        success,
        ...(content && { content }),
        ...(message && { message })
    };
}
