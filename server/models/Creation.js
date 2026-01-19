import mongoose from 'mongoose';

const creationSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    prompt: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['article', 'blog-title', 'image', 'resume-review']
    },
    publish: {
        type: Boolean,
        default: false
    },
    likes: {
        type: [String],
        default: []
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

const Creation = mongoose.model('Creation', creationSchema);

export default Creation;
