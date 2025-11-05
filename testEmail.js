const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  logger: true, // لتسجيل تفاصيل التصحيح
  debug: true, // لعرض سجلات تفصيلية
});

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'mohamed.m.mahmoud29@gmail.com', // أو أي بريد آخر للاختبار
      subject: 'Test Email from LinaStore',
      text: 'This is a test email to verify Nodemailer configuration.',
    });
    console.log('✅ Test email sent:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
  }
}

testEmail();