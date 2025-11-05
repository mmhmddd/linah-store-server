const Book = require('../models/Book');

// Helper functions
const parseFloatSafe = (val) => (val == null || val === '') ? null : parseFloat(val);
const parseIntSafe = (val) => (val == null || val === '') ? null : parseInt(val, 10);

// Add Book
const addBook = async (req, res) => {
  console.log('addBook - body:', req.body);
  console.log('addBook - files:', req.files);

  const { name, title, category, code, price, quantity, description, offer = '0' } = req.body;

  // Validate required fields
  if (!name || !title || !category || price == null || quantity == null) {
    return res.status(400).json({ message: 'Required fields (name, title, category, price, quantity) are missing' });
  }

  const parsedPrice = parseFloatSafe(price);
  const parsedQty = parseIntSafe(quantity);
  const parsedOffer = parseFloatSafe(offer) ?? 0;

  // Validate parsed values
  if (parsedPrice === null || isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ message: 'Price must be a positive number or zero' });
  }
  if (parsedQty === null || isNaN(parsedQty) || parsedQty < 0) {
    return res.status(400).json({ message: 'Quantity must be a positive integer or zero' });
  }
  if (parsedOffer < 0 || parsedOffer > 100) {
    return res.status(400).json({ message: 'Offer percentage must be between 0 and 100' });
  }

  try {
    // Map uploaded files to relative paths
    const imgs = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    const book = new Book({
      name: name.trim(),
      title: title.trim(),
      category: category.trim(),
      imgs,
      code: code ? code.trim() : '',
      price: parsedPrice,
      quantity: parsedQty,
      description: description ? description.trim() : '',
      offer: parsedOffer,
      stockStatus: parsedQty > 0 ? 'inStock' : 'outOfStock',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await book.save();
    console.log('Book added:', book);
    return res.status(201).json({ message: 'Book added successfully', book });
  } catch (err) {
    console.error('addBook error:', err);
    return res.status(500).json({ message: 'Error saving book: ' + err.message });
  }
};

// Update Book
const updateBook = async (req, res) => {
  console.log('updateBook - body:', req.body);
  console.log('updateBook - files:', req.files);

  const { name, title, category, code, price, quantity, description, offer } = req.body;

  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });

    // Update fields if provided
    if (name !== undefined) book.name = name.trim();
    if (title !== undefined) book.title = title.trim();
    if (category !== undefined) book.category = category.trim();
    if (code !== undefined) book.code = code.trim();
    if (description !== undefined) book.description = description.trim();

    if (price !== undefined) {
      const p = parseFloatSafe(price);
      if (p === null || isNaN(p) || p < 0) {
        return res.status(400).json({ message: 'Invalid price' });
      }
      book.price = p;
    }
    if (quantity !== undefined) {
      const q = parseIntSafe(quantity);
      if (q === null || isNaN(q) || q < 0) {
        return res.status(400).json({ message: 'Invalid quantity' });
      }
      book.quantity = q;
      book.stockStatus = q > 0 ? 'inStock' : 'outOfStock';
    }
    if (offer !== undefined) {
      const o = parseFloatSafe(offer);
      if (o === null || isNaN(o) || o < 0 || o > 100) {
        return res.status(400).json({ message: 'Invalid offer percentage' });
      }
      book.offer = o;
    }

    // Update images if new files are uploaded
    if (req.files && req.files.length) {
      book.imgs = req.files.map(f => `/uploads/${f.filename}`);
    }

    book.updatedAt = new Date();
    await book.save();
    console.log('Book updated:', book);
    return res.json({ message: 'Book updated successfully', book });
  } catch (err) {
    console.error('updateBook error:', err);
    return res.status(500).json({ message: 'Error updating book: ' + err.message });
  }
};

// Get All Books
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().lean();
    console.log('Books fetched:', books.length);
    res.json(books);
  } catch (err) {
    console.error('getAllBooks error:', err);
    res.status(500).json({ message: 'Error fetching books: ' + err.message });
  }
};

// Get Book by ID
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ message: 'Book not found' });
    console.log('Book fetched:', book);
    res.json(book);
  } catch (err) {
    console.error('getBookById error:', err);
    res.status(500).json({ message: 'Error fetching book: ' + err.message });
  }
};

// Delete Book
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    await book.deleteOne();
    console.log('Book deleted:', req.params.id);
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('deleteBook error:', err);
    res.status(500).json({ message: 'Error deleting book: ' + err.message });
  }
};

// Add Offer to Book
const addOfferToBook = async (req, res) => {
  const { offer } = req.body;
  const o = parseFloatSafe(offer);
  if (o === null || isNaN(o) || o < 0 || o > 100) {
    return res.status(400).json({ message: 'Invalid offer percentage' });
  }
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    book.offer = o;
    book.updatedAt = new Date();
    await book.save();
    console.log('Offer updated:', { id: req.params.id, offer: o });
    res.json({ message: 'Offer added successfully', book });
  } catch (err) {
    console.error('addOfferToBook error:', err);
    res.status(500).json({ message: 'Error adding offer: ' + err.message });
  }
};

// Set Stock Status
const setStockStatus = async (req, res) => {
  const { quantity } = req.body;
  const q = parseIntSafe(quantity);
  if (q === null || isNaN(q) || q < 0) {
    return res.status(400).json({ message: 'Invalid quantity' });
  }
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    book.quantity = q;
    book.stockStatus = q > 0 ? 'inStock' : 'outOfStock';
    book.updatedAt = new Date();
    await book.save();
    console.log('Stock updated:', { id: req.params.id, quantity: q, stockStatus: book.stockStatus });
    res.json({ message: 'Stock updated successfully', book });
  } catch (err) {
    console.error('setStockStatus error:', err);
    res.status(500).json({ message: 'Error updating stock: ' + err.message });
  }
};

module.exports = {
  addBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  getBookById,
  addOfferToBook,
  setStockStatus,
};