import React from 'react';
import { Sparkles } from 'lucide-react';
import { usePromptOptimizer } from '../../hooks/usePromptOptimizer';

/**
 * OptimizePromptButton Component
 * 
 * Reusable button component for optimizing AI prompts.
 * Integrates with usePromptOptimizer hook and provides visual feedback.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.prompt - The raw prompt to optimize
 * @param {function} props.onOptimized - Callback with optimized prompt
 * @param {boolean} props.disabled - External disabled state
 * 
 * @example
 * <OptimizePromptButton
 *   prompt={input}
 *   onOptimized={(enhanced) => setInput(enhanced)}
 *   disabled={loading}
 * />
 */
const OptimizePromptButton = ({ prompt, onOptimized, disabled = false }) => {
  const { optimize, loading } = usePromptOptimizer();

  // Handle optimization click
  const handleOptimize = async () => {
    // Call optimization hook
    const optimizedPrompt = await optimize(prompt);
    
    // If successful, call parent callback
    if (optimizedPrompt && onOptimized) {
      onOptimized(optimizedPrompt);
    }
  };

  // Button is disabled if loading, externally disabled, or prompt is too short
  const isDisabled = loading || disabled || !prompt || prompt.trim().length < 10;

  return (
    <button
      type="button"
      onClick={handleOptimize}
      disabled={isDisabled}
      className="
        flex items-center gap-2 px-3 py-2 mt-2
        bg-gradient-to-r from-purple-500 to-blue-500 
        text-white text-sm rounded-md
        hover:from-purple-600 hover:to-blue-600
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
      "
      aria-label="Optimize prompt with AI"
      title="Enhance your prompt for better results"
    >
      {loading ? (
        // Loading spinner
        <div className='w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin' />
      ) : (
        // Sparkles icon
        <Sparkles className='w-4 h-4' />
      )}
      {loading ? 'Optimizing...' : 'Optimize'}
    </button>
  );
};

export default OptimizePromptButton;
