import mongoose from 'mongoose';

const promptFileSchema = new mongoose.Schema({
    public_id: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    promptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prompt'
    }
}, {
    timestamps: true
});

export default mongoose.model('PromptFile', promptFileSchema);
