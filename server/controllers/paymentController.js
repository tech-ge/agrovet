const { paystackRequest } = require('../config/paystack');

exports.initializePayment = async (req, res, next) => {
  try {
    const { amount, email } = req.body;
    const numericAmount = Number(amount);
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'A valid email and amount are required' });
    }

    const publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    if (!publicKey) return res.status(503).json({ success: false, message: 'Paystack is not configured' });
    res.json({
      success: true,
      publicKey,
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const response = await paystackRequest(`/transaction/verify/${encodeURIComponent(req.params.reference)}`);
    if (!response.status || response.data?.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment was not successful' });
    }
    res.json({ success: true, payment: response.data });
  } catch (err) {
    next(err);
  }
};
