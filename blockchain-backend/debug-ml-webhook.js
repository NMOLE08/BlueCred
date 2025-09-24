const mongoose = require('mongoose');
const Project = require('./models/Project');
const NGO = require('./models/NGO');
require('dotenv').config();

async function debugMLWebhook() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bluecred');
    
    const projectId = 'PRJ_FLUTTER_002';
    console.log('Looking for project:', projectId);
    
    // This is the same query as in the ML webhook
    let project = await Project.findOne({ projectId }).populate('ngoId', 'organizationName metamaskAccount.address');
    
    if (!project) {
      console.log('❌ Project not found with populate query');
      
      // Try without populate
      project = await Project.findOne({ projectId });
      if (project) {
        console.log('✅ Project found without populate');
        console.log('- Verification Status:', project.verificationStatus);
        console.log('- NGO ID:', project.ngoId);
      } else {
        console.log('❌ Project not found at all');
      }
    } else {
      console.log('✅ Project found with populate query');
      console.log('- Verification Status:', project.verificationStatus);
      console.log('- NGO:', project.ngoId?.organizationName);
    }
    
    // Check NGOs
    const ngos = await NGO.find({});
    console.log('\nNGOs in database:', ngos.length);
    ngos.forEach(ngo => {
      console.log(`- ${ngo.organizationName} (${ngo._id})`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugMLWebhook();
