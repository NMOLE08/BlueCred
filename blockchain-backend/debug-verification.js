const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function debugVerification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bluecred');
    console.log('Connected to MongoDB');

    const projectId = 'PRJ_COMPLETE_TEST_1758696039';
    
    console.log('\n=== Before Update ===');
    let project = await Project.findOne({ projectId });
    if (project) {
      console.log('Project found:', project.projectName);
      console.log('Current status:', project.verificationStatus);
      console.log('Verification details:', project.verificationDetails);
    } else {
      console.log('Project not found');
      return;
    }

    console.log('\n=== Updating Project ===');
    project.verificationStatus = 'approved';
    project.verificationDetails = {
      verifiedAt: new Date(),
      comments: 'Debug test approval',
      approvedCarbonCredits: 25
    };

    const saveResult = await project.save();
    console.log('Save result:', saveResult ? 'Success' : 'Failed');

    console.log('\n=== After Update (same object) ===');
    console.log('Status:', project.verificationStatus);

    console.log('\n=== After Update (fresh query) ===');
    const freshProject = await Project.findOne({ projectId });
    console.log('Fresh query status:', freshProject.verificationStatus);
    console.log('Fresh verification details:', freshProject.verificationDetails);

    console.log('\n=== Testing ML Webhook Query ===');
    const mlProject = await Project.findOne({ projectId }).populate('ngoId', 'organizationName metamaskAccount.address');
    console.log('ML webhook query status:', mlProject.verificationStatus);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

debugVerification();
