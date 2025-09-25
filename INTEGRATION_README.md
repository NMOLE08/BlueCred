# BlueCred Complete Integration

This repository contains the complete BlueCred ecosystem with all components integrated.

## 🏗️ Project Structure

```
BlueCred/
├── biomass-frontend-worktree/     # Biomass estimation and tokenization UI (Flask)
├── blockchain-backend/            # Node.js API with blockchain integration
├── blue-carbon-registry/         # Hardhat blockchain project + React DApp
├── blue_carbon_app/              # Flutter mobile/web application
├── website/                      # NCCR authorities website (HTML/CSS/JS)
└── INTEGRATION_README.md         # This file
```

## 🚀 Components Overview

### 1. **Biomass Frontend** (`biomass-frontend-worktree/`)
- **Purpose**: ML-based biomass estimation and carbon tokenization
- **Technology**: Python Flask, OpenCV, YOLOv8
- **Port**: 5002
- **Features**: 
  - Video processing for biomass estimation
  - Direct tokenization to blockchain
  - Integration with blockchain backend

### 2. **Blockchain Backend** (`blockchain-backend/`)
- **Purpose**: API layer for blockchain interactions
- **Technology**: Node.js, Express, MongoDB, ethers.js
- **Port**: 5001
- **Features**:
  - Project management
  - Token minting (multiple mints per project)
  - NGO and admin management
  - ML webhook integration

### 3. **Blue Carbon Registry** (`blue-carbon-registry/`)
- **Purpose**: Core blockchain infrastructure and DApp
- **Technology**: Hardhat, React TypeScript, Solidity
- **Ports**: 8546 (blockchain), 3001 (DApp)
- **Features**:
  - Smart contracts (NCT tokens, marketplace)
  - React DApp for token management
  - Real-time balance updates

### 4. **Flutter Mobile App** (`blue_carbon_app/`)
- **Purpose**: Mobile application for stakeholders
- **Technology**: Flutter, Dart
- **Features**:
  - Cross-platform (iOS, Android, Web)
  - User authentication
  - Project data management
  - Blue carbon project tracking

### 5. **NCCR Authorities Website** (`website/`)
- **Purpose**: Web interface for regulatory authorities
- **Technology**: HTML, CSS, JavaScript, Leaflet maps
- **Features**:
  - Project verification interface
  - Interactive maps
  - Reporting dashboard
  - Verification workflows

## 🔗 Integration Points

### Backend Integration
- **Biomass Frontend** ↔ **Blockchain Backend**: ML webhook for tokenization
- **Blockchain Backend** ↔ **Smart Contracts**: Direct blockchain interaction
- **DApp** ↔ **Smart Contracts**: Web3 integration via MetaMask

### Data Flow
1. **Project Creation**: Flutter App/Manual → Backend Database → Pending Status
2. **Biomass Estimation**: Video → ML Processing → Carbon Credits Calculation → Pending Verification
3. **Verification**: NCCR Website → Authority Review → Approve/Reject → Database Update
4. **Tokenization**: Approved Projects → Blockchain Backend → Smart Contract Minting
5. **Token Management**: Smart Contract → DApp Display → User Interface

### Verification Workflow
```
Project Submission → Pending Status → NCCR Review → Approved/Rejected
                                           ↓
                                    (If Approved)
                                           ↓
                              Tokenization Enabled → Blockchain Minting
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- Flutter SDK
- MetaMask browser extension

### Quick Start
```bash
# 1. Start Hardhat blockchain
cd blue-carbon-registry
npm install
npx hardhat node

# 2. Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# 3. Start blockchain backend
cd ../blockchain-backend
npm install
PORT=5001 node server.js

# 4. Start biomass frontend
cd ../biomass-frontend-worktree
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
FLASK_APP=app.py flask run --port 5002

# 5. Start React DApp
cd ../blue-carbon-registry/frontend
npm install
npm start

# 6. Start Flutter app (optional)
cd ../blue_carbon_app
flutter pub get
flutter run -d web-server --web-port 8080

# 7. Serve NCCR website (optional)
cd ../website
python -m http.server 8000
```

## 🌐 Access Points

- **Biomass Frontend**: http://127.0.0.1:5002
- **React DApp**: http://localhost:3001
- **Blockchain API**: http://127.0.0.1:5001
- **Hardhat Network**: http://127.0.0.1:8546
- **Flutter Web**: http://localhost:8080
- **NCCR Website**: http://localhost:8000/nccr-authorities.html

## 🔧 Configuration

### Smart Contract Addresses (Update after deployment)
```
CarbonCreditToken: 0x68B1D87F95878fE05B998F19b66F4baba5De1aed
CarbonCreditMarketplace: 0x3Aa5ebB10DC797CAC828524e59A333d0A371443c
```

### Network Configuration
```
Network Name: Localhost 8546
RPC URL: http://127.0.0.1:8546
Chain ID: 8546
Currency Symbol: ETH
```

## 📱 Mobile App Features

The Flutter app (`blue_carbon_app/`) provides:
- **Welcome Screen**: App introduction and navigation
- **Authentication**: Login/signup functionality
- **Homepage**: Project overview and statistics
- **Data Entry**: Add new project data
- **Cross-platform**: Works on iOS, Android, and Web

## 🌍 NCCR Authorities Website

The website (`website/`) provides:
- **Main Dashboard**: `nccr-authorities.html` - Project overview with interactive maps
- **Verification Interface**: `verification.html` - Detailed project verification
- **Reports**: `report.html` - Comprehensive reporting system
- **Interactive Maps**: Leaflet-based project location mapping

## 🔄 Integration Status

✅ **Completed Integrations**:
- Biomass Frontend ↔ Blockchain Backend
- Smart Contracts ↔ React DApp
- Multiple mints per project support
- Real-time balance updates
- Clean UI formatting

✅ **Verification Workflow Integration**:
- NCCR authorities website connected to backend API
- Project verification gates implemented
- Tokenization only allowed for approved projects
- Flutter app integrated with real project data
- Cross-component data synchronization working

🔄 **Next Steps**:
- Enhanced authentication system
- Real-time notifications
- Advanced reporting features
- Mobile app deployment

## 🚀 Production Deployment

For production deployment:
1. Configure environment variables for each component
2. Set up proper database connections
3. Deploy smart contracts to mainnet/testnet
4. Configure CORS and security settings
5. Set up monitoring and logging

## 📞 Support

For integration support or questions, refer to individual component READMEs or contact the development team.
