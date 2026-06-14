const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'supervisor', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  createdBy: { type: String, default: 'system' },
  lastLogin: { type: Date, default: null },
  loginCount: { type: Number, default: 0 },
  email: { type: String, default: '', lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  avatar: { type: String, default: '👤' }
}, {
  timestamps: true
});

// Indices
userSchema.index({ username: 1 }, { unique: true });

// Pre-save: hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password
userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
