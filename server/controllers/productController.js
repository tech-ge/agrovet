const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockPurchase = require('../models/StockPurchase');

const formatProduct = (product, role) => {
  const result = product.toObject({ virtuals: true });
  if (role !== 'admin') {
    delete result.costPrice;
    delete result.profitPerUnit;
    delete result.profitAmount;
  }
  if (role === 'user') {
    delete result.stock;
    delete result.lowStockThreshold;
    delete result.isLowStock;
  }
  return result;
};

exports.getProducts = async (req, res, next) => {
  try {
    const { search, category, lowStock } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;

    let products = await Product.find(query).sort({ createdAt: -1 });

    if (lowStock === 'true') {
      products = products.filter((p) => p.stock <= p.lowStockThreshold);
    }

    res.json({ success: true, count: products.length, products: products.map((product) => formatProduct(product, req.user.role)) });
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: formatProduct(product, req.user.role) });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [product] = await Product.create([req.body], { session });
    if (product.stock > 0) {
      await StockPurchase.create([{
        product: product._id,
        productName: product.name,
        quantity: product.stock,
        totalCost: product.stock * product.costPrice,
        unitCost: product.costPrice,
        supplier: product.supplier,
        receivedBy: req.user._id,
        notes: 'Initial stock recorded at product creation',
      }], { session });
    }
    await session.commitTransaction();
    res.status(201).json({ success: true, product });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const editableFields = ['name', 'sku', 'size', 'category', 'description', 'alternativeDescription', 'sellingPrice', 'lowStockThreshold', 'unit', 'unitOfMeasure', 'supplier'];
    const updates = Object.fromEntries(editableFields
      .filter((field) => req.body[field] !== undefined)
      .map((field) => [field, req.body[field]]));
    if (req.body.alternatives !== undefined) {
      if (!Array.isArray(req.body.alternatives)) {
        return res.status(400).json({ success: false, message: 'Alternatives must be a list of products' });
      }
      const alternativeIds = [...new Set(req.body.alternatives.map(String))]
        .filter((id) => id.toLowerCase() !== req.params.id.toLowerCase());
      if (alternativeIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({ success: false, message: 'Invalid alternative product' });
      }
      updates.alternatives = await Product.find({ _id: { $in: alternativeIds }, isActive: true }).distinct('_id');
    }
    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product removed' });
  } catch (err) {
    next(err);
  }
};

exports.adjustStock = async (req, res, next) => {
  try {
    const { quantity, operation } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ success: false, message: 'Invalid quantity' });
    }

    if (operation === 'add') product.stock += qty;
    else if (operation === 'subtract') product.stock = Math.max(0, product.stock - qty);
    else product.stock = qty;

    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};