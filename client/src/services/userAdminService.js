const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const userAdminService = {
    getAllUsers: async (token) => {
        const response = await fetch(`${API_URL}/api/user/admin/all-users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.json();
    },

    promoteToAdmin: async (userId, token) => {
        const response = await fetch(`${API_URL}/api/user/admin/${userId}/promote`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.json();
    },

    demoteToUser: async (userId, token) => {
        const response = await fetch(`${API_URL}/api/user/admin/${userId}/demote`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.json();
    }
};
