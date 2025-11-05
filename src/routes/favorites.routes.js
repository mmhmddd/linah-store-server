// routes/favorites.routes.js
const express = require('express');
const router = express.Router();
const { 
  getFavorites, 
  addToFavorites, 
  removeFromFavorites, 
  clearFavorites 
} = require('../controllers/favorites.controller');

// ❤️ FAVORITES ROUTES - MATCH FRONTEND EXPECTATIONS
router.route('/')
  .get(getFavorites)    // GET /api/favorites
  .post(addToFavorites); // POST /api/favorites

router.delete('/:bookId', removeFromFavorites);  // DELETE /api/favorites/:bookId
router.post('/clear', clearFavorites);           // POST /api/favorites/clear

module.exports = router;