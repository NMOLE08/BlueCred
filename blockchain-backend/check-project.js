const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function checkProject() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bluecred');
    const project = await Project.findOne({ projectId: 'PRJ_FLUTTER_002' });
    console.log('Project found:', !!project);
    if (project) {
      console.log('Verification Status:', project.verificationStatus);
      console.log('Project Name:', project.projectName);
      console.log('NGO ID:', project.ngoId);
    } else {
      console.log('Project PRJ_FLUTTER_002 not found in database');
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProject();
