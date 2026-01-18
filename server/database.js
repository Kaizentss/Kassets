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
    role: 'admin',
    display_name: 'Administrator',
    created_at: new Date().toISOString()
  });
  saveDB(db);
}

// Helper to get next ID
const nextId = (arr) => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;

module.exports = {
  // Users
  getUsers: () => db.users.map(u => ({ ...u, password: undefined })),
  getUser: (id) => db.users.find(u => u.id === id),
  getUserByUsername: (username) => db.users.find(u => u.username === username),
  createUser: (userData) => {
    if (db.users.find(u => u.username === userData.username)) {
      throw new Error('Username already exists');
    }
    const newUser = {
      id: nextId(db.users),
      username: userData.username,
      password: bcrypt.hashSync(userData.password, 10),
      role: userData.role || 'viewer',
      display_name: userData.display_name || userData.username,
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDB(db);
    return { ...newUser, password: undefined };
  },
  updateUser: (id, updates) => {
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found');
    if (updates.password) {
      updates.password = bcrypt.hashSync(updates.password, 10);
    }
    db.users[idx] = { ...db.users[idx], ...updates };
    saveDB(db);
    return { ...db.users[idx], password: undefined };
  },
  deleteUser: (id) => {
    const user = db.users.find(u => u.id === id);
    if (user?.username === 'admin') throw new Error('Cannot delete admin');
    db.users = db.users.filter(u => u.id !== id);
    saveDB(db);
  },
  verifyPassword: (user, password) => bcrypt.compareSync(password, user.password),

  // Locations
  getLocations: () => db.locations,
  getLocation: (id) => db.locations.find(l => l.id === id),
  createLocation: (data) => {
    const newLoc = {
      id: nextId(db.locations),
      name: data.name,
      address: data.address || '',
      created_at: new Date().toISOString()
    };
    db.locations.push(newLoc);
    saveDB(db);
    return newLoc;
  },
  updateLocation: (id, updates) => {
    const idx = db.locations.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('Location not found');
    db.locations[idx] = { ...db.locations[idx], ...updates };
    saveDB(db);
    return db.locations[idx];
  },
  deleteLocation: (id) => {
    const assetsAtLocation = db.assets.filter(a => a.location_id === id);
    if (assetsAtLocation.length > 0) {
      throw new Error(`Cannot delete: ${assetsAtLocation.length} assets at this location`);
    }
    db.locations = db.locations.filter(l => l.id !== id);
    saveDB(db);
  },

  // Assets
  getAssets: () => {
    return db.assets.map(a => ({
      ...a,
      photos: (db.photos || []).filter(p => p.asset_id === a.id),
      notes: (db.notes || []).filter(n => n.asset_id === a.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }));
  },
  getAsset: (id) => db.assets.find(a => a.id === id),
  createAsset: (data) => {
    const newAsset = {
      id: nextId(db.assets),
      name: data.name,
      category: data.category || '',
      serial_number: data.serial_number || '',
      part_number: data.part_number || '',
      description: data.description || '',
      purchase_date: data.purchase_date || null,
      purchase_cost: data.purchase_cost || 0,
      current_value: data.current_value || 0,
      quantity: data.quantity || 1,
      depreciation_rate: data.depreciation_rate || 10,
      location_id: data.location_id || null,
      created_at: new Date().toISOString()
    };
    db.assets.push(newAsset);
    saveDB(db);
    return newAsset;
  },
  updateAsset: (id, updates) => {
    const idx = db.assets.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Asset not found');
    db.assets[idx] = { ...db.assets[idx], ...updates };
    saveDB(db);
    return db.assets[idx];
  },
  deleteAsset: (id) => {
    db.assets = db.assets.filter(a => a.id !== id);
    db.photos = (db.photos || []).filter(p => p.asset_id !== id);
    db.notes = (db.notes || []).filter(n => n.asset_id !== id);
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
  deleteCategory: (id) => {
    const cat = db.categories.find(c => c.id === id);
    if (!cat) throw new Error('Not found');
    const count = db.assets.filter(a => a.category === cat.name).length;
    if (count > 0) throw new Error(`${count} assets use this category`);
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
    if (!db.photos) db.photos = [];
    const photo = {
      id: nextId(db.photos),
      asset_id: assetId,
      url,
      name: name || 'Photo',
      created_at: new Date().toISOString()
    };
    db.photos.push(photo);
    saveDB(db);
    return photo;
  },
  deletePhoto: (photoId) => {
    db.photos = (db.photos || []).filter(p => p.id !== photoId);
    saveDB(db);
  },
  getPhotos: (assetId) => (db.photos || []).filter(p => p.asset_id === assetId),

  // Notes
  addNote: (assetId, content, author) => {
    if (!db.notes) db.notes = [];
    const note = {
      id: nextId(db.notes),
      asset_id: assetId,
      content,
      author: author || 'System',
      created_at: new Date().toISOString()
    };
    db.notes.push(note);
    saveDB(db);
    return note;
  },
  deleteNote: (noteId) => {
    db.notes = (db.notes || []).filter(n => n.id !== noteId);
    saveDB(db);
  },
  getNotes: (assetId) => (db.notes || []).filter(n => n.asset_id === assetId)
};
