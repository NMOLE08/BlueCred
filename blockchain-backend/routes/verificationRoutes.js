const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Admin = require('../models/Admin');
const NGO = require('../models/NGO');
const { authenticateToken } = require('../middleware/auth');

// Get all projects pending verification
router.get('/pending', async (req, res) => {
  try {
    const pendingProjects = await Project.find({
      verificationStatus: { $in: ['pending', 'under_review'] }
    })
    .populate('ngoId', 'organizationName contactEmail')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        projects: pendingProjects,
        count: pendingProjects.length
      }
    });
  } catch (error) {
    console.error('Error fetching pending projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending projects',
      error: error.message
    });
  }
});

// Get project details for verification
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const project = await Project.findOne({ projectId })
      .populate('ngoId', 'organizationName contactEmail metamaskAccount')
      .populate('verificationDetails.verifiedBy', 'username email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project details',
      error: error.message
    });
  }
});

// Update project verification status
router.post('/project/:projectId/verify', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      status, 
      comments, 
      approvedCarbonCredits,
      verifierEmail = 'nccr@authority.gov' // Default NCCR authority
    } = req.body;

    // Validate status
    if (!['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status'
      });
    }

    let project = await Project.findOne({ projectId });
    if (!project) {
      // Auto-create a minimal project so website verification can proceed
      // Find any NGO to attach the project to
      const firstNGO = await NGO.findOne({});
      if (!firstNGO) {
        return res.status(400).json({ success: false, message: 'No NGOs found to attach project.' });
      }

      project = new Project({
        projectId,
        ngoId: firstNGO._id,
        projectName: `Website Project ${projectId}`,
        projectDescription: 'Created via NCCR report verification flow.',
        projectLocation: 'India',
        projectType: 'other'
      });
      await project.save();
    }

    // Find or create admin/verifier
    let verifier = await Admin.findOne({ email: verifierEmail });
    if (!verifier) {
      verifier = new Admin({
        adminId: `ADMIN_${Date.now()}`,
        fullName: 'NCCR Authority',
        email: verifierEmail,
        password: 'nccr_temp_password_123',
        role: 'nccr_verifier',
        department: 'NCCR'
      });
      await verifier.save();
    }

    // Update verification details (atomic)
    console.log(`[DEBUG] Updating project ${projectId} status from ${project.verificationStatus} to ${status}`);

    const update = {
      verificationStatus: status,
      verificationDetails: {
        verifiedBy: verifier._id,
        verifiedAt: new Date(),
        comments: comments || '',
        approvedCarbonCredits: status === 'approved' ? 
          (approvedCarbonCredits || (project.mlAnalysis?.carbonCreditsCalculated || 0)) : 0
      }
    };

    const updatedProject = await Project.findOneAndUpdate(
      { projectId },
      { $set: update },
      { new: true }
    ).populate('verificationDetails.verifiedBy', 'fullName email');

    console.log(`[DEBUG] Project ${projectId} saved with status: ${updatedProject?.verificationStatus}`);

    res.json({
      success: true,
      message: `Project ${status} successfully`,
      data: {
        project: {
          projectId: updatedProject.projectId,
          projectName: updatedProject.projectName,
          verificationStatus: updatedProject.verificationStatus,
          verificationDetails: updatedProject.verificationDetails
        }
      }
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update verification status',
      error: error.message
    });
  }
});

// Get verification statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Project.aggregate([
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 },
          totalCarbonCredits: { $sum: '$mlAnalysis.carbonCreditsCalculated' }
        }
      }
    ]);

    const formattedStats = {
      pending: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      totalProjects: 0,
      totalCarbonCredits: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.totalProjects += stat.count;
      if (stat._id === 'approved') {
        formattedStats.totalCarbonCredits += stat.totalCarbonCredits;
      }
    });

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Error fetching verification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification statistics',
      error: error.message
    });
  }
});

module.exports = router;
