const express = require('express');
const router = express.Router();
const { getDashboard, getProfitLoss, getInventoryReport, getStaffSummary } = require('../controllers/reportController');
const { protect, adminOnly, allowRoles } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', adminOnly, getDashboard);
router.get('/profit-loss', adminOnly, getProfitLoss);
router.get('/inventory', adminOnly, getInventoryReport);
router.get('/staff-summary', allowRoles('admin', 'staff'), getStaffSummary);

module.exports = router;