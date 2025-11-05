// cart.controller.js (updated)
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Book = require('../models/Book');

// FIXED: Robust JWT token decoding
const getUserIdFromToken = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('No token provided');
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔑 JWT Decoded payload:', decoded);
    
    // Try multiple possible field names (most common first)
    const userId = decoded.id || 
                   decoded._id || 
                   decoded.userId || 
                   decoded.user?._id || 
                   (decoded._doc && decoded._doc._id);
    
    console.log('👤 Extracted userId:', userId);
    return userId;
  } catch (err) {
    console.error('❌ JWT Verification Error:', err.message);
    return null;
  }
};

// FIXED: Better cart population with error handling
const populateCart = async (cart) => {
  if (!cart || cart.length === 0) {
    console.log('Empty cart, no population needed');
    return [];
  }

  console.log(`📚 Populating ${cart.length} cart items`);
  
  const populatedItems = await Promise.all(
    cart.map(async (item) => {
      try {
        const book = await Book.findById(item.book).lean();
        if (!book) {
          console.warn(`⚠️ Book not found for ID: ${item.book}`);
          return null;
        }
        return { 
          book: {
            ...book,
            stockStatus: book.quantity > 0 ? 'inStock' : 'outOfStock'
          }, 
          quantity: item.quantity 
        };
      } catch (err) {
        console.error(`❌ Error populating book ${item.book}:`, err);
        return null;
      }
    })
  );

  // Filter out null items (missing books)
  return populatedItems.filter(item => item !== null);
};

// 🛒 GET CART
const getCart = async (req, res) => {
  try {
    console.log('🛒 GET CART REQUEST');
    const userId = getUserIdFromToken(req);
    console.log('👤 User ID from token:', userId || 'GUEST');

    let cart = [];

    if (userId) {
      console.log('🔍 Fetching user from DB:', userId);
      const user = await User.findById(userId).select('cart').lean();
      
      if (!user) {
        console.error('❌ User not found:', userId);
        return res.status(404).json({ 
          message: 'User not found', 
          userId,
          debug: { tokenPresent: !!req.headers.authorization }
        });
      }
      
      console.log('✅ User found, cart length:', user.cart?.length || 0);
      cart = user.cart || [];
    } else {
      console.log('👻 Guest - using session cart');
      cart = req.session.cart || [];
    }

    console.log('📦 Raw cart items:', cart.length);
    const populatedCart = await populateCart(cart);
    console.log('✅ Populated cart:', populatedCart.length, 'items');
    
    // ✅ FIXED: Wrap in { cart: ... } to match frontend expectation
    res.json({ cart: populatedCart });
  } catch (error) {
    console.error('💥 getCart ERROR:', error);
    res.status(500).json({ 
      message: 'Failed to load cart', 
      error: error.message 
    });
  }
};

// ➕ ADD TO CART
const addToCart = async (req, res) => {
  const { bookId, quantity = 1 } = req.body;
  console.log('➕ ADD TO CART:', { bookId, quantity });

  if (!bookId || quantity < 1) {
    return res.status(400).json({ message: 'Invalid bookId or quantity' });
  }

  try {
    // Get book
    const book = await Book.findById(bookId).lean();
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    console.log('📖 Book found:', book.name, 'Stock:', book.quantity);

    const userId = getUserIdFromToken(req);
    let cart = [];
    let newQuantity;

    if (userId) {
      // LOGGED IN USER
      console.log('👤 Logged in user:', userId);
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found', userId });
      }

      const existingItemIndex = user.cart.findIndex(
        item => item.book.toString() === bookId
      );
      
      newQuantity = existingItemIndex > -1 
        ? user.cart[existingItemIndex].quantity + quantity 
        : quantity;

      console.log('📊 Stock check:', { 
        currentStock: book.quantity, 
        newTotal: newQuantity 
      });

      if (book.quantity < newQuantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }

      if (existingItemIndex > -1) {
        user.cart[existingItemIndex].quantity = newQuantity;
        console.log('🔄 Updated existing item');
      } else {
        user.cart.push({ book: bookId, quantity });
        console.log('➕ Added new item');
      }

      await user.save();
      console.log('💾 User saved successfully');
      cart = user.cart;

    } else {
      // GUEST
      console.log('👻 Guest cart');
      if (!req.session.cart) req.session.cart = [];
      
      const existingItemIndex = req.session.cart.findIndex(
        item => item.book.toString() === bookId
      );
      
      newQuantity = existingItemIndex > -1 
        ? req.session.cart[existingItemIndex].quantity + quantity 
        : quantity;

      if (book.quantity < newQuantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }

      if (existingItemIndex > -1) {
        req.session.cart[existingItemIndex].quantity = newQuantity;
      } else {
        req.session.cart.push({ book: bookId, quantity });
      }
      cart = req.session.cart;
    }

    const populatedCart = await populateCart(cart);
    console.log('✅ Added to cart successfully');
    res.json({ 
      message: 'Added to cart successfully', 
      cart: populatedCart 
    });

  } catch (error) {
    console.error('💥 addToCart ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// 🔄 UPDATE QUANTITY
const updateCartItem = async (req, res) => {
  const { bookId, quantity } = req.body;
  console.log('🔄 UPDATE CART:', { bookId, quantity });

  if (!bookId || quantity < 1) {
    return res.status(400).json({ message: 'Invalid bookId or quantity' });
  }

  try {
    const book = await Book.findById(bookId).lean();
    if (!book) return res.status(404).json({ message: 'Book not found' });

    if (book.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const userId = getUserIdFromToken(req);
    let cart = [];

    if (userId) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const itemIndex = user.cart.findIndex(
        item => item.book.toString() === bookId
      );
      
      if (itemIndex === -1) {
        return res.status(404).json({ message: 'Book not in cart' });
      }

      user.cart[itemIndex].quantity = quantity;
      await user.save();
      cart = user.cart;
      console.log('✅ Updated user cart item');

    } else {
      if (!req.session.cart) {
        return res.status(404).json({ message: 'Cart is empty' });
      }
      
      const itemIndex = req.session.cart.findIndex(
        item => item.book.toString() === bookId
      );
      
      if (itemIndex === -1) {
        return res.status(404).json({ message: 'Book not in cart' });
      }

      req.session.cart[itemIndex].quantity = quantity;
      cart = req.session.cart;
      console.log('✅ Updated guest cart item');
    }

    const populatedCart = await populateCart(cart);
    res.json({ 
      message: 'Cart item updated successfully', 
      cart: populatedCart 
    });

  } catch (error) {
    console.error('💥 updateCartItem ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// 🗑️ REMOVE FROM CART
const removeFromCart = async (req, res) => {
  const { bookId } = req.params;
  console.log('🗑️ REMOVE FROM CART:', bookId);

  if (!bookId) {
    return res.status(400).json({ message: 'Invalid bookId' });
  }

  try {
    const userId = getUserIdFromToken(req);
    let cart = [];

    if (userId) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const itemIndex = user.cart.findIndex(
        item => item.book.toString() === bookId
      );
      
      if (itemIndex === -1) {
        return res.status(404).json({ message: 'Book not in cart' });
      }

      user.cart.splice(itemIndex, 1);
      await user.save();
      cart = user.cart;
      console.log('✅ Removed from user cart');

    } else {
      if (!req.session.cart) {
        return res.status(404).json({ message: 'Cart is empty' });
      }
      
      const itemIndex = req.session.cart.findIndex(
        item => item.book.toString() === bookId
      );
      
      if (itemIndex === -1) {
        return res.status(404).json({ message: 'Book not in cart' });
      }

      req.session.cart.splice(itemIndex, 1);
      cart = req.session.cart;
      console.log('✅ Removed from guest cart');
    }

    const populatedCart = await populateCart(cart);
    res.json({ 
      message: 'Item removed from cart successfully', 
      cart: populatedCart 
    });

  } catch (error) {
    console.error('💥 removeFromCart ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// 🧹 CLEAR CART
const clearCart = async (req, res) => {
  console.log('🧹 CLEAR CART REQUEST');
  
  try {
    const userId = getUserIdFromToken(req);

    if (userId) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      user.cart = [];
      await user.save();
      console.log('✅ Cleared user cart');
    } else {
      req.session.cart = [];
      console.log('✅ Cleared guest cart');
    }

    res.json({ message: 'Cart cleared successfully', cart: [] });
  } catch (error) {
    console.error('💥 clearCart ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart  
};