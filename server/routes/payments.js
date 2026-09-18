const express = require('express');
const router = express.Router();
const { initializePayment, verifyPayment } = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/initialize', protect, adminOnly, initializePayment);
router.get('/verify/:reference', protect, adminOnly, verifyPayment);

module.exports = router;
