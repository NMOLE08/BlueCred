const mongoose = require('mongoose');
const Project = require('../models/Project');
const NGO = require('../models/NGO');
require('dotenv').config();

async function seedFlutterProjects() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bluecred');
    console.log('Connected to MongoDB');

    // Find or create an NGO
    let ngo = await NGO.findOne();
    if (!ngo) {
      ngo = new NGO({
        appAccountId: 'NGO_001_FLUTTER',
        organizationName: 'Ocean Conservation Society',
        email: 'contact@oceanconservation.org',
        contactPerson: 'Dr. Marine Biologist',
        phone: '+1-555-0123',
        address: '123 Ocean Drive, Marine City, MC 12345',
        registrationNumber: 'REG-OCS-2024-001',
        metamaskAccount: {
          address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
          accountIndex: 1,
          isActive: true
        },
        totalProjects: 0
      });
      await ngo.save();
      console.log('Created NGO:', ngo.organizationName);
    }

    // Sample projects for Flutter app
    const sampleProjects = [
      {
        projectId: 'PRJ_FLUTTER_001',
        projectName: 'Sundarbans Mangrove Conservation',
        projectDescription: 'Large-scale mangrove restoration project in the Sundarbans delta region, focusing on biodiversity conservation and carbon sequestration.',
        projectLocation: 'Sundarbans, Bangladesh',
        projectType: 'mangrove',
        verificationStatus: 'approved',
        mlAnalysis: {
          carbonCreditsCalculated: 1250,
          confidenceScore: 0.92,
          analysisDate: new Date(),
          modelVersion: 'flutter-seed-v1.0'
        },
        verificationDetails: {
          verifiedBy: null,
          verifiedAt: new Date(),
          comments: 'Approved by NCCR authorities - excellent conservation impact',
          approvedCarbonCredits: 1250
        }
      },
      {
        projectId: 'PRJ_FLUTTER_002',
        projectName: 'Great Barrier Reef Seagrass Restoration',
        projectDescription: 'Seagrass meadow restoration project aimed at protecting marine ecosystems and enhancing carbon storage capacity.',
        projectLocation: 'Queensland, Australia',
        projectType: 'seagrass',
        verificationStatus: 'under_review',
        mlAnalysis: {
          carbonCreditsCalculated: 890,
          confidenceScore: 0.87,
          analysisDate: new Date(),
          modelVersion: 'flutter-seed-v1.0'
        }
      },
      {
        projectId: 'PRJ_FLUTTER_003',
        projectName: 'California Salt Marsh Protection',
        projectDescription: 'Comprehensive salt marsh ecosystem protection and restoration initiative along the California coast.',
        projectLocation: 'San Francisco Bay, California',
        projectType: 'saltmarsh',
        verificationStatus: 'pending',
        mlAnalysis: {
          carbonCreditsCalculated: 650,
          confidenceScore: 0.89,
          analysisDate: new Date(),
          modelVersion: 'flutter-seed-v1.0'
        }
      },
      {
        projectId: 'PRJ_FLUTTER_004',
        projectName: 'Kerala Backwater Mangrove Project',
        projectDescription: 'Community-driven mangrove plantation project in Kerala backwaters to combat coastal erosion and climate change.',
        projectLocation: 'Kerala, India',
        projectType: 'mangrove',
        verificationStatus: 'approved',
        mlAnalysis: {
          carbonCreditsCalculated: 780,
          confidenceScore: 0.94,
          analysisDate: new Date(),
          modelVersion: 'flutter-seed-v1.0'
        },
        verificationDetails: {
          verifiedBy: null,
          verifiedAt: new Date(),
          comments: 'Approved - strong community engagement and measurable impact',
          approvedCarbonCredits: 780
        }
      },
      {
        projectId: 'PRJ_FLUTTER_005',
        projectName: 'Mediterranean Seagrass Conservation',
        projectDescription: 'Posidonia oceanica seagrass conservation project in the Mediterranean Sea to preserve marine biodiversity.',
        projectLocation: 'Mediterranean Sea, Spain',
        projectType: 'seagrass',
        verificationStatus: 'rejected',
        mlAnalysis: {
          carbonCreditsCalculated: 420,
          confidenceScore: 0.65,
          analysisDate: new Date(),
          modelVersion: 'flutter-seed-v1.0'
        },
        verificationDetails: {
          verifiedBy: null,
          verifiedAt: new Date(),
          comments: 'Rejected - insufficient documentation and low confidence score',
          approvedCarbonCredits: 0
        }
      }
    ];

    // Clear existing Flutter projects
    await Project.deleteMany({ projectId: { $regex: /^PRJ_FLUTTER_/ } });
    console.log('Cleared existing Flutter projects');

    // Insert new projects
    for (const projectData of sampleProjects) {
      projectData.ngoId = ngo._id;
      const project = new Project(projectData);
      await project.save();
      console.log(`Created project: ${project.projectName}`);
    }

    // Update NGO project count
    const projectCount = await Project.countDocuments({ ngoId: ngo._id });
    ngo.totalProjects = projectCount;
    await ngo.save();

    console.log('\n✅ Flutter projects seeded successfully!');
    console.log(`📊 Total projects: ${projectCount}`);
    console.log(`🏢 NGO: ${ngo.organizationName}`);

  } catch (error) {
    console.error('Error seeding Flutter projects:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
if (require.main === module) {
  seedFlutterProjects();
}

module.exports = seedFlutterProjects;
