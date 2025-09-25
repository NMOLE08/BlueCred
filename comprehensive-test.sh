#!/bin/bash

echo "🧪 Comprehensive Integration Test"
echo "================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}1. Testing Services Status${NC}"
echo "Hardhat Network: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8546)"
echo "Backend API: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/health)"
echo "Biomass Frontend: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5002)"
echo "NCCR Website: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/nccr-authorities.html)"

echo -e "\n${BLUE}2. Testing Project Status${NC}"
PROJECT_STATUS=$(curl -s "http://127.0.0.1:5001/api/verification/project/PRJ_FLUTTER_002" | jq -r '.data.project.verificationStatus')
echo "PRJ_FLUTTER_002 Status: $PROJECT_STATUS"

echo -e "\n${BLUE}3. Testing Direct Database${NC}"
cd blockchain-backend
DB_STATUS=$(node -e "
const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bluecred');
  const project = await Project.findOne({ projectId: 'PRJ_FLUTTER_002' });
  console.log(project ? project.verificationStatus : 'NOT_FOUND');
  await mongoose.disconnect();
}
check();
")
echo "Database Status: $DB_STATUS"
cd ..

echo -e "\n${BLUE}4. Testing Verification API${NC}"
VERIFY_RESULT=$(curl -s -X POST "http://127.0.0.1:5001/api/verification/project/PRJ_FLUTTER_002/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "comments": "Final integration test",
    "approvedCarbonCredits": 890
  }' | jq -r '.success')
echo "Verification API Result: $VERIFY_RESULT"

echo -e "\n${BLUE}5. Testing Project Status After Verification${NC}"
sleep 1
PROJECT_STATUS_AFTER=$(curl -s "http://127.0.0.1:5001/api/verification/project/PRJ_FLUTTER_002" | jq -r '.data.project.verificationStatus')
echo "PRJ_FLUTTER_002 Status After: $PROJECT_STATUS_AFTER"

echo -e "\n${BLUE}6. Testing Tokenization${NC}"
TOKENIZE_RESULT=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/PRJ_FLUTTER_002/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{
    "carbonKg": 50000,
    "confidenceScore": 0.95,
    "modelVersion": "comprehensive-test",
    "autoApprove": true,
    "recipientAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  }' | jq -r '.success')
echo "Tokenization Result: $TOKENIZE_RESULT"

echo -e "\n${BLUE}7. Summary${NC}"
if [ "$VERIFY_RESULT" = "true" ] && [ "$PROJECT_STATUS_AFTER" = "approved" ] && [ "$TOKENIZE_RESULT" = "true" ]; then
    echo -e "${GREEN}✅ All tests passed! Integration is working.${NC}"
else
    echo -e "${RED}❌ Some tests failed. Check the results above.${NC}"
fi
