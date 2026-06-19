const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../../db/database');
const routes = require('../../routes/review.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, '../../public')));

// Serve dynamic uploaded images
let userDataUploads;
if (process.versions.electron) {
  const { app: electronApp } = require('electron');
  const appInstance = electronApp || require('@electron/remote').app;
  userDataUploads = path.join(appInstance.getPath('userData'), 'uploads');
} else {
  // Safe fallback for testing outside Electron
  userDataUploads = path.join(__dirname, '../../public/uploads');
}
app.use('/uploads', express.static(userDataUploads));

// API routes
app.use('/api', routes);

// Fallback to discover.html for SPA routing
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/discover.html'));
});
app.get('/discover.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/discover.html'));
});
app.get('/reviews.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/reviews.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/discover.html'));
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/discover.html'));
});

let serverInstance;

async function startServer() {
  try {
    // Force SQLite mode for integration tests to avoid dependency on global MySQL service
    process.env.USE_SQLITE = 'true';
    process.env.DB_NAME = 'hutaboo_test';

    // Delete database file if it exists to ensure a clean test run
    const dbPath = path.join(process.cwd(), 'hutaboo_test.db');
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
        console.log('[E2E Server] Deleted old test database hutaboo_test.db');
      } catch (err) {
        console.warn('[E2E Server] Failed to delete test database file:', err.message);
      }
    }
    
    console.log('[E2E Server] Initializing test database...');
    await db.initialize();
    
    serverInstance = app.listen(PORT, '127.0.0.1', () => {
      console.log(`[E2E Server] Running at http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error('[E2E Server] Initialization failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
