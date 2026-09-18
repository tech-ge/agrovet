const express = require('express');
const router = express.Router();
const { createSale, getSales, getSale, refundSale } = require('../controllers/saleController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getSales).post(adminOnly, createSale);
router.get('/:id', getSale);
router.post('/:id/refund', adminOnly, refundSale);

module.exports = router;
