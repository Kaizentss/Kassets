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
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api', require('./routes')(db));

// PWA Manifest
app.get('/manifest.json', (req, res) => {
  res.json({
    name: 'Kassets',
    short_name: 'Kassets',
    description: 'Multi-Company Asset Management',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      { src: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ccircle cx=%2750%27 cy=%2750%27 r=%2748%27 fill=%27%23ffd700%27 stroke=%27%23d4a000%27 stroke-width=%274%27/%3E%3Ctext x=%2750%27 y=%2768%27 text-anchor=%27middle%27 font-size=%2752%27 font-weight=%27bold%27 fill=%27%23a07800%27 font-family=%27sans-serif%27%3EK%3C/text%3E%3C/svg%3E', sizes: '192x192', type: 'image/svg+xml' }
    ]
  });
});

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
║   🪙  KASSETS — Multi-Company Asset Management             ║
║   🌐  https://kassets.app                                  ║
║                                                            ║
║   Local:   http://localhost:${PORT}                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});