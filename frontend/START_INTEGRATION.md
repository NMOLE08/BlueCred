# BlueCred Integration Quick Start Guide

## 🚀 Getting Started

This guide will help you quickly start the integrated BlueCred system with all components working together.

## 📋 Prerequisites

- Node.js (v16+)
- Flutter SDK (v3.9.2+)
- Modern web browser

## ⚡ Quick Start (5 minutes)

### 1. Start the API Server
```bash
cd api/
npm install
npm start
```
✅ Server will start on http://localhost:3002

### 2. Start the Blockchain (Optional)
```bash
# In project root
npm install
npx hardhat node
```
✅ Blockchain will start on http://localhost:8545

### 3. Open Website Frontend
```bash
# Open in browser
open website/index.html
# Or navigate to: file:///path/to/website/index.html
```
✅ Website will connect to API automatically

### 4. Run Mobile App
```bash
cd blue_carbon_app/
flutter pub get
flutter run
```
✅ Mobile app will connect to API with fallback to dummy data

## 🔧 Test the Integration

### Test Authentication
**Website:** Open browser console and run:
```javascript
BlueCred_API.apiCall('/auth/login', {
  method: 'POST', 
  body: JSON.stringify({
    email: 'admin@bluecred.com', 
    password: 'admin123'
  })
}).then(console.log);
```

**Mobile App:** Use credentials:
- Email: `admin@bluecred.com`
- Password: `admin123`

### Test Data Flow
1. **Mobile:** Submit project data
2. **Website:** Check verification queue
3. **Website:** Process verification
4. **Both:** See real-time updates

## 🎯 Key Features Working

✅ **Cross-Platform Authentication**
- Unified login across website and mobile
- JWT token-based security
- Graceful fallback to dummy data

✅ **Real-Time Data Sync**
- Live updates between components
- WebSocket notifications (demo mode)
- Automatic cache refresh

✅ **Seamless User Experience**
- Original UI/UX preserved
- Progressive enhancement
- Offline capability

✅ **Blockchain Integration**
- Smart contract connectivity
- Token operations
- Marketplace functionality

## 🔍 Monitoring Integration Health

### API Status
```bash
curl http://localhost:3002/api/health
```

### Website Console Messages
Look for these success indicators:
- `✅ BlueCred API integration loaded`
- `🏠 Dashboard integration starting...`
- `🔗 WebSocket client initialized`

### Mobile App Logs
```bash
flutter logs
```

## 🛠️ Troubleshooting

### API Server Not Starting
```bash
cd api/
npm install --force
npm start
```

### Mobile App Issues
```bash
cd blue_carbon_app/
flutter clean
flutter pub get
flutter run
```

### Website Not Connecting
- Check browser console for errors
- Verify API server is running
- Look for CORS issues

## 📊 Integration Architecture

```
Mobile App (Flutter) ←→ API Server (Node.js) ←→ Website (HTML/JS)
                              ↕
                         Blockchain (Hardhat)
```

## 🎮 Demo Mode

If blockchain/WebSocket servers aren't available, the system automatically:
- Uses mock data for development
- Simulates real-time updates
- Maintains full functionality
- Shows offline indicators

## 📈 Success Indicators

- **Green Status:** All components connected
- **Orange Status:** Partial connectivity (offline mode)
- **Red Status:** Component errors

## 🔐 Default Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bluecred.com | admin123 |
| Field User | field@bluecred.com | field123 |
| NGO User | anmol@bluecred.com | anmol123 |

## 📱 Mobile App Features

- **Real API Integration:** Connects to live backend
- **Offline Support:** Works with dummy data when offline
- **Project Management:** Full CRUD operations
- **Media Upload:** Photo/video submission
- **Real-time Sync:** Live updates from server

## 🌐 Website Features

- **Live Dashboard:** Real-time project statistics
- **Verification Queue:** Process submissions from mobile
- **Project Reports:** Detailed analysis and approval
- **Blockchain Data:** Live token and marketplace info
- **Real-time Updates:** WebSocket notifications

## 🔗 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/auth/login` | POST | User authentication |
| `/api/projects` | GET | List all projects |
| `/api/verification-queue` | GET | Pending verifications |
| `/api/dashboard/stats` | GET | Dashboard statistics |

## 🎯 Next Steps

1. **Customize Data:** Modify mock data in API server
2. **Add Features:** Extend functionality as needed  
3. **Deploy:** Follow deployment guide for production
4. **Monitor:** Set up logging and monitoring
5. **Scale:** Add database and cloud services

---

**🎉 Integration Complete!** 

The BlueCred system now works as a unified platform with seamless data flow between mobile data collection, website verification, and blockchain tokenization.
