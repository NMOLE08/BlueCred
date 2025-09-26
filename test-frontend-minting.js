// Test the biomass frontend minting functionality
async function testBiomassMinting() {
    console.log('=== Testing Biomass Frontend Minting ===\n');
    
    const BASE_URL = 'http://127.0.0.1:5001';
    const PROJECT_ID = 'BIOMASS_DEMO_PROJECT';
    const SECRET = '7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e';
    const RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    
    // Test cases with different carbon amounts
    const testCases = [
        { carbonKg: 27.25, description: 'Default detected biomass' },
        { carbonKg: 1000, description: '1 tonne (should mint 1 NCT)' },
        { carbonKg: 50000, description: '50 tonnes (should mint 50 NCT)' }
    ];
    
    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.description}`);
        console.log(`Carbon: ${testCase.carbonKg} kg`);
        
        try {
            const response = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/ml-webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-ml-secret': SECRET
                },
                body: JSON.stringify({
                    carbonKg: testCase.carbonKg,
                    recipientAddress: RECIPIENT,
                    biomassData: {
                        total_biomass: testCase.carbonKg * 2,
                        carbon_kg: testCase.carbonKg,
                        confidence: 95
                    }
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                const expectedTokens = Math.round((testCase.carbonKg / 1000) * 100) / 100;
                const actualTokens = result.data.tokensRoundedDown;
                const minted = result.data.minted;
                
                console.log(`✅ Success: ${result.message}`);
                console.log(`   Expected: ${expectedTokens} NCT`);
                console.log(`   Actual: ${actualTokens} NCT`);
                console.log(`   Minted: ${minted}`);
                console.log(`   Transaction: ${result.data.transactionHash || 'N/A'}`);
                
                if (actualTokens === expectedTokens && minted) {
                    console.log('✅ Test PASSED');
                } else {
                    console.log('❌ Test FAILED');
                }
            } else {
                console.log(`❌ Failed: ${result.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        console.log('---\n');
    }
    
    // Test with unapproved project (should fail)
    console.log('Testing: Unapproved project (should fail)');
    try {
        const response = await fetch(`${BASE_URL}/api/projects/PRJ_FLUTTER_001/ml-webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ml-secret': SECRET
            },
            body: JSON.stringify({
                carbonKg: 1000,
                recipientAddress: RECIPIENT,
                biomassData: {
                    total_biomass: 2000,
                    carbon_kg: 1000,
                    confidence: 95
                }
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            console.log(`✅ Success: Unapproved project correctly rejected`);
            console.log(`   Message: ${result.message}`);
            console.log('✅ Test PASSED');
        } else {
            console.log(`❌ Failed: Unapproved project should have been rejected`);
            console.log(`   Result: ${JSON.stringify(result)}`);
            console.log('❌ Test FAILED');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n=== Test Complete ===');
}

testBiomassMinting().catch(console.error);
