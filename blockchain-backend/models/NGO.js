const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema({
  // App account details
  appAccountId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  organizationName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  contactPerson: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // MetaMask account mapping
  metamaskAccount: {
    address: {
      type: String,
      required: true,
      unique: true
    },
    privateKey: {
      type: String,
      required: true
    },
    accountIndex: {
      type: Number,
      required: true,
      min: 1,
      max: 6
    }
  },
  
  // Project tracking
  totalProjects: {
    type: Number,
    default: 0
  },
  verifiedProjects: {
    type: Number,
    default: 0
  },
  totalCarbonCredits: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
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
ngoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('NGO', ngoSchema);
