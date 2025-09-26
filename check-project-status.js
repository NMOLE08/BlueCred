// Check project verification status
async function checkProjectStatus() {
    const BASE_URL = 'http://127.0.0.1:5001';
    const SECRET = '7a3d9f2b6c4e8a1d5f0c3b2a9e7d4c1f8b6a3d2e0f1c4b7a9d3e5f6a1b2c3d4e';
    
    const projectsToCheck = [
        'BIOMASS_DEMO_PROJECT',
        'PRJ_FLUTTER_001',
        'PRJ_FLUTTER_002'
    ];
    
    console.log('=== Checking Project Statuses ===\n');
    
    for (const projectId of projectsToCheck) {
        console.log(`Checking project: ${projectId}`);
        
        try {
            // Try to get project info via ML webhook (will create if doesn't exist)
            const response = await fetch(`${BASE_URL}/api/projects/${projectId}/ml-webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-ml-secret': SECRET
                },
                body: JSON.stringify({
                    carbonKg: 1, // Minimal amount for testing
                    recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                    biomassData: {
                        total_biomass: 2,
                        carbon_kg: 1,
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
                console.log(`Minted: ${result.data.minted}`);
                console.log(`Tokens: ${result.data.tokensRoundedDown}`);
                console.log(`Transaction: ${result.data.transactionHash || 'N/A'}`);
            }
            
            // Try to get the actual project status via the public summaries
            try {
                const summaryResponse = await fetch(`${BASE_URL}/api/public/projects/summaries`);
                const summaryData = await summaryResponse.json();
                
                if (summaryData.success && summaryData.data.projects) {
                    const project = summaryData.data.projects.find(p => p.projectId === projectId);
                    if (project) {
                        console.log(`Status from summaries: ${project.verificationStatus}`);
                    } else {
                        console.log('Not found in summaries');
                    }
                }
            } catch (error) {
                console.log('Could not fetch summaries:', error.message);
            }
            
        } catch (error) {
            console.log(`Error: ${error.message}`);
        }
        
        console.log('---\n');
    }
}

checkProjectStatus().catch(console.error);
