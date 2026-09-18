const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { calculateSaleTotals } = require('../utils/calculateProfit');
const { generateReceiptNumber } = require('../utils/generateReceipt');

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
      customerName = 'Walk-in Customer',
      customerPhone = '',
      customerEmail = '',
      notes = '',
    } = req.body;

    if (!items.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Sale must have items' });
    }

    const productIds = items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true }).session(session);
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const verifiedItems = items.map((item) => {
      const product = productMap.get(String(item.product));
      if (!product) throw Object.assign(new Error(`Product not found: ${item.product}`), { statusCode: 404 });
      if (product.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient stock for ${product.name} (available: ${product.stock})`), { statusCode: 400 });
      }
      return {
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        costPrice: product.costPrice,
        sellingPrice: item.sellingPrice ?? product.sellingPrice,
      };
    });

    const totals = calculateSaleTotals(verifiedItems, { discount, tax });

    for (const item of totals.items) {
      const result = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session }
      );
      if (result.modifiedCount === 0) {
        throw Object.assign(new Error(`Stock update failed for ${item.name}`), { statusCode: 400 });
      }
    }

    const [sale] = await Sale.create(
      [
        {
          receiptNumber: generateReceiptNumber(),
          items: totals.items,
          subtotal: totals.subtotal,
          discount: Number(discount),
          tax: Number(tax),
          total: totals.total,
          totalCost: totals.totalCost,
          totalProfit: totals.totalProfit,
          paymentMethod,
          paymentStatus,
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
    res.status(201).json({ success: true, sale });
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

    res.json({ success: true, count: sales.length, sales });
  } catch (err) {
    next(err);
  }
};

exports.getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('servedBy', 'name');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, sale });
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

    for (const item of sale.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    sale.paymentStatus = 'failed';
    sale.notes = `${sale.notes || ''}\n[REFUNDED ${new Date().toISOString()}]`.trim();
    await sale.save({ session });

    await session.commitTransaction();
    res.json({ success: true, sale });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};
