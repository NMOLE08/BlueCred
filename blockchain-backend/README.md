# 🌊 Blue Carbon Registry Blockchain Backend

Blockchain Backend API for the Blue Carbon Registry and MRV (Monitoring, Reporting, and Verification) system. This blockchain backend integrates with the existing blockchain system to manage NGO accounts, project verification, and carbon credit token transfers.

## 🚀 Features

- **NGO Management**: Map NGO app accounts to MetaMask accounts
- **Project Verification**: NCCR authorities can verify restoration projects
- **ML Integration**: Receive carbon credit calculations from ML models
- **Blockchain Integration**: Mint tokens to verified projects
- **Admin Dashboard**: Complete admin interface for NCCR authorities
- **Secure Authentication**: JWT-based authentication with role-based access

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Running Hardhat blockchain network (from the main repository)
- MetaMask accounts (6 predefined accounts)

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
cd blockchain-backend
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Update the `.env` file with your configuration:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/blue-carbon-registry

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Blockchain Configuration (from existing repo)
HARDHAT_NETWORK_URL=http://127.0.0.1:8546
CHAIN_ID=8546

# Contract Addresses (update after deployment)
CARBON_CREDIT_TOKEN_ADDRESS=
CARBON_CREDIT_MARKETPLACE_ADDRESS=

# Owner Private Key (for contract interactions)
OWNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 3. Start MongoDB

Make sure MongoDB is running on your system.

### 4. Setup Database

Initialize the database with default admin accounts and sample NGOs:

```bash
npm run setup
```

This will create:
- 3 default admin accounts (super admin, NCCR admin, verifier)
- 3 sample NGOs with assigned MetaMask accounts
- Proper database indexes

### 5. Start the Backend Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 🔗 API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/profile` - Get admin profile
- `PUT /api/admin/profile` - Update admin profile

### NGO Management
- `GET /api/ngos` - Get all NGOs
- `POST /api/ngos` - Create new NGO (super admin only)
- `GET /api/ngos/:id` - Get NGO by ID
- `PUT /api/ngos/:id` - Update NGO
- `GET /api/ngos/metamask-status` - Get MetaMask account status

### Project Management
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:projectId/ml-analysis` - Update ML analysis results
- `PUT /api/projects/:projectId/verify` - Verify project (NCCR only)
- `GET /api/projects/pending-verification` - Get pending projects

### Health Check
- `GET /health` - System health check

## 🔐 Default Admin Credentials

After running the setup script, you can use these credentials:

- **Super Admin**: `superadmin@nccr.gov` / `superadmin123`
- **NCCR Admin**: `admin@nccr.gov` / `admin123`
- **Verifier**: `verifier@nccr.gov` / `verifier123`

## 🏗️ Architecture

### Database Models

- **NGO**: NGO organization data with MetaMask account mapping
- **Project**: Restoration projects with ML analysis and verification status
- **Admin**: NCCR admin accounts with role-based permissions
- **VerificationLog**: Audit trail of all verification actions

### MetaMask Account Management

The system manages 6 predefined MetaMask accounts:
1. `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (NGO1)
2. `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (NGO2)
3. `0x90F79bf6EB2c4f870365E785982E1f101E93b906` (Company1)
4. `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` (NGO3)
5. `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` (NGO4)
6. `0x976EA74026E726554dB657fA54763abd0C3a0aa9` (NGO5)

### Blockchain Integration

- Connects to Hardhat network on `http://127.0.0.1:8546`
- Uses owner private key for contract interactions
- Mints NCT tokens based on verified carbon credits
- Conversion rate: 1 NCT ≈ 3,994 tons CO₂e

## 🔄 Workflow

1. **NGO Registration**: NGOs are created and assigned MetaMask accounts
2. **Project Creation**: NGOs create restoration projects
3. **ML Analysis**: ML models calculate carbon credits from uploaded media
4. **Verification**: NCCR authorities review and verify projects
5. **Token Minting**: Approved projects receive NCT tokens in their MetaMask accounts
6. **Trading**: NGOs can list, sell, and retire tokens using the existing frontend

## 🛡️ Security Features

- JWT-based authentication
- Role-based access control
- Rate limiting
- Input validation
- Helmet security headers
- CORS configuration

## 📊 Monitoring

The `/health` endpoint provides:
- Database connection status
- Blockchain network status
- MetaMask account assignment status
- System environment information

## 🚨 Important Notes

- This backend integrates with the existing blockchain system without modifications
- MetaMask accounts are pre-assigned and cannot be changed
- Token minting only occurs after NCCR verification
- All transactions are logged for audit purposes
- The system maintains the exact carbon credit conversion rates from the main repository

## 🔧 Development

### Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run setup` - Initialize database with default data

### File Structure

```
blockchain-backend/
├── controllers/     # API route handlers
├── middleware/      # Authentication and validation
├── models/         # Database models
├── routes/         # API routes
├── scripts/        # Setup and utility scripts
├── utils/          # Blockchain and MetaMask utilities
└── server.js       # Main server file
```

## 📞 Support

For issues or questions:
1. Check the console logs
2. Verify blockchain network connection
3. Ensure MongoDB is running
4. Check MetaMask account assignments
5. Review the health endpoint for system status
