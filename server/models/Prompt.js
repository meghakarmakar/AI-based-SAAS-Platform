import mongoose from 'mongoose';

const promptSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    shortDescription: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: false,
        default: 0,
        min: 0
    },
    estimatedPrice: {
        type: Number,
        min: 0
    },
    category: {
        type: String,
        required: true
    },
    tags: {
        type: String
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    sellerId: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Live', 'Declined'],
        default: 'Pending',
        index: true
    },
    previewImage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image'
    },
    images: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image'
    }],
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }],
    promptFiles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PromptFile'
    }],
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }]
}, {
    timestamps: true
});

promptSchema.index({ sellerId: 1, status: 1 });
promptSchema.index({ createdAt: -1 });
promptSchema.index({ rating: -1 });

export default mongoose.model('Prompt', promptSchema);
