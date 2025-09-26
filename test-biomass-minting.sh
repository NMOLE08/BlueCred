#!/bin/bash

echo "=== Testing Biomass Frontend Minting Workflow ==="
echo

# Test 1: Check if all services are running
echo "1. Checking service status..."
echo "Backend: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/health)"
echo "Biomass Frontend: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5002/)"
echo "DApp: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/ 2>/dev/null || echo "N/A")"
echo

# Test 2: Check if BIOMASS_DEMO_PROJECT exists and is approved
echo "2. Checking BIOMASS_DEMO_PROJECT status..."
PROJECT_STATUS=$(curl -s -X GET "http://127.0.0.1:5001/api/projects/BIOMASS_DEMO_PROJECT" \
  -H "Authorization: Bearer test-token" 2>/dev/null | jq -r '.data.verificationStatus // "not_found"')
echo "Project Status: $PROJECT_STATUS"
echo

# Test 3: Test minting with different carbon amounts
echo "3. Testing minting with different carbon amounts..."

# Test with 27.25 kg (detected biomass)
echo "   Testing with 27.25 kg (should mint 0.03 NCT)..."
MINT_RESULT_1=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/BIOMASS_DEMO_PROJECT/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{"carbonKg":27.25,"recipientAddress":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8","biomassData":{"total_biomass":54.5,"carbon_kg":27.25,"confidence":95}}')
echo "   Result: $(echo $MINT_RESULT_1 | jq -r '.message') - Minted: $(echo $MINT_RESULT_1 | jq -r '.data.minted') - Tokens: $(echo $MINT_RESULT_1 | jq -r '.data.tokensRoundedDown')"

# Test with 1000 kg (should mint 1 NCT)
echo "   Testing with 1000 kg (should mint 1 NCT)..."
MINT_RESULT_2=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/BIOMASS_DEMO_PROJECT/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{"carbonKg":1000,"recipientAddress":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8","biomassData":{"total_biomass":2000,"carbon_kg":1000,"confidence":95}}')
echo "   Result: $(echo $MINT_RESULT_2 | jq -r '.message') - Minted: $(echo $MINT_RESULT_2 | jq -r '.data.minted') - Tokens: $(echo $MINT_RESULT_2 | jq -r '.data.tokensRoundedDown')"

# Test with 50000 kg (should mint 50 NCT)
echo "   Testing with 50000 kg (should mint 50 NCT)..."
MINT_RESULT_3=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/BIOMASS_DEMO_PROJECT/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{"carbonKg":50000,"recipientAddress":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8","biomassData":{"total_biomass":100000,"carbon_kg":50000,"confidence":95}}')
echo "   Result: $(echo $MINT_RESULT_3 | jq -r '.message') - Minted: $(echo $MINT_RESULT_3 | jq -r '.data.minted') - Tokens: $(echo $MINT_RESULT_3 | jq -r '.data.tokensRoundedDown')"
echo

# Test 4: Check NGO balance after minting
echo "4. Checking NGO balance after minting..."
BALANCE_RESPONSE=$(curl -s "http://127.0.0.1:3001/api/ngo/balance/0x70997970C51812dc3A010C7d01b50e0d17dc79C8" 2>/dev/null)
if [[ $? -eq 0 ]] && [[ "$BALANCE_RESPONSE" == *"balance"* ]]; then
  BALANCE=$(echo "$BALANCE_RESPONSE" | jq -r '.balance // "N/A"')
else
  BALANCE="N/A"
fi
echo "NGO1 Balance: $BALANCE NCT"
echo

# Test 5: Test with unapproved project (should fail)
echo "5. Testing with unapproved project (should fail)..."
UNAPPROVED_RESULT=$(curl -s -X POST "http://127.0.0.1:5001/api/projects/PRJ_FLUTTER_001/ml-webhook" \
  -H "Content-Type: application/json" \
  -H "x-ml-secret: 7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e" \
  -d '{"carbonKg":1000,"recipientAddress":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8","biomassData":{"total_biomass":2000,"carbon_kg":1000,"confidence":95}}')
echo "   Result: $(echo $UNAPPROVED_RESULT | jq -r '.message // "Unknown error"')"
echo

echo "=== Test Summary ==="
echo "✅ Backend: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/health) - $( [ $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/health) -eq 200 ] && echo "OK" || echo "FAIL")"
echo "✅ Biomass Frontend: $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5002/) - $( [ $(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5002/) -eq 200 ] && echo "OK" || echo "FAIL")"
echo "✅ BIOMASS_DEMO_PROJECT: $PROJECT_STATUS - $( [ "$PROJECT_STATUS" = "approved" ] && echo "OK" || echo "FAIL")"
echo "✅ Minting 27.25kg: $(echo $MINT_RESULT_1 | jq -r '.data.minted') - $( [ $(echo $MINT_RESULT_1 | jq -r '.data.minted') = "true" ] && echo "OK" || echo "FAIL")"
echo "✅ Minting 1000kg: $(echo $MINT_RESULT_2 | jq -r '.data.minted') - $( [ $(echo $MINT_RESULT_2 | jq -r '.data.minted') = "true" ] && echo "OK" || echo "FAIL")"
echo "✅ Minting 50000kg: $(echo $MINT_RESULT_3 | jq -r '.data.minted') - $( [ $(echo $MINT_RESULT_3 | jq -r '.data.minted') = "true" ] && echo "OK" || echo "FAIL")"
echo "✅ Unapproved project rejection: $(echo $UNAPPROVED_RESULT | jq -r '.success') - $( [ $(echo $UNAPPROVED_RESULT | jq -r '.success') = "false" ] && echo "OK" || echo "FAIL")"
echo

echo "=== URLs for Manual Testing ==="
echo "Biomass Frontend: http://127.0.0.1:5002/"
echo "DApp: http://127.0.0.1:3001/"
echo "Backend Health: http://127.0.0.1:5001/health"
echo

echo "=== Testing Complete ==="
