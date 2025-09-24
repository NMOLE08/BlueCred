const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables from this directory explicitly so
// starting the server from any CWD still picks up blockchain-backend/.env
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const projectRoutes = require('./routes/projectRoutes');
const ngoRoutes = require('./routes/ngoRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const projectController = require('./controllers/projectController');

// Import utilities
let blockchainService;
let metamaskAccountManager;

try {
  blockchainService = require('./utils/blockchain');
  metamaskAccountManager = require('./utils/metamaskAccounts');
} catch (error) {
  console.error('Error loading utilities:', error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : [
        'http://localhost:3000', 
        'http://localhost:3001', 
        'http://localhost:8080',  // Flutter web
        'http://127.0.0.1:5002',  // Biomass frontend
        'http://localhost:8000',  // NCCR website (localhost)
        'http://127.0.0.1:8000'   // NCCR website (127.0.0.1)
      ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check blockchain connection
    const blockchainStatus = await blockchainService.checkNetworkConnection();
    
    // Get MetaMask account status
    const metamaskStats = metamaskAccountManager.getAssignmentStats();
    
    res.json({
      success: true,
      message: 'Blue Carbon Registry Blockchain Backend is running',
      data: {
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
          readyState: mongoose.connection.readyState
        },
        blockchain: blockchainStatus,
        metamask: metamaskStats,
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Contract configuration endpoint
app.get('/config', (req, res) => {
  const configData = {
    success: true,
    data: {
      contracts: {
        carbonCreditToken: process.env.CARBON_CREDIT_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
        carbonCreditMarketplace: process.env.CARBON_CREDIT_MARKETPLACE_ADDRESS || '0x0000000000000000000000000000000000000000'
      },
      network: {
        chainId: process.env.CHAIN_ID || '8546',
        rpcUrl: process.env.HARDHAT_NETWORK_URL || 'http://127.0.0.1:8546',
        name: 'Localhost 8546'
      },
      timestamp: new Date().toISOString()
    }
  };
  
  res.json(configData);
});

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/verification', verificationRoutes);

// Public endpoints for ML UI (no auth)
app.get('/api/public/projects/summaries', projectController.getProjectSummaries);
app.post('/api/public/projects/seed-demo', projectController.seedDemoProject);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Initialize blockchain service
const initializeBlockchain = async () => {
  try {
    console.log('Initializing blockchain service...');
    
    // Check network connection
    const networkStatus = await blockchainService.checkNetworkConnection();
    
    if (!networkStatus.success) {
      console.warn('Warning: Blockchain network not connected:', networkStatus.error);
      console.log('Please ensure Hardhat node is running on http://127.0.0.1:8546');
    } else {
      console.log('Blockchain network connected successfully');
      console.log(`Chain ID: ${networkStatus.chainId}, Block: ${networkStatus.blockNumber}`);
    }
    
    // Initialize contracts if addresses are provided
    if (process.env.CARBON_CREDIT_TOKEN_ADDRESS && process.env.CARBON_CREDIT_MARKETPLACE_ADDRESS) {
      blockchainService.initializeContracts(
        process.env.CARBON_CREDIT_TOKEN_ADDRESS,
        process.env.CARBON_CREDIT_MARKETPLACE_ADDRESS
      );
      console.log('Smart contracts initialized');
    } else {
      console.log('Contract addresses not provided. Please set CARBON_CREDIT_TOKEN_ADDRESS and CARBON_CREDIT_MARKETPLACE_ADDRESS in .env');
    }
    
  } catch (error) {
    console.error('Blockchain initialization error:', error);
  }
};

// Initialize MetaMask accounts
const initializeMetaMaskAccounts = () => {
  console.log('Initializing MetaMask accounts...');
  const stats = metamaskAccountManager.getAssignmentStats();
  console.log(`MetaMask accounts: ${stats.assigned}/${stats.total} assigned`);
};

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize blockchain
    await initializeBlockchain();
    
    // Initialize MetaMask accounts
    initializeMetaMaskAccounts();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`
🌊 Blue Carbon Registry Blockchain Backend Server
🚀 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Health check: http://localhost:${PORT}/health
🔗 API Base URL: http://localhost:${PORT}/api
      `);
    });
    
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});

// Start the server
startServer();
