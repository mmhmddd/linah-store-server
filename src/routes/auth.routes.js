const express = require('express');
const { registerUser, loginUser, forgetPassword, resetPassword } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgetpassword', forgetPassword);
router.put('/resetpassword/:token', resetPassword);

module.exports = router;