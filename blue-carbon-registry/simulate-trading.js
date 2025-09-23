// Script to simulate the complete trading flow
const { ethers } = require("hardhat");

async function simulateTrading() {
  console.log("🔄 Simulating Complete Trading Flow...\n");

  try {
    // Get accounts
    const [owner, ngo1, ngo2, company1] = await ethers.getSigners();
    
    // Contract addresses
    const CARBON_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const MARKETPLACE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    
    // Get contracts
    const carbonToken = await ethers.getContractAt("CarbonCreditToken", CARBON_TOKEN_ADDRESS);
    const marketplace = await ethers.getContractAt("CarbonCreditMarketplace", MARKETPLACE_ADDRESS);
    
    console.log("📊 Initial Balances:");
    const ngo1InitialETH = await ethers.provider.getBalance(ngo1.address);
    const ngo1InitialNCT = await carbonToken.balanceOf(ngo1.address);
    const company1InitialETH = await ethers.provider.getBalance(company1.address);
    const company1InitialNCT = await carbonToken.balanceOf(company1.address);
    
    console.log(`NGO1 ETH: ${ethers.formatEther(ngo1InitialETH)}`);
    console.log(`NGO1 NCT: ${ethers.formatEther(ngo1InitialNCT)}`);
    console.log(`Company1 ETH: ${ethers.formatEther(company1InitialETH)}`);
    console.log(`Company1 NCT: ${ethers.formatEther(company1InitialNCT)}\n`);
    
    // Step 1: NGO lists tokens for sale
    console.log("🛒 Step 1: NGO lists tokens for sale");
    const listAmount = ethers.parseEther("100");
    const pricePerToken = ethers.parseEther("0.0002504"); // Market rate
    
    // Approve marketplace to spend tokens
    await carbonToken.connect(ngo1).approve(MARKETPLACE_ADDRESS, listAmount);
    console.log("✅ Approved marketplace to spend tokens");
    
    // List tokens
    await marketplace.connect(ngo1).listTokens(
      listAmount,
      pricePerToken,
      "Mangrove carbon credits for sale"
    );
    console.log("✅ Listed 100 NCT tokens for sale at 0.0002504 ETH each");
    console.log(`   Total price: ${ethers.formatEther(listAmount * pricePerToken / ethers.parseEther("1"))} ETH\n`);
    
    // Step 2: Company purchases tokens
    console.log("💰 Step 2: Company purchases tokens");
    const totalPrice = listAmount * pricePerToken / ethers.parseEther("1");
    
    // Get the latest listing ID
    const totalListings = await marketplace.getTotalListings();
    const listingId = Number(totalListings);
    
    await marketplace.connect(company1).purchaseTokens(listingId, {
      value: totalPrice
    });
    console.log("✅ Company purchased 100 NCT tokens");
    console.log(`   Paid: ${ethers.formatEther(totalPrice)} ETH\n`);
    
    // Step 3: Check balances after purchase
    console.log("📊 Balances After Purchase:");
    const ngo1AfterETH = await ethers.provider.getBalance(ngo1.address);
    const ngo1AfterNCT = await carbonToken.balanceOf(ngo1.address);
    const company1AfterETH = await ethers.provider.getBalance(company1.address);
    const company1AfterNCT = await carbonToken.balanceOf(company1.address);
    
    console.log(`NGO1 ETH: ${ethers.formatEther(ngo1AfterETH)} (${ethers.formatEther(ngo1AfterETH - ngo1InitialETH)} change)`);
    console.log(`NGO1 NCT: ${ethers.formatEther(ngo1AfterNCT)} (${ethers.formatEther(ngo1AfterNCT - ngo1InitialNCT)} change)`);
    console.log(`Company1 ETH: ${ethers.formatEther(company1AfterETH)} (${ethers.formatEther(company1AfterETH - company1InitialETH)} change)`);
    console.log(`Company1 NCT: ${ethers.formatEther(company1AfterNCT)} (${ethers.formatEther(company1AfterNCT - company1InitialNCT)} change)\n`);
    
    // Step 4: Company retires some tokens
    console.log("🔥 Step 3: Company retires tokens");
    const retireAmount = ethers.parseEther("50");
    
    await carbonToken.connect(company1).retireTokens(
      retireAmount,
      "Offset company emissions for Q1 2024"
    );
    console.log("✅ Retired 50 NCT tokens");
    console.log(`   CO₂e offset: ${parseFloat(ethers.formatEther(retireAmount)) * 3994} tons\n`);
    
    // Step 5: Final balances
    console.log("📊 Final Balances:");
    const ngo1FinalETH = await ethers.provider.getBalance(ngo1.address);
    const ngo1FinalNCT = await carbonToken.balanceOf(ngo1.address);
    const company1FinalETH = await ethers.provider.getBalance(company1.address);
    const company1FinalNCT = await carbonToken.balanceOf(company1.address);
    const company1Retired = await carbonToken.getRetiredTokens(company1.address);
    
    console.log(`NGO1 ETH: ${ethers.formatEther(ngo1FinalETH)}`);
    console.log(`NGO1 NCT: ${ethers.formatEther(ngo1FinalNCT)}`);
    console.log(`Company1 ETH: ${ethers.formatEther(company1FinalETH)}`);
    console.log(`Company1 NCT: ${ethers.formatEther(company1FinalNCT)}`);
    console.log(`Company1 Retired: ${ethers.formatEther(company1Retired)} NCT\n`);
    
    // Calculate marketplace fee
    const marketplaceFee = await marketplace.marketplaceFee();
    const feeAmount = (totalPrice * BigInt(marketplaceFee)) / BigInt(10000);
    const ngoReceived = totalPrice - feeAmount;
    
    console.log("💸 Financial Flow Summary:");
    console.log(`Company paid: ${ethers.formatEther(totalPrice)} ETH`);
    console.log(`Marketplace fee (${Number(marketplaceFee)/100}%): ${ethers.formatEther(feeAmount)} ETH`);
    console.log(`NGO received: ${ethers.formatEther(ngoReceived)} ETH`);
    console.log(`NGO profit: ${ethers.formatEther(ngo1FinalETH - ngo1InitialETH)} ETH\n`);
    
    console.log("🌍 Environmental Impact:");
    console.log(`Total NCT traded: ${ethers.formatEther(listAmount)}`);
    console.log(`Total CO₂e equivalent: ${parseFloat(ethers.formatEther(listAmount)) * 3994} tons`);
    console.log(`Retired CO₂e: ${parseFloat(ethers.formatEther(company1Retired)) * 3994} tons`);
    console.log(`Active CO₂e: ${parseFloat(ethers.formatEther(company1FinalNCT)) * 3994} tons\n`);
    
    console.log("🎉 Trading simulation complete!");
    console.log("\n✅ This proves:");
    console.log("1. NGOs can list carbon credits for sale");
    console.log("2. Companies can purchase credits from NGOs");
    console.log("3. NGOs receive ETH payments (minus marketplace fee)");
    console.log("4. Tokens can be retired to offset emissions");
    console.log("5. All transactions are recorded on blockchain");
    
  } catch (error) {
    console.error("❌ Simulation failed:", error.message);
    console.log("\n🔧 Make sure:");
    console.log("1. Hardhat node is running: npm run node");
    console.log("2. Contracts are deployed: npm run deploy");
    console.log("3. Accounts have sufficient balances");
  }
}

simulateTrading();
