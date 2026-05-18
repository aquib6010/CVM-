/**
 * VIRTUAL-LAB Server — Main entry point.
 * Express + Socket.IO + MongoDB
 */
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const { setupSocket } = require('./socket');
const authRoutes = require('./routes/auth');
const experimentRoutes = require('./routes/experiments');

// ─── Initialize ──────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      /^http:\/\/localhost:\d+$/,   // Any localhost port (dev)
      /\.vercel\.app$/,
      /\.railway\.app$/,
      /\.onrender\.com$/,
    ];
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowed.some(o => o.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging (dev) ──────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/experiments', experimentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'virtual-lab-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  res.status(500).json({
    message: 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

// ─── Socket.IO ──────────────────────────────────────────────────
setupSocket(server);

// ─── Start ──────────────────────────────────────────────────────
async function start() {
  // Connect to MongoDB
  await connectDB();

  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║          VIRTUAL-LAB Backend Server          ║
║──────────────────────────────────────────────║
║  HTTP:     http://localhost:${PORT}             ║
║  Socket:   ws://localhost:${PORT}               ║
║  Env:      ${process.env.NODE_ENV || 'development'}                    ║
╚══════════════════════════════════════════════╝
    `);
  });
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
