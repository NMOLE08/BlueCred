const { ethers } = require('hardhat');

async function checkBalance() {
    try {
        // Use the new contract address from the deployment
        const contractAddress = '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';
        
        console.log('📋 Contract address:', contractAddress);
        
        // Connect to the contract
        const CarbonCreditToken = await ethers.getContractFactory('CarbonCreditToken');
        const carbonToken = CarbonCreditToken.attach(contractAddress);
        
        // Get the NGO1 address (from the screenshot, let's try the full address)
        // The address from the screenshot appears to be: 0x7099797970C5182dc3A010C7d01b50e0d17dc79C8
        // But let's also check some common test addresses
        const testAddresses = [
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account 1 from Hardhat
            '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Account 2 from Hardhat  
            '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Account 3 from Hardhat
            '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // Account 4 from Hardhat
        ];
        
        console.log('🔍 Checking balances for multiple addresses:');
        
        for (const address of testAddresses) {
            try {
                const balance = await carbonToken.balanceOf(address);
                const formattedBalance = ethers.formatEther(balance);
                const rawBalance = balance.toString();
                console.log(`💰 Address ${address}: ${formattedBalance} NCT (Raw: ${rawBalance} wei)`);
            } catch (error) {
                console.log(`❌ Error checking ${address}: ${error.message}`);
            }
        }
        
        // Also check total supply
        const totalSupply = await carbonToken.totalSupply();
        const formattedTotalSupply = ethers.formatEther(totalSupply);
        
        console.log('📊 Total supply (NCT):', formattedTotalSupply);
        
    } catch (error) {
        console.error('❌ Error checking balance:', error);
    }
}

checkBalance();
