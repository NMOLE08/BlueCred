// Test script to verify manual carbon input is working correctly
async function testManualInputWorkflow() {
    console.log('=== Testing Manual Input Workflow ===\n');
    
    const BASE_URL = 'http://127.0.0.1:5001';
    const PROJECT_ID = 'BIOMASS_DEMO_PROJECT';
    const SECRET = '7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e';
    const RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    
    // Test the exact scenario the user described
    const testScenarios = [
        {
            name: "User inputs 1000 kg manually",
            manualInput: 1000,
            expectedTokens: 1,
            description: "This should mint 1 NCT token, not the default 27.25 kg"
        },
        {
            name: "User inputs 500 kg manually", 
            manualInput: 500,
            expectedTokens: 0.5,
            description: "This should mint 0.5 NCT tokens, not the default 27.25 kg"
        },
        {
            name: "User inputs 2000 kg manually",
            manualInput: 2000, 
            expectedTokens: 2,
            description: "This should mint 2 NCT tokens, not the default 27.25 kg"
        }
    ];
    
    for (const scenario of testScenarios) {
        console.log(`🧪 Testing: ${scenario.name}`);
        console.log(`📝 Description: ${scenario.description}`);
        console.log(`🔢 Manual Input: ${scenario.manualInput} kg`);
        console.log(`🎯 Expected Tokens: ${scenario.expectedTokens} NCT`);
        
        try {
            // Simulate the frontend API call with manual input
            const response = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/ml-webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-ml-secret': SECRET
                },
                body: JSON.stringify({
                    carbonKg: scenario.manualInput, // This should be the manual input value
                    recipientAddress: RECIPIENT,
                    biomassData: {
                        total_biomass: scenario.manualInput * 2, // Simulate biomass data
                        carbon_kg: scenario.manualInput, // This should match the manual input
                        confidence: 95
                    }
                })
            });
            
            const result = await response.json();
            
            console.log(`📡 API Response Status: ${response.status}`);
            console.log(`📊 API Response Success: ${result.success}`);
            console.log(`📋 API Message: ${result.message}`);
            
            if (result.data) {
                const actualTokens = result.data.tokensRoundedDown;
                const minted = result.data.minted;
                const transactionHash = result.data.transactionHash;
                
                console.log(`💰 Actual Tokens Minted: ${actualTokens} NCT`);
                console.log(`✅ Minting Status: ${minted ? 'SUCCESS' : 'FAILED'}`);
                console.log(`🔗 Transaction Hash: ${transactionHash || 'N/A'}`);
                
                // Verify the result
                if (actualTokens === scenario.expectedTokens && minted) {
                    console.log(`🎉 TEST PASSED: Manual input of ${scenario.manualInput} kg correctly minted ${actualTokens} NCT tokens`);
                } else {
                    console.log(`❌ TEST FAILED: Expected ${scenario.expectedTokens} NCT, got ${actualTokens} NCT. Minted: ${minted}`);
                }
            } else {
                console.log(`❌ TEST FAILED: No data in response`);
            }
            
        } catch (error) {
            console.log(`❌ TEST FAILED: Error - ${error.message}`);
        }
        
        console.log('----------------------------------------\n');
        
        // Wait between tests to avoid blockchain congestion
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('=== Manual Input Workflow Test Complete ===');
    console.log('🔍 If all tests pass, the backend is working correctly.');
    console.log('🌐 The issue may be in the frontend JavaScript or user interaction.');
    console.log('💡 Check the browser console for debugging messages when testing manually.');
}

// Run the test
testManualInputWorkflow().catch(console.error);
