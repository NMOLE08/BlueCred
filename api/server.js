const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

// Import JsonRpcProvider explicitly
const { JsonRpcProvider } = require('@ethersproject/providers');

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:5500',
      'http://localhost:8000',
      'http://localhost',
      'file://'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import route modules
const authRoutes = require('./auth/auth-routes');
const { optionalAuth } = require('./auth/auth-middleware');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Blockchain connection setup
let provider, carbonToken, marketplace;
const HARDHAT_RPC_URL = 'http://127.0.0.1:8546';

// Contract ABIs (simplified)
const CARBON_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function createProject(string memory projectId, string memory projectName, string memory ngoName, uint256 carbonCredits)",
  "function verifyProjectAndMint(string memory projectId, address ngoWallet)",
  "function getProject(string memory projectId) view returns (string, string, uint256, uint256, bool, bool)",
  "function retireTokens(uint256 amount, string memory reason)",
  "function getRetiredTokens(address account) view returns (uint256)",
  "event ProjectCreated(string indexed projectId, string projectName, string ngoName, uint256 carbonCredits)",
  "event TokensMinted(string indexed projectId, address indexed ngo, uint256 amount)",
  "event TokensRetired(address indexed company, uint256 amount, string reason)"
];

const MARKETPLACE_ABI = [
  "function listTokens(uint256 tokenAmount, uint256 pricePerToken, string memory description)",
  "function purchaseTokens(uint256 listingId) payable",
  "function getListing(uint256 listingId) view returns (address seller, uint256 tokenAmount, uint256 pricePerToken, bool isActive, uint256 timestamp, string description)",
  "function getTotalListings() view returns (uint256)",
  "event TokenListed(uint256 indexed listingId, address indexed seller, uint256 tokenAmount, uint256 pricePerToken)",
  "event TokenPurchased(uint256 indexed listingId, address indexed buyer, uint256 tokenAmount, uint256 totalPrice)"
];

// Initialize blockchain connection with retry logic
async function initializeBlockchain() {
  const maxRetries = 1; // Only try once to avoid delays
  let retryCount = 0;
  
  // Skip blockchain connection in development if HARDHAT_RPC_URL is not set
  if (process.env.NODE_ENV === 'development' && !process.env.HARDHAT_RPC_URL) {
    console.log('⚠️  Skipping blockchain connection in development mode');
    provider = null;
    carbonToken = null;
    marketplace = null;
    return false;
  }
  
  while (retryCount < maxRetries) {
    try {
      console.log(`🔗 Connecting to blockchain (Attempt ${retryCount + 1}/${maxRetries})...`);
      
      // Use environment variable or fallback to default
      const rpcUrl = process.env.HARDHAT_RPC_URL || HARDHAT_RPC_URL;
      provider = new JsonRpcProvider({
        url: rpcUrl,
        timeout: 3000, // Shorter timeout for faster fallback
        allowGzip: true,
        skipFetchSetup: true // Skip fetch setup for Node.js
      });
      
      // Test connection with a simple request
      const network = await provider.getNetwork();
      console.log(`✅ Connected to ${network.name} (chainId: ${network.chainId})`);
      
      // Get signer (first account from Hardhat)
      const signer = provider.getSigner(0);
      
      // Load contracts
      carbonToken = new ethers.Contract(CARBON_TOKEN_ADDRESS, CARBON_TOKEN_ABI, signer);
      marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      
      console.log('✅ Smart contracts initialized');
      return true;
      
    } catch (error) {
      retryCount++;
      console.error(`❌ Blockchain connection failed (Attempt ${retryCount}/${maxRetries}):`, error.message);
      
      if (retryCount >= maxRetries) {
        console.warn('⚠️  Proceeding in offline mode - blockchain features will be limited');
        provider = null;
        carbonToken = null;
        marketplace = null;
        return false;
      }
    }
  }
}

