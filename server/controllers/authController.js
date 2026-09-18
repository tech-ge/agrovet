const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const count = await User.countDocuments();
    const assignedRole = count === 0 ? 'admin' : 'staff';

    const user = await User.create({ name, email, password, role: assignedRole });
    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user: formatUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }

    const token = signToken(user._id);
    res.json({ success: true, token, user: formatUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  res.json({ success: true, user: formatUser(req.user) });
};

exports.setupStatus = async (req, res, next) => {
  try {
    const count = await User.countDocuments();
    res.json({ success: true, needsSetup: count === 0 });
  } catch (err) {
    next(err);
  }
};
