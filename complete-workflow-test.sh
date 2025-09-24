#!/bin/bash

echo "🎯 Complete Workflow Test - End-to-End Verification"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ID="PRJ_COMPLETE_TEST_$(date +%s)"

echo -e "\n${BLUE}Step 1: Create project via ML webhook (no auto-approve)${NC}"
CREATE_RESULT=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/$PROJECT_ID/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{
    "carbonKg": 25000,
    "confidenceScore": 0.90,
    "modelVersion": "complete-workflow-test",
    "autoApprove": false
  }')

CREATE_SUCCESS=$(echo "$CREATE_RESULT" | jq -r '.success')
echo "Project creation: $CREATE_SUCCESS"

if [ "$CREATE_SUCCESS" != "true" ]; then
    echo -e "${RED}❌ Project creation failed${NC}"
    echo "$CREATE_RESULT" | jq '.'
    exit 1
fi

echo -e "\n${BLUE}Step 2: Verify project is pending${NC}"
sleep 1
PENDING_CHECK=$(curl -s "http://127.0.0.1:5001/api/verification/project/$PROJECT_ID")
PENDING_STATUS=$(echo "$PENDING_CHECK" | jq -r '.data.project.verificationStatus // "not_found"')
echo "Project status: $PENDING_STATUS"

if [ "$PENDING_STATUS" != "pending" ]; then
    echo -e "${RED}❌ Project should be pending${NC}"
    exit 1
fi

echo -e "\n${BLUE}Step 3: Try tokenization (should fail)${NC}"
FAIL_TOKENIZE=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/$PROJECT_ID/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{
    "carbonKg": 25000,
    "confidenceScore": 0.90,
    "modelVersion": "should-fail-test",
    "autoApprove": true,
    "recipientAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  }')

FAIL_SUCCESS=$(echo "$FAIL_TOKENIZE" | jq -r '.success')
echo "Tokenization of pending project: $FAIL_SUCCESS (should be false)"

if [ "$FAIL_SUCCESS" = "true" ]; then
    echo -e "${RED}❌ Pending project should not be allowed to tokenize${NC}"
    exit 1
fi

echo -e "\n${BLUE}Step 4: Approve the project${NC}"
APPROVE_RESULT=$(curl -s -X POST "http://127.0.0.1:5001/api/verification/project/$PROJECT_ID/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "comments": "Complete workflow test - approved for tokenization",
    "approvedCarbonCredits": 25
  }')

APPROVE_SUCCESS=$(echo "$APPROVE_RESULT" | jq -r '.success')
echo "Project approval: $APPROVE_SUCCESS"

if [ "$APPROVE_SUCCESS" != "true" ]; then
    echo -e "${RED}❌ Project approval failed${NC}"
    echo "$APPROVE_RESULT" | jq '.'
    exit 1
fi

echo -e "\n${BLUE}Step 5: Verify project is approved${NC}"
sleep 2
APPROVED_CHECK=$(curl -s "http://127.0.0.1:5001/api/verification/project/$PROJECT_ID")
APPROVED_STATUS=$(echo "$APPROVED_CHECK" | jq -r '.data.project.verificationStatus')
echo "Project status after approval: $APPROVED_STATUS"

if [ "$APPROVED_STATUS" != "approved" ]; then
    echo -e "${RED}❌ Project should be approved${NC}"
    exit 1
fi

echo -e "\n${BLUE}Step 6: Test tokenization (should succeed)${NC}"
SUCCESS_TOKENIZE=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/$PROJECT_ID/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{
    "carbonKg": 25000,
    "confidenceScore": 0.90,
    "modelVersion": "should-succeed-test",
    "autoApprove": true,
    "recipientAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  }')

echo "Tokenization result:"
echo "$SUCCESS_TOKENIZE" | jq '.'

SUCCESS_SUCCESS=$(echo "$SUCCESS_TOKENIZE" | jq -r '.success')
MINTED=$(echo "$SUCCESS_TOKENIZE" | jq -r '.data.minted // false')

echo -e "\n${YELLOW}=== FINAL RESULTS ===${NC}"
if [ "$SUCCESS_SUCCESS" = "true" ] && [ "$MINTED" = "true" ]; then
    echo -e "${GREEN}🎉 COMPLETE SUCCESS! End-to-end verification workflow is working!${NC}"
    echo -e "${GREEN}✅ Project creation: Working${NC}"
    echo -e "${GREEN}✅ Pending project blocking: Working${NC}"
    echo -e "${GREEN}✅ NCCR verification: Working${NC}"
    echo -e "${GREEN}✅ Approved project tokenization: Working${NC}"
    echo -e "\n${BLUE}The BlueCred verification workflow is fully functional!${NC}"
else
    echo -e "${RED}❌ Tokenization still failed. Debugging info:${NC}"
    echo "Success: $SUCCESS_SUCCESS"
    echo "Minted: $MINTED"
    echo "Full response:"
    echo "$SUCCESS_TOKENIZE" | jq '.'
fi
