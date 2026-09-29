const express = require('express');
const router = express.Router();
const { createPurchase, getPurchases } = require('../controllers/purchaseController');
const { protect, adminOnly, allowRoles } = require('../middleware/auth');

router.use(protect);
router.get('/', adminOnly, getPurchases);
router.post('/', allowRoles('admin', 'staff'), createPurchase);

module.exports = router;