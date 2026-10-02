const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { calculateSaleTotals } = require('../utils/calculateProfit');
const { generateReceiptNumber } = require('../utils/generateReceipt');
const { paystackRequest } = require('../config/paystack');
const { allocateStock, restoreStock } = require('../utils/stockBatches');

const formatSale = (sale, role) => {
  const result = sale.toObject();
  result.items.forEach((item) => delete item.stockBatchId);
  if (role !== 'admin') {
    delete result.totalCost;
    delete result.totalProfit;
    result.items = result.items.map((item) => {
      delete item.costPrice;
      delete item.profit;
      return item;
    });
  }
  return result;
};

exports.createSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      items = [],
      discount = 0,
      tax = 0,
      paymentMethod = 'cash',
      paymentStatus = 'paid',
      paymentReference = '',
      customerName = 'pyhsical Customer',
      customerPhone = '',
      customerEmail = '',
      notes = '',
    } = req.body;

    if (!items.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Sale must have items' });
    }
    if (!['cash', 'bank', 'paystack'].includes(paymentMethod)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Payment method must be cash, bank, or paystack' });
    }
    const isStaff = req.user?.role === 'staff';

    const productIds = items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true }).session(session);
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const verifiedItems = [];
    for (const item of items) {
      const product = productMap.get(String(item.product));
      if (!product) throw Object.assign(new Error(`Product not found: ${item.product}`), { statusCode: 404 });
      const allocations = allocateStock(product, item.quantity);
      for (const allocation of allocations) {
        verifiedItems.push({
          product: product._id,
          stockBatchId: allocation.stockBatchId,
          name: product.name,
          quantity: allocation.quantity,
          costPrice: allocation.costPrice,
          sellingPrice: isStaff ? allocation.sellingPrice : item.sellingPrice ?? allocation.sellingPrice,
        });
      }
    }

    const totals = calculateSaleTotals(verifiedItems, { discount, tax: isStaff ? 0 : tax });
    if (Number(discount) > totals.subtotal) {
      throw Object.assign(new Error('Discount cannot exceed the subtotal'), { statusCode: 400 });
    }

    if (paymentMethod === 'paystack') {
      if (!paymentReference) throw Object.assign(new Error('Paystack payment reference is required'), { statusCode: 400 });
      if (!customerEmail) throw Object.assign(new Error('Customer email is required for Paystack payment'), { statusCode: 400 });
      const existingPayment = await Sale.exists({ paymentReference }).session(session);
      if (existingPayment) throw Object.assign(new Error('Paystack payment has already been used'), { statusCode: 400 });
      const verification = await paystackRequest(`/transaction/verify/${encodeURIComponent(paymentReference)}`);
      const payment = verification.data;
      if (!verification.status || payment?.status !== 'success') {
        throw Object.assign(new Error('Paystack payment was not successful'), { statusCode: 400 });
      }
      if (payment.currency !== 'KES' || payment.amount !== Math.round(totals.total * 100)) {
        throw Object.assign(new Error('Paystack payment amount does not match this sale'), { statusCode: 400 });
      }
      if (customerEmail && payment.customer?.email?.toLowerCase() !== customerEmail.toLowerCase()) {
        throw Object.assign(new Error('Paystack customer email does not match this sale'), { statusCode: 400 });
      }
    }

    for (const product of products) await product.save({ session });

    const [sale] = await Sale.create(
      [
        {
          receiptNumber: generateReceiptNumber(),
          items: totals.items,
          subtotal: totals.subtotal,
          discount: Number(discount),
          tax: isStaff ? 0 : Number(tax),
          total: totals.total,
          totalCost: totals.totalCost,
          totalProfit: totals.totalProfit,
          paymentMethod,
          paymentStatus: isStaff || paymentMethod === 'paystack' ? 'paid' : paymentStatus,
          paymentReference,
          customerName,
          customerPhone,
          customerEmail,
          servedBy: req.user?._id,
          notes,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({ success: true, sale: formatSale(sale, req.user.role) });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

exports.getSales = async (req, res, next) => {
  try {
    const { from, to, paymentMethod, search, limit = 100 } = req.query;
    const query = {};
    if (req.user.role === 'user') query.customerUser = req.user._id;

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (search) {
      query.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('servedBy', 'name');

    res.json({ success: true, count: sales.length, sales: sales.map((sale) => formatSale(sale, req.user.role)) });
  } catch (err) {
    next(err);
  }
};

exports.getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('servedBy', 'name');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    if (req.user.role === 'user' && String(sale.customerUser) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    res.json({ success: true, sale: formatSale(sale, req.user.role) });
  } catch (err) {
    next(err);
  }
};

exports.refundSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) throw Object.assign(new Error('Sale not found'), { statusCode: 404 });
    if (sale.paymentStatus === 'failed') throw Object.assign(new Error('Already refunded'), { statusCode: 400 });

    const products = await Product.find({ _id: { $in: sale.items.map((item) => item.product) } }).session(session);
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    for (const item of sale.items) {
      const product = productMap.get(String(item.product));
      if (product) restoreStock(product, item, sale.createdAt);
    }
    for (const product of products) await product.save({ session });

    sale.paymentStatus = 'failed';
    sale.notes = `${sale.notes || ''}\n[REFUNDED ${new Date().toISOString()}]`.trim();
    await sale.save({ session });

    await session.commitTransaction();
    res.json({ success: true, sale: formatSale(sale, req.user.role) });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};
