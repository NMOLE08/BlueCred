// Debug script to test manual carbon input minting
async function testManualMinting() {
    console.log('=== Testing Manual Carbon Input Minting ===\n');
    
    const BASE_URL = 'http://127.0.0.1:5001';
    const PROJECT_ID = 'BIOMASS_DEMO_PROJECT';
    const SECRET = '7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e';
    const RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    
    // Test cases with different manual carbon amounts
    const testCases = [
        { carbonKg: 1000, description: "Manual input: 1000 kg (1 tonne)" },
        { carbonKg: 5000, description: "Manual input: 5000 kg (5 tonnes)" },
        { carbonKg: 27.25, description: "Manual input: 27.25 kg (default detected)" },
        { carbonKg: 150, description: "Manual input: 150 kg" }
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
            
            console.log(`Response: ${response.status} ${response.statusText}`);
            console.log(`Success: ${result.success}`);
            console.log(`Message: ${result.message}`);
            
            if (result.data) {
                console.log(`Project ID: ${result.data.projectId}`);
                console.log(`Tonnes Calculated: ${result.data.tonnesCalculated}`);
                console.log(`Tokens Rounded Down: ${result.data.tokensRoundedDown}`);
                console.log(`Minted: ${result.data.minted}`);
                console.log(`Transaction Hash: ${result.data.transactionHash || 'N/A'}`);
                
                // Verify the calculation
                const expectedTonnes = testCase.carbonKg / 1000;
                const expectedTokens = Math.round(expectedTonnes * 100) / 100;
                const actualTokens = result.data.tokensRoundedDown;
                
                console.log(`Expected Tokens: ${expectedTokens} NCT`);
                console.log(`Actual Tokens: ${actualTokens} NCT`);
                
                if (actualTokens === expectedTokens) {
                    console.log('✅ Token calculation CORRECT');
                } else {
                    console.log('❌ Token calculation INCORRECT');
                }
                
                if (result.data.minted) {
                    console.log('✅ Minting SUCCESSFUL');
                } else {
                    console.log('❌ Minting FAILED');
                }
            }
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        console.log('----------------------------------------\n');
        
        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('=== Test Complete ===');
}

// Run the test
testManualMinting().catch(console.error);
