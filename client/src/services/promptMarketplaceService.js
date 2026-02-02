import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const promptMarketplaceService = {
    getLivePrompts: async (token) => {
        const { data } = await axios.get('/api/marketplace', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return data;
    },

    getPromptDetails: async (id, token) => {
        const { data } = await axios.get(`/api/marketplace/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return data;
    }
};
