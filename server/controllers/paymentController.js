const { paystackRequest } = require('../config/paystack');

exports.initializePayment = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const email = 'geoffreymuthoka200@gmail.com';
    const numericAmount = Number(amount);
    if (!email || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'A valid email and amount are required' });
    }

    const response = await paystackRequest('/transaction/initialize', 'POST', {
      email,
      amount: Math.round(numericAmount * 100),
      currency: 'KES',
    });
    if (!response.status || !response.data?.authorization_url) {
      return res.status(502).json({ success: false, message: response.message || 'Paystack could not initialize payment' });
    }
    res.json({
      success: true,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
      authorizationUrl: response.data.authorization_url,
      reference: response.data.reference,
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
