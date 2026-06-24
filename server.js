const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase, queryAll, queryGet, queryRun, saveDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Uploads dir: use DATA_DIR env on server, fallback to public/uploads locally
const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// When DATA_DIR is set (production), serve uploads from there
if (process.env.DATA_DIR) {
  app.use('/uploads', express.static(uploadsDir));
}

// Start server after async DB init
async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Database initialized');

    const dbHelpers = { queryAll, queryGet, queryRun };

    // API Routes
    const createAuthRouter = require('./routes/auth');
    const createDevicesRouter = require('./routes/devices');
    const createInstallationsRouter = require('./routes/installations');
    const createAnalyticsRouter = require('./routes/analytics');

    app.use('/api/auth', createAuthRouter(dbHelpers));
    app.use('/api/devices', createDevicesRouter(dbHelpers));
    app.use('/api/installations', createInstallationsRouter(dbHelpers));
    app.use('/api/analytics', createAnalyticsRouter(dbHelpers));

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
      }
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    app.listen(PORT, () => {
      console.log(`🔆 Solar Tracker Dashboard running at http://localhost:${PORT}`);
    });

    // Save database on process exit
    process.on('SIGINT', () => {
      console.log('\n💾 Saving database...');
      saveDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      saveDatabase();
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
