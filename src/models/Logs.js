const mongoose = require('mongoose');

// Access Log Schema
const accessLogSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    action: {
        type: String,
        enum: ['login', 'logout', 'failed_login'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    }
});

// Modification Log Schema
const modificationLogSchema = new mongoose.Schema({
    adminUsername: {
        type: String,
        required: true
    },
    targetUsername: {
        type: String,
        required: true
    },
    recordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Record',
        required: true
    },
    action: {
        type: String,
        enum: ['edit', 'delete'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    changes: {
        type: Object,
        default: null
    },
    reason: {
        type: String,
        default: ''
    }
});

const AccessLog = mongoose.model('AccessLog', accessLogSchema);
const ModificationLog = mongoose.model('ModificationLog', modificationLogSchema);

module.exports = { AccessLog, ModificationLog };
