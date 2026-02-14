const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// ==================== FILE PATHS ====================
const DB_DIR = path.join(__dirname, '..', 'database');
const COMPANIES_DIR = path.join(DB_DIR, 'companies');
const PLATFORM_PATH = path.join(DB_DIR, 'platform.json');

// Ensure directories exist
[DB_DIR, COMPANIES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ==================== SLUG HELPER ====================
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ==================== PLATFORM DATA (users + companies list) ====================
const defaultPlatform = {
  users: [],
  companies: []
};

function loadPlatform() {
  try {
    if (fs.existsSync(PLATFORM_PATH)) {
      const data = JSON.parse(fs.readFileSync(PLATFORM_PATH, 'utf8'));
      return { ...defaultPlatform, ...data };
    }
  } catch (e) {
    console.log('Creating new platform database...');
  }
  return { ...defaultPlatform };
}

function savePlatform() {
  fs.writeFileSync(PLATFORM_PATH, JSON.stringify(platform, null, 2));
}

let platform = loadPlatform();

// ==================== COMPANY DATA (per-company JSON files) ====================
const defaultCompanyData = {
  assets: [],
  locations: [],
  categories: [],
  settings: [],
  photos: [],
  notes: []
};

// Cache of loaded company data: { companyId: { data, slug } }
const companyCache = {};

function getCompanyFilePath(slug) {
  return path.join(COMPANIES_DIR, `${slug}.json`);
}

function loadCompanyData(companyId) {
  // Return from cache if available
  if (companyCache[companyId]) return companyCache[companyId].data;

  const company = platform.companies.find(c => c.id === companyId);
  if (!company) return { ...defaultCompanyData };

  const slug = company.slug || slugify(company.name);
  const filePath = getCompanyFilePath(slug);

  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      companyCache[companyId] = { data: { ...defaultCompanyData, ...data }, slug };
      return companyCache[companyId].data;
    }
  } catch (e) {
    console.log(`Creating new database for company: ${company.name}`);
  }

  const freshData = { ...defaultCompanyData, assets: [], locations: [], categories: [], settings: [], photos: [], notes: [] };
  companyCache[companyId] = { data: freshData, slug };
  return freshData;
}

function saveCompanyData(companyId) {
  const company = platform.companies.find(c => c.id === companyId);
  if (!company) return;

  const slug = company.slug || slugify(company.name);
  const filePath = getCompanyFilePath(slug);
  const data = companyCache[companyId]?.data;
  if (data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

// ==================== ID HELPERS ====================
function nextId(array) {
  return array.length > 0 ? Math.max(...array.map(x => x.id)) + 1 : 1;
}

// Global ID counters across all companies (to keep IDs unique platform-wide)
function nextGlobalId(type) {
  // Gather IDs across all company files + platform
  let maxId = 0;

  // Check all loaded company caches
  for (const cid of Object.keys(companyCache)) {
    const data = companyCache[cid].data;
    if (data[type]) {
      const ids = data[type].map(x => x.id);
      if (ids.length > 0) maxId = Math.max(maxId, ...ids);
    }
  }

  // Also scan all company files on disk (for companies not yet in cache)
  try {
    const files = fs.readdirSync(COMPANIES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(COMPANIES_DIR, file), 'utf8'));
        if (data[type]) {
          const ids = data[type].map(x => x.id);
          if (ids.length > 0) maxId = Math.max(maxId, ...ids);
        }
      } catch (e) { /* skip corrupt files */ }
    }
  } catch (e) { /* directory might not exist yet */ }

  return maxId + 1;
}

