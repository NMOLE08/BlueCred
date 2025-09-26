const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function approveProject() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bluecred');
    
    const projectId = 'PRJ_FLUTTER_002';
    console.log('Approving project:', projectId);
    
    const project = await Project.findOne({ projectId });
    
    if (!project) {
      console.log('❌ Project not found');
      return;
    }
    
    console.log('Current status:', project.verificationStatus);
    
    // Update project status to approved
    project.verificationStatus = 'approved';
    project.verificationDetails = {
      verifiedBy: null, // Will be set by proper verification process
      verifiedAt: new Date(),
      comments: 'Auto-approved for biomass tokenization demo',
      approvedCarbonCredits: 1250
    };
    
    await project.save();
    
    console.log('✅ Project approved successfully');
    console.log('New status:', project.verificationStatus);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

approveProject();
