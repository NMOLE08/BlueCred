const Admin = require('../models/Admin');
const { generateToken } = require('../middleware/auth');

// Admin login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Compare password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate token
    const token = generateToken(admin._id);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role,
          department: admin.department,
          lastLogin: admin.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Get admin profile
const getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    
    res.json({
      success: true,
      data: {
        admin
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Get all admins (super admin only)
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select('-password');
    
    res.json({
      success: true,
      data: {
        admins,
        count: admins.length
      }
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Create new admin (super admin only)
const createAdmin = async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      role,
      department
    } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists.'
      });
    }

    // Create new admin
    const admin = new Admin({
      adminId: `ADM_${Date.now()}`,
      email: email.toLowerCase(),
      password,
      fullName,
      role: role || 'nccr_verifier',
      department: department || 'NCCR'
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully.',
      data: {
        admin: {
          id: admin._id,
          adminId: admin.adminId,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role,
          department: admin.department,
          createdAt: admin.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Update admin profile
const updateProfile = async (req, res) => {
  try {
    const { fullName, department } = req.body;
    const adminId = req.admin._id;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (department) updateData.department = department;

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        admin
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Get admin statistics
const getAdminStats = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    
    res.json({
      success: true,
      data: {
        stats: {
          totalVerifications: admin.totalVerifications,
          approvedProjects: admin.approvedProjects,
          rejectedProjects: admin.rejectedProjects,
          lastLogin: admin.lastLogin,
          accountCreated: admin.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

module.exports = {
  login,
  getProfile,
  getAllAdmins,
  createAdmin,
  updateProfile,
  getAdminStats
};
