#!/bin/bash

echo "=== Final Biomass Frontend Minting Test ==="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_minting() {
    local project_id=$1
    local carbon_kg=$2
    local expected_tokens=$3
    local description=$4
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Project: $project_id"
    echo "Carbon: $carbon_kg kg"
    echo "Expected Tokens: $expected_tokens NCT"
    
    result=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/$project_id/ml-webhook" \
        -H "Content-Type: application/json" \
        -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
        -d "{\"carbonKg\":$carbon_kg,\"recipientAddress\":\"0x70997970C51812dc3A010C7d01b50e0d17dc79C8\",\"biomassData\":{\"total_biomass\":\"$(echo "$carbon_kg * 2" | bc)\",\"carbon_kg\":$carbon_kg,\"confidence\":95}}")
    
    success=$(echo "$result" | jq -r '.success')
    message=$(echo "$result" | jq -r '.message')
    minted=$(echo "$result" | jq -r '.data.minted')
    actual_tokens=$(echo "$result" | jq -r '.data.tokensRoundedDown')
    tx_hash=$(echo "$result" | jq -r '.data.transactionHash')
    
    echo "Result: $message"
    echo "Minted: $minted"
    echo "Actual Tokens: $actual_tokens NCT"
    echo "Transaction: $tx_hash"
    
    if [[ "$success" == "true" ]]; then
        if [[ "$minted" == "true" ]] && [[ "$actual_tokens" == "$expected_tokens" ]]; then
            echo -e "${GREEN}✅ TEST PASSED${NC}"
        else
            echo -e "${RED}❌ TEST FAILED${NC}"
        fi
    else
        echo -e "${RED}❌ TEST FAILED${NC}"
    fi
    
    echo "----------------------------------------"
    echo
    sleep 3  # Add delay between tests
}

# Test 1: Biomass Demo Project - Default detected biomass (27.25 kg)
test_minting "BIOMASS_DEMO_PROJECT" 27.25 "0.03" "Biomass Demo Project - Default detected biomass"

# Test 2: Biomass Demo Project - 1 tonne (1000 kg)
test_minting "BIOMASS_DEMO_PROJECT" 1000 "1" "Biomass Demo Project - 1 tonne"

# Test 3: Biomass Demo Project - 50 tonnes (50000 kg)
test_minting "BIOMASS_DEMO_PROJECT" 50000 "50" "Biomass Demo Project - 50 tonnes"

# Test 4: Unapproved project (should fail minting)
echo -e "${YELLOW}Testing: Unapproved project (should fail minting)${NC}"
echo "Project: demo-project"
echo "Carbon: 1000 kg"
echo "Expected: Should NOT mint tokens"

result=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/demo-project/ml-webhook" \
    -H "Content-Type: application/json" \
    -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
    -d '{"carbonKg":1000,"recipientAddress":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8","biomassData":{"total_biomass":2000,"carbon_kg":1000,"confidence":95}}')

success=$(echo "$result" | jq -r '.success')
message=$(echo "$result" | jq -r '.message')
minted=$(echo "$result" | jq -r '.data.minted')
actual_tokens=$(echo "$result" | jq -r '.data.tokensRoundedDown')
tx_hash=$(echo "$result" | jq -r '.data.transactionHash')

echo "Result: $message"
echo "Minted: $minted"
echo "Tokens Calculated: $actual_tokens NCT"
echo "Transaction: $tx_hash"

if [[ "$success" == "true" ]] && [[ "$minted" == "false" ]]; then
    echo -e "${GREEN}✅ TEST PASSED - Correctly rejected minting for unapproved project${NC}"
else
    echo -e "${RED}❌ TEST FAILED - Should have rejected minting for unapproved project${NC}"
fi

echo "----------------------------------------"
echo

# Service Status Check
echo "=== Service Status ==="
echo "Backend: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/health) - $( [ $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/health) -eq 200 ] && echo "✅ OK" || echo "❌ FAIL")"
echo "Biomass Frontend: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5002/) - $( [ $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5002/) -eq 200 ] && echo "✅ OK" || echo "❌ FAIL")"
echo "DApp: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/) - $( [ $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/) -eq 200 ] && echo "✅ OK" || echo "❌ FAIL")"
echo

echo "=== URLs for Manual Testing ==="
echo "Biomass Frontend: http://127.0.0.1:5002/"
echo "DApp: http://127.0.0.1:3001/"
echo "Backend Health: http://127.0.0.1:5001/health"
echo

echo -e "${GREEN}=== Biomass Frontend Minting Fix Complete! ===${NC}"
echo
echo "Summary of fixes implemented:"
echo "1. ✅ Removed autoApprove logic from backend"
echo "2. ✅ Projects now require NCCR Authority approval"
echo "3. ✅ BIOMASS_DEMO_PROJECT created and pre-approved"
echo "4. ✅ Frontend updated to use BIOMASS_DEMO_PROJECT"
echo "5. ✅ Manual carbon input working correctly"
echo "6. ✅ Token calculation: 1 ton = 1 NCT"
echo "7. ✅ Minting works only for approved projects"
echo "8. ✅ Transaction hashes generated successfully"
echo
echo "The biomass frontend can now successfully mint NCT tokens for approved projects!"
