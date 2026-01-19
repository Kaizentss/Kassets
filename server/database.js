const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Use Render disk if available, otherwise use local database folder
const RENDER_DISK_PATH = '/opt/render/project/src/database';
const LOCAL_DB_PATH = path.join(__dirname, '..', 'database');
const DB_DIR = fs.existsSync(RENDER_DISK_PATH) ? RENDER_DISK_PATH : LOCAL_DB_PATH;
const DB_PATH = path.join(DB_DIR, 'data.json');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Default data structure
const defaultData = {
  users: [],
  assets: [],
  locations: [],
  categories: [],
  settings: { company_name: '' },
  photos: [],
  notes: []
};

// Load or create database
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      return { ...defaultData, ...data };
    }
  } catch (e) {
    console.log('Creating new database...');
  }
  return { ...defaultData };
}

// Save database
function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Initialize database
let db = loadDB();

// Create admin if not exists
if (!db.users.find(u => u.username === 'admin')) {
  db.users.push({
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    display_name: 'Administrator',
    email: '',
    role: 'admin',
    is_active: 1,
    created_at: new Date().toISOString()
  });
  console.log('✅ Admin user created (admin / admin123)');
}

// Create default categories
const defaultCategories = ['Equipment', 'Furniture', 'Vehicles', 'Electronics', 'Machinery', 'Real Estate', 'Inventory', 'Other'];
defaultCategories.forEach((name, i) => {
  if (!db.categories.find(c => c.name === name)) {
    db.categories.push({ id: i + 1, name });
  }
});

// Create default locations
if (db.locations.length === 0) {
  db.locations = [
    { id: 1, name: 'Main Office', address: '123 Business St', created_at: new Date().toISOString() },
    { id: 2, name: 'Warehouse A', address: '456 Industrial Ave', created_at: new Date().toISOString() },
    { id: 3, name: 'Remote Site', address: '789 Field Rd', created_at: new Date().toISOString() }
  ];
}

saveDB(db);
console.log('✅ Database ready');

// Helper to get next ID
function nextId(array) {
  return array.length > 0 ? Math.max(...array.map(x => x.id)) + 1 : 1;
}

// Database interface
module.exports = {
  // Users
  getUser: (username) => db.users.find(u => u.username === username && u.is_active),
  getUserById: (id) => db.users.find(u => u.id === id),
  getUsers: () => db.users.map(({ password, ...u }) => u),
  createUser: (user) => {
    const newUser = { id: nextId(db.users), ...user, created_at: new Date().toISOString() };
    db.users.push(newUser);
    saveDB(db);
    return newUser;
  },
  updateUser: (id, data) => {
    const idx = db.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      db.users[idx] = { ...db.users[idx], ...data };
      saveDB(db);
    }
  },
  deleteUser: (id) => {
    db.users = db.users.filter(u => u.id !== id);
    saveDB(db);
  },

  // Assets
  getAssets: () => {
    return db.assets.map(a => ({
      ...a,
      location_name: db.locations.find(l => l.id === a.location_id)?.name || 'Unknown',
      photos: db.photos.filter(p => p.asset_id === a.id),
      notes: db.notes.filter(n => n.asset_id === a.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }));
  },
  getAsset: (id) => db.assets.find(a => a.id === id),
  createAsset: (asset) => {
    const newAsset = { id: nextId(db.assets), ...asset, created_at: new Date().toISOString() };
    db.assets.push(newAsset);
    saveDB(db);
    return newAsset;
  },
  updateAsset: (id, data) => {
    const idx = db.assets.findIndex(a => a.id === id);
    if (idx !== -1) {
      db.assets[idx] = { ...db.assets[idx], ...data };
      saveDB(db);
    }
  },
  deleteAsset: (id) => {
    db.assets = db.assets.filter(a => a.id !== id);
    db.photos = db.photos.filter(p => p.asset_id !== id);
    db.notes = db.notes.filter(n => n.asset_id !== id);
    saveDB(db);
  },

  // Locations
  getLocations: () => {
    return db.locations.map(l => ({
      ...l,
      asset_count: db.assets.filter(a => a.location_id === l.id).length,
      total_value: db.assets.filter(a => a.location_id === l.id).reduce((sum, a) => sum + (a.current_value || 0) * (a.quantity || 1), 0)
    }));
  },
  createLocation: (loc) => {
    const newLoc = { id: nextId(db.locations), ...loc, created_at: new Date().toISOString() };
    db.locations.push(newLoc);
    saveDB(db);
    return newLoc;
  },
  updateLocation: (id, data) => {
    const idx = db.locations.findIndex(l => l.id === id);
    if (idx !== -1) {
      db.locations[idx] = { ...db.locations[idx], ...data };
      saveDB(db);
    }
  },
  deleteLocation: (id) => {
    const count = db.assets.filter(a => a.location_id === id).length;
    if (count > 0) throw new Error(`${count} assets in this location`);
    db.locations = db.locations.filter(l => l.id !== id);
    saveDB(db);
  },

  // Categories
  getCategories: () => {
    return db.categories.map(c => ({
      ...c,
      asset_count: db.assets.filter(a => a.category === c.name).length
    }));
  },
  createCategory: (name) => {
    if (db.categories.find(c => c.name === name)) throw new Error('Category exists');
    const newCat = { id: nextId(db.categories), name };
    db.categories.push(newCat);
    saveDB(db);
    return newCat;
  },
  renameCategory: (oldName, newName) => {
    if (db.categories.find(c => c.name === newName)) throw new Error('Category name already exists');
    const cat = db.categories.find(c => c.name === oldName);
    if (!cat) throw new Error('Category not found');
    // Update category name
    cat.name = newName;
    // Update all assets with this category
    db.assets.forEach(a => {
      if (a.category === oldName) {
        a.category = newName;
      }
    });
    saveDB(db);
  },
  deleteCategory: (id, force = false) => {
    const cat = db.categories.find(c => c.id === id);
    if (!cat) throw new Error('Not found');
    const assetsWithCat = db.assets.filter(a => a.category === cat.name);
    const count = assetsWithCat.length;
    if (count > 0 && !force) {
      const assetNames = assetsWithCat.slice(0, 3).map(a => a.name).join(', ');
      throw new Error(`${count} assets use this category: ${assetNames}${count > 3 ? '...' : ''}`);
    }
    // If force or no assets, reassign assets to "Other" and delete
    if (count > 0 && force) {
      assetsWithCat.forEach(a => a.category = 'Other');
    }
    db.categories = db.categories.filter(c => c.id !== id);
    saveDB(db);
  },

  // Settings
  getSettings: () => db.settings,
  updateSettings: (data) => {
    db.settings = { ...db.settings, ...data };
    saveDB(db);
  },

  // Photos
  addPhoto: (assetId, url, name) => {
    const photo = { id: nextId(db.photos), asset_id: assetId, url, name, created_at: new Date().toISOString() };
    db.photos.push(photo);
    saveDB(db);
    return photo;
  },
  deletePhoto: (id) => {
    db.photos = db.photos.filter(p => p.id !== id);
    saveDB(db);
  },

  // Notes
  addNote: (assetId, text, createdBy) => {
    const note = { id: nextId(db.notes), asset_id: assetId, text, created_by: createdBy, created_at: new Date().toISOString() };
    db.notes.push(note);
    saveDB(db);
    return note;
  },
  deleteNote: (id) => {
    db.notes = db.notes.filter(n => n.id !== id);
    saveDB(db);
  },

  // Get location by ID
  getLocation: (id) => db.locations.find(l => l.id === id)
};