// ==================== MIGRATION: Import existing data.json ====================
function migrateFromSingleFile() {
  const oldPath = path.join(DB_DIR, 'data.json');
  if (!fs.existsSync(oldPath)) return false;

  console.log('🔄 Migrating from single data.json to per-company files...');

  try {
    const oldData = JSON.parse(fs.readFileSync(oldPath, 'utf8'));

    // Migrate platform data (users + companies)
    platform.users = oldData.users || [];
    platform.companies = oldData.companies || [];
    savePlatform();

    // Migrate each company's data into its own file
    for (const company of platform.companies) {
      const slug = company.slug || slugify(company.name);
      company.slug = slug; // ensure slug is set

      const companyData = {
        assets: (oldData.assets || []).filter(a => a.company_id === company.id),
        locations: (oldData.locations || []).filter(l => l.company_id === company.id),
        categories: (oldData.categories || []).filter(c => c.company_id === company.id),
        settings: (oldData.settings || []).filter(s => s.company_id === company.id),
        photos: [],
        notes: []
      };

      // Migrate photos and notes that belong to this company's assets
      const assetIds = new Set(companyData.assets.map(a => a.id));
      companyData.photos = (oldData.photos || []).filter(p => assetIds.has(p.asset_id));
      companyData.notes = (oldData.notes || []).filter(n => assetIds.has(n.asset_id));

      const filePath = getCompanyFilePath(slug);
      fs.writeFileSync(filePath, JSON.stringify(companyData, null, 2));
      console.log(`  ✅ Migrated: ${company.name} → ${slug}.json (${companyData.assets.length} assets, ${companyData.locations.length} locations)`);
    }

    // Save updated platform with slugs
    savePlatform();

    // Rename old file as backup
    const backupPath = path.join(DB_DIR, 'data.json.backup');
    fs.renameSync(oldPath, backupPath);
    console.log(`  📦 Original data.json backed up to data.json.backup`);
    console.log('✅ Migration complete!\n');

    // Reload platform
    platform = loadPlatform();
    return true;
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    return false;
  }
}

// Run migration if old file exists
migrateFromSingleFile();

// ==================== CREATE SUPER ADMIN ====================
if (!platform.users.find(u => u.username === 'superadmin')) {
  platform.users.push({
    id: nextId(platform.users),
    username: 'superadmin',
    password: bcrypt.hashSync('super123', 10),
    display_name: 'Super Administrator',
    email: '',
    role: 'super_admin',
    company_id: null,
    is_active: 1,
    created_at: new Date().toISOString()
  });
  console.log('✅ Super Admin created (superadmin / super123)');
}

savePlatform();
console.log('✅ Platform database ready');

// List company files
try {
  const files = fs.readdirSync(COMPANIES_DIR).filter(f => f.endsWith('.json'));
  if (files.length > 0) {
    console.log(`📂 Company databases: ${files.join(', ')}`);
  }
} catch (e) { /* ignore */ }

// ==================== DATABASE INTERFACE ====================

