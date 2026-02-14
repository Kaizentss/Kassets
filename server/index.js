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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// API Routes
app.use('/api', require('./routes')(db));

// Serve the React app (embedded as a single HTML file)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🪙  KASSETS 2.0 - Multi-Company Asset Management         ║
║                                                            ║
║   🌐 Local:     http://localhost:${PORT}                      ║
║   🌐 Network:   http://0.0.0.0:${PORT}                        ║
║                                                            ║
║   📡 Tailscale: Use your Tailscale IP:${PORT}                 ║
║                                                            ║
║   🔑 Super Admin: superadmin / super123                    ║
║                                                            ║
║   ⚠️  Change password after first login!                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
