const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockPurchase = require('../models/StockPurchase');
const { addStockBatch } = require('../utils/stockBatches');

exports.createPurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { product: productId, quantity, totalCost, supplier = '', reference = '', notes = '' } = req.body;
    const receivedQuantity = Number(quantity);
    const paidAmount = Number(totalCost);
    if (!Number.isInteger(receivedQuantity) || receivedQuantity < 1 || !Number.isFinite(paidAmount) || paidAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Enter a valid quantity and total purchase amount' });
    }

    const product = await Product.findOne({ _id: productId, isActive: true }).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const unitCost = paidAmount / receivedQuantity;
    const batchSellingPrice = Math.round((unitCost + 100) * 100) / 100;
    addStockBatch(product, {
      quantity: receivedQuantity,
      costPrice: unitCost,
      sellingPrice: batchSellingPrice,
    });
    await product.save({ session });

    await StockPurchase.create([{
      product: product._id,
      productName: product.name,
      quantity: receivedQuantity,
      totalCost: paidAmount,
      unitCost,
      supplier: String(supplier).trim(),
      reference: String(reference).trim(),
      notes: String(notes).trim(),
      receivedBy: req.user._id,
    }], { session });

    const activeBatch = product.stockBatches.find((batch) => batch.quantity > 0);
    const newestBatch = product.stockBatches[product.stockBatches.length - 1];
    await session.commitTransaction();
    res.status(201).json({
      success: true,
      product: { _id: product._id, stock: product.stock, sellingPrice: product.sellingPrice },
      batchSellingPrice,
      batchActive: String(activeBatch?._id) === String(newestBatch?._id),
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

exports.getPurchases = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.from || req.query.to) {
      query.createdAt = {};
      if (req.query.from) query.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const end = new Date(req.query.to);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    const purchases = await StockPurchase.find(query)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('receivedBy', 'name');
    res.json({ success: true, purchases });
  } catch (err) {
    next(err);
  }
};