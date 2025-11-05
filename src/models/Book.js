const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  imgs: [{ type: String }], 
  code: { type: String, default: '' }, 
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  offer: { type: Number, default: 0, min: 0, max: 100 },
  stockStatus: {
    type: String,
    enum: ['inStock', 'outOfStock'],
    default: 'inStock',
  },
}, { timestamps: true });

bookSchema.pre('save', function(next) {
  this.stockStatus = this.quantity > 0 ? 'inStock' : 'outOfStock';
  next();
});

module.exports = mongoose.model('Book', bookSchema);