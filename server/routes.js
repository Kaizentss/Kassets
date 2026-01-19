const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth, canEdit, isAdmin } = require('./middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'kassets-secret-key';

module.exports = (db) => {
  const router = express.Router();

  // ========== AUTH ==========
  router.post('/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const user = db.getUser(username);
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, displayName: user.display_name }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/auth/me', auth, (req, res) => {
    const user = db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, username: user.username, displayName: user.display_name, email: user.email, role: user.role });
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

  // ========== USERS ==========
  router.get('/users', auth, isAdmin, (req, res) => {
    res.json(db.getUsers());
  });

  router.post('/users', auth, isAdmin, (req, res) => {
    try {
      const { username, password, displayName, email, role } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
      const user = db.createUser({
        username,
        password: bcrypt.hashSync(password, 10),
        display_name: displayName || username,
        email: email || '',
        role: role || 'viewer',
        is_active: 1
      });
      res.json({ id: user.id });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put('/users/:id', auth, isAdmin, (req, res) => {
    try {
      const { displayName, email, role, isActive } = req.body;
      db.updateUser(parseInt(req.params.id), {
        display_name: displayName,
        email,
        role,
        is_active: isActive ? 1 : 0
      });
      res.json({ message: 'Updated' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/users/:id/reset-password', auth, isAdmin, (req, res) => {
    try {
      db.updateUser(parseInt(req.params.id), { password: bcrypt.hashSync(req.body.newPassword, 10) });
      res.json({ message: 'Password reset' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/users/:id', auth, isAdmin, (req, res) => {
    try {
      if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
      db.deleteUser(parseInt(req.params.id));
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ========== SETTINGS ==========
  router.get('/settings', auth, (req, res) => {
    res.json(db.getSettings());
  });

  router.put('/settings', auth, canEdit, (req, res) => {
    try {
      db.updateSettings({ company_name: req.body.companyName || '' });
      res.json({ message: 'Saved' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ========== LOCATIONS ==========
  router.get('/locations', auth, (req, res) => {
    res.json(db.getLocations());
  });

  router.post('/locations', auth, canEdit, (req, res) => {
    try {
      const loc = db.createLocation({ name: req.body.name, address: req.body.address || '' });
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

  // ========== CATEGORIES ==========
  router.get('/categories', auth, (req, res) => {
    res.json(db.getCategories());
  });

  router.post('/categories', auth, canEdit, (req, res) => {
    try {
      const cat = db.createCategory(req.body.name);
      res.json({ id: cat.id });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/categories/rename', auth, canEdit, (req, res) => {
    try {
      const { oldName, newName } = req.body;
      db.renameCategory(oldName, newName);
      res.json({ message: 'Category renamed' });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.delete('/categories/:id', auth, canEdit, (req, res) => {
    try {
      db.deleteCategory(parseInt(req.params.id));
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // ========== ASSETS ==========
  router.get('/assets', auth, (req, res) => {
    res.json(db.getAssets());
  });

  router.post('/assets', auth, canEdit, (req, res) => {
    try {
      const { name, category, serialNumber, partNumber, description, purchaseDate, purchaseCost, currentValue, quantity, depreciationRate, locationId } = req.body;
      const asset = db.createAsset({
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

  return router;
};
