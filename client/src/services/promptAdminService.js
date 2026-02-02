import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const promptAdminService = {
    getAllPrompts: async (token) => {
        const { data } = await axios.get('/api/admin/prompts', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return data;
    },

    getPromptStats: async (token) => {
        const { data } = await axios.get('/api/admin/prompts/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return data;
    },

    updatePromptStatus: async (id, status, token) => {
        const { data } = await axios.patch(`/api/admin/prompts/${id}/status`, 
            { status }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return data;
    },

    deletePrompt: async (id, token) => {
        const { data } = await axios.delete(`/api/admin/prompts/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return data;
    }
};
