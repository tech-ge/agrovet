const express = require('express');
const router = express.Router();
const { initializePayment } = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/initialize', protect, adminOnly, initializePayment);

module.exports = router;
