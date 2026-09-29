const User = require('../models/User');

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('name email role isActive createdAt').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

exports.createStaff = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const user = await User.create({ name, email, password, role: 'staff' });
    res.status(201).json({ success: true, user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
  } catch (err) {
    next(err);
  }
};

exports.setUserActive = async (req, res, next) => {
  try {
    if (String(req.user._id) === req.params.id) {
      return res.status(400).json({ success: false, message: 'You cannot disable your own account' });
    }
    const isActive = req.body.isActive;
    if (typeof isActive !== 'boolean') return res.status(400).json({ success: false, message: 'isActive must be true or false' });
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: ['staff', 'user'] } },
      { isActive },
      { new: true }
    ).select('name email role isActive createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'Staff or user account not found' });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};