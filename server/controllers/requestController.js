const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const SaleRequest = require('../models/SaleRequest');
const User = require('../models/User');
const { calculateSaleTotals } = require('../utils/calculateProfit');
const { generateReceiptNumber } = require('../utils/generateReceipt');

const formatSale = (sale) => {
  const result = sale.toObject();
  delete result.totalCost;
  delete result.totalProfit;
  result.items = result.items.map((item) => {
    delete item.costPrice;
    delete item.profit;
    return item;
  });
  return result;
};

exports.createRequest = async (req, res, next) => {
  try {
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!requestedItems.length) return res.status(400).json({ success: false, message: 'Your cart is empty' });

    const quantities = new Map();
    for (const item of requestedItems) {
      const id = String(item.product || '');
      const quantity = Number(item.quantity);
      if (!mongoose.Types.ObjectId.isValid(id) || !Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ success: false, message: 'Cart contains an invalid item or quantity' });
      }
      quantities.set(id, (quantities.get(id) || 0) + quantity);
    }

    const products = await Product.find({ _id: { $in: [...quantities.keys()] }, isActive: true });
    if (products.length !== quantities.size) return res.status(400).json({ success: false, message: 'A product is no longer available' });
    for (const product of products) {
      if (product.stock < quantities.get(String(product._id))) {
        return res.status(400).json({ success: false, message: `${product.name} does not have enough stock` });
      }
    }

    const request = await SaleRequest.create({
      customer: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      customerPhone: String(req.body.phone || '').trim(),
      items: products.map((product) => ({
        product: product._id,
        name: product.name,
        quantity: quantities.get(String(product._id)),
        sellingPrice: product.sellingPrice,
      })),
    });
    res.status(201).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const query = req.user.role === 'user' ? { customer: req.user._id } : {};
    if (req.user.role !== 'user' && req.query.status) query.status = req.query.status;
    const requests = await SaleRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(300)
      .populate('customer', 'name email')
      .populate('processedBy', 'name');
    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
};

exports.fulfillRequest = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const request = await SaleRequest.findById(req.params.id).session(session);
    if (!request || request.status !== 'pending') {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }
    const discount = Number(req.body.discount || 0);
    const paymentMethod = req.body.paymentMethod || 'cash';
    if (!Number.isFinite(discount) || discount < 0 || !['cash', 'bank'].includes(paymentMethod)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Enter a valid discount and payment method' });
    }

    const user = await User.findById(request.customer).session(session);
    if (!user || !user.isActive) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Customer account is not active' });
    }
    const products = await Product.find({ _id: { $in: request.items.map((item) => item.product) }, isActive: true }).session(session);
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const verifiedItems = request.items.map((item) => {
      const product = productMap.get(String(item.product));
      if (!product) throw Object.assign(new Error(`Product no longer available: ${item.name}`), { statusCode: 400 });
      if (product.stock < item.quantity) throw Object.assign(new Error(`Insufficient stock for ${product.name}`), { statusCode: 400 });
      return { product: product._id, name: product.name, quantity: item.quantity, costPrice: product.costPrice, sellingPrice: product.sellingPrice };
    });
    const totals = calculateSaleTotals(verifiedItems, { discount, tax: 0 });
    if (discount > totals.subtotal) throw Object.assign(new Error('Discount cannot exceed the subtotal'), { statusCode: 400 });

    for (const item of totals.items) {
      const result = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session }
      );
      if (!result.modifiedCount) throw Object.assign(new Error(`Stock update failed for ${item.name}`), { statusCode: 400 });
    }

    const [sale] = await Sale.create([{
      receiptNumber: generateReceiptNumber(),
      items: totals.items,
      subtotal: totals.subtotal,
      discount,
      tax: 0,
      total: totals.total,
      totalCost: totals.totalCost,
      totalProfit: totals.totalProfit,
      paymentMethod,
      paymentStatus: 'paid',
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerEmail: user.email,
      customerUser: user._id,
      servedBy: req.user._id,
    }], { session });

    request.status = 'fulfilled';
    request.sale = sale._id;
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    await request.save({ session });
    await session.commitTransaction();
    res.json({ success: true, request, sale: formatSale(sale) });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const request = await SaleRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'rejected', processedBy: req.user._id, processedAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Pending request not found' });
    res.json({ success: true, request });
  } catch (err) {
    next(err);
  }
};