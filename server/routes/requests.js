const express = require('express');
const router = express.Router();
const { createRequest, getRequests, fulfillRequest, rejectRequest } = require('../controllers/requestController');
const { protect, allowRoles } = require('../middleware/auth');

router.use(protect);
router.get('/', allowRoles('admin', 'staff', 'user'), getRequests);
router.post('/', allowRoles('user'), createRequest);
router.post('/:id/fulfill', allowRoles('admin', 'staff'), fulfillRequest);
router.post('/:id/reject', allowRoles('admin', 'staff'), rejectRequest);

module.exports = router;