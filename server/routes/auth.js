const express = require('express');
const router = express.Router();
const { register, login, me, setupStatus } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.get('/setup-status', setupStatus);
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);

module.exports = router;