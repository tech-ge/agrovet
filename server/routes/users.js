const express = require('express');
const router = express.Router();
const { getUsers, createStaff, setUserActive } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.get('/', getUsers);
router.post('/', createStaff);
router.patch('/:id/status', setUserActive);

module.exports = router;