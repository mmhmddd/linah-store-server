const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// Register user
const registerUser = async (req, res) => {
  const { name, email, password, phone, address, age, role } = req.body; // role اختياري، default user
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'المستخدم موجود بالفعل' });

    user = new User({ name, email, password, phone, address, age, role: role || 'user' });
    await user.save();

    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user._id, name, email, role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login (للمستخدم أو الأدمن)
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'بيانات خاطئة' });
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forget Password
const forgetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    // توليد توكن إعادة تعيين
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 دقائق
    await user.save();

    const resetUrl = `http://localhost:${process.env.PORT}/api/auth/resetpassword/${resetToken}`;
    const message = `رابط إعادة تعيين كلمة المرور: ${resetUrl}`;

    await sendEmail({
      to: user.email,
      subject: 'إعادة تعيين كلمة المرور',
      text: message,
    });

    res.json({ message: 'تم إرسال الإيميل' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'توكن غير صالح أو منتهي' });

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'تم إعادة تعيين كلمة المرور' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// لإنشاء أدمن (يمكن استدعاؤها مرة واحدة أو محمية)
const createAdmin = async (req, res) => {
  // يمكنك استخدام register مع role: 'admin'، أو هذه الطريقة
  // للبساطة، استخدم register وحدد role في الـ body
  res.json({ message: 'استخدم /register مع role: admin' });
};

module.exports = { registerUser, loginUser, forgetPassword, resetPassword, createAdmin };