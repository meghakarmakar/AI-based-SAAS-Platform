import Creation from "../models/Creation.js";


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