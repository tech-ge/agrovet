const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getProducts).post(adminOnly, createProduct);
router.route('/:id').get(getProduct).put(adminOnly, updateProduct).delete(adminOnly, deleteProduct);
router.patch('/:id/stock', adminOnly, adjustStock);

module.exports = router;
