# 🪙 KASSETS - Multi-User Asset Management System

A complete web application for managing company assets with user authentication, role-based access control, and team collaboration.

## ✨ Features

- **User Authentication** - Secure login system with JWT tokens
- **Role-Based Access Control**
  - **Admin** - Full access: manage users, edit everything
  - **Editor** - Can add/edit/delete assets, locations, categories
  - **Viewer** - Read-only access to view assets and reports
- **Asset Management** - Track equipment, furniture, vehicles, etc.
- **Multiple Locations** - Organize assets by location
- **Photo Uploads** - Attach photos to assets (with fullscreen preview)
- **Notes System** - Add timestamped notes to assets
- **Bulk Operations** - Select multiple assets to move or delete
- **Balance Sheet** - Generate printable reports
- **Company Branding** - Customize with your company name

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm

### Installation

```bash
# 1. Navigate to the project folder
cd kassets-web

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

### Access
Open **http://localhost:3001** in your browser

**Default Login:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change the admin password after first login!**

---

## 🌐 Deploy to the Internet

### Option 1: Railway (Recommended - Free)

1. Sign up at https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Upload or connect your repo
4. Railway auto-detects Node.js and deploys
5. Get your public URL!

### Option 2: Render (Free)

1. Sign up at https://render.com
2. New → Web Service
3. Connect GitHub or upload files
4. Build Command: `npm install`
5. Start Command: `npm start`

### Option 3: DigitalOcean/AWS/VPS

```bash
# On your server:
git clone <your-repo>
cd kassets-web
npm install
npm start

# For production, use PM2:
npm install -g pm2
pm2 start server/index.js --name kassets
pm2 save
```

---

## 👥 Managing Users

1. Log in as admin
2. Click **"Users"** button in header
3. Click **"+ Add"** to create new users
4. Set their role:
   - **Viewer** - Can only view assets (read-only)
   - **Editor** - Can add/edit/delete assets
   - **Admin** - Full access including user management

---

## 📁 Project Structure

```
kassets-web/
├── server/
│   ├── index.js        # Express server
│   ├── database.js     # SQLite setup
│   ├── routes.js       # All API endpoints
│   └── middleware/
│       └── auth.js     # JWT authentication
├── client/
│   └── index.html      # Complete React frontend
├── database/
│   └── kassets.db      # SQLite database (auto-created)
├── package.json
└── .env
```

---

## 🔒 Security

- Passwords are hashed with bcrypt
- JWT tokens for authentication
- Role-based access control on all API endpoints

**For production:**
1. Change `JWT_SECRET` in `.env` to a random string
2. Change the default admin password immediately
3. Use HTTPS (free with Let's Encrypt)

---

## 📱 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | - | Login |
| GET | /api/auth/me | ✓ | Get current user |
| GET | /api/users | Admin | List users |
| POST | /api/users | Admin | Create user |
| GET | /api/assets | ✓ | List assets |
| POST | /api/assets | Editor | Create asset |
| PUT | /api/assets/:id | Editor | Update asset |
| DELETE | /api/assets/:id | Editor | Delete asset |
| GET | /api/locations | ✓ | List locations |
| GET | /api/categories | ✓ | List categories |
| GET | /api/settings | ✓ | Get settings |

---

## 🆘 Troubleshooting

**"Cannot connect to database"**
- The database auto-creates in `./database/kassets.db`
- Make sure the folder has write permissions

**"Invalid token" after login**
- Clear browser localStorage
- Try logging in again

**Reset admin password:**
```bash
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('./database/kassets.db');
db.prepare('UPDATE users SET password = ? WHERE username = ?')
  .run(bcrypt.hashSync('newpassword', 10), 'admin');
console.log('Password reset to: newpassword');
"
```

---

## 📄 License

MIT - Free for personal and commercial use.
