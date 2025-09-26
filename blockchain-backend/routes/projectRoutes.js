const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateObjectId, validateProjectData, validateMLAnalysis, validateVerificationData } = require('../middleware/validation');

// Public routes (no authentication required)

// Public ML webhook (secured by shared secret header, not JWT)
router.post('/:projectId/ml-webhook', projectController.ingestMLWebhook);

// Public project summaries for ML UI (no auth)
router.get('/public/summaries', projectController.getProjectSummaries);

// Seed a demo project if none exist (protected by x-ml-secret header)
router.post('/seed-demo', projectController.seedDemoProject);

// Create a pre-approved biomass demo project (protected by x-ml-secret header)
router.post('/create-biomass-demo', projectController.createBiomassDemoProject);

// All other routes require authentication
router.use(verifyToken);

// Project management routes
router.get('/', projectController.getAllProjects);
router.get('/pending-verification', projectController.getPendingVerification);
router.get('/:id', validateObjectId, projectController.getProjectById);
router.post('/', validateProjectData, projectController.createProject);

// ML Analysis routes
router.put('/:projectId/ml-analysis', validateMLAnalysis, projectController.updateMLAnalysis);

// Verification routes (NCCR admins only)
router.put('/:projectId/verify', 
  requireRole(['nccr_admin', 'nccr_verifier']), 
  validateVerificationData, 
  projectController.verifyProject
);

// Verification logs (NCCR admins only)
router.get('/logs/verification', 
  requireRole(['nccr_admin', 'nccr_verifier']), 
  projectController.getVerificationLogs
);

module.exports = router;