module.exports = {
  // ========== COMPANIES ==========
  getCompanies: () => platform.companies,
  getCompany: (id) => platform.companies.find(c => c.id === id),
  createCompany: (company) => {
    const slug = slugify(company.name);

    // Check for duplicate slug
    if (platform.companies.find(c => c.slug === slug)) {
      throw new Error('A company with a similar name already exists');
    }

    const newCompany = {
      id: nextId(platform.companies),
      name: company.name,
      slug,
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      is_active: 1,
      created_at: new Date().toISOString()
    };
    platform.companies.push(newCompany);
    savePlatform();

    // Initialize company data file
    const companyData = {
      assets: [],
      locations: [{
        id: 1,
        company_id: newCompany.id,
        name: 'Main Office',
        address: company.address || '',
        created_at: new Date().toISOString()
      }],
      categories: ['Equipment', 'Furniture', 'Vehicles', 'Electronics', 'Machinery', 'Real Estate', 'Inventory', 'Other'].map((name, i) => ({
        id: i + 1,
        company_id: newCompany.id,
        name
      })),
      settings: [{
        id: 1,
        company_id: newCompany.id,
        company_name: newCompany.name
      }],
      photos: [],
      notes: []
    };

    companyCache[newCompany.id] = { data: companyData, slug };
    saveCompanyData(newCompany.id);

    console.log(`📂 Created company database: ${slug}.json`);
    return newCompany;
  },
  updateCompany: (id, data) => {
    const idx = platform.companies.findIndex(c => c.id === id);
    if (idx === -1) return;

    const oldSlug = platform.companies[idx].slug;
    const nameChanged = data.name && data.name !== platform.companies[idx].name;

    platform.companies[idx] = { ...platform.companies[idx], ...data };

    // If name changed, rename the company file
    if (nameChanged) {
      const newSlug = slugify(data.name);

      // Check for duplicate slug
      if (platform.companies.find((c, i) => i !== idx && c.slug === newSlug)) {
        throw new Error('A company with a similar name already exists');
      }

      platform.companies[idx].slug = newSlug;

      const oldPath = getCompanyFilePath(oldSlug);
      const newPath = getCompanyFilePath(newSlug);

      // Load data from old file if not cached
      if (!companyCache[id]) loadCompanyData(id);

      // Update cache slug
      if (companyCache[id]) {
        companyCache[id].slug = newSlug;
      }

      // Rename file on disk
      if (fs.existsSync(oldPath) && oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
        console.log(`📂 Renamed company database: ${oldSlug}.json → ${newSlug}.json`);
      }
    }

    savePlatform();
    if (companyCache[id]) saveCompanyData(id);
  },
  deleteCompany: (id) => {
    const company = platform.companies.find(c => c.id === id);
    if (!company) return;

    const cData = loadCompanyData(id);
    if (cData.assets.length > 0) throw new Error(`Company has ${cData.assets.length} assets. Delete assets first.`);

    // Remove users belonging to this company
    platform.users = platform.users.filter(u => u.company_id !== id);

    // Remove company from list
    platform.companies = platform.companies.filter(c => c.id !== id);
    savePlatform();

    // Delete company file
    const slug = company.slug || slugify(company.name);
    const filePath = getCompanyFilePath(slug);
    if (fs.existsSync(filePath)) {
      // Backup before delete
      const backupPath = filePath + '.deleted';
      fs.renameSync(filePath, backupPath);
      console.log(`🗑️ Company database archived: ${slug}.json.deleted`);
    }

    // Clear cache
    delete companyCache[id];
  },
  getCompanyStats: (companyId) => {
    const cData = loadCompanyData(companyId);
    return {
      assetCount: cData.assets.length,
      totalUnits: cData.assets.reduce((s, a) => s + (a.quantity || 1), 0),
      totalValue: cData.assets.reduce((s, a) => s + (a.current_value || 0) * (a.quantity || 1), 0),
      totalCost: cData.assets.reduce((s, a) => s + (a.purchase_cost || 0) * (a.quantity || 1), 0),
      userCount: platform.users.filter(u => u.company_id === companyId).length,
      locationCount: cData.locations.length
    };
  },

  // ========== USERS (still platform-level) ==========
  getUser: (username) => platform.users.find(u => u.username === username && u.is_active),
  getUserById: (id) => platform.users.find(u => u.id === id),
  getUsers: (companyId) => {
    const filter = companyId ? platform.users.filter(u => u.company_id === companyId) : platform.users;
    return filter.map(({ password, ...u }) => u);
  },
  getAllUsers: () => platform.users.map(({ password, ...u }) => u),
  createUser: (user) => {
    if (platform.users.find(u => u.username === user.username)) {
      throw new Error('Username already exists');
    }
    const newUser = {
      id: nextId(platform.users),
      ...user,
      created_at: new Date().toISOString()
    };
    platform.users.push(newUser);
    savePlatform();
    return newUser;
  },
  updateUser: (id, data) => {
    const idx = platform.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      platform.users[idx] = { ...platform.users[idx], ...data };
      savePlatform();
    }
  },
  deleteUser: (id) => {
    platform.users = platform.users.filter(u => u.id !== id);
    savePlatform();
  },

  // ========== ASSETS (company-scoped) ==========
  getAssets: (companyId) => {
    const cData = loadCompanyData(companyId);
    return cData.assets.map(a => ({
      ...a,
      location_name: cData.locations.find(l => l.id === a.location_id)?.name || 'Unknown',
      photos: cData.photos.filter(p => p.asset_id === a.id),
      notes: cData.notes.filter(n => n.asset_id === a.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }));
  },
  getAllAssets: () => {
    let allAssets = [];
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      allAssets = allAssets.concat(cData.assets.map(a => ({
        ...a,
        company_name: company.name,
        location_name: cData.locations.find(l => l.id === a.location_id)?.name || 'Unknown',
        photos: cData.photos.filter(p => p.asset_id === a.id),
        notes: cData.notes.filter(n => n.asset_id === a.id).sort((x, y) => new Date(y.created_at) - new Date(x.created_at))
      })));
    }
    return allAssets;
  },
  getAsset: (id) => {
    // Search across all companies
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      const asset = cData.assets.find(a => a.id === id);
      if (asset) return asset;
    }
    return null;
  },
  createAsset: (asset) => {
    const companyId = asset.company_id;
    const cData = loadCompanyData(companyId);
    const newAsset = { id: nextGlobalId('assets'), ...asset, created_at: new Date().toISOString() };
    cData.assets.push(newAsset);
    saveCompanyData(companyId);
    return newAsset;
  },
  updateAsset: (id, data) => {
    // Find which company owns this asset
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      const idx = cData.assets.findIndex(a => a.id === id);
      if (idx !== -1) {
        cData.assets[idx] = { ...cData.assets[idx], ...data };
        saveCompanyData(company.id);
        return;
      }
    }
  },
  deleteAsset: (id) => {
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      const idx = cData.assets.findIndex(a => a.id === id);
      if (idx !== -1) {
        cData.assets = cData.assets.filter(a => a.id !== id);
        cData.photos = cData.photos.filter(p => p.asset_id !== id);
        cData.notes = cData.notes.filter(n => n.asset_id !== id);
        saveCompanyData(company.id);
        return;
      }
    }
  },

  // ========== LOCATIONS (company-scoped) ==========
  getLocations: (companyId) => {
    const cData = loadCompanyData(companyId);
    return cData.locations.map(l => ({
      ...l,
      asset_count: cData.assets.filter(a => a.location_id === l.id).length,
      total_value: cData.assets.filter(a => a.location_id === l.id).reduce((sum, a) => sum + (a.current_value || 0) * (a.quantity || 1), 0)
    }));
  },
  getLocation: (id) => {
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      const loc = cData.locations.find(l => l.id === id);
      if (loc) return loc;
    }
    return null;
  },
  createLocation: (loc) => {
    const companyId = loc.company_id;
    const cData = loadCompanyData(companyId);
    const newLoc = { id: nextGlobalId('locations'), ...loc, created_at: new Date().toISOString() };
    cData.locations.push(newLoc);
    saveCompanyData(companyId);
    return newLoc;
  },
  updateLocation: (id, data) => {
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      const idx = cData.locations.findIndex(l => l.id === id);
      if (idx !== -1) {
        cData.locations[idx] = { ...cData.locations[idx], ...data };
        saveCompanyData(company.id);
        return;
      }
    }
  },
  deleteLocation: (id) => {
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      const loc = cData.locations.find(l => l.id === id);
      if (loc) {
        const count = cData.assets.filter(a => a.location_id === id).length;
        if (count > 0) throw new Error(`${count} assets in this location`);
        cData.locations = cData.locations.filter(l => l.id !== id);
        saveCompanyData(company.id);
        return;
      }
    }
  },

  // ========== CATEGORIES (company-scoped) ==========
  getCategories: (companyId) => {
    const cData = loadCompanyData(companyId);
    return cData.categories.map(c => ({
      ...c,
      asset_count: cData.assets.filter(a => a.category === c.name).length
    }));
  },
  createCategory: (companyId, name) => {
    const cData = loadCompanyData(companyId);
    if (cData.categories.find(c => c.name === name)) throw new Error('Category exists');
    const newCat = { id: nextGlobalId('categories'), company_id: companyId, name };
    cData.categories.push(newCat);
    saveCompanyData(companyId);
    return newCat;
  },
  renameCategory: (companyId, oldName, newName) => {
    const cData = loadCompanyData(companyId);
    if (cData.categories.find(c => c.name === newName)) throw new Error('Category name already exists');
    const cat = cData.categories.find(c => c.name === oldName);
    if (!cat) throw new Error('Category not found');
    cat.name = newName;
    cData.assets.forEach(a => {
      if (a.category === oldName) a.category = newName;
    });
    saveCompanyData(companyId);
  },
  deleteCategory: (id, companyId) => {
    const cData = loadCompanyData(companyId);
    const cat = cData.categories.find(c => c.id === id);
    if (!cat) throw new Error('Not found');
    const count = cData.assets.filter(a => a.category === cat.name).length;
    if (count > 0) throw new Error(`${count} assets use this category`);
    cData.categories = cData.categories.filter(c => c.id !== id);
    saveCompanyData(companyId);
  },

  // ========== SETTINGS (company-scoped) ==========
  getSettings: (companyId) => {
    const cData = loadCompanyData(companyId);
    return cData.settings[0] || { company_name: '' };
  },
  updateSettings: (companyId, data) => {
    const cData = loadCompanyData(companyId);
    if (cData.settings.length > 0) {
      cData.settings[0] = { ...cData.settings[0], ...data };
    } else {
      cData.settings.push({ id: 1, company_id: companyId, ...data });
    }
    saveCompanyData(companyId);
  },

  // ========== PHOTOS ==========
  addPhoto: (assetId, url, name) => {
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      if (cData.assets.find(a => a.id === assetId)) {
        const photo = { id: nextGlobalId('photos'), asset_id: assetId, url, name, created_at: new Date().toISOString() };
        cData.photos.push(photo);
        saveCompanyData(company.id);
        return photo;
      }
    }
    throw new Error('Asset not found');
  },
  deletePhoto: (id) => {
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      const photo = cData.photos.find(p => p.id === id);
      if (photo) {
        cData.photos = cData.photos.filter(p => p.id !== id);
        saveCompanyData(company.id);
        return;
      }
    }
  },

  // ========== NOTES ==========
  addNote: (assetId, text, createdBy) => {
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      if (cData.assets.find(a => a.id === assetId)) {
        const note = { id: nextGlobalId('notes'), asset_id: assetId, text, created_by: createdBy, created_at: new Date().toISOString() };
        cData.notes.push(note);
        saveCompanyData(company.id);
        return note;
      }
    }
    throw new Error('Asset not found');
  },
  deleteNote: (id) => {
    for (const company of platform.companies) {
      const cData = loadCompanyData(company.id);
      const note = cData.notes.find(n => n.id === id);
      if (note) {
        cData.notes = cData.notes.filter(n => n.id !== id);
        saveCompanyData(company.id);
        return;
      }
    }
  },

  // ========== IMPORT LEGACY (Kassets v1 single-company data) ==========
  importLegacyData: (legacyData, companyName, masterAdminCredentials) => {
    const now = new Date().toISOString();

    // ── 1. Create the company ──
    const slug = slugify(companyName);
    if (platform.companies.find(c => c.slug === slug)) {
      throw new Error('A company with a similar name already exists');
    }

    const newCompany = {
      id: nextId(platform.companies),
      name: companyName,
      slug,
      address: '',
      phone: '',
      email: '',
      is_active: 1,
      created_at: now
    };
    platform.companies.push(newCompany);
    const companyId = newCompany.id;

    // ── 2. Build ID maps (old ID → new ID) ──
    const locationMap = {};   // oldLocId → newLocId
    const assetMap = {};      // oldAssetId → newAssetId

    // ── 3. Import locations ──
    const newLocations = [];
    const oldLocations = legacyData.locations || [];
    oldLocations.forEach(loc => {
      const newId = newLocations.length + 1;
      locationMap[loc.id] = newId;
      newLocations.push({
        id: newId,
        company_id: companyId,
        name: loc.name,
        address: loc.address || '',
        created_at: loc.created_at || now
      });
    });

    // If no locations were imported, create a default
    if (newLocations.length === 0) {
      newLocations.push({
        id: 1,
        company_id: companyId,
        name: 'Main Office',
        address: '',
        created_at: now
      });
    }

    // ── 4. Import categories ──
    const newCategories = [];
    const oldCategories = legacyData.categories || [];
    // Categories in old app could be an array of strings OR array of objects with .name
    const catNames = oldCategories.map(c => typeof c === 'string' ? c : c.name).filter(Boolean);
    // Deduplicate
    const uniqueCats = [...new Set(catNames)];
    uniqueCats.forEach((name, i) => {
      newCategories.push({
        id: i + 1,
        company_id: companyId,
        name
      });
    });

    // If no categories, add defaults
    if (newCategories.length === 0) {
      ['Equipment', 'Furniture', 'Vehicles', 'Electronics', 'Machinery', 'Real Estate', 'Inventory', 'Other'].forEach((name, i) => {
        newCategories.push({ id: i + 1, company_id: companyId, name });
      });
    }

    // ── 5. Import assets ──
    const newAssets = [];
    const oldAssets = legacyData.assets || [];
    oldAssets.forEach((a, i) => {
      const newId = i + 1;
      const oldId = a.id || `__idx_${i}`;
      assetMap[oldId] = newId;
      // Also store by index so embedded photos can be matched
      assetMap[`__idx_${i}`] = newId;

      // Map the location ID (handle both snake_case and camelCase from old app)
      // Also handle export format where location is a name string instead of an ID
      let mappedLocId = null;
      const oldLocId = a.location_id || a.locationId;
      if (oldLocId) {
        mappedLocId = locationMap[oldLocId] || null;
      } else if (a.location && typeof a.location === 'string') {
        // Export format: location is a name, find matching new location
        const matchedLoc = newLocations.find(l => l.name === a.location);
        if (matchedLoc) mappedLocId = matchedLoc.id;
      }

      newAssets.push({
        id: newId,
        company_id: companyId,
        name: a.name || 'Unnamed Asset',
        category: a.category || 'Other',
        serial_number: a.serial_number || a.serialNumber || '',
        part_number: a.part_number || a.partNumber || '',
        description: a.description || '',
        purchase_date: a.purchase_date || a.purchaseDate || '',
        purchase_cost: parseFloat(a.purchase_cost || a.purchaseCost) || 0,
        current_value: parseFloat(a.current_value || a.currentValue) || 0,
        quantity: parseInt(a.quantity) || 1,
        depreciation_rate: parseFloat(a.depreciation_rate || a.depreciationRate) || 10,
        location_id: mappedLocId,
        created_at: a.created_at || now
      });
    });

    // ── 6. Import photos ──
    const newPhotos = [];
    const oldPhotos = legacyData.photos || [];
    oldPhotos.forEach((p, i) => {
      const oldAssetId = p.asset_id || p.assetId;
      const mappedAssetId = assetMap[oldAssetId];
      if (mappedAssetId) {
        newPhotos.push({
          id: i + 1,
          asset_id: mappedAssetId,
          url: p.url,
          name: p.name || 'photo',
          created_at: p.created_at || now
        });
      }
    });

    // Also handle photos embedded directly on assets (old frontend stored them as asset.photos[])
    oldAssets.forEach((a, idx) => {
      if (a.photos && Array.isArray(a.photos)) {
        const mappedAssetId = assetMap[a.id] || assetMap[`__idx_${idx}`];
        if (mappedAssetId) {
          a.photos.forEach(p => {
            // Avoid duplicates (if already imported from top-level photos array)
            const alreadyExists = newPhotos.find(np => np.asset_id === mappedAssetId && np.url === p.url);
            if (!alreadyExists) {
              newPhotos.push({
                id: newPhotos.length + 1,
                asset_id: mappedAssetId,
                url: p.url,
                name: p.name || 'photo',
                created_at: p.created_at || now
              });
            }
          });
        }
      }
    });

    // ── 7. Import notes ──
    const newNotes = [];
    const oldNotes = legacyData.notes || [];
    oldNotes.forEach((n, i) => {
      const oldAssetId = n.asset_id || n.assetId;
      const mappedAssetId = assetMap[oldAssetId];
      if (mappedAssetId) {
        newNotes.push({
          id: i + 1,
          asset_id: mappedAssetId,
          text: n.text,
          created_by: n.created_by || n.createdBy || 'Legacy Import',
          created_at: n.created_at || now
        });
      }
    });

    // Also handle notes embedded directly on assets
    oldAssets.forEach((a, idx) => {
      if (a.notes && Array.isArray(a.notes)) {
        const mappedAssetId = assetMap[a.id] || assetMap[`__idx_${idx}`];
        if (mappedAssetId) {
          a.notes.forEach(n => {
            const alreadyExists = newNotes.find(nn => nn.asset_id === mappedAssetId && nn.text === n.text);
            if (!alreadyExists) {
              newNotes.push({
                id: newNotes.length + 1,
                asset_id: mappedAssetId,
                text: n.text,
                created_by: n.created_by || n.createdBy || 'Legacy Import',
                created_at: n.created_at || now
              });
            }
          });
        }
      }
    });

    // ── 8. Import settings ──
    const oldSettings = legacyData.settings;
    let settingsCompanyName = companyName;
    if (oldSettings) {
      // Could be an object or an array with one entry
      if (Array.isArray(oldSettings) && oldSettings.length > 0) {
        settingsCompanyName = oldSettings[0].company_name || companyName;
      } else if (typeof oldSettings === 'object' && oldSettings.company_name) {
        settingsCompanyName = oldSettings.company_name;
      }
    }

    const companyData = {
      assets: newAssets,
      locations: newLocations,
      categories: newCategories,
      settings: [{ id: 1, company_id: companyId, company_name: settingsCompanyName }],
      photos: newPhotos,
      notes: newNotes
    };

    companyCache[companyId] = { data: companyData, slug };
    saveCompanyData(companyId);

    // ── 9. Import users → map old roles to new hierarchy ──
    const roleMapping = {
      admin: 'admin',
      editor: 'editor',
      viewer: 'viewer'
    };

    const importedUsers = [];
    const oldUsers = legacyData.users || [];
    oldUsers.forEach(u => {
      // Skip if username already exists on the platform
      if (platform.users.find(pu => pu.username === u.username)) {
        importedUsers.push({ username: u.username, status: 'skipped', reason: 'username already exists' });
        return;
      }

      const mappedRole = roleMapping[u.role] || 'viewer';
      const newUser = {
        id: nextId(platform.users),
        username: u.username,
        password: u.password, // preserve existing bcrypt hash
        display_name: u.display_name || u.displayName || u.username,
        email: u.email || '',
        role: mappedRole,
        company_id: companyId,
        is_active: u.is_active !== undefined ? u.is_active : 1,
        created_at: u.created_at || now
      };
      platform.users.push(newUser);
      importedUsers.push({ username: u.username, status: 'imported', role: mappedRole });
    });

    // ── 10. Create master admin for this company (if credentials provided) ──
    if (masterAdminCredentials && masterAdminCredentials.username && masterAdminCredentials.password) {
      if (!platform.users.find(u => u.username === masterAdminCredentials.username)) {
        const bcrypt = require('bcryptjs');
        platform.users.push({
          id: nextId(platform.users),
          username: masterAdminCredentials.username,
          password: bcrypt.hashSync(masterAdminCredentials.password, 10),
          display_name: masterAdminCredentials.displayName || masterAdminCredentials.username,
          email: masterAdminCredentials.email || '',
          role: 'master_admin',
          company_id: companyId,
          is_active: 1,
          created_at: now
        });
        importedUsers.push({ username: masterAdminCredentials.username, status: 'created', role: 'master_admin' });
      }
    }

    savePlatform();

    // ── 11. Return summary ──
    return {
      companyId,
      companyName: settingsCompanyName,
      slug,
      imported: {
        locations: newLocations.length,
        categories: newCategories.length,
        assets: newAssets.length,
        photos: newPhotos.length,
        notes: newNotes.length,
        users: importedUsers
      }
    };
  }
};
