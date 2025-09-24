#!/bin/bash

echo "🎯 Final Integration Test - Complete Verification Workflow"
echo "=========================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ID="PRJ_INTEGRATION_TEST_$(date +%s)"

echo -e "\n${BLUE}Step 1: Create a new test project via ML webhook${NC}"
CREATE_RESULT=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/$PROJECT_ID/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{
    "carbonKg": 10000,
    "confidenceScore": 0.85,
    "modelVersion": "integration-test-setup",
    "autoApprove": false
  }')

echo "Project creation result:"
echo "$CREATE_RESULT" | jq '.'

echo -e "\n${BLUE}Step 2: Verify project exists and is pending${NC}"
sleep 2
PROJECT_CHECK=$(curl -s "http://127.0.0.1:5001/api/verification/project/$PROJECT_ID")
INITIAL_STATUS=$(echo "$PROJECT_CHECK" | jq -r '.data.project.verificationStatus // "not_found"')
echo "Initial project status: $INITIAL_STATUS"

if [ "$INITIAL_STATUS" = "pending" ]; then
    echo -e "${GREEN}✅ Project created successfully with pending status${NC}"
else
    echo -e "${RED}❌ Project creation failed or wrong status${NC}"
    exit 1
fi

echo -e "\n${BLUE}Step 3: Approve the project via NCCR verification${NC}"
VERIFY_RESULT=$(curl -s -X POST "http://127.0.0.1:5001/api/verification/project/$PROJECT_ID/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "comments": "Final integration test - approved for tokenization",
    "approvedCarbonCredits": 100
  }')

VERIFY_SUCCESS=$(echo "$VERIFY_RESULT" | jq -r '.success')
echo "Verification result: $VERIFY_SUCCESS"

if [ "$VERIFY_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Project approved successfully${NC}"
else
    echo -e "${RED}❌ Project approval failed${NC}"
    echo "$VERIFY_RESULT" | jq '.'
    exit 1
fi

echo -e "\n${BLUE}Step 4: Verify project status is now approved${NC}"
sleep 2
PROJECT_CHECK_AFTER=$(curl -s "http://127.0.0.1:5001/api/verification/project/$PROJECT_ID")
APPROVED_STATUS=$(echo "$PROJECT_CHECK_AFTER" | jq -r '.data.project.verificationStatus')
echo "Project status after approval: $APPROVED_STATUS"

if [ "$APPROVED_STATUS" = "approved" ]; then
    echo -e "${GREEN}✅ Project status correctly updated to approved${NC}"
else
    echo -e "${RED}❌ Project status not updated correctly${NC}"
    exit 1
fi

echo -e "\n${BLUE}Step 5: Test tokenization for approved project${NC}"
TOKENIZE_RESULT=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/$PROJECT_ID/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{
    "carbonKg": 100000,
    "confidenceScore": 0.95,
    "modelVersion": "final-integration-test",
    "autoApprove": true,
    "recipientAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  }')

TOKENIZE_SUCCESS=$(echo "$TOKENIZE_RESULT" | jq -r '.success')
MINTED=$(echo "$TOKENIZE_RESULT" | jq -r '.data.minted // false')

echo "Tokenization result:"
echo "$TOKENIZE_RESULT" | jq '.'

if [ "$TOKENIZE_SUCCESS" = "true" ] && [ "$MINTED" = "true" ]; then
    echo -e "${GREEN}✅ Tokenization successful!${NC}"
else
    echo -e "${RED}❌ Tokenization failed${NC}"
fi

echo -e "\n${BLUE}Step 6: Test rejection workflow${NC}"
REJECT_PROJECT_ID="PRJ_REJECT_TEST_$(date +%s)"

# Create another project via ML webhook
curl -s -X POST "http://127.0.0.1:5001/api/projects/$REJECT_PROJECT_ID/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{
    "carbonKg": 5000,
    "confidenceScore": 0.70,
    "modelVersion": "rejection-test-setup",
    "autoApprove": false
  }' > /dev/null

sleep 1

# Reject the project
REJECT_RESULT=$(curl -s -X POST "http://127.0.0.1:5001/api/verification/project/$REJECT_PROJECT_ID/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "comments": "Integration test - insufficient documentation",
    "approvedCarbonCredits": 0
  }')

REJECT_SUCCESS=$(echo "$REJECT_RESULT" | jq -r '.success')
echo "Rejection result: $REJECT_SUCCESS"

# Try to tokenize rejected project
REJECTED_TOKENIZE=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/$REJECT_PROJECT_ID/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{
    "carbonKg": 50000,
    "confidenceScore": 0.95,
    "modelVersion": "rejection-test",
    "autoApprove": true,
    "recipientAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  }')

REJECTED_SUCCESS=$(echo "$REJECTED_TOKENIZE" | jq -r '.success')

if [ "$REJECTED_SUCCESS" = "false" ]; then
    echo -e "${GREEN}✅ Rejected project correctly blocked from tokenization${NC}"
else
    echo -e "${RED}❌ Rejected project was allowed to tokenize${NC}"
fi

echo -e "\n${YELLOW}=== FINAL RESULTS ===${NC}"
if [ "$TOKENIZE_SUCCESS" = "true" ] && [ "$MINTED" = "true" ] && [ "$REJECTED_SUCCESS" = "false" ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Complete verification workflow is working!${NC}"
    echo -e "${GREEN}✅ Project creation: Working${NC}"
    echo -e "${GREEN}✅ NCCR verification: Working${NC}"
    echo -e "${GREEN}✅ Approved project tokenization: Working${NC}"
    echo -e "${GREEN}✅ Rejected project blocking: Working${NC}"
    echo -e "\n${BLUE}The complete BlueCred integration is ready for production!${NC}"
else
    echo -e "${RED}❌ Some tests failed. Check the results above.${NC}"
fi
