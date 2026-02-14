const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'kassets-secret-key';

// Authenticate JWT token
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Super admin only
const isSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin only' });
  }
  next();
};

// Master admin or super admin
const isMasterAdmin = (req, res, next) => {
  if (!['super_admin', 'master_admin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Master admin or higher required' });
  }
  next();
};

// Admin, master admin, or super admin
const isAdmin = (req, res, next) => {
  if (!['super_admin', 'master_admin', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Admin or higher required' });
  }
  next();
};

// Editor or higher (can modify assets)
const canEdit = (req, res, next) => {
  if (!['super_admin', 'master_admin', 'admin', 'editor'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'No edit permission' });
  }
  next();
};

// Ensure user is accessing their own company's data (or is super admin)
const sameCompany = (req, res, next) => {
  if (req.user?.role === 'super_admin') return next(); // super admin can access anything
  
  // The company_id can come from the route param or the user's own company
  const targetCompanyId = parseInt(req.params.companyId) || req.user?.companyId;
  
  if (!req.user?.companyId || (targetCompanyId && targetCompanyId !== req.user.companyId)) {
    return res.status(403).json({ error: 'Access denied - wrong company' });
  }
  next();
};

module.exports = { auth, isSuperAdmin, isMasterAdmin, isAdmin, canEdit, sameCompany };
