// Script to verify the system is working correctly
const { ethers } = require("hardhat");

async function verifySystem() {
  console.log("🔍 Verifying Blue Carbon Registry System...\n");

  try {
    // Get accounts from localhost network
    const [owner, ngo1, ngo2, company1] = await ethers.getSigners();
    
    // Contract addresses (from latest deployment)
    const CARBON_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const MARKETPLACE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    
    // Get contracts
    const carbonToken = await ethers.getContractAt("CarbonCreditToken", CARBON_TOKEN_ADDRESS);
    const marketplace = await ethers.getContractAt("CarbonCreditMarketplace", MARKETPLACE_ADDRESS);
    
    console.log("📊 Account Information:");
    console.log(`Owner: ${owner.address}`);
    console.log(`NGO1: ${ngo1.address}`);
    console.log(`NGO2: ${ngo2.address}`);
    console.log(`Company1: ${company1.address}\n`);
    
    // Check ETH balances
    console.log("💰 ETH Balances:");
    const ownerETH = await ethers.provider.getBalance(owner.address);
    const ngo1ETH = await ethers.provider.getBalance(ngo1.address);
    const ngo2ETH = await ethers.provider.getBalance(ngo2.address);
    const company1ETH = await ethers.provider.getBalance(company1.address);
    
    console.log(`Owner: ${ethers.formatEther(ownerETH)} ETH`);
    console.log(`NGO1: ${ethers.formatEther(ngo1ETH)} ETH`);
    console.log(`NGO2: ${ethers.formatEther(ngo2ETH)} ETH`);
    console.log(`Company1: ${ethers.formatEther(company1ETH)} ETH\n`);
    
    // Check NCT token balances
    console.log("🪙 NCT Token Balances:");
    const ownerNCT = await carbonToken.balanceOf(owner.address);
    const ngo1NCT = await carbonToken.balanceOf(ngo1.address);
    const ngo2NCT = await carbonToken.balanceOf(ngo2.address);
    const company1NCT = await carbonToken.balanceOf(company1.address);
    
    console.log(`Owner: ${ethers.formatEther(ownerNCT)} NCT`);
    console.log(`NGO1: ${ethers.formatEther(ngo1NCT)} NCT (${parseFloat(ethers.formatEther(ngo1NCT)) * 3994} tons CO₂e)`);
    console.log(`NGO2: ${ethers.formatEther(ngo2NCT)} NCT (${parseFloat(ethers.formatEther(ngo2NCT)) * 3994} tons CO₂e)`);
    console.log(`Company1: ${ethers.formatEther(company1NCT)} NCT (${parseFloat(ethers.formatEther(company1NCT)) * 3994} tons CO₂e)\n`);
    
    // Check retired tokens
    console.log("🔥 Retired Tokens:");
    const ownerRetired = await carbonToken.getRetiredTokens(owner.address);
    const ngo1Retired = await carbonToken.getRetiredTokens(ngo1.address);
    const ngo2Retired = await carbonToken.getRetiredTokens(ngo2.address);
    const company1Retired = await carbonToken.getRetiredTokens(company1.address);
    
    console.log(`Owner: ${ethers.formatEther(ownerRetired)} NCT`);
    console.log(`NGO1: ${ethers.formatEther(ngo1Retired)} NCT`);
    console.log(`NGO2: ${ethers.formatEther(ngo2Retired)} NCT`);
    console.log(`Company1: ${ethers.formatEther(company1Retired)} NCT (${parseFloat(ethers.formatEther(company1Retired)) * 3994} tons CO₂e offset)\n`);
    
    // Check total supply
    const totalSupply = await carbonToken.totalSupply();
    console.log(`📈 Total NCT Supply: ${ethers.formatEther(totalSupply)} NCT`);
    console.log(`🌍 Total CO₂e Equivalent: ${parseFloat(ethers.formatEther(totalSupply)) * 3994} tons\n`);
    
    // Check marketplace listings
    const totalListings = await marketplace.getTotalListings();
    console.log(`🛒 Total Marketplace Listings: ${Number(totalListings)}\n`);
    
    if (Number(totalListings) > 0) {
      console.log("📋 Active Listings:");
      for (let i = 1; i <= Number(totalListings); i++) {
        try {
          const listing = await marketplace.getListing(i);
          if (listing.isActive) {
            console.log(`   Listing #${i}:`);
            console.log(`   Seller: ${listing.seller}`);
            console.log(`   Amount: ${ethers.formatEther(listing.tokenAmount)} NCT`);
            console.log(`   Price: ${ethers.formatEther(listing.pricePerToken)} ETH per token`);
            console.log(`   Total: ${ethers.formatEther(listing.tokenAmount * listing.pricePerToken / ethers.parseEther("1"))} ETH`);
            console.log(`   Description: ${listing.description}\n`);
          }
        } catch (error) {
          // Listing doesn't exist or error
        }
      }
    }
    
    // Check project information
    console.log("🌱 Project Information:");
    try {
      const project1 = await carbonToken.getProject("MANGROVE_001");
      console.log(`Mangrove Project: ${ethers.formatEther(project1.carbonCredits)} NCT (${parseFloat(ethers.formatEther(project1.carbonCredits)) * 3994} tons CO₂e)`);
      console.log(`   Verified: ${project1.isVerified}`);
      console.log(`   Retired: ${project1.isRetired}\n`);
    } catch (error) {
      console.log("Mangrove project not found\n");
    }
    
    console.log("✅ System verification complete!");
    console.log("\n🎯 Key Points to Check:");
    console.log("1. NGOs should have NCT tokens (from project verification)");
    console.log("2. Companies can purchase tokens from NGOs");
    console.log("3. NGOs receive ETH payments when tokens are sold");
    console.log("4. Tokens can be retired to offset emissions");
    console.log("5. All transactions are recorded on the blockchain");
    
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Make sure Hardhat node is running: npm run node");
    console.log("2. Deploy contracts: npm run deploy");
    console.log("3. Check contract addresses are correct");
  }
}

verifySystem();
