const mongoose = require('mongoose');

const stockPurchaseSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    totalCost: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    supplier: { type: String, default: '' },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockPurchase', stockPurchaseSchema);