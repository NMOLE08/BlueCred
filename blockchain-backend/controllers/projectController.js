const Project = require('../models/Project');
const NGO = require('../models/NGO');
const Admin = require('../models/Admin');
const VerificationLog = require('../models/VerificationLog');
const blockchainService = require('../utils/blockchain');
const metamaskAccountManager = require('../utils/metamaskAccounts');

// Get all projects with pagination and filtering
const getAllProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const ngoId = req.query.ngoId;
    const projectType = req.query.projectType;

    // Build filter object
    const filter = {};
    if (status) filter.verificationStatus = status;
    if (ngoId) filter.ngoId = ngoId;
    if (projectType) filter.projectType = projectType;

    const skip = (page - 1) * limit;

    const projects = await Project.find(filter)
      .populate('ngoId', 'organizationName email metamaskAccount.address')
      .populate('verificationDetails.verifiedBy', 'fullName role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Project.countDocuments(filter);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalProjects: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Public: minimal list of projects for ML UI (no auth)
const getProjectSummaries = async (req, res) => {
  try {
    const projects = await Project.find({}, 'projectId projectName ngoId')
      .populate('ngoId', 'organizationName metamaskAccount.address')
      .sort({ createdAt: -1 })
      .limit(200);

    const summaries = projects.map(p => ({
      projectId: p.projectId,
      projectName: p.projectName,
      ngo: p.ngoId ? {
        organizationName: p.ngoId.organizationName,
        wallet: p.ngoId.metamaskAccount?.address || null
      } : null
    }));

    res.json({ success: true, data: { projects: summaries } });
  } catch (error) {
    console.error('getProjectSummaries error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// Public (but header-protected) seed: creates a demo project if none exist
const seedDemoProject = async (req, res) => {
  try {
    const secret = req.headers['x-ml-secret'];
    if (!process.env.ML_WEBHOOK_SECRET || secret !== process.env.ML_WEBHOOK_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const existing = await Project.countDocuments();
    if (existing > 0) {
      return res.json({ success: true, message: 'Projects already exist. No seeding performed.' });
    }

    // Find any NGO to attach the project to
    const firstNGO = await NGO.findOne({});
    if (!firstNGO) {
      return res.status(400).json({ success: false, message: 'No NGOs found to attach demo project.' });
    }

    const projectId = `PRJ_DEMO_${Date.now()}`;
    const project = new Project({
      projectId,
      ngoId: firstNGO._id,
      projectName: 'Demo Blue Carbon Project',
      projectDescription: 'Auto-seeded demo project for ML integration tests.',
      projectLocation: 'Demo Location',
      projectType: 'mangrove'
    });
    await project.save();

    await NGO.findByIdAndUpdate(firstNGO._id, { $inc: { totalProjects: 1 } });

    res.json({ success: true, data: { projectId, projectName: project.projectName } });
  } catch (error) {
    console.error('seedDemoProject error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// Create a pre-approved demo project for biomass frontend testing
const createBiomassDemoProject = async (req, res) => {
  try {
    const secret = req.headers['x-ml-secret'];
    if (!process.env.ML_WEBHOOK_SECRET || secret !== process.env.ML_WEBHOOK_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if biomass demo project already exists
    const existingProject = await Project.findOne({ projectId: 'BIOMASS_DEMO_PROJECT' });
    if (existingProject) {
      return res.json({ 
        success: true, 
        message: 'Biomass demo project already exists',
        data: { 
          projectId: existingProject.projectId,
          verificationStatus: existingProject.verificationStatus
        }
      });
    }

    // Find any NGO to attach the project to
    const firstNGO = await NGO.findOne({});
    if (!firstNGO) {
      return res.status(400).json({ success: false, message: 'No NGOs found to attach demo project.' });
    }

    const project = new Project({
      projectId: 'BIOMASS_DEMO_PROJECT',
      ngoId: firstNGO._id,
      projectName: 'Biomass Frontend Demo Project',
      projectDescription: 'Pre-approved demo project for biomass frontend tokenization testing.',
      projectLocation: 'Demo Location',
      projectType: 'mangrove',
      verificationStatus: 'approved' // Pre-approved for testing
    });
    await project.save();

    await NGO.findByIdAndUpdate(firstNGO._id, { $inc: { totalProjects: 1 } });

    res.json({ 
      success: true, 
      message: 'Biomass demo project created and approved',
      data: { 
        projectId: project.projectId,
        verificationStatus: project.verificationStatus
      }
    });
  } catch (error) {
    console.error('createBiomassDemoProject error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ML webhook to ingest results in kilograms, convert to tonnes, and (optionally) mint tokens
// Auth: expects 'x-ml-secret' header to match process.env.ML_WEBHOOK_SECRET
const ingestMLWebhook = async (req, res) => {
  try {
    const secret = req.headers['x-ml-secret'];
    if (!process.env.ML_WEBHOOK_SECRET || secret !== process.env.ML_WEBHOOK_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { projectId } = req.params;
    const {
      carbonKg,            // number (kg)
      confidenceScore,     // 0..1
      modelVersion,        // string
      rawData,             // any
      recipientAddress     // optional string (NGO/company wallet)
    } = req.body;

    if (carbonKg === undefined || carbonKg === null || typeof carbonKg !== 'number' || carbonKg <= 0) {
      return res.status(400).json({ success: false, message: 'carbonKg must be a positive number' });
    }

    // Convert kg -> tonnes (1 tonne = 1000 kg, 1 tonne = 1 NCT)
    const tonnes = carbonKg / 1000;
    // Use exact value for NCT tokens (1 tonne = 1 NCT)
    const tokensWhole = Math.round(tonnes * 100) / 100; // Round to 2 decimal places for precision

    let project = await Project.findOne({ projectId }).populate('ngoId', 'organizationName metamaskAccount.address');
    if (!project) {
      // For ML webhook, create a new project if it doesn't exist
      const firstNGO = await NGO.findOne({});
      if (!firstNGO) {
        return res.status(400).json({ success: false, message: 'No NGOs found to attach project.' });
      }
      
      project = new Project({
        projectId,
        ngoId: firstNGO._id,
        projectName: `ML Generated Project ${projectId}`,
        projectDescription: 'Auto-generated project from ML biomass estimation.',
        projectLocation: 'ML Estimation',
        projectType: 'other'
      });
      await project.save();
      
      await NGO.findByIdAndUpdate(firstNGO._id, { $inc: { totalProjects: 1 } });
      
      // Re-populate the project
      project = await Project.findOne({ projectId }).populate('ngoId', 'organizationName metamaskAccount.address');
    }

    // Update ML analysis on the project (store both values for transparency)
    project.mlAnalysis = {
      carbonCreditsCalculated: tokensWhole,
      confidenceScore: typeof confidenceScore === 'number' ? confidenceScore : undefined,
      modelVersion: modelVersion || 'unknown',
      rawData,
      analysisDate: new Date(),
      // extra fields for traceability
      inputCarbonKg: carbonKg,
      calculatedTonnes: tonnes
    };
    // Keep existing verification status - approval is handled by NCCR Authorities
    console.log(`[DEBUG] Project verification status: ${project.verificationStatus}`);

    await project.save();

    let mintResult = null;
    
    // Check if project is approved before minting
    if (project.verificationStatus === 'approved' && tokensWhole > 0) {
      // Reload project to get the latest verification status from database
      const currentProject = await Project.findOne({ projectId }).populate('ngoId', 'organizationName metamaskAccount.address');
      
      console.log(`[DEBUG] Project ${projectId} verification status: ${currentProject.verificationStatus}`);
      
      // Double-check that project is still approved
      if (currentProject.verificationStatus !== 'approved') {
        return res.status(400).json({
          success: false,
          message: `Cannot mint tokens for unverified project. Current status: ${currentProject.verificationStatus}. Project must be approved by NCCR authorities first.`,
          data: {
            projectId,
            verificationStatus: currentProject.verificationStatus,
            tokensCalculated: tokensWhole,
            minted: false
          }
        });
      }
      
      try {
        currentProject.blockchainStatus = 'minting';
        await currentProject.save();

        const toAddress = recipientAddress || (currentProject.ngoId?.metamaskAccount?.address);
        if (!toAddress) {
          throw new Error('Recipient address is required for minting');
        }

        // Mint tokens to recipient (uses existing service which expects integer tokens)
        mintResult = await blockchainService.mintTokensToNGO(
          toAddress,
          tokensWhole,
          currentProject.projectId,
          currentProject.projectName,
          currentProject.ngoId?.organizationName || 'Unknown NGO'
        );

        if (mintResult.success) {
          currentProject.blockchainStatus = 'minted';
          currentProject.transactionHash = mintResult.transactionHash;
          currentProject.tokensMinted = mintResult.tokensMinted;
          await currentProject.save();
        } else {
          currentProject.blockchainStatus = 'failed';
          await currentProject.save();
        }
      } catch (mintErr) {
        console.error('ingestMLWebhook mint error:', mintErr);
        currentProject.blockchainStatus = 'failed';
        await currentProject.save();
        return res.status(500).json({ success: false, message: 'Minting failed', error: mintErr.message });
      }
    }

    return res.json({
      success: true,
      message: 'ML webhook processed',
      data: {
        projectId: project.projectId,
        tonnesCalculated: tonnes,
        tokensRoundedDown: tokensWhole,
        minted: !!mintResult?.success,
        transactionHash: mintResult?.transactionHash || null
      }
    });
  } catch (error) {
    console.error('ingestMLWebhook error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get project by ID
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('ngoId', 'organizationName email contactPerson metamaskAccount')
      .populate('verificationDetails.verifiedBy', 'fullName role department');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    res.json({
      success: true,
      data: {
        project
      }
    });

  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Create new project
const createProject = async (req, res) => {
  try {
    const {
      ngoId,
      projectName,
      projectDescription,
      projectLocation,
      projectType
    } = req.body;

    // Check if NGO exists and has a MetaMask account
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found.'
      });
    }

    if (!ngo.metamaskAccount || !ngo.metamaskAccount.address) {
      return res.status(400).json({
        success: false,
        message: 'NGO does not have an assigned MetaMask account.'
      });
    }

    // Generate unique project ID
    const projectId = `PRJ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const project = new Project({
      projectId,
      ngoId,
      projectName,
      projectDescription,
      projectLocation,
      projectType
    });

    await project.save();

    // Update NGO project count
    await NGO.findByIdAndUpdate(ngoId, {
      $inc: { totalProjects: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: {
        project
      }
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Update ML analysis results
const updateMLAnalysis = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      carbonCreditsCalculated,
      confidenceScore,
      modelVersion,
      rawData
    } = req.body;

    const project = await Project.findOne({ projectId });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Update ML analysis
    project.mlAnalysis = {
      carbonCreditsCalculated,
      confidenceScore,
      modelVersion,
      rawData,
      analysisDate: new Date()
    };

    // Set status to pending verification
    project.verificationStatus = 'pending';

    await project.save();

    res.json({
      success: true,
      message: 'ML analysis updated successfully.',
      data: {
        project: {
          projectId: project.projectId,
          mlAnalysis: project.mlAnalysis,
          verificationStatus: project.verificationStatus
        }
      }
    });

  } catch (error) {
    console.error('Update ML analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Verify project (NCCR admin only)
const verifyProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      verificationAction,
      approvedCredits,
      comments,
      internalNotes
    } = req.body;

    const project = await Project.findOne({ projectId })
      .populate('ngoId', 'metamaskAccount.address organizationName');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    if (project.verificationStatus === 'approved' || project.verificationStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Project has already been verified.'
      });
    }

    // Update verification details
    project.verificationDetails = {
      verifiedBy: req.admin._id,
      verifiedAt: new Date(),
      comments,
      approvedCarbonCredits: approvedCredits || 0
    };

    project.verificationStatus = verificationAction === 'approved' ? 'approved' : 'rejected';

    // If approved, mint tokens to NGO's MetaMask account
    if (verificationAction === 'approved' && approvedCredits > 0) {
      project.blockchainStatus = 'minting';

      try {
        const mintResult = await blockchainService.mintTokensToNGO(
          project.ngoId.metamaskAccount.address,
          approvedCredits,
          project.projectId,
          project.projectName,
          project.ngoId.organizationName
        );

        if (mintResult.success) {
          project.blockchainStatus = 'minted';
          project.transactionHash = mintResult.transactionHash;
          project.tokensMinted = mintResult.tokensMinted;
        } else {
          project.blockchainStatus = 'failed';
          throw new Error(mintResult.error);
        }
      } catch (blockchainError) {
        console.error('Blockchain minting error:', blockchainError);
        project.blockchainStatus = 'failed';
        
        // Save project with failed status and return error
        await project.save();
        
        return res.status(500).json({
          success: false,
          message: 'Project approved but token minting failed.',
          error: blockchainError.message
        });
      }
    }

    // Save project with final status
    await project.save();

    // Create verification log
    const verificationLog = new VerificationLog({
      projectId: project._id,
      ngoId: project.ngoId._id,
      verifiedBy: req.admin._id,
      verificationAction,
      mlCalculatedCredits: project.mlAnalysis.carbonCreditsCalculated,
      approvedCredits: approvedCredits || 0,
      creditDifference: (project.mlAnalysis.carbonCreditsCalculated || 0) - (approvedCredits || 0),
      comments,
      internalNotes,
      blockchainTransaction: project.blockchainStatus === 'minted' ? {
        transactionHash: project.transactionHash,
        status: 'success',
        tokensMinted: project.tokensMinted
      } : null
    });

    await verificationLog.save();

    // Update admin statistics
    await Admin.findByIdAndUpdate(req.admin._id, {
      $inc: {
        totalVerifications: 1,
        [verificationAction === 'approved' ? 'approvedProjects' : 'rejectedProjects']: 1
      }
    });

    // Update NGO statistics
    if (verificationAction === 'approved') {
      await NGO.findByIdAndUpdate(project.ngoId._id, {
        $inc: {
          verifiedProjects: 1,
          totalCarbonCredits: approvedCredits
        }
      });
    }

    res.json({
      success: true,
      message: `Project ${verificationAction} successfully.`,
      data: {
        project: {
          projectId: project.projectId,
          verificationStatus: project.verificationStatus,
          blockchainStatus: project.blockchainStatus,
          tokensMinted: project.tokensMinted,
          transactionHash: project.transactionHash
        }
      }
    });

  } catch (error) {
    console.error('Verify project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Get projects pending verification
const getPendingVerification = async (req, res) => {
  try {
    const projects = await Project.find({ verificationStatus: 'pending' })
      .populate('ngoId', 'organizationName metamaskAccount.address')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: {
        projects,
        count: projects.length
      }
    });

  } catch (error) {
    console.error('Get pending verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Get verification logs
const getVerificationLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const logs = await VerificationLog.find({})
      .populate('projectId', 'projectName projectId')
      .populate('ngoId', 'organizationName')
      .populate('verifiedBy', 'fullName role')
      .sort({ verifiedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await VerificationLog.countDocuments();

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalLogs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get verification logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateMLAnalysis,
  ingestMLWebhook,
  getProjectSummaries,
  seedDemoProject,
  createBiomassDemoProject,
  verifyProject,
  getPendingVerification,
  getVerificationLogs
};
