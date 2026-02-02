import Creation from "../models/Creation.js";
import { clerkClient } from "@clerk/express";


export const getUserCreations = async (req, res)=>{
    try {
        const {userId} = req.auth()

        const creations = await Creation.find({ user_id: userId })
            .sort({ created_at: -1 })
            .lean();

        res.json({ success: true, creations });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const getPublishedCreations = async (req, res)=>{
    try {

        const creations = await Creation.find({ publish: true })
            .sort({ created_at: -1 })
            .lean();

        res.json({ success: true, creations });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const toggleLikeCreation = async (req, res)=>{
    try {

        const {userId} = req.auth()
        const {id} = req.body

        const creation = await Creation.findById(id);

        if(!creation){
            return res.json({ success: false, message: "Creation not found" })
        }

        const currentLikes = creation.likes;
        const userIdStr = userId.toString();
        let updatedLikes;
        let message;

        if(currentLikes.includes(userIdStr)){
            updatedLikes = currentLikes.filter((user)=>user !== userIdStr);
            message = 'Creation Unliked'
        }else{
            updatedLikes = [...currentLikes, userIdStr]
            message = 'Creation Liked'
        }

        creation.likes = updatedLikes;
        await creation.save();

        res.json({ success: true, message });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
    try {
        const { data: users } = await clerkClient.users.getUserList({
            limit: 100
        });

        const formattedUsers = users.map(user => ({
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            fullName: user.fullName,
            imageUrl: user.imageUrl,
            role: user.publicMetadata?.role || 'user',
            createdAt: user.createdAt
        }));

        res.json({ success: true, users: formattedUsers });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Promote user to admin (admin only)
export const promoteToAdmin = async (req, res) => {
    try {
        const { userId } = req.params;

        // Get the user from Clerk
        const user = await clerkClient.users.getUser(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if user is already an admin
        if (user.publicMetadata?.role === 'admin') {
            return res.json({ success: false, message: 'User is already an admin' });
        }

        // Update user's role to admin
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                ...user.publicMetadata,
                role: 'admin'
            }
        });

        res.json({ 
            success: true, 
            message: `${user.emailAddresses[0]?.emailAddress} has been promoted to admin` 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Demote admin to user (admin only)
export const demoteToUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { userId: requestingUserId } = req.auth();

        // Prevent self-demotion
        if (userId === requestingUserId) {
            return res.status(400).json({ 
                success: false, 
                message: 'You cannot demote yourself' 
            });
        }

        // Get the user from Clerk
        const user = await clerkClient.users.getUser(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if user is an admin
        if (user.publicMetadata?.role !== 'admin') {
            return res.json({ success: false, message: 'User is not an admin' });
        }

        // Update user's role to user
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                ...user.publicMetadata,
                role: 'user'
            }
        });

        res.json({ 
            success: true, 
            message: `${user.emailAddresses[0]?.emailAddress} has been demoted to user` 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}