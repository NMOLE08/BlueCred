const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function approveProject() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bluecred');
    
    const project = await Project.findOne({ projectId: 'PRJ_FLUTTER_002' });
    if (!project) {
      console.log('Project not found');
      return;
    }
    
    console.log('Before update:');
    console.log('- Verification Status:', project.verificationStatus);
    
    // Update verification status
    project.verificationStatus = 'approved';
    project.verificationDetails = {
      verifiedAt: new Date(),
      comments: 'Direct approval for integration test',
      approvedCarbonCredits: 890
    };
    
    await project.save();
    console.log('✅ Project approved successfully');
    
    // Verify the update
    const updatedProject = await Project.findOne({ projectId: 'PRJ_FLUTTER_002' });
    console.log('After update:');
    console.log('- Verification Status:', updatedProject.verificationStatus);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

approveProject();
