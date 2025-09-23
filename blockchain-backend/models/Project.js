const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  // Project identification
  projectId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGO',
    required: true
  },
  
  // Project details
  projectName: {
    type: String,
    required: true
  },
  projectDescription: {
    type: String,
    required: true
  },
  projectLocation: {
    type: String,
    required: true
  },
  projectType: {
    type: String,
    enum: ['mangrove', 'seagrass', 'saltmarsh', 'other'],
    required: true
  },
  
  // Media files
  beforeImages: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: Date
  }],
  afterImages: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: Date
  }],
  videos: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: Date
  }],
  
  // ML Model Results
  mlAnalysis: {
    carbonCreditsCalculated: {
      type: Number,
      default: 0
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    analysisDate: {
      type: Date,
      default: Date.now
    },
    modelVersion: {
      type: String,
      default: '1.0'
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  
  // Verification process
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationDetails: {
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    verifiedAt: Date,
    comments: String,
    approvedCarbonCredits: {
      type: Number,
      default: 0
    }
  },
  
  // Blockchain integration
  blockchainStatus: {
    type: String,
    enum: ['not_minted', 'minting', 'minted', 'failed'],
    default: 'not_minted'
  },
  transactionHash: {
    type: String,
    default: null
  },
  tokensMinted: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', projectSchema);
