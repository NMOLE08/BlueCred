# 🚀 Blue Carbon Registry - Quick Start Guide

## **For Your Development Team**

---

## ⚡ **5-Minute Setup**

### **1. Start the Blockchain Network**
```bash
# Terminal 1: Start Hardhat node
cd /Users/adityajadhav/BlueCred/BlueCred/blue-carbon-registry
npx hardhat node --port 8546
```

### **2. Start the Backend API**
```bash
# Terminal 2: Start backend server
cd /Users/adityajadhav/BlueCred/BlueCred/blockchain-backend
PORT=5001 node server.js
```

### **3. Verify Everything is Working**
```bash
# Test the API
curl http://localhost:5001/health
```

---

## 🔗 **Integration URLs**

| Service | URL | Status |
|---------|-----|--------|
| **Backend API** | `http://localhost:5001` | ✅ Ready |
| **Blockchain RPC** | `http://localhost:8546` | ✅ Ready |
| **Health Check** | `http://localhost:5001/health` | ✅ Ready |

---

## 🧪 **Quick Test**

### **Test Admin Login**
```bash
curl -X POST http://localhost:5001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@nccr.gov", "password": "admin123"}'
```

### **Test Project Creation**
```bash
# First get a token from login response, then:
curl -X POST http://localhost:5001/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ngoId": "68c4164b980e85fc4431b25f",
    "projectName": "Test Project",
    "projectType": "mangrove",
    "projectLocation": "Test Location",
    "projectDescription": "Test project for integration"
  }'
```

---

## 📱 **For NGO App Integration**

### **Key Endpoints:**
- `POST /api/projects` - Create projects
- `PUT /api/projects/:id/ml-analysis` - Send ML results
- `GET /api/projects/:id` - Check project status

### **Example Integration:**
```javascript
const API_BASE = 'http://localhost:5001/api';

// Create project
const createProject = async (projectData) => {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(projectData)
  });
  return response.json();
};

// Send ML analysis
const updateMLAnalysis = async (projectId, analysisData) => {
  const response = await fetch(`${API_BASE}/projects/${projectId}/ml-analysis`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(analysisData)
  });
  return response.json();
};
```

---

## 🖥️ **For Admin Website Integration**

### **Key Endpoints:**
- `POST /api/admin/login` - Admin authentication
- `GET /api/projects` - Get all projects
- `PUT /api/projects/:id/verify` - Verify projects
- `GET /api/admin/stats` - Dashboard statistics

### **Example Integration:**
```javascript
// Admin login
const adminLogin = async (email, password) => {
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
};

// Verify project
const verifyProject = async (projectId, verificationData) => {
  const response = await fetch(`${API_BASE}/projects/${projectId}/verify`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(verificationData)
  });
  return response.json();
};
```

---

## 🔗 **For Blockchain/Frontend Integration**

### **Contract Addresses:**
- **Token Contract**: `0x5fbdb2315678afecb367f032d93f642f64180aa3`
- **Marketplace Contract**: `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`

### **Network Configuration:**
```javascript
const networkConfig = {
  rpcUrl: 'http://localhost:8546',
  chainId: 8546,
  tokenAddress: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  marketplaceAddress: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512'
};
```

### **NGO MetaMask Accounts:**
```javascript
const ngoAccounts = {
  'NGO_001': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  'NGO_002': '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  'NGO_003': '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
};
```

---

## 🎯 **Ready-to-Use Test Data**

### **Admin Credentials:**
- **Email**: `admin@nccr.gov`
- **Password**: `admin123`

### **NGO IDs:**
- Ocean Conservation Society: `68c4164b980e85fc4431b25f`
- Blue Carbon Initiative: `68c4164b980e85fc4431b262`
- Mangrove Restoration Foundation: `68c4164b980e85fc4431b265`

---

## 🚨 **Troubleshooting**

### **Port Already in Use:**
```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9

# Kill process on port 8546
lsof -ti:8546 | xargs kill -9
```

### **Database Connection Issues:**
```bash
# Make sure MongoDB is running
brew services start mongodb-community
```

### **Blockchain Connection Issues:**
```bash
# Make sure Hardhat node is running
cd blue-carbon-registry
npx hardhat node --port 8546
```

---

## 📞 **Support**

- **Backend API**: Running on port 5001
- **Blockchain**: Running on port 8546
- **Database**: MongoDB on default port 27017
- **Status Check**: `http://localhost:5001/health`

---

## 🎉 **You're Ready to Go!**

All systems are operational and ready for integration. The token minting has been tested and is working perfectly.

**Happy coding!** 🚀
