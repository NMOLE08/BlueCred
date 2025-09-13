// Unified Authentication Middleware for BlueCred System
// This middleware handles authentication across all components

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock user database (in production, this would be a real database)
const users = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@bluecred.com',
    password: '$2a$10$rOvHq8p1mBKKmFnU8tQxOeX8K9vJ2nF3qL4mP6sR7tU8vW9xY0zA2', // 'admin123'
    role: 'admin',
    walletAddress: '0x742d35Cc6634C0532925a3b8D404fddF4f780EAD',
    createdAt: new Date('2024-01-01'),
    isActive: true
  },
  {
    id: '2',
    name: 'Field User',
    email: 'field@bluecred.com',
    password: '$2a$10$rOvHq8p1mBKKmFnU8tQxOeX8K9vJ2nF3qL4mP6sR7tU8vW9xY0zA2', // 'field123'
    role: 'field_user',
    walletAddress: '0x8ba1f109551bD432803012645Hac136c30C6213c',
    createdAt: new Date('2024-01-15'),
    isActive: true
  },
  {
    id: '3',
    name: 'Anmol K',
    email: 'anmol@bluecred.com',
    password: '$2a$10$rOvHq8p1mBKKmFnU8tQxOeX8K9vJ2nF3qL4mP6sR7tU8vW9xY0zA2', // 'anmol123'
    role: 'field_user',
    walletAddress: '0x9Cc9a2c777605Af16872E0997b3Aeb91d96D5FA2',
    createdAt: new Date('2024-02-01'),
    isActive: true
  }
];

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'bluecred-super-secret-key-2024';
const JWT_EXPIRES_IN = '24h';

class AuthService {
  // Generate JWT token
  static generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Hash password
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  // Compare password
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Find user by email
  static findUserByEmail(email) {
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  // Find user by ID
  static findUserById(id) {
    return users.find(user => user.id === id);
  }

  // Create new user
  static async createUser(userData) {
    const existingUser = this.findUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await this.hashPassword(userData.password);
    const newUser = {
      id: (users.length + 1).toString(),
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      role: userData.role || 'field_user',
      walletAddress: userData.walletAddress || null,
      createdAt: new Date(),
      isActive: true
    };

    users.push(newUser);
    return newUser;
  }

  // Login user
  static async loginUser(email, password) {
    const user = this.findUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    const token = this.generateToken(user);
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token,
      expiresIn: JWT_EXPIRES_IN
    };
  }

  // Get user profile
  static getUserProfile(userId) {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Update user profile
  static async updateUserProfile(userId, updateData) {
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const allowedUpdates = ['name', 'walletAddress'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    users[userIndex] = { ...users[userIndex], ...updates };
    
    const { password: _, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = AuthService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// Role-based authorization middleware
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = AuthService.verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // Token is invalid, but we continue without authentication
      req.user = null;
    }
  }

  next();
};

module.exports = {
  AuthService,
  authenticateToken,
  authorizeRole,
  optionalAuth
};
