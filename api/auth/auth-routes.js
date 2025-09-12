// Authentication Routes for BlueCred System
// Handles login, registration, and user management endpoints

const express = require('express');
const { AuthService, authenticateToken, authorizeRole } = require('./auth-middleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Attempt login
    const result = await AuthService.loginUser(email, password);

    res.json({
      success: true,
      message: 'Login successful',
      ...result
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, walletAddress } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Create user
    const newUser = await AuthService.createUser({
      name,
      email,
      password,
      walletAddress
    });

    // Generate token for immediate login
    const token = AuthService.generateToken(newUser);
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: userWithoutPassword,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const userProfile = AuthService.getUserProfile(req.user.id);
    
    res.json({
      success: true,
      user: userProfile
    });

  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, walletAddress } = req.body;
    
    const updatedUser = await AuthService.updateUserProfile(req.user.id, {
      name,
      walletAddress
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/auth/verify-token
router.post('/verify-token', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const decoded = AuthService.verifyToken(token);
    const userProfile = AuthService.getUserProfile(decoded.id);

    res.json({
      success: true,
      valid: true,
      user: userProfile
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      valid: false,
      message: 'Invalid or expired token'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  // In a real implementation, you might want to blacklist the token
  // For now, we'll just return a success response
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// GET /api/auth/users (Admin only)
router.get('/users', authenticateToken, authorizeRole(['admin']), (req, res) => {
  try {
    // Get all users without passwords
    const allUsers = AuthService.getAllUsers();
    
    res.json({
      success: true,
      users: allUsers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
