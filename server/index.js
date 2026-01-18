require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Database
const db = require('./database');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Routes
app.use('/api', require('./routes')(db));

// Serve the React app (embedded as a single HTML file)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🪙  KASSETS - Asset Management System                    ║
║                                                            ║
║   🌐 Open: http://localhost:${PORT}                          ║
║                                                            ║
║   👤 Login: admin / admin123                               ║
║                                                            ║
║   ⚠️  Change password after first login!                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
