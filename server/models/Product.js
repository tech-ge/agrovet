const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    size: { type: String, default: '', trim: true },
    sku: { type: String, unique: true, sparse: true, trim: true },
    category: {
      type: String,
      enum: [
        'Seeds',
        'Fertilizers',
        'Pesticides',
        'Herbicides',
        'Animal Feed',
        'Veterinary',
        'Equipment',
        'Other',
      ],
      default: 'Other',
    },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    unit: { type: String, default: 'pcs' },
    unitOfMeasure: { type: String, default: 'pcs', trim: true },
    supplier: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.virtual('profitPerUnit').get(function () {
  return this.sellingPrice - this.costPrice;
});

productSchema.virtual('profitAmount').get(function () {
  return this.sellingPrice - this.costPrice;
});

productSchema.virtual('isLowStock').get(function () {
  return this.stock <= this.lowStockThreshold;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
