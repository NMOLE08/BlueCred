const NGO = require('../models/NGO');
const Project = require('../models/Project');
const metamaskAccountManager = require('../utils/metamaskAccounts');

// Get all NGOs
const getAllNGOs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ngos = await NGO.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await NGO.countDocuments();

    res.json({
      success: true,
      data: {
        ngos,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalNGOs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all NGOs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Get NGO by ID
const getNGOById = async (req, res) => {
  try {
    const ngo = await NGO.findById(req.params.id);

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found.'
      });
    }

    // Get NGO's projects
    const projects = await Project.find({ ngoId: ngo._id })
      .select('projectName projectType verificationStatus mlAnalysis.carbonCreditsCalculated tokensMinted createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        ngo,
        projects
      }
    });

  } catch (error) {
    console.error('Get NGO by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Create new NGO
const createNGO = async (req, res) => {
  try {
    const {
      appAccountId,
      organizationName,
      email,
      contactPerson,
      phone,
      address,
      registrationNumber
    } = req.body;

    // Check if NGO already exists
    const existingNGO = await NGO.findOne({
      $or: [
        { appAccountId },
        { email: email.toLowerCase() },
        { registrationNumber }
      ]
    });

    if (existingNGO) {
      return res.status(400).json({
        success: false,
        message: 'NGO with this account ID, email, or registration number already exists.'
      });
    }

    // Get next available MetaMask account
    const availableAccount = metamaskAccountManager.getNextAvailableAccount();
    
    if (!availableAccount) {
      return res.status(400).json({
        success: false,
        message: 'No available MetaMask accounts. All 6 accounts are already assigned.'
      });
    }

    // Assign MetaMask account
    metamaskAccountManager.assignAccount(availableAccount.accountIndex, appAccountId);

    const ngo = new NGO({
      appAccountId,
      organizationName,
      email: email.toLowerCase(),
      contactPerson,
      phone,
      address,
      registrationNumber,
      metamaskAccount: {
        address: availableAccount.address,
        privateKey: availableAccount.privateKey,
        accountIndex: availableAccount.accountIndex
      }
    });

    await ngo.save();

    res.status(201).json({
      success: true,
      message: 'NGO created and MetaMask account assigned successfully.',
      data: {
        ngo: {
          id: ngo._id,
          appAccountId: ngo.appAccountId,
          organizationName: ngo.organizationName,
          email: ngo.email,
          metamaskAccount: {
            address: ngo.metamaskAccount.address,
            accountIndex: ngo.metamaskAccount.accountIndex
          },
          createdAt: ngo.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Create NGO error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Update NGO
const updateNGO = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      organizationName,
      contactPerson,
      phone,
      address
    } = req.body;

    const updateData = {};
    if (organizationName) updateData.organizationName = organizationName;
    if (contactPerson) updateData.contactPerson = contactPerson;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    const ngo = await NGO.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found.'
      });
    }

    res.json({
      success: true,
      message: 'NGO updated successfully.',
      data: {
        ngo
      }
    });

  } catch (error) {
    console.error('Update NGO error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Deactivate NGO
const deactivateNGO = async (req, res) => {
  try {
    const { id } = req.params;

    const ngo = await NGO.findById(id);
    
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found.'
      });
    }

    ngo.isActive = false;
    await ngo.save();

    // Release MetaMask account
    metamaskAccountManager.releaseAccount(ngo.metamaskAccount.accountIndex);

    res.json({
      success: true,
      message: 'NGO deactivated successfully.'
    });

  } catch (error) {
    console.error('Deactivate NGO error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Get MetaMask account assignment status
const getMetaMaskStatus = async (req, res) => {
  try {
    const stats = metamaskAccountManager.getAssignmentStats();
    const accounts = metamaskAccountManager.getAllAccounts();

    res.json({
      success: true,
      data: {
        stats,
        accounts: accounts.map(account => ({
          accountIndex: account.accountIndex,
          address: account.address,
          name: account.name,
          isAssigned: account.isAssigned,
          assignedTo: account.assignedTo || null,
          assignedAt: account.assignedAt || null
        }))
      }
    });

  } catch (error) {
    console.error('Get MetaMask status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Get NGO statistics
const getNGOStats = async (req, res) => {
  try {
    const totalNGOs = await NGO.countDocuments();
    const activeNGOs = await NGO.countDocuments({ isActive: true });
    const totalProjects = await Project.countDocuments();
    const verifiedProjects = await Project.countDocuments({ verificationStatus: 'approved' });
    
    const totalCarbonCredits = await NGO.aggregate([
      { $group: { _id: null, total: { $sum: '$totalCarbonCredits' } } }
    ]);

    const totalTokensMinted = await Project.aggregate([
      { $group: { _id: null, total: { $sum: '$tokensMinted' } } }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalNGOs,
          activeNGOs,
          totalProjects,
          verifiedProjects,
          totalCarbonCredits: totalCarbonCredits[0]?.total || 0,
          totalTokensMinted: totalTokensMinted[0]?.total || 0
        }
      }
    });

  } catch (error) {
    console.error('Get NGO stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  getAllNGOs,
  getNGOById,
  createNGO,
  updateNGO,
  deactivateNGO,
  getMetaMaskStatus,
  getNGOStats
};
