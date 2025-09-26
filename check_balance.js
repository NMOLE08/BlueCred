const { ethers } = require('hardhat');

async function checkBalance() {
    try {
        // Get the deployed contract address from the config
        const fs = require('fs');
        const configPath = './blockchain-backend/config/contracts.json';
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        console.log('📋 Contract addresses:', config.contracts);
        
        // Connect to the contract
        const CarbonCreditToken = await ethers.getContractFactory('CarbonCreditToken');
        const carbonToken = CarbonCreditToken.attach(config.contracts.carbonCreditToken);
        
        // Get the NGO1 address (from the screenshot, it's 0x7099...)
        const ngoAddress = '0x7099797970C5182dc3A010C7d01b50e0d17dc79C8';
        
        console.log('🔍 Checking balance for address:', ngoAddress);
        
        // Get the balance
        const balance = await carbonToken.balanceOf(ngoAddress);
        const formattedBalance = ethers.formatEther(balance);
        
        console.log('💰 Raw balance (wei):', balance.toString());
        console.log('💰 Formatted balance (NCT):', formattedBalance);
        
        // Also check total supply
        const totalSupply = await carbonToken.totalSupply();
        const formattedTotalSupply = ethers.formatEther(totalSupply);
        
        console.log('📊 Total supply (NCT):', formattedTotalSupply);
        
    } catch (error) {
        console.error('❌ Error checking balance:', error);
    }
}

checkBalance();
