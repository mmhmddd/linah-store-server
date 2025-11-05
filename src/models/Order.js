const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  items: [{
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true } // Price at time of purchase
  }],
  totalAmount: { type: Number, required: true },
  government: { type: String, required: true },
  fullName: { type: String, required: true },
  address: { type: String, required: true },
  paymentMethod: { type: String, enum: ['cash', 'visa'], required: true },
  saleCode: { type: String, default: null },
  notes: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['قيد الانتظار', 'مسلم', 'ملغي'], 
    default: 'قيد الانتظار' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);