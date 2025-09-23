# 🧪 Complete Testing Guide - Blue Carbon Registry

This guide will show you how to test the complete system flow with real MetaMask accounts and transactions.

## 🚀 **Step 1: Start the System**

### Terminal 1 - Start Hardhat Node
```bash
npm run node
```
This starts the local blockchain with unlimited ETH for testing.

### Terminal 2 - Deploy Contracts
```bash
npm run deploy
```
This deploys contracts and creates sample projects with realistic CO₂e amounts.

### Terminal 3 - Start React DApp
```bash
npm run start
```
This starts the React DApp at http://localhost:3001

## 🔧 **Step 2: Setup MetaMask**

### Add Local Network to MetaMask
1. Open MetaMask
2. Go to Settings → Networks → Add Network
3. Enter these details:
   - **Network Name**: Localhost 8546
   - **RPC URL**: http://127.0.0.1:8546
   - **Chain ID**: 8546
   - **Currency Symbol**: ETH

### Import Test Accounts
Import these accounts to MetaMask using their private keys:

**Account #0 (Owner)**
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Role: Contract Owner (can create and verify projects)

**Account #1 (NGO1 - Green Earth Foundation)**
- Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- Role: NGO (receives carbon credits)

**Account #2 (NGO2 - Ocean Conservation Society)**
- Address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- Private Key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
- Role: NGO (receives carbon credits)

**Account #3 (Company1 - Carbon Offset Buyer)**
- Address: `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
- Private Key: `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6`
- Role: Company (buys carbon credits)

## 🧪 **Step 3: Test Complete Flow**

### Test 1: Verify Project Creation and Token Distribution
1. **Connect as Owner (Account #0)**
   - Open DApp at http://localhost:3001
   - Click "Connect MetaMask"
   - Select Account #0
   - You should see "OWNER" badge

2. **Check Projects Tab**
   - Go to "Projects" tab
   - You should see 3 projects already created:
     - Mangrove Restoration: 2,500 NCT ≈ 9,985,000 tons CO₂e
     - Seagrass Conservation: 1,800 NCT ≈ 7,189,200 tons CO₂e
     - Salt Marsh Protection: 1,200 NCT ≈ 4,792,800 tons CO₂e

3. **Verify Token Distribution**
   - Switch to Account #1 (NGO1) in MetaMask
   - Refresh the DApp
   - Check Dashboard - should show 2,500 NCT tokens
   - Switch to Account #2 (NGO2)
   - Check Dashboard - should show 1,800 NCT tokens

### Test 2: Test Marketplace Trading
1. **Connect as NGO1 (Account #1)**
   - Switch to Account #1 in MetaMask
   - Go to "Marketplace" tab
   - Click "List Tokens for Sale"
   - Enter:
     - Token Amount: 100
     - Price per Token: 0.0002504 (market rate)
     - Description: "Mangrove carbon credits for sale"
   - Click "List Tokens"

2. **Check Listing**
   - The listing should appear in the marketplace
   - Shows: 100 NCT (399,400 tons CO₂e) at 0.0002504 ETH each
   - Total Price: 0.02504 ETH

### Test 3: Test Company Purchase and NGO Payment
1. **Connect as Company1 (Account #3)**
   - Switch to Account #3 in MetaMask
   - Go to "Marketplace" tab
   - You should see the listing from NGO1
   - Click "Purchase for 0.02504 ETH"

2. **Verify Transaction**
   - MetaMask will pop up asking to confirm
   - Check the transaction details
   - Confirm the transaction
   - Wait for confirmation

3. **Check Balances After Purchase**
   - **Company1 (Account #3)**:
     - Should have 100 NCT tokens
     - ETH balance should decrease by ~0.02504 ETH
   - **NGO1 (Account #1)**:
     - Should have 2,400 NCT tokens (2,500 - 100)
     - ETH balance should increase by ~0.024414 ETH (after 2.5% marketplace fee)

### Test 4: Test Token Retirement
1. **Connect as Company1 (Account #3)**
   - Go to "Marketplace" tab
   - Click "Retire Tokens"
   - Enter:
     - Amount: 50
     - Reason: "Offset company emissions for Q1 2024"
   - Click "Retire Tokens"

2. **Verify Retirement**
   - Company1 should have 50 NCT tokens remaining
   - 50 NCT tokens should be permanently retired
   - This represents 199,700 tons CO₂e offset

## 🔍 **Step 4: Verify Everything Works**

### Check Transaction History
1. Go to "Transactions" tab
2. You should see:
   - Project creation events
   - Token minting events
   - Token listing events
   - Token purchase events
   - Token retirement events

### Check Conversion Rates
1. Go to "Dashboard" tab
2. Verify conversion rates are displayed:
   - 1 NCT ≈ 0.0002504 ETH
   - 1 ETH ≈ 3,994 NCT
   - 1 NCT ≈ 3,994 tons CO₂e

### Check Environmental Impact
1. Dashboard should show:
   - Total NCT in circulation
   - Total CO₂e equivalent
   - Retired tokens and their CO₂e impact

## 🎯 **Expected Results**

After completing all tests, you should see:

### Token Distribution
- **NGO1**: 2,400 NCT (9,585,600 tons CO₂e)
- **NGO2**: 1,800 NCT (7,189,200 tons CO₂e)
- **Company1**: 50 NCT (199,700 tons CO₂e)

### Financial Flow
- **NGO1 received**: ~0.024414 ETH (after marketplace fee)
- **Company1 paid**: ~0.02504 ETH
- **Marketplace fee**: ~0.000626 ETH (2.5%)

### Environmental Impact
- **Total CO₂e in circulation**: 16,974,500 tons
- **Retired CO₂e**: 199,700 tons
- **Active CO₂e**: 16,774,800 tons

## 🚨 **Troubleshooting**

### If transactions fail:
1. Make sure Hardhat node is running
2. Check MetaMask is connected to localhost network
3. Ensure you have enough ETH (should be unlimited on localhost)
4. Check browser console for errors

### If balances don't update:
1. Refresh the DApp
2. Switch accounts in MetaMask and back
3. Check MetaMask transaction history

### If contracts aren't deployed:
1. Run `npm run deploy` again
2. Check terminal for deployment addresses
3. Update contract addresses in frontend if needed

## 🎉 **Success Indicators**

You'll know everything is working when:
- ✅ NGOs receive NCT tokens after project verification
- ✅ Companies can purchase tokens from NGOs
- ✅ NGOs receive ETH payments (minus marketplace fee)
- ✅ Tokens can be retired to offset emissions
- ✅ All transactions are visible in the DApp
- ✅ Conversion rates are correctly displayed
- ✅ Environmental impact is accurately calculated

This proves the complete carbon credit trading system is working end-to-end! 🌊🌱
