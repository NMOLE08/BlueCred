const express = require('express');
const router = express.Router();
const ngoController = require('../controllers/ngoController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateObjectId, validateNGOData } = require('../middleware/validation');

// All routes require authentication
router.use(verifyToken);

// NGO management routes
router.get('/', ngoController.getAllNGOs);
router.get('/stats', ngoController.getNGOStats);
router.get('/metamask-status', ngoController.getMetaMaskStatus);
router.get('/:id', validateObjectId, ngoController.getNGOById);

// NGO creation and management (super admin only)
router.post('/', 
  requireRole(['super_admin']), 
  validateNGOData, 
  ngoController.createNGO
);

router.put('/:id', 
  requireRole(['super_admin', 'nccr_admin']), 
  validateObjectId, 
  ngoController.updateNGO
);

router.put('/:id/deactivate', 
  requireRole(['super_admin']), 
  validateObjectId, 
  ngoController.deactivateNGO
);

module.exports = router;
