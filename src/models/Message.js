const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    to: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    message: {
        type: String,
        required: true,
        maxlength: 1000,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Índices para optimizar consultas
messageSchema.index({ from: 1, to: 1, timestamp: -1 });
messageSchema.index({ to: 1, isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);
