const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth, isSuperAdmin, isMasterAdmin, isAdmin, canEdit, sameCompany } = require('./middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'kassets-secret-key';

module.exports = (db) => {
  const router = express.Router();

  // Helper: get the effective company ID for the current user
  const getCompanyId = (req) => {
    if (req.user.role === 'super_admin') {
      // Super admin can specify a company via query param or header
      return parseInt(req.query.companyId) || parseInt(req.headers['x-company-id']) || null;
    }
    return req.user.companyId;
  };

  // ========== AUTH ==========
  router.post('/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const user = db.getUser(username);
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Check if company is active (for non-super admins)
      if (user.company_id) {
        const company = db.getCompany(user.company_id);
        if (!company || !company.is_active) {
          return res.status(401).json({ error: 'Company account is inactive' });
        }
      }
      
      const tokenPayload = {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.display_name,
        companyId: user.company_id
      };
      
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
      
      const company = user.company_id ? db.getCompany(user.company_id) : null;
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role: user.role,
          companyId: user.company_id,
          companyName: company?.name || null
        }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/auth/me', auth, (req, res) => {
    const user = db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const company = user.company_id ? db.getCompany(user.company_id) : null;
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      companyName: company?.name || null
    });
  });

  router.post('/auth/change-password', auth, (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = db.getUserById(req.user.id);
      if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(400).json({ error: 'Wrong current password' });
      }
      db.updateUser(req.user.id, { password: bcrypt.hashSync(newPassword, 10) });
      res.json({ message: 'Password changed' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ========== SUPER ADMIN: COMPANIES ==========
  router.get('/companies', auth, isSuperAdmin, (req, res) => {
    const companies = db.getCompanies().map(c => ({
      ...c,
      stats: db.getCompanyStats(c.id)
    }));
    res.json(companies);
  });

  router.post('/companies', auth, isSuperAdmin, (req, res) => {
    try {
      const { name, address, phone, email } = req.body;
      if (!name) return res.status(400).json({ error: 'Company name required' });
      const company = db.createCompany({ name, address, phone, email });
      res.json(company);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/companies/:id', auth, isSuperAdmin, (req, res) => {
    try {
      const { name, address, phone, email, is_active, compress_photos } = req.body;
      db.updateCompany(parseInt(req.params.id), { name, address, phone, email, is_active, compress_photos });
      res.json({ message: 'Updated' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/companies/:id', auth, isSuperAdmin, (req, res) => {
    try {
      db.deleteCompany(parseInt(req.params.id));
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // ========== SUPER ADMIN: CREATE MASTER ADMINS ==========
  router.post('/companies/:id/master-admin', auth, isSuperAdmin, (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const company = db.getCompany(companyId);
      if (!company) return res.status(404).json({ error: 'Company not found' });

      const { username, password, displayName, email } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

      const user = db.createUser({
        username,
        password: bcrypt.hashSync(password, 10),
        display_name: displayName || username,
        email: email || '',
        role: 'master_admin',
        company_id: companyId,
        is_active: 1
      });

      res.json({ id: user.id });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Super admin: view all users across all companies
  router.get('/all-users', auth, isSuperAdmin, (req, res) => {
    const users = db.getAllUsers().map(u => ({
      ...u,
      company_name: u.company_id ? db.getCompany(u.company_id)?.name || 'Unknown' : 'Platform'
    }));
    res.json(users);
  });

  // Super admin: delete a user from a specific company
  router.delete('/companies/:companyId/users/:userId', auth, isSuperAdmin, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const targetUser = db.getUserById(userId);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      if (targetUser.role === 'super_admin') return res.status(403).json({ error: 'Cannot delete a super admin' });
      db.deleteUser(userId);
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Super admin: view a specific company's data
  router.get('/companies/:id/overview', auth, isSuperAdmin, (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const company = db.getCompany(companyId);
      if (!company) return res.status(404).json({ error: 'Company not found' });

      const stats = db.getCompanyStats(companyId);
      const users = db.getUsers(companyId);
      const locations = db.getLocations(companyId);
      const categories = db.getCategories(companyId);
      const assets = db.getAssets(companyId);

      res.json({ company, stats, users, locations, categories, assets });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ========== USERS (company-scoped) ==========
  router.get('/users', auth, isAdmin, (req, res) => {
    const companyId = getCompanyId(req);
    if (!companyId) return res.json(db.getAllUsers());
    res.json(db.getUsers(companyId));
  });

  router.post('/users', auth, isAdmin, (req, res) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const { username, password, displayName, email, role } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

      // Validate role hierarchy
      const allowedRoles = { master_admin: ['admin', 'editor', 'viewer'], admin: ['editor', 'viewer'] };
      const creatorAllowed = allowedRoles[req.user.role] || [];
      
      // Super admin can create any role
      if (req.user.role === 'super_admin') {
        // allow anything
      } else if (req.user.role === 'master_admin') {
        if (!['master_admin', 'admin', 'editor', 'viewer'].includes(role)) {
          return res.status(403).json({ error: 'Master admins can create master_admin, admin, editor, or viewer roles' });
        }
      } else if (req.user.role === 'admin') {
        if (!['editor', 'viewer'].includes(role)) {
          return res.status(403).json({ error: 'Admins can only create editor or viewer roles' });
        }
      }

      const user = db.createUser({
        username,
        password: bcrypt.hashSync(password, 10),
        display_name: displayName || username,
        email: email || '',
        role: role || 'viewer',
        company_id: companyId,
        is_active: 1
      });
      res.json({ id: user.id });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put('/users/:id', auth, isAdmin, (req, res) => {
    try {
      const targetUser = db.getUserById(parseInt(req.params.id));
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      // Ensure same company (unless super admin)
      if (req.user.role !== 'super_admin' && targetUser.company_id !== req.user.companyId) {
        return res.status(403).json({ error: 'Cannot edit users from another company' });
      }

      // Can't edit someone of higher role (unless super admin); master admins can edit peers
      const roleHierarchy = { super_admin: 5, master_admin: 4, admin: 3, editor: 2, viewer: 1 };
      if (req.user.role !== 'super_admin') {
        if (req.user.role === 'master_admin') {
          if (roleHierarchy[targetUser.role] > roleHierarchy[req.user.role]) {
            return res.status(403).json({ error: 'Cannot edit a user with a higher role' });
          }
        } else if (roleHierarchy[targetUser.role] >= roleHierarchy[req.user.role]) {
          return res.status(403).json({ error: 'Cannot edit a user with equal or higher role' });
        }
      }

      const { displayName, email, role, isActive } = req.body;
      
      // Validate role change
      if (role) {
        if (req.user.role === 'master_admin' && !['master_admin', 'admin', 'editor', 'viewer'].includes(role)) {
          return res.status(403).json({ error: 'Invalid role for master admin to assign' });
        }
        if (req.user.role === 'admin' && !['editor', 'viewer'].includes(role)) {
          return res.status(403).json({ error: 'Invalid role for admin to assign' });
        }
      }

      db.updateUser(parseInt(req.params.id), {
        display_name: displayName,
        email,
        role: role || targetUser.role,
        is_active: isActive !== undefined ? (isActive ? 1 : 0) : targetUser.is_active
      });
      res.json({ message: 'Updated' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/users/:id/reset-password', auth, isAdmin, (req, res) => {
    try {
      const targetUser = db.getUserById(parseInt(req.params.id));
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      
      if (req.user.role !== 'super_admin' && targetUser.company_id !== req.user.companyId) {
        return res.status(403).json({ error: 'Cannot reset password for user from another company' });
      }

      db.updateUser(parseInt(req.params.id), { password: bcrypt.hashSync(req.body.newPassword, 10) });
      res.json({ message: 'Password reset' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/users/:id', auth, isAdmin, (req, res) => {
    try {
      if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
      
      const targetUser = db.getUserById(parseInt(req.params.id));
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      
      if (req.user.role !== 'super_admin' && targetUser.company_id !== req.user.companyId) {
        return res.status(403).json({ error: 'Cannot delete user from another company' });
      }

      const roleHierarchy = { super_admin: 5, master_admin: 4, admin: 3, editor: 2, viewer: 1 };
      
      // Super admin can delete anyone except other super admins
      if (req.user.role === 'super_admin') {
        if (targetUser.role === 'super_admin') {
          return res.status(403).json({ error: 'Cannot delete another super admin' });
        }
      } else if (req.user.role === 'master_admin') {
        // Master admins can delete other master admins (same company) and below
        if (roleHierarchy[targetUser.role] > roleHierarchy[req.user.role]) {
          return res.status(403).json({ error: 'Cannot delete a user with a higher role' });
        }
      } else {
        // Admins can only delete lower roles
        if (roleHierarchy[targetUser.role] >= roleHierarchy[req.user.role]) {
          return res.status(403).json({ error: 'Cannot delete a user with equal or higher role' });
        }
      }

      db.deleteUser(parseInt(req.params.id));
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ========== SETTINGS (company-scoped) ==========
  router.get('/settings', auth, (req, res) => {
    const companyId = getCompanyId(req);
    if (!companyId) return res.json({ company_name: 'KASSETS Platform' });
    const settings = db.getSettings(companyId);
    // Include company-level compress_photos setting (managed by super_admin)
    const company = db.getCompanies().find(c => c.id === companyId);
    if (company && company.compress_photos !== undefined) settings.compress_photos = company.compress_photos;
    res.json(settings);
  });

  router.put('/settings', auth, canEdit, (req, res) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) return res.status(400).json({ error: 'Company context required' });
      const updates = { company_name: req.body.companyName || '' };
      if (req.body.brandColor) updates.brand_color = req.body.brandColor;
      if (req.body.bgColor1) updates.bg_color_1 = req.body.bgColor1;
      if (req.body.bgColor2) updates.bg_color_2 = req.body.bgColor2;
      if (req.body.compressPhotos !== undefined) updates.compress_photos = req.body.compressPhotos;
      db.updateSettings(companyId, updates);
      res.json({ message: 'Saved' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ========== LOCATIONS (company-scoped) ==========
  router.get('/locations', auth, (req, res) => {
    const companyId = getCompanyId(req);
    if (!companyId) return res.json([]);
    res.json(db.getLocations(companyId));
  });

  router.post('/locations', auth, canEdit, (req, res) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) return res.status(400).json({ error: 'Company context required' });
      const loc = db.createLocation({ company_id: companyId, name: req.body.name, address: req.body.address || '' });
      res.json({ id: loc.id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/locations/:id', auth, canEdit, (req, res) => {
    try {
      db.updateLocation(parseInt(req.params.id), { name: req.body.name, address: req.body.address });
      res.json({ message: 'Updated' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/locations/:id', auth, canEdit, (req, res) => {
    try {
      db.deleteLocation(parseInt(req.params.id));
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // ========== CATEGORIES (company-scoped) ==========
  router.get('/categories', auth, (req, res) => {
    const companyId = getCompanyId(req);
    if (!companyId) return res.json([]);
    res.json(db.getCategories(companyId));
  });

  router.post('/categories', auth, canEdit, (req, res) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) return res.status(400).json({ error: 'Company context required' });
      const cat = db.createCategory(companyId, req.body.name);
      res.json({ id: cat.id });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/categories/rename', auth, canEdit, (req, res) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) return res.status(400).json({ error: 'Company context required' });
      const { oldName, newName } = req.body;
      db.renameCategory(companyId, oldName, newName);
      res.json({ message: 'Category renamed' });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.delete('/categories/:id', auth, canEdit, (req, res) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) return res.status(400).json({ error: 'Company context required' });
      db.deleteCategory(parseInt(req.params.id), companyId);
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // ========== ASSETS (company-scoped) ==========
  router.get('/assets', auth, (req, res) => {
    const companyId = getCompanyId(req);
    if (!companyId) return res.json([]);
    res.json(db.getAssets(companyId));
  });

  router.post('/assets', auth, canEdit, (req, res) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const { name, category, serialNumber, partNumber, description, purchaseDate, purchaseCost, currentValue, quantity, depreciationRate, locationId } = req.body;
      const asset = db.createAsset({
        company_id: companyId,
        name,
        category: category || 'Other',
        serial_number: serialNumber || '',
        part_number: partNumber || '',
        description: description || '',
        purchase_date: purchaseDate || '',
        purchase_cost: parseFloat(purchaseCost) || 0,
        current_value: parseFloat(currentValue) || parseFloat(purchaseCost) || 0,
        quantity: parseInt(quantity) || 1,
        depreciation_rate: parseFloat(depreciationRate) || 10,
        location_id: locationId ? parseInt(locationId) : null
      });
      res.json({ id: asset.id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/assets/:id', auth, canEdit, (req, res) => {
    try {
      const { name, category, serialNumber, partNumber, description, purchaseDate, purchaseCost, currentValue, quantity, depreciationRate, locationId } = req.body;
      db.updateAsset(parseInt(req.params.id), {
        name,
        category,
        serial_number: serialNumber,
        part_number: partNumber,
        description,
        purchase_date: purchaseDate,
        purchase_cost: parseFloat(purchaseCost) || 0,
        current_value: parseFloat(currentValue) || 0,
        quantity: parseInt(quantity) || 1,
        depreciation_rate: parseFloat(depreciationRate) || 10,
        location_id: locationId ? parseInt(locationId) : null
      });
      res.json({ message: 'Updated' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/assets/:id', auth, canEdit, (req, res) => {
    try {
      db.deleteAsset(parseInt(req.params.id));
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/assets/bulk-transfer', auth, canEdit, (req, res) => {
    try {
      const { assetIds, locationId } = req.body;
      const loc = db.getLocation(parseInt(locationId));
      assetIds.forEach(id => {
        const asset = db.getAsset(id);
        const oldLoc = asset?.location_id ? db.getLocation(asset.location_id) : null;
        db.updateAsset(id, { location_id: parseInt(locationId) });
        db.addNote(id, `Transferred from ${oldLoc?.name || 'Unknown'} to ${loc?.name}`, req.user.displayName || req.user.username);
      });
      res.json({ message: `${assetIds.length} assets transferred` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/assets/bulk-category', auth, canEdit, (req, res) => {
    try {
      const { assetIds, category } = req.body;
      assetIds.forEach(id => {
        const asset = db.getAsset(id);
        const oldCategory = asset?.category || 'Unknown';
        db.updateAsset(id, { category });
        db.addNote(id, `Category changed from "${oldCategory}" to "${category}"`, req.user.displayName || req.user.username);
      });
      res.json({ message: `${assetIds.length} assets updated` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/assets/bulk-delete', auth, canEdit, (req, res) => {
    try {
      const { assetIds } = req.body;
      assetIds.forEach(id => db.deleteAsset(id));
      res.json({ message: `${assetIds.length} assets deleted` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ========== PHOTOS ==========
  router.post('/assets/:id/photos', auth, canEdit, (req, res) => {
    try {
      const photo = db.addPhoto(parseInt(req.params.id), req.body.url, req.body.name);
      res.json(photo);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/assets/:assetId/photos/:photoId', auth, canEdit, (req, res) => {
    try {
      db.deletePhoto(parseInt(req.params.photoId));
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ========== NOTES ==========
  router.post('/assets/:id/notes', auth, canEdit, (req, res) => {
    try {
      const note = db.addNote(parseInt(req.params.id), req.body.text, req.user.displayName || req.user.username);
      res.json(note);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/assets/:assetId/notes/:noteId', auth, canEdit, (req, res) => {
    try {
      db.deleteNote(parseInt(req.params.noteId));
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ========== IMPORT LEGACY DATABASE (Super Admin only) ==========
  router.post('/import-legacy', auth, isSuperAdmin, (req, res) => {
    try {
      const { legacyData, companyName, masterAdmin } = req.body;

      if (!legacyData) {
        return res.status(400).json({ error: 'legacyData is required (the old Kassets v1 database JSON)' });
      }
      if (!companyName) {
        return res.status(400).json({ error: 'companyName is required (name for the new company)' });
      }

      const result = db.importLegacyData(legacyData, companyName, masterAdmin || null);

      console.log(`\n🔄 LEGACY IMPORT COMPLETE:`);
      console.log(`   Company: ${result.companyName} (ID: ${result.companyId})`);
      console.log(`   Assets: ${result.imported.assets}, Locations: ${result.imported.locations}`);
      console.log(`   Categories: ${result.imported.categories}, Photos: ${result.imported.photos}, Notes: ${result.imported.notes}`);
      console.log(`   Users: ${result.imported.users.length}\n`);

      res.json({
        message: 'Legacy data imported successfully',
        ...result
      });
    } catch (e) {
      console.error('Import error:', e.message);
      res.status(400).json({ error: e.message });
    }
  });

  return router;
};
