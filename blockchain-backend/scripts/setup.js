const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const NGO = require('../models/NGO');
const metamaskAccountManager = require('../utils/metamaskAccounts');
require('dotenv').config();

const setupDatabase = async () => {
  try {
    console.log('🔧 Setting up Blue Carbon Registry Blockchain Backend Database...');
    
    // Check for required environment variables
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Database connected');

    // Clear existing data (optional - remove in production)
    if (process.env.NODE_ENV === 'development') {
      await Admin.deleteMany({});
      await NGO.deleteMany({});
      console.log('🧹 Cleared existing data');
    }

    // Create default admin accounts
    const defaultAdmins = [
      {
        adminId: 'ADM_SUPER_001',
        email: 'superadmin@nccr.gov',
        password: 'superadmin123',
        fullName: 'Super Administrator',
        role: 'super_admin',
        department: 'NCCR'
      },
      {
        adminId: 'ADM_NCCR_001',
        email: 'admin@nccr.gov',
        password: 'admin123',
        fullName: 'NCCR Administrator',
        role: 'nccr_admin',
        department: 'NCCR'
      },
      {
        adminId: 'ADM_VER_001',
        email: 'verifier@nccr.gov',
        password: 'verifier123',
        fullName: 'NCCR Verifier',
        role: 'nccr_verifier',
        department: 'NCCR'
      }
    ];

    for (const adminData of defaultAdmins) {
      const existingAdmin = await Admin.findOne({ email: adminData.email });
      if (!existingAdmin) {
        const admin = new Admin(adminData);
        await admin.save();
        console.log(`✅ Created admin: ${adminData.fullName} (${adminData.email})`);
      } else {
        console.log(`⚠️  Admin already exists: ${adminData.email}`);
      }
    }

    // Create sample NGOs with MetaMask account assignments
    const sampleNGOs = [
      {
        appAccountId: 'NGO_001',
        organizationName: 'Ocean Conservation Society',
        email: 'contact@oceanconservation.org',
        contactPerson: 'Dr. Sarah Johnson',
        phone: '+1-555-0101',
        address: '123 Marine Drive, Coastal City, CC 12345',
        registrationNumber: 'REG-OCS-2024-001'
      },
      {
        appAccountId: 'NGO_002',
        organizationName: 'Blue Carbon Initiative',
        email: 'info@bluecarbon.org',
        contactPerson: 'Michael Chen',
        phone: '+1-555-0102',
        address: '456 Ocean Boulevard, Seaside, SS 67890',
        registrationNumber: 'REG-BCI-2024-002'
      },
      {
        appAccountId: 'NGO_003',
        organizationName: 'Mangrove Restoration Foundation',
        email: 'hello@mangrovefoundation.org',
        contactPerson: 'Dr. Maria Rodriguez',
        phone: '+1-555-0103',
        address: '789 Wetland Way, Marshland, ML 11111',
        registrationNumber: 'REG-MRF-2024-003'
      }
    ];

    for (const ngoData of sampleNGOs) {
      const existingNGO = await NGO.findOne({ 
        $or: [
          { appAccountId: ngoData.appAccountId },
          { email: ngoData.email }
        ]
      });
      
      if (!existingNGO) {
        // Get next available MetaMask account
        const availableAccount = metamaskAccountManager.getNextAvailableAccount();
        
        if (availableAccount) {
          // Assign MetaMask account
          metamaskAccountManager.assignAccount(availableAccount.accountIndex, ngoData.appAccountId);
          
          const ngo = new NGO({
            ...ngoData,
            metamaskAccount: {
              address: availableAccount.address,
              privateKey: availableAccount.privateKey,
              accountIndex: availableAccount.accountIndex
            }
          });
          
          await ngo.save();
          console.log(`✅ Created NGO: ${ngoData.organizationName} with MetaMask account ${availableAccount.address}`);
        } else {
          console.log(`⚠️  No available MetaMask accounts for NGO: ${ngoData.organizationName}`);
        }
      } else {
        console.log(`⚠️  NGO already exists: ${ngoData.organizationName}`);
      }
    }

    // Display setup summary
    console.log('\n📊 Setup Summary:');
    console.log('================');
    
    const adminCount = await Admin.countDocuments();
    const ngoCount = await NGO.countDocuments();
    const metamaskStats = metamaskAccountManager.getAssignmentStats();
    
    console.log(`👥 Admins created: ${adminCount}`);
    console.log(`🏢 NGOs created: ${ngoCount}`);
    console.log(`🔑 MetaMask accounts assigned: ${metamaskStats.assigned}/${metamaskStats.total}`);
    
    console.log('\n🔐 Default Admin Credentials:');
    console.log('============================');
    console.log('Super Admin: superadmin@nccr.gov / superadmin123');
    console.log('NCCR Admin: admin@nccr.gov / admin123');
    console.log('Verifier: verifier@nccr.gov / verifier123');
    
    console.log('\n🌊 Blue Carbon Registry Blockchain Backend Setup Complete!');
    console.log('Run "npm run dev" to start the server');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
