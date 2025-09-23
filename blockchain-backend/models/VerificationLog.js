const mongoose = require('mongoose');

const verificationLogSchema = new mongoose.Schema({
  // Project reference
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGO',
    required: true
  },
  
  // Verification details
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  verificationAction: {
    type: String,
    enum: ['approved', 'rejected', 'requested_changes'],
    required: true
  },
  
  // Carbon credit details
  mlCalculatedCredits: {
    type: Number,
    required: true
  },
  approvedCredits: {
    type: Number,
    required: true
  },
  creditDifference: {
    type: Number,
    required: true
  },
  
  // Verification comments
  comments: {
    type: String,
    required: true
  },
  internalNotes: {
    type: String
  },
  
  // Blockchain transaction details
  blockchainTransaction: {
    transactionHash: String,
    blockNumber: Number,
    gasUsed: Number,
    status: {
      type: String,
      enum: ['pending', 'success', 'failed']
    },
    tokensMinted: Number
  },
  
  // Timestamps
  verifiedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VerificationLog', verificationLogSchema);
