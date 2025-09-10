const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Blue Carbon Registry contracts...");

  // Get the contract factories
  const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
  const CarbonCreditMarketplace = await ethers.getContractFactory("CarbonCreditMarketplace");

  // Deploy CarbonCreditToken
  console.log("Deploying CarbonCreditToken...");
  const carbonToken = await CarbonCreditToken.deploy();
  await carbonToken.waitForDeployment();
  const carbonTokenAddress = await carbonToken.getAddress();
  console.log("CarbonCreditToken deployed to:", carbonTokenAddress);

  // Deploy CarbonCreditMarketplace
  console.log("Deploying CarbonCreditMarketplace...");
  const marketplace = await CarbonCreditMarketplace.deploy(carbonTokenAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("CarbonCreditMarketplace deployed to:", marketplaceAddress);

  // Create some sample projects for testing
  console.log("Creating sample projects...");
  
  // Project 1: Mangrove Restoration - 9,985,000 tons CO₂e
  await carbonToken.createProject(
    "MANGROVE_001",
    "Mangrove Restoration Project - Sundarbans",
    "Green Earth Foundation",
    ethers.parseEther("2500") // 2,500 NCT ≈ 9,985,000 tons CO₂e
  );
  console.log("Created Mangrove Restoration Project (2,500 NCT ≈ 9,985,000 tons CO₂e)");

  // Project 2: Seagrass Conservation - 7,189,200 tons CO₂e
  await carbonToken.createProject(
    "SEAGRASS_002",
    "Seagrass Conservation - Andaman Islands",
    "Ocean Conservation Society",
    ethers.parseEther("1800") // 1,800 NCT ≈ 7,189,200 tons CO₂e
  );
  console.log("Created Seagrass Conservation Project (1,800 NCT ≈ 7,189,200 tons CO₂e)");

  // Project 3: Salt Marsh Protection - 4,792,800 tons CO₂e
  await carbonToken.createProject(
    "SALTMARSH_003",
    "Salt Marsh Protection - Gulf of Mexico",
    "Coastal Guardians NGO",
    ethers.parseEther("1200") // 1,200 NCT ≈ 4,792,800 tons CO₂e
  );
  console.log("Created Salt Marsh Protection Project (1,200 NCT ≈ 4,792,800 tons CO₂e)");

  // Verify and mint tokens for the projects
  console.log("Verifying projects and minting tokens...");
  
  // Get some test accounts
  const [owner, ngo1, ngo2, ngo3, company1, company2] = await ethers.getSigners();
  
  // Verify Project 1 and mint to NGO1
  await carbonToken.verifyProjectAndMint("MANGROVE_001", ngo1.address);
  console.log("Verified and minted tokens for Mangrove Project to:", ngo1.address);

  // Verify Project 2 and mint to NGO2
  await carbonToken.verifyProjectAndMint("SEAGRASS_002", ngo2.address);
  console.log("Verified and minted tokens for Seagrass Project to:", ngo2.address);

  // Verify Project 3 and mint to NGO3
  await carbonToken.verifyProjectAndMint("SALTMARSH_003", ngo3.address);
  console.log("Verified and minted tokens for Salt Marsh Project to:", ngo3.address);

  // Display contract addresses and account information
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("CarbonCreditToken Address:", carbonTokenAddress);
  console.log("CarbonCreditMarketplace Address:", marketplaceAddress);
  console.log("\n=== TEST ACCOUNTS ===");
  console.log("Owner:", owner.address);
  console.log("NGO1 (Mangrove):", ngo1.address);
  console.log("NGO2 (Seagrass):", ngo2.address);
  console.log("NGO3 (Salt Marsh):", ngo3.address);
  console.log("Company1:", company1.address);
  console.log("Company2:", company2.address);
  
  console.log("\n=== METAMASK SETUP ===");
  console.log("Add this network to MetaMask:");
  console.log("Network Name: Localhost 8546");
  console.log("RPC URL: http://127.0.0.1:8546");
  console.log("Chain ID: 8546");
  console.log("Currency Symbol: ETH");
  
  console.log("\n=== NEXT STEPS ===");
  console.log("1. Start Hardhat node: npm run node");
  console.log("2. Deploy contracts: npm run deploy");
  console.log("3. Start React DApp: npm run start");
  console.log("4. Import test accounts to MetaMask using the private keys from Hardhat");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
