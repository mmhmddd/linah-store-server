require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth.routes');
const bookRoutes = require('./src/routes/book.routes');
const cartRoutes = require('./src/routes/cart.routes');
const favoritesRoutes = require('./src/routes/favorites.routes');
const orderRoutes = require('./src/routes/order.routes');
const path = require('path');

const app = express();

const allowedOrigins = [
  'https://linah-store.vercel.app',
  'http://localhost:4200'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const isProd = process.env.NODE_ENV === 'production';

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Timeout
app.use((req, res, next) => {
  res.setTimeout(10000, () => {
    console.error(`Timeout: ${req.method} ${req.url}`);
    res.status(408).json({ message: 'Request timed out' });
  });
  next();
});

// Database
connectDB().catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Static Uploads
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/orders', orderRoutes);

// === Serve Frontend (Production) ===
if (isProd) {
  const clientPath = path.join(__dirname, 'client', 'dist', 'linah-store');
  app.use(express.static(clientPath));

  // صحيح: app.all لـ SPA
  app.all('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Health Check
app.get('/', (req, res) => {
  res.send('LinaStore API is alive');
});

// === 404 for API Routes Only ===
app.all('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Route not found' });
  }
  // للـ SPA، لا تُرسل 404
  if (isProd) {
    const clientPath = path.join(__dirname, 'client', 'dist', 'linah-store');
    return res.sendFile(path.join(clientPath, 'index.html'));
  }
  res.status(404).send('Not found');
});

// === Global Error Handler ===
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
  });
});

// === Start Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${isProd ? 'PROD' : 'DEV'})`);
});