// In-memory storage for integration data (in production, use a database)
let projectData = {};
let userData = {};
let verificationQueue = [
  {
    id: 'proj-001',
    projectName: 'Sunderbans',
    location: 'West Bengal, India',
    organization: 'Sunderbans Conservation Society',
    status: 'Pending',
    submissionDate: new Date().toISOString(),
    area: 1250, // in hectares
    estimatedCarbonSequestration: 2500, // in tons
    documents: []
  },
  {
    id: 'proj-002',
    projectName: 'SeaGrass Meadows',
    location: 'Tamil Nadu, India',
    organization: 'Marine Conservation Trust',
    status: 'In Review',
    submissionDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    area: 850, // in hectares
    estimatedCarbonSequestration: 1800, // in tons
    documents: []
  },
  {
    id: 'proj-003',
    projectName: 'Mangrove Restoration',
    location: 'Odisha, India',
    organization: 'Coastal Protection Initiative',
    status: 'Pending',
    submissionDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    area: 2000, // in hectares
    estimatedCarbonSequestration: 4000, // in tons
    documents: []
  }
];

// Authentication routes
app.use('/api/auth', authRoutes);

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'BlueCred API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get all projects with blockchain data
app.get('/api/projects', async (req, res) => {
  try {
    const projects = [];
    
    // Get projects from blockchain
    const projectIds = ['MANGROVE_001', 'SEAGRASS_002', 'SALTMARSH_003'];
    
    for (const projectId of projectIds) {
      try {
        const project = await carbonToken.getProject(projectId);
        const projectInfo = {
          id: projectId,
          name: project[0],
          ngoName: project[1],
          carbonCredits: ethers.formatEther(project[2]),
          timestamp: new Date(Number(project[3]) * 1000).toISOString(),
          isVerified: project[4],
          isRetired: project[5],
          // Add additional data from our storage
          ...projectData[projectId]
        };
        projects.push(projectInfo);
      } catch (error) {
        console.error(`Error fetching project ${projectId}:`, error);
      }
    }
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await carbonToken.getProject(projectId);
    
    const projectInfo = {
      id: projectId,
      name: project[0],
      ngoName: project[1],
      carbonCredits: ethers.formatEther(project[2]),
      timestamp: new Date(Number(project[3]) * 1000).toISOString(),
      isVerified: project[4],
      isRetired: project[5],
      ...projectData[projectId]
    };
    
    res.json(projectInfo);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Project not found' });
  }
});

// Add project data (from mobile app)
app.post('/api/projects/:id/data', upload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
]), (req, res) => {
  try {
    const projectId = req.params.id;
    const data = req.body;
    
    // Store uploaded files info
    const files = {
      photos: req.files?.photos?.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
      })) || [],
      videos: req.files?.videos?.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
      })) || []
    };
    
    // Store project data
    if (!projectData[projectId]) {
      projectData[projectId] = { submissions: [] };
    }
    
    const submission = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      dataType: data.dataType,
      healthStatus: data.healthStatus,
      saplingsPlanted: data.saplingsPlanted,
      avgSaplingHeight: data.avgSaplingHeight,
      files,
      submittedBy: data.submittedBy || 'Unknown'
    };
    
    projectData[projectId].submissions.push(submission);
    
    // Add to verification queue
    verificationQueue.push({
      projectId,
      submissionId: submission.id,
      status: 'Pending',
      timestamp: submission.timestamp,
      type: data.dataType
    });
    
    res.json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error('Error adding project data:', error);
    res.status(500).json({ error: 'Failed to add project data' });
  }
});

// Get verification queue
app.get('/api/verification-queue', (req, res) => {
  try {
    // Return the verification queue with all necessary fields
    const queue = verificationQueue.map(item => ({
      id: item.id,
      projectName: item.projectName,
      location: item.location,
      organization: item.organization,
      status: item.status,
      submissionDate: item.submissionDate,
      area: item.area,
      estimatedCarbonSequestration: item.estimatedCarbonSequestration
    }));
    
    res.json(queue);
  } catch (error) {
    console.error('Error fetching verification queue:', error);
    res.status(500).json({ error: 'Failed to fetch verification queue' });
  }
});

// Update verification status
app.put('/api/verification/:submissionId', (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    const { status, reviewerComment, bcrsToIssue } = req.body;
    
    const queueItem = verificationQueue.find(item => item.submissionId === submissionId);
    if (queueItem) {
      queueItem.status = status;
      queueItem.reviewerComment = reviewerComment;
      queueItem.bcrsToIssue = bcrsToIssue;
      queueItem.reviewedAt = new Date().toISOString();
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating verification:', error);
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// Get marketplace listings
app.get('/api/marketplace/listings', async (req, res) => {
  try {
    const totalListings = await marketplace.getTotalListings();
    const listings = [];
    
    for (let i = 1; i <= Number(totalListings); i++) {
      try {
        const listing = await marketplace.getListing(i);
        if (listing.isActive) {
          listings.push({
            id: i,
            seller: listing.seller,
            tokenAmount: ethers.formatEther(listing.tokenAmount),
            pricePerToken: ethers.formatEther(listing.pricePerToken),
            totalPrice: ethers.formatEther(listing.tokenAmount * listing.pricePerToken / ethers.parseEther("1")),
            description: listing.description,
            timestamp: new Date(Number(listing.timestamp) * 1000).toISOString()
          });
        }
      } catch (error) {
        console.error(`Error fetching listing ${i}:`, error);
      }
    }
    
    res.json(listings);
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace listings' });
  }
});

// Get user token balance
app.get('/api/users/:address/balance', async (req, res) => {
  try {
    const address = req.params.address;
    const balance = await carbonToken.balanceOf(address);
    const retiredTokens = await carbonToken.getRetiredTokens(address);
    
    res.json({
      address,
      tokenBalance: ethers.formatEther(balance),
      retiredTokens: ethers.formatEther(retiredTokens)
    });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ error: 'Failed to fetch user balance' });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    let stats;
    
    if (provider) {
      // Try to get real data if blockchain is connected
      try {
        const totalSupply = await carbonToken.totalSupply();
        const totalListings = await marketplace.getTotalListings();
        stats = {
          totalSupply: totalSupply.toString(),
          totalListings: totalListings.toNumber(),
          activeProjects: Object.keys(projectData).length,
          totalCarbonCredits: '50000' // This would come from blockchain in production
        };
      } catch (error) {
        console.error('Error fetching blockchain data, falling back to mock data:', error.message);
        stats = mockBlockchainResponse();
      }
    } else {
      // Use mock data if blockchain is not connected
      console.log('Using mock blockchain data for dashboard stats');
      stats = mockBlockchainResponse();
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error in /api/dashboard/stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple authentication (in production, use proper authentication)
  const users = {
    'admin@bluecred.com': { password: 'admin123', role: 'admin', name: 'Admin User' },
    'ngo@bluecred.com': { password: 'ngo123', role: 'ngo', name: 'NGO User' },
    'field@bluecred.com': { password: 'field123', role: 'field', name: 'Field User' }
  };
  
  const user = users[email];
  if (user && user.password === password) {
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    res.json({
      success: true,
      token,
      user: {
        email,
        name: user.name,
        role: user.role
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Helper functions
function getProjectLocation(projectId) {
  const locations = {
    'MANGROVE_001': 'West Bengal, India',
    'SEAGRASS_002': 'Tamil Nadu, India',
    'SALTMARSH_003': 'Gujarat, India'
  };
  return locations[projectId] || 'Unknown Location';
}

function getProjectOrganization(projectId) {
  const organizations = {
    'MANGROVE_001': 'Green Earth Foundation',
    'SEAGRASS_002': 'Ocean Conservation Society',
    'SALTMARSH_003': 'Coastal Guardians NGO'
  };
  return organizations[projectId] || 'Unknown Organization';
}

// Mock blockchain responses when offline
function mockBlockchainResponse() {
  return {
    totalSupply: '1000000',
    totalListings: 5,
    activeProjects: 3,
    totalCarbonCredits: '50000'
  };
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BlueCred API Server running on port ${PORT}`);
  console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
  
  // Initialize blockchain in the background
  if (process.env.NODE_ENV !== 'test') {
    initializeBlockchain().then(connected => {
      if (connected) {
        console.log('🔗 Blockchain integration: ACTIVE');
      } else {
        console.log('⚠️  Blockchain integration: OFFLINE (using mock data)');
      }
    }).catch(error => {
      console.error('❌ Error initializing blockchain:', error.message);
    });
  }
  
  console.log('\n🌐 Available API Endpoints:');
  console.log('   📝 POST   /api/projects');
  console.log('   🔍 GET    /api/projects/:id');
  console.log('   📊 GET    /api/verification-queue');
  console.log('   📈 GET    /api/dashboard/stats');
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n💡 Development Notes:');
    console.log('   - To enable blockchain features, start a local node:');
    console.log('     $ npx hardhat node');
    console.log('   - Then set the RPC URL:');
    console.log('     $ set HARDHAT_RPC_URL=http://localhost:8545');
    console.log('   - Or run the server with:');
    console.log('     $ HARDHAT_RPC_URL=http://localhost:8545 npm start');
  }
});

module.exports = app;
