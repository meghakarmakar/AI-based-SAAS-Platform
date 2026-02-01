import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import toast from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

/**
 * usePromptOptimizer Hook
 * 
 * Custom hook for optimizing AI prompts using the backend API.
 * Manages loading state, error handling, and prevents duplicate requests.
 * 
 * @returns {Object} { optimize, loading, error }
 * 
 * @example
 * const { optimize, loading } = usePromptOptimizer();
 * const enhanced = await optimize(userPrompt);
 * if (enhanced) setPrompt(enhanced);
 */
export const usePromptOptimizer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { getToken } = useAuth();

  /**
   * Optimizes a user prompt via API call
   * 
   * @param {string} prompt - The raw prompt to optimize
   * @returns {Promise<string|null>} Optimized prompt or null on error
   */
  const optimize = async (prompt) => {
    // Prevent duplicate requests
    if (loading) {
      return null;
    }

    // Reset error state
    setError(null);

    // Validate input
    if (!prompt || prompt.trim().length < 10) {
      const errorMsg = "Prompt must be at least 10 characters";
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    setLoading(true);

    try {
      // Get authentication token
      const token = await getToken();

      // Make API call to optimization endpoint
      const { data } = await axios.post(
        '/api/ai/optimize-prompt',
        { prompt: prompt.trim() },
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        }
      );

      // Handle response
      if (data.success) {
        // Show success feedback
        toast.success('✨ Prompt optimized successfully!');
        return data.optimizedPrompt;
      } else {
        // Handle API error response
        setError(data.message);
        toast.error(data.message);
        return null;
      }
    } catch (err) {
      // Handle network or server errors
      const errorMessage = err.response?.data?.message || err.message || 'Failed to optimize prompt';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  return { 
    optimize, 
    loading, 
    error 
  };
};
