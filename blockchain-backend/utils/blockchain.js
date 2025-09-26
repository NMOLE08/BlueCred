const { ethers } = require('ethers');
require('dotenv').config();

class BlockchainService {
  constructor() {
    // Check for required environment variables
    if (!process.env.HARDHAT_NETWORK_URL) {
      throw new Error('HARDHAT_NETWORK_URL environment variable is required');
    }
    if (!process.env.OWNER_PRIVATE_KEY) {
      throw new Error('OWNER_PRIVATE_KEY environment variable is required');
    }
    if (!process.env.CHAIN_ID) {
      throw new Error('CHAIN_ID environment variable is required');
    }

    this.provider = new ethers.JsonRpcProvider(process.env.HARDHAT_NETWORK_URL);
    this.ownerWallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, this.provider);
    this.chainId = process.env.CHAIN_ID;
    
    // Contract ABIs (from the actual deployed contracts)
    this.tokenABI = [
      "function createProject(string memory projectId, string memory projectName, string memory ngoName, uint256 carbonCredits) external",
      "function verifyProjectAndMint(string memory projectId, address ngoWallet) external",
      "function mintAdditionalCredits(string memory projectId, address ngoWallet, uint256 additionalCredits) external",
      "function balanceOf(address account) external view returns (uint256)",
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function allowance(address owner, address spender) external view returns (uint256)",
      "function projects(string memory) external view returns (string memory, string memory, string memory, uint256, uint256, bool, bool)"
    ];
    
    this.marketplaceABI = [
      "function listToken(uint256 tokenId, uint256 price) external",
      "function buyToken(uint256 tokenId) external payable",
      "function retireToken(uint256 tokenId) external"
    ];
  }

  // Initialize contracts with addresses
  initializeContracts(tokenAddress, marketplaceAddress) {
    this.tokenContract = new ethers.Contract(
      tokenAddress,
      this.tokenABI,
      this.ownerWallet
    );
    
    this.marketplaceContract = new ethers.Contract(
      marketplaceAddress,
      this.marketplaceABI,
      this.ownerWallet
    );
  }

  // Convert carbon credits to NCT tokens
  // 1 NCT ≈ 3,994 tons CO₂e
  convertCreditsToTokens(carbonCreditsInTons) {
    const nctTokens = Math.floor(carbonCreditsInTons / 3994);
    return nctTokens;
  }

  // Convert NCT tokens to ETH value
  // 1 NCT ≈ 0.0002504 ETH
  convertTokensToETH(nctTokens) {
    const ethValue = nctTokens * 0.0002504;
    return ethValue;
  }

  // Create project and mint tokens to NGO's MetaMask account
  async mintTokensToNGO(ngoAddress, carbonCreditsInTons, projectId, projectName, ngoName) {
    try {
      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      // For testing, we'll use the carbon credits directly (not converting to NCT)
      // The smart contract expects carbon credits in tons
      if (carbonCreditsInTons <= 0) {
        throw new Error('Invalid carbon credit amount - must be greater than 0');
      }

      console.log(`Creating project ${projectId} with ${carbonCreditsInTons} tons of carbon credits`);

      // Get current nonce
      const nonce = await this.ownerWallet.getNonce();
      
      // Check if project already exists
      let projectExists = false;
      try {
        const projectInfo = await this.tokenContract.projects(projectId);
        projectExists = projectInfo[0] !== ""; // If projectName is not empty, project exists
      } catch (error) {
        console.log('Project does not exist, will create it');
      }

      let currentNonce = nonce;
      
      if (!projectExists) {
        // Step 1: Create the project in the smart contract
        console.log(`Creating new project ${projectId} with ${carbonCreditsInTons} tons of carbon credits`);
        const createTx = await this.tokenContract.createProject(
          projectId,
          projectName,
          ngoName,
          carbonCreditsInTons,
          { nonce: currentNonce }
        );
        
        console.log(`Project creation transaction hash: ${createTx.hash}`);
        await createTx.wait();
        currentNonce++;
        
        // For new projects, use verifyProjectAndMint
        console.log(`Minting ${carbonCreditsInTons} carbon credit tokens to ${ngoAddress} (new project)`);
        const mintTx = await this.tokenContract.verifyProjectAndMint(projectId, ngoAddress, { nonce: currentNonce });
        console.log(`Minting transaction hash: ${mintTx.hash}`);
        const receipt = await mintTx.wait();
        
        return {
          success: true,
          transactionHash: mintTx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          tokensMinted: carbonCreditsInTons,
          ngoAddress: ngoAddress,
          projectId: projectId
        };
      } else {
        // For existing projects, use mintAdditionalCredits
        console.log(`Minting ${carbonCreditsInTons} additional carbon credit tokens to ${ngoAddress} (existing project)`);
        // Convert carbon credits to wei for the smart contract (1 token = 1 wei for minting)
        const carbonCreditsInWei = ethers.parseEther(carbonCreditsInTons.toString());
        const mintTx = await this.tokenContract.mintAdditionalCredits(projectId, ngoAddress, carbonCreditsInWei, { nonce: currentNonce });
        console.log(`Additional minting transaction hash: ${mintTx.hash}`);
        const receipt = await mintTx.wait();
        
        return {
          success: true,
          transactionHash: mintTx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          tokensMinted: carbonCreditsInTons,
          ngoAddress: ngoAddress,
          projectId: projectId
        };
      }

    } catch (error) {
      console.error('Error minting tokens:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check token balance of an address
  async getTokenBalance(address) {
    try {
      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      const balance = await this.tokenContract.balanceOf(address);
      const formattedBalance = ethers.formatUnits(balance, 18);
      
      return {
        success: true,
        balance: formattedBalance,
        address: address
      };
    } catch (error) {
      console.error('Error getting token balance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify network connection
  async checkNetworkConnection() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        success: true,
        chainId: network.chainId.toString(),
        blockNumber: blockNumber,
        connected: true
      };
    } catch (error) {
      console.error('Network connection error:', error);
      return {
        success: false,
        error: error.message,
        connected: false
      };
    }
  }

  // Get owner wallet information
  getOwnerInfo() {
    return {
      address: this.ownerWallet.address,
      balance: 'Check with provider.getBalance()'
    };
  }
}

module.exports = new BlockchainService();
