const mongoose = require('mongoose');

const requestItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    sellingPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleRequestSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    items: { type: [requestItemSchema], validate: (items) => items.length > 0 },
    status: { type: String, enum: ['pending', 'fulfilled', 'rejected'], default: 'pending', index: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SaleRequest', saleRequestSchema);