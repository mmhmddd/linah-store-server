const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const {
  addBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  addOfferToBook,
  setStockStatus,
} = require('../controllers/book.controller');

// Routes with file uploads
router.post('/', upload, addBook);
router.put('/:id', upload, updateBook);

// Routes without file uploads
router.get('/', getAllBooks);
router.get('/:id', getBookById);
router.delete('/:id', deleteBook);
router.patch('/:id/offer', addOfferToBook);
router.patch('/:id/stock', setStockStatus);

module.exports = router;