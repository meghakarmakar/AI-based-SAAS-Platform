import { clerkClient } from "@clerk/express";

export const getAllUsers = async (req, res) => {
    try {
        const users = await clerkClient.users.getUserList({ limit: 100 });

        const formattedUsers = users.data.map(user => ({
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            imageUrl: user.imageUrl,
            role: user.publicMetadata?.role || 'user',
            createdAt: user.createdAt
        }));

        res.json({ success: true, users: formattedUsers });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const promoteToAdmin = async (req, res) => {
    try {
        const { userId } = req.params;

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: 'admin'
            }
        });

        res.json({ success: true, message: 'User promoted to admin successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const demoteToUser = async (req, res) => {
    try {
        const { userId } = req.params;

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: 'user'
            }
        });

        res.json({ success: true, message: 'User demoted to regular user successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
