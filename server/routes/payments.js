const express = require('express');
const router = express.Router();
const { initializePayment, verifyPayment } = require('../controllers/paymentController');
const { protect, allowRoles } = require('../middleware/auth');

router.post('/initialize', protect, allowRoles('admin', 'staff'), initializePayment);
router.get('/verify/:reference', protect, allowRoles('admin', 'staff'), verifyPayment);

module.exports = router;
