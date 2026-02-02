import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const promptSellerService = {
    createPrompt: async (promptData, token) => {
        const { data } = await axios.post('/api/prompts', 
            promptData, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return data;
    },

    uploadPreviewImage: async (promptId, imageFile, token) => {
        const formData = new FormData();
        formData.append('previewImage', imageFile);
        
        const { data } = await axios.post(`/api/prompts/${promptId}/upload-preview`, 
            formData, 
            { 
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                } 
            }
        );
        return data;
    },

    getMyPrompts: async (token) => {
        const { data } = await axios.get('/api/prompts/my', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return data;
    },

    updatePrompt: async (id, promptData, token) => {
        const { data } = await axios.put(`/api/prompts/${id}`, 
            promptData, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return data;
    },

    deletePrompt: async (id, token) => {
        const { data } = await axios.delete(`/api/prompts/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return data;
    }
};
