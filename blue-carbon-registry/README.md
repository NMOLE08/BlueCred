# 🌊 Blue Carbon Registry - Blockchain Prototype

A blockchain-based carbon credit registry and MRV (Monitoring, Reporting, and Verification) system for blue carbon projects using Nature Carbon Tonnes (NCT).

## 💰 Carbon Credit Conversion Rates

- **1 NCT ≈ 0.0002504 ETH**
- **1 ETH ≈ 3,994 NCT**  
- **1 NCT ≈ 3,994 tons CO₂e**

*Based on current market rates from KlimaDAO and Nature Carbon Tonne standards*

## 🚀 Features

- **Smart Contracts**: Carbon credit tokenization and marketplace
- **MetaMask Integration**: Seamless wallet connection
- **Local Blockchain**: Hardhat network for development
- **React DApp**: Transaction visibility and management interface
- **Token Management**: Mint, trade, and retire NCT tokens (1 NCT ≈ 3,994 tons CO₂e)

## 📋 Prerequisites

- Node.js (v16 or higher)
- MetaMask browser extension
- Git

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm run setup
```

This will install all dependencies for both the blockchain backend and React frontend.

### 2. Start the Local Blockchain

```bash
npm run node
```

This starts a local Hardhat node on `http://127.0.0.1:8546` with Chain ID `8546`.

### 3. Deploy Smart Contracts

In a new terminal:

```bash
npm run deploy
```

This deploys the CarbonCreditToken and CarbonCreditMarketplace contracts and creates sample projects.

### 4. Add Local Network to MetaMask

1. Open MetaMask
2. Go to Settings → Networks → Add Network
3. Enter the following details:
   - **Network Name**: Localhost 8546
   - **RPC URL**: http://127.0.0.1:8546
   - **Chain ID**: 8546
   - **Currency Symbol**: ETH

### 5. Import Test Accounts

Import these test accounts to MetaMask using their private keys (from Hardhat):

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Owner)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (NGO1)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (NGO2)
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

Account #3: 0x90F79bf6EB2c4f870365E785982E1f101E93b906 (Company1)
Private Key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
```

### 6. Start the React DApp

```bash
npm run start
```

The DApp will open at `http://localhost:3001`.

## 🎯 How to Use

### For Contract Owners (Account #0)
1. Connect MetaMask with the owner account
2. Go to "Projects" tab
3. Create new carbon credit projects
4. Verify projects and mint tokens to NGO wallets

### For NGOs (Accounts #1, #2)
1. Connect MetaMask with NGO account
2. Go to "Marketplace" tab
3. List carbon credit tokens for sale
4. Set price per token in ETH

### For Companies (Account #3)
1. Connect MetaMask with company account
2. Go to "Marketplace" tab
3. Purchase carbon credit tokens
4. Retire tokens to offset emissions

## 📊 Smart Contracts

### CarbonCreditToken.sol
- ERC20 token representing carbon credits
- Project creation and verification
- Token minting and retirement
- Owner-only functions for project management

### CarbonCreditMarketplace.sol
- Token listing and trading
- Purchase functionality with ETH payments
- Marketplace fees (2.5% default)
- Listing management

## 🔧 Development

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Deploy to Local Network
```bash
npm run deploy
```

## 📁 Project Structure

```
blue-carbon-registry/
├── contracts/           # Smart contracts
│   ├── CarbonCreditToken.sol
│   └── CarbonCreditMarketplace.sol
├── scripts/            # Deployment scripts
│   └── deploy.js
├── frontend/           # React DApp
│   ├── src/
│   │   ├── components/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
├── hardhat.config.js   # Hardhat configuration
└── package.json        # Root package.json
```

## 🌟 Key Features

- **Transparent Transactions**: All transactions visible in the DApp
- **Token Retirement**: Prevents double-counting of carbon credits
- **Marketplace Trading**: Buy and sell carbon credits with ETH
- **Project Verification**: Owner-controlled project approval process
- **MetaMask Integration**: Seamless wallet connectivity

## 🚨 Important Notes

- This is a **prototype** for demonstration purposes
- Uses local blockchain network (not mainnet)
- Test accounts have unlimited ETH for testing
- Contract addresses will change on each deployment

## 🔗 Network Details

- **Network Name**: Localhost 8546
- **RPC URL**: http://127.0.0.1:8546
- **Chain ID**: 8546
- **Currency Symbol**: ETH
- **Block Explorer**: None (local network)

## 📞 Support

For issues or questions, please check the console logs and ensure:
1. MetaMask is connected to the correct network
2. Hardhat node is running
3. Contracts are deployed
4. You're using the correct test accounts
