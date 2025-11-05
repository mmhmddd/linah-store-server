// Updated models/User.js
// No changes needed, but ensuring it's consistent.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  age: { type: Number, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }], 
  cart: [{
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    quantity: { type: Number, default: 1 }
  }],
favorites: [{
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' }
  }],
    resetPasswordToken: String, 
  resetPasswordExpire: Date,
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);