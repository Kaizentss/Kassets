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

// Public QR code asset page
app.get('/qr/:code', (req, res) => {
  const asset = db.getAssetByQrCode(req.params.code);
  if (!asset) return res.status(404).send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Asset Not Found</title><style>body{font-family:-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}div{text-align:center;padding:40px}h1{color:#ffd700;margin-bottom:16px}p{color:#94a3b8}</style></head><body><div><h1>🪙 Kassets</h1><p>This QR code is not assigned to any asset.</p><p style="margin-top:20px;font-size:13px">Code: ' + req.params.code + '</p></div></body></html>');

  const photoUrl = asset.thumbnailPhotoId ? '/api/public/photo/' + asset.thumbnailPhotoId : '';
  const photosHtml = (asset.photos || []).map(p => '<img src="/api/public/photo/' + p.id + '" style="width:100%;max-width:400px;border-radius:12px;margin-bottom:12px" />').join('');

  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${asset.name} — Kassets</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23ffd700' stroke='%23d4a000' stroke-width='4'/%3E%3Ctext x='50' y='68' text-anchor='middle' font-size='52' font-weight='bold' fill='%23a07800' font-family='sans-serif'%3EK%3C/text%3E%3C/svg%3E" />
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:20px}
.card{background:rgba(30,41,59,0.8);border:1px solid rgba(148,163,184,0.15);border-radius:20px;max-width:500px;margin:0 auto;overflow:hidden}
.header{background:linear-gradient(135deg,#1e293b,#0f172a);padding:24px;text-align:center;border-bottom:1px solid rgba(148,163,184,0.1)}
.header h1{color:#ffd700;font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
.body{padding:24px}
.name{font-size:22px;font-weight:700;margin-bottom:16px}
.field{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(148,163,184,0.08);font-size:14px}
.field .label{color:#64748b}
.field .value{color:#e2e8f0;font-weight:500;text-align:right}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500}
.cat{background:rgba(59,130,246,0.2);color:#60a5fa}
.loc{background:rgba(34,197,94,0.2);color:#4ade80}
.photos{padding:24px;text-align:center}
.photos img{display:block;margin:0 auto 12px}
.footer{padding:16px 24px;text-align:center;font-size:11px;color:#475569;border-top:1px solid rgba(148,163,184,0.08)}
</style></head><body>
<div class="card">
  <div class="header"><h1>🪙 Kassets</h1><p style="font-size:11px;color:#64748b">Asset Management</p></div>
  <div class="body">
    <div class="name">${asset.name}</div>
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <span class="badge cat">${asset.category || 'Uncategorized'}</span>
      <span class="badge loc">${asset.location_name || 'Unknown'}</span>
    </div>
    ${asset.serial_number ? '<div class="field"><span class="label">Serial Number</span><span class="value">' + asset.serial_number + '</span></div>' : ''}
    ${asset.part_number ? '<div class="field"><span class="label">Part Number</span><span class="value">' + asset.part_number + '</span></div>' : ''}
    <div class="field"><span class="label">Quantity</span><span class="value">${asset.quantity}</span></div>
    ${asset.description ? '<div class="field" style="flex-direction:column;gap:8px"><span class="label">Description</span><span class="value" style="text-align:left;color:#94a3b8">' + asset.description + '</span></div>' : ''}
  </div>
  ${photosHtml ? '<div class="photos">' + photosHtml + '</div>' : ''}
  <div class="footer">Managed by Kassets — kassets.app</div>
</div>
</body></html>`);
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
