const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockPurchase = require('../models/StockPurchase');
const { ensureStockBatches, addStockBatch, allocateStock, syncActivePrice } = require('../utils/stockBatches');

const formatProduct = (product, role) => {
  const result = product.toObject({ virtuals: true });
  ensureStockBatches(product);
  syncActivePrice(product);
  const activeBatch = product.stockBatches.find((batch) => batch.quantity > 0);
  result.costPrice = activeBatch?.costPrice ?? result.costPrice;
  result.sellingPrice = activeBatch?.sellingPrice ?? result.sellingPrice;
  result.activeStock = activeBatch?.quantity ?? product.stock;
  result.priceTiers = product.stockBatches
    .filter((batch) => batch.quantity > 0)
    .map((batch) => ({ quantity: batch.quantity, sellingPrice: batch.sellingPrice }));
  if (!result.priceTiers.length && product.stock > 0) {
    result.priceTiers = [{ quantity: product.stock, sellingPrice: product.sellingPrice }];
  }
  delete result.stockBatches;
  if (role !== 'admin') {
    delete result.costPrice;
    delete result.profitPerUnit;
    delete result.profitAmount;
  }
  if (role === 'user') {
    delete result.stock;
    delete result.lowStockThreshold;
    delete result.isLowStock;
    delete result.activeStock;
    delete result.priceTiers;
    delete result.alternatives;
    delete result.alternativeDescription;
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
  const productData = { ...req.body };
  if (productData.alternatives !== undefined) {
    if (!Array.isArray(productData.alternatives)) {
      return res.status(400).json({ success: false, message: 'Alternatives must be a list of products' });
    }
    const alternativeIds = [...new Set(productData.alternatives.map(String))];
    if (alternativeIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ success: false, message: 'Invalid alternative product' });
    }
    try {
      productData.alternatives = await Product.find({ _id: { $in: alternativeIds }, isActive: true }).distinct('_id');
    } catch (err) {
      return next(err);
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [product] = await Product.create([productData], { session });
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
    if (updates.sellingPrice !== undefined) {
      ensureStockBatches(product);
      const activeBatch = product.stockBatches.find((batch) => batch.quantity > 0);
      if (activeBatch) {
        activeBatch.sellingPrice = Number(updates.sellingPrice);
        product.sellingPrice = activeBatch.sellingPrice;
        product.costPrice = activeBatch.costPrice;
        await product.save();
      }
    }
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
    if (!Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ success: false, message: 'Invalid quantity' });
    }

    if (operation === 'add') {
      if (qty > 0) addStockBatch(product, {
        quantity: qty,
        costPrice: product.costPrice,
        sellingPrice: Math.round((product.costPrice + 100) * 100) / 100,
      });
    } else if (operation === 'subtract') {
      const quantityToRemove = Math.min(qty, product.stock);
      if (quantityToRemove > 0) allocateStock(product, quantityToRemove);
    } else if (qty > product.stock) {
      addStockBatch(product, {
        quantity: qty - product.stock,
        costPrice: product.costPrice,
        sellingPrice: Math.round((product.costPrice + 100) * 100) / 100,
      });
    } else if (qty < product.stock) {
      allocateStock(product, product.stock - qty);
    }
    syncActivePrice(product);

    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};