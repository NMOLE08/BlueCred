const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function testVerification() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bluecred');
    console.log('Connected to MongoDB');

    // Find the project
    const project = await Project.findOne({ projectId: 'PRJ_FLUTTER_001' });
    if (!project) {
      console.log('Project not found');
      return;
    }

    console.log('Project found:');
    console.log('- ID:', project.projectId);
    console.log('- Name:', project.projectName);
    console.log('- Verification Status:', project.verificationStatus);
    console.log('- Verification Details:', project.verificationDetails);

    // Update verification status directly
    project.verificationStatus = 'approved';
    project.verificationDetails = {
      verifiedAt: new Date(),
      comments: 'Direct database approval test',
      approvedCarbonCredits: 1250
    };

    await project.save();
    console.log('\n✅ Project verification updated successfully!');

    // Verify the update
    const updatedProject = await Project.findOne({ projectId: 'PRJ_FLUTTER_001' });
    console.log('\nUpdated verification status:', updatedProject.verificationStatus);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testVerification();
