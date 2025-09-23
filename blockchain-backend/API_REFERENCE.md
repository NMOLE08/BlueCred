# 🔗 Blue Carbon Registry - API Reference

## **Base URL**: `http://localhost:5001/api`

---

## 🔐 **Authentication**

### **Admin Login**
```bash
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@nccr.gov",
  "password": "admin123"
}

# Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "68c4164b980e85fc4431b259",
      "email": "admin@nccr.gov",
      "role": "nccr_admin"
    }
  }
}
```

---

## 🏢 **NGO Management**

### **Get All NGOs**
```bash
GET /api/ngos
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "data": {
    "ngos": [
      {
        "organizationName": "Ocean Conservation Society",
        "email": "contact@oceanconservation.org",
        "metamaskAccount": {
          "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        }
      }
    ]
  }
}
```

### **Create NGO**
```bash
POST /api/ngos
Authorization: Bearer <token>
Content-Type: application/json

{
  "organizationName": "New NGO",
  "email": "contact@newngo.org",
  "contactPerson": "John Doe",
  "phone": "+1-555-0123",
  "address": "123 Main St, City, State 12345"
}
```

---

## 📋 **Project Management**

### **Create Project**
```bash
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "ngoId": "68c4164b980e85fc4431b25f",
  "projectName": "Mangrove Restoration",
  "projectType": "mangrove",
  "projectLocation": "Sundarbans, India",
  "projectDescription": "Restoring mangrove forests for carbon capture"
}

# Response:
{
  "success": true,
  "data": {
    "project": {
      "projectId": "PRJ_1757682035393_83u7sdmt7",
      "verificationStatus": "pending",
      "blockchainStatus": "not_minted"
    }
  }
}
```

### **Update ML Analysis**
```bash
PUT /api/projects/{projectId}/ml-analysis
Authorization: Bearer <token>
Content-Type: application/json

{
  "carbonCreditsCalculated": 200,
  "confidenceScore": 0.95,
  "modelVersion": "2.1",
  "analysisNotes": "High confidence analysis"
}
```

### **NCCR Verification**
```bash
PUT /api/projects/{projectId}/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "approvedCredits": 200,
  "comments": "Project verified and approved",
  "verificationAction": "approved"
}

# Response:
{
  "success": true,
  "data": {
    "project": {
      "verificationStatus": "approved",
      "blockchainStatus": "minted",
      "tokensMinted": 200,
      "transactionHash": "0x6689ac287af6b95661b8454d7c5c783f7ba731bcbc1500ce621c7075cd117bfd"
    }
  }
}
```

### **Get All Projects**
```bash
GET /api/projects
Authorization: Bearer <token>

# Query Parameters:
# ?status=pending&ngoId=123&page=1&limit=10
```

---

## 👨‍💼 **Admin Management**

### **Get Admin Profile**
```bash
GET /api/admin/profile
Authorization: Bearer <token>
```

### **Get System Statistics**
```bash
GET /api/admin/stats
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "data": {
    "totalProjects": 4,
    "pendingVerification": 0,
    "approvedProjects": 1,
    "totalTokensMinted": 200
  }
}
```

---

## 🔍 **Health Check**

### **System Status**
```bash
GET /health

# Response:
{
  "success": true,
  "data": {
    "database": {"status": "connected"},
    "blockchain": {"connected": true, "chainId": "8546"},
    "metamask": {"total": 6, "assigned": 3}
  }
}
```

---

## 🚨 **Error Responses**

### **Authentication Error**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### **Validation Error**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    "Project name must be at least 3 characters long."
  ]
}
```

### **Not Found Error**
```json
{
  "success": false,
  "message": "Project not found."
}
```

---

## 🔧 **Integration Examples**

### **Complete Workflow Example**

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:5001/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@nccr.gov',
    password: 'admin123'
  })
});
const { data: { token } } = await loginResponse.json();

// 2. Create Project
const projectResponse = await fetch('http://localhost:5001/api/projects', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ngoId: '68c4164b980e85fc4431b25f',
    projectName: 'Test Project',
    projectType: 'mangrove',
    projectLocation: 'Test Location',
    projectDescription: 'Test project description'
  })
});

// 3. Update ML Analysis
const mlResponse = await fetch(`http://localhost:5001/api/projects/${projectId}/ml-analysis`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    carbonCreditsCalculated: 100,
    confidenceScore: 0.9,
    modelVersion: '2.1'
  })
});

// 4. Verify Project
const verifyResponse = await fetch(`http://localhost:5001/api/projects/${projectId}/verify`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    approvedCredits: 100,
    comments: 'Project approved',
    verificationAction: 'approved'
  })
});
```

---

## 📝 **Notes**

- All endpoints require authentication except `/health`
- Use `Authorization: Bearer <token>` header for authenticated requests
- Project IDs are generated automatically (format: `PRJ_<timestamp>_<random>`)
- Token minting happens automatically upon project verification
- All timestamps are in ISO 8601 format
