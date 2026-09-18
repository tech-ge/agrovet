const Sale = require('../models/Sale');
const Product = require('../models/Product');

exports.getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, monthAgg, totalProducts, lowStockCount, recentSales] = await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: startOfDay }, paymentStatus: 'paid' } },
        { $group: { _id: null, revenue: { $sum: '$total' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, paymentStatus: 'paid' } },
        { $group: { _id: null, revenue: { $sum: '$total' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } },
      ]),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
      Sale.find().sort({ createdAt: -1 }).limit(5).populate('servedBy', 'name'),
    ]);

    res.json({
      success: true,
      data: {
        today: todayAgg[0] || { revenue: 0, profit: 0, count: 0 },
        month: monthAgg[0] || { revenue: 0, profit: 0, count: 0 },
        totalProducts,
        lowStockCount,
        recentSales,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getProfitLoss = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = { paymentStatus: 'paid' };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    const [summary] = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          cost: { $sum: '$totalCost' },
          profit: { $sum: '$totalProfit' },
          salesCount: { $sum: 1 },
          itemsSold: { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]);

    const daily = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          profit: { $sum: '$totalProfit' },
          salesCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const topProducts = await Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
          profit: { $sum: '$items.profit' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      summary: summary || { revenue: 0, cost: 0, profit: 0, salesCount: 0, itemsSold: 0 },
      daily,
      topProducts,
    });
  } catch (err) {
    next(err);
  }
};

exports.getInventoryReport = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ stock: 1 });
    const totalStockValue = products.reduce((s, p) => s + p.stock * p.costPrice, 0);
    const totalRetailValue = products.reduce((s, p) => s + p.stock * p.sellingPrice, 0);
    const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);

    res.json({
      success: true,
      totalStockValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalStockValue,
      productCount: products.length,
      lowStock,
      products,
    });
  } catch (err) {
    next(err);
  }
};