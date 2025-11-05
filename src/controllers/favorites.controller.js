// controllers/favorites.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Book = require('../models/Book');

// Reuse the same JWT helper from cart
const getUserIdFromToken = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('No token provided');
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

// 🧡 POPULATE FAVORITES (similar to cart population)
const populateFavorites = async (favorites) => {
  if (!favorites || favorites.length === 0) {
    console.log('Empty favorites, no population needed');
    return [];
  }

  console.log(`❤️ Populating ${favorites.length} favorite items`);
  
  const populatedItems = await Promise.all(
    favorites.map(async (item) => {
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
          } 
        };
      } catch (err) {
        console.error(`❌ Error populating book ${item.book}:`, err);
        return null;
      }
    })
  );

  return populatedItems.filter(item => item !== null);
};

// ❤️ GET FAVORITES
const getFavorites = async (req, res) => {
  try {
    console.log('❤️ GET FAVORITES REQUEST');
    const userId = getUserIdFromToken(req);
    console.log('👤 User ID from token:', userId || 'GUEST');

    let favorites = [];

    if (userId) {
      // LOGGED IN USER
      console.log('🔍 Fetching user favorites from DB:', userId);
      const user = await User.findById(userId).select('favorites').lean();
      
      if (!user) {
        console.error('❌ User not found:', userId);
        return res.status(404).json({ 
          message: 'User not found', 
          userId,
          debug: { tokenPresent: !!req.headers.authorization }
        });
      }
      
      console.log('✅ User found, favorites length:', user.favorites?.length || 0);
      favorites = user.favorites || [];
    } else {
      // GUEST - LOCAL STORAGE SIMULATION
      console.log('👻 Guest - using session favorites');
      favorites = req.session.favorites || [];
    }

    console.log('💖 Raw favorites:', favorites.length);
    const populatedFavorites = await populateFavorites(favorites);
    console.log('✅ Populated favorites:', populatedFavorites.length, 'items');
    
    res.json({ favorites: populatedFavorites });
  } catch (error) {
    console.error('💥 getFavorites ERROR:', error);
    res.status(500).json({ 
      message: 'Failed to load favorites', 
      error: error.message 
    });
  }
};

// ➕ ADD TO FAVORITES
const addToFavorites = async (req, res) => {
  const { bookId } = req.body;
  console.log('➕ ADD TO FAVORITES:', { bookId });

  if (!bookId) {
    return res.status(400).json({ message: 'Invalid bookId' });
  }

  try {
    // Get book
    const book = await Book.findById(bookId).lean();
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    console.log('📖 Book found:', book.name);

    const userId = getUserIdFromToken(req);
    let favorites = [];
    let isAdded = false;

    if (userId) {
      // LOGGED IN USER
      console.log('👤 Logged in user:', userId);
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found', userId });
      }

      // Check if already in favorites
      const existingItemIndex = user.favorites.findIndex(
        item => item.book.toString() === bookId
      );

      if (existingItemIndex === -1) {
        // Add new favorite
        user.favorites.push({ book: bookId });
        isAdded = true;
        console.log('➕ Added new favorite');
      } else {
        console.log('ℹ️ Book already in favorites');
        isAdded = false;
      }

      await user.save();
      console.log('💾 User saved successfully');
      favorites = user.favorites;

    } else {
      // GUEST
      console.log('👻 Guest favorites');
      if (!req.session.favorites) req.session.favorites = [];
      
      const existingItemIndex = req.session.favorites.findIndex(
        item => item.book.toString() === bookId
      );
      
      if (existingItemIndex === -1) {
        req.session.favorites.push({ book: bookId });
        isAdded = true;
        console.log('➕ Added to guest favorites');
      } else {
        console.log('ℹ️ Book already in guest favorites');
        isAdded = false;
      }
      favorites = req.session.favorites;
    }

    const populatedFavorites = await populateFavorites(favorites);
    console.log('✅ Add to favorites completed');
    
    res.json({ 
      message: isAdded ? 'Added to favorites successfully' : 'Already in favorites',
      isAdded,
      favorites: populatedFavorites 
    });

  } catch (error) {
    console.error('💥 addToFavorites ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// 🗑️ REMOVE FROM FAVORITES
const removeFromFavorites = async (req, res) => {
  const { bookId } = req.params;
  console.log('🗑️ REMOVE FROM FAVORITES:', bookId);

  if (!bookId) {
    return res.status(400).json({ message: 'Invalid bookId' });
  }

  try {
    const userId = getUserIdFromToken(req);
    let favorites = [];
    let isRemoved = false;

    if (userId) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const itemIndex = user.favorites.findIndex(
        item => item.book.toString() === bookId
      );
      
      if (itemIndex > -1) {
        user.favorites.splice(itemIndex, 1);
        isRemoved = true;
        console.log('✅ Removed from user favorites');
      }

      await user.save();
      favorites = user.favorites;

    } else {
      if (!req.session.favorites) {
        return res.status(404).json({ message: 'Favorites is empty' });
      }
      
      const itemIndex = req.session.favorites.findIndex(
        item => item.book.toString() === bookId
      );
      
      if (itemIndex > -1) {
        req.session.favorites.splice(itemIndex, 1);
        isRemoved = true;
        console.log('✅ Removed from guest favorites');
      }
      
      favorites = req.session.favorites;
    }

    const populatedFavorites = await populateFavorites(favorites);
    res.json({ 
      message: isRemoved ? 'Removed from favorites successfully' : 'Not in favorites',
      isRemoved,
      favorites: populatedFavorites 
    });

  } catch (error) {
    console.error('💥 removeFromFavorites ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// 🧹 CLEAR FAVORITES
const clearFavorites = async (req, res) => {
  console.log('🧹 CLEAR FAVORITES REQUEST');
  
  try {
    const userId = getUserIdFromToken(req);

    if (userId) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      user.favorites = [];
      await user.save();
      console.log('✅ Cleared user favorites');
    } else {
      req.session.favorites = [];
      console.log('✅ Cleared guest favorites');
    }

    res.json({ message: 'Favorites cleared successfully', favorites: [] });
  } catch (error) {
    console.error('💥 clearFavorites ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  getFavorites, 
  addToFavorites, 
  removeFromFavorites, 
  clearFavorites 
};