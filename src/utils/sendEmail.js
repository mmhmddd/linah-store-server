const transporter = require('../config/mailer');

const sendEmail = async (options) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
};

module.exports = sendEmail;