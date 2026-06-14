const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'supervisor', 'user'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  email: {
    type: String,
    default: '',
    trim: true,
    lowercase: true
  },
  avatar: {
    type: String,
    default: '👤'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
