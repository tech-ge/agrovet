const express = require('express');
const router = express.Router();
const { getDashboard, getProfitLoss, getInventoryReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/profit-loss', getProfitLoss);
router.get('/inventory', getInventoryReport);

module.exports = router;