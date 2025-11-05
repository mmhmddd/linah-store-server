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
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,                 // <-- important for cookies
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
      secure: isProd,               // true only on HTTPS
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax', // cross-site in prod
      maxAge: 24 * 60 * 60 * 1000, // 24 h
    },
  })
);

app.use((req, res, next) => {
  res.setTimeout(10000, () => {
    console.error(`Timeout: ${req.method} ${req.url}`);
    res.status(408).json({ message: 'Request timed out' });
  });
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

connectDB().catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/orders', orderRoutes);

if (isProd) {
  const clientPath = path.join(__dirname, 'client', 'dist', 'linah-store'); // <-- adjust if needed

  app.use(express.static(clientPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

app.get('/', (req, res) => {
  res.send('LinaStore API is alive');
});


app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${isProd ? 'PROD' : 'DEV'})`);
});