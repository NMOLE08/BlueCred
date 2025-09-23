const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middleware/auth');

// Public routes
router.post('/login', adminController.login);

// Protected routes
router.use(verifyToken);

// Profile routes
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);
router.get('/stats', adminController.getAdminStats);

// Admin management routes (super admin only)
router.get('/all', requireRole(['super_admin']), adminController.getAllAdmins);
router.post('/create', requireRole(['super_admin']), adminController.createAdmin);

module.exports = router;
