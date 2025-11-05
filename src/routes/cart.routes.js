// src/routes/cart.routes.js - FIXED
const express = require('express');
const router = express.Router();
const { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart 
} = require('../controllers/cart.controller');

// 🛒 FIXED ROUTES - MATCH FRONTEND EXPECTATIONS
router.route('/')
  .get(getCart)         // GET /api/cart
  .post(addToCart)      // POST /api/cart
  .put(updateCartItem); // PUT /api/cart

router.delete('/:bookId', removeFromCart);  // DELETE /api/cart/:bookId
router.post('/clear', clearCart);           // POST /api/cart/clear

module.exports = router;