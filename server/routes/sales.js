const express = require('express');
const router = express.Router();
const { createSale, getSales, getSale, refundSale } = require('../controllers/saleController');
const { protect, adminOnly, allowRoles } = require('../middleware/auth');

router.use(protect);

router.route('/').get(allowRoles('admin', 'staff', 'user'), getSales).post(allowRoles('admin', 'staff'), createSale);
router.get('/:id', getSale);
router.post('/:id/refund', adminOnly, refundSale);

module.exports = router;
