const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  console.log('Authorization Header:', authHeader);

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      token = authHeader.split(' ')[1];
      console.log('Token:', token);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded Token:', decoded);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'غير مصرح، المستخدم غير موجود' });
      }
      next();
    } catch (error) {
      console.error('Error in protect middleware:', error.message);
      return res.status(401).json({ message: 'غير مصرح، توكن غير صالح' });
    }
  } else {
    return res.status(401).json({ message: 'غير مصرح، لا يوجد توكن' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'غير مصرح، أدمن فقط' });
  }
};

module.exports = { protect, admin };