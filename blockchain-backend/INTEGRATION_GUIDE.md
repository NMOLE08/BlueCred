# 🔗 Integration Guide

This guide explains how to integrate the backend with your existing NGO app and the blockchain system.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NGO Mobile    │    │ Blockchain API  │    │  Blockchain     │
│      App        │◄──►│   (This Repo)   │◄──►│   (Main Repo)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Project Data   │    │   MongoDB       │    │  MetaMask       │
│  ML Analysis    │    │   Database      │    │  Accounts       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 Integration Workflow

### 1. NGO Registration Flow

```mermaid
sequenceDiagram
    participant App as NGO App
    participant Backend as Backend API
    participant DB as MongoDB
    participant MM as MetaMask Manager

    App->>Backend: POST /api/ngos (NGO data)
    Backend->>MM: Get next available account
    MM-->>Backend: MetaMask account details
    Backend->>DB: Save NGO with MetaMask mapping
    Backend-->>App: NGO created with MetaMask address
```

### 2. Project Verification Flow

```mermaid
sequenceDiagram
    participant App as NGO App
    participant Backend as Backend API
    participant ML as ML Service
    participant Admin as NCCR Admin
    participant BC as Blockchain

    App->>Backend: POST /api/projects (project data)
    App->>Backend: Upload media files
    ML->>Backend: PUT /api/projects/:id/ml-analysis
    Backend->>DB: Update project with ML results
    Admin->>Backend: PUT /api/projects/:id/verify
    Backend->>BC: Mint tokens to NGO MetaMask
    BC-->>Backend: Transaction hash
    Backend-->>Admin: Verification complete
```

## 📱 NGO App Integration

### API Endpoints for Your App

#### 1. Create Project
```http
POST /api/projects
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "ngoId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "projectName": "Mangrove Restoration Project",
  "projectDescription": "Restoring 50 hectares of mangrove forest",
  "projectLocation": "Sundarbans, Bangladesh",
  "projectType": "mangrove"
}
```

#### 2. Upload ML Analysis Results
```http
PUT /api/projects/{projectId}/ml-analysis
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "carbonCreditsCalculated": 15000,
  "confidenceScore": 0.95,
  "modelVersion": "2.1",
  "rawData": {
    "area_hectares": 50,
    "carbon_density": 300,
    "confidence_factors": {...}
  }
}
```

#### 3. Get Project Status
```http
GET /api/projects/{projectId}
Authorization: Bearer <admin_token>
```

Response includes:
- Verification status
- ML analysis results
- Blockchain transaction details
- Token minting status

## 🔐 Authentication

### Admin Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@nccr.gov",
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "email": "admin@nccr.gov",
      "role": "nccr_admin"
    }
  }
}
```

### Using the Token
Include the token in all subsequent requests:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🏦 MetaMask Account Management

### Pre-assigned Accounts
The system manages 6 MetaMask accounts that are automatically assigned to NGOs:

| Account | Address | Assigned To |
|---------|---------|-------------|
| 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | NGO1 |
| 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | NGO2 |
| 3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | Company1 |
| 4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | NGO3 |
| 5 | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | NGO4 |
| 6 | `0x976EA74026E726554dB657fA54763abd0C3a0aa9` | NGO5 |

### Check Account Status
```http
GET /api/ngos/metamask-status
Authorization: Bearer <admin_token>
```

## 🔗 Blockchain Integration

### Contract Addresses
After deploying your smart contracts, update the `.env` file:

```env
CARBON_CREDIT_TOKEN_ADDRESS=0x...
CARBON_CREDIT_MARKETPLACE_ADDRESS=0x...
```

### Token Minting
When a project is verified, tokens are automatically minted:

```javascript
// Conversion: 1 NCT ≈ 3,994 tons CO₂e
const nctTokens = Math.floor(carbonCreditsInTons / 3994);
```

### Transaction Details
After verification, the project will contain:
```json
{
  "blockchainStatus": "minted",
  "transactionHash": "0x...",
  "tokensMinted": 3,
  "verificationStatus": "approved"
}
```

## 🎯 NCCR Admin Workflow

### 1. Login to Admin Panel
Use the default credentials or create new admin accounts.

### 2. Review Pending Projects
```http
GET /api/projects/pending-verification
Authorization: Bearer <admin_token>
```

### 3. Verify Project
```http
PUT /api/projects/{projectId}/verify
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "verificationAction": "approved",
  "approvedCredits": 12000,
  "comments": "Project meets all verification criteria. Approved for 12,000 tons CO₂e."
}
```

### 4. View Verification Logs
```http
GET /api/projects/logs/verification
Authorization: Bearer <admin_token>
```

## 📊 Monitoring and Health Checks

### System Health
```http
GET /health
```

Returns:
- Database connection status
- Blockchain network status
- MetaMask account assignments
- System environment info

### Key Metrics
- Total NGOs registered
- Projects pending verification
- Tokens minted
- Verification success rate

## 🚨 Important Considerations

### Security
- All API endpoints require authentication
- Role-based access control (super_admin, nccr_admin, nccr_verifier)
- Rate limiting enabled
- Input validation on all endpoints

### Data Integrity
- All verification actions are logged
- Blockchain transactions are tracked
- ML analysis results are stored with confidence scores
- Audit trail for all admin actions

### Error Handling
- Comprehensive error responses
- Blockchain transaction failure handling
- Database connection error recovery
- Graceful degradation when services are unavailable

## 🔧 Development Setup

### 1. Start the Blockchain Backend
```bash
cd blockchain-backend
npm install
npm run setup  # Initialize database
npm run dev    # Start development server
```

### 2. Start the Blockchain
```bash
cd ../blue-carbon-registry
npm run node    # Start Hardhat network
npm run deploy  # Deploy contracts
```

### 3. Update Contract Addresses
After deployment, update the blockchain-backend `.env` file with the contract addresses.

### 4. Test Integration
Use the health endpoint to verify all systems are connected:
```http
GET http://localhost:5000/health
```

## 📞 Support

For integration issues:
1. Check the health endpoint
2. Verify blockchain network connection
3. Ensure MongoDB is running
4. Check MetaMask account assignments
5. Review API logs for detailed error messages

The blockchain backend is designed to work seamlessly with your existing NGO app while maintaining the exact blockchain functionality from the main repository.
