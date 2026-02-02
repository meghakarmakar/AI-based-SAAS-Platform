import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    promptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prompt',
        required: true
    },
    payment_method: {
        type: String
    },
    payment_id: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Order', orderSchema);
