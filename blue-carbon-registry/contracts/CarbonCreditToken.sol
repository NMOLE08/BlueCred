// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CarbonCreditToken
 * @dev ERC20 token representing Nature Carbon Tonnes (NCT) for blue carbon projects
 * @notice This token represents verified carbon credits (1 token = 1 ton CO₂e) that can be traded and retired
 */
contract CarbonCreditToken is ERC20, Ownable, Pausable {
    
    // Struct to store carbon credit project information
    struct CarbonProject {
        string projectId;
        string projectName;
        string ngoName;
        uint256 carbonCredits;
        uint256 timestamp;
        bool isVerified;
        bool isRetired;
    }
    
    // Mapping to store project information
    mapping(string => CarbonProject) public projects;
    
    // Mapping to track retired tokens
    mapping(address => uint256) public retiredTokens;
    
    // Events
    event ProjectCreated(string indexed projectId, string projectName, string ngoName, uint256 carbonCredits);
    event TokensMinted(string indexed projectId, address indexed ngo, uint256 amount);
    event TokensRetired(address indexed company, uint256 amount, string reason);
    event ProjectVerified(string indexed projectId, bool verified);
    
    // Modifiers
    modifier onlyVerifiedProject(string memory projectId) {
        require(projects[projectId].isVerified, "Project not verified");
        _;
    }
    
    constructor() ERC20("Nature Carbon Tonne", "NCT") Ownable(msg.sender) {
        // Initial supply is 0, tokens are minted when projects are verified
        // 1 NCT ≈ 3,994 tons of CO₂e equivalent
    }
    
    /**
     * @dev Create a new carbon project (only owner can do this)
     * @param projectId Unique identifier for the project
     * @param projectName Name of the carbon project
     * @param ngoName Name of the NGO running the project
     * @param carbonCredits Amount of carbon credits generated
     */
    function createProject(
        string memory projectId,
        string memory projectName,
        string memory ngoName,
        uint256 carbonCredits
    ) external onlyOwner {
        require(bytes(projectId).length > 0, "Project ID cannot be empty");
        require(carbonCredits > 0, "Carbon credits must be greater than 0");
        require(projects[projectId].carbonCredits == 0, "Project already exists");
        
        projects[projectId] = CarbonProject({
            projectId: projectId,
            projectName: projectName,
            ngoName: ngoName,
            carbonCredits: carbonCredits,
            timestamp: block.timestamp,
            isVerified: false,
            isRetired: false
        });
        
        emit ProjectCreated(projectId, projectName, ngoName, carbonCredits);
    }
    
    /**
     * @dev Verify a project and mint tokens to NGO's wallet (allows multiple mints)
     * @param projectId Project to verify
     * @param ngoWallet NGO's wallet address
     */
    function verifyProjectAndMint(string memory projectId, address ngoWallet) 
        external 
        onlyOwner 
    {
        CarbonProject storage project = projects[projectId];
        require(project.carbonCredits > 0, "Project does not exist");
        require(!project.isRetired, "Project already retired");
        
        // Set as verified if not already (allows multiple mints)
        if (!project.isVerified) {
            project.isVerified = true;
            emit ProjectVerified(projectId, true);
        }
        
        // Mint tokens to NGO's wallet (1 NCT ≈ 3,994 tons CO₂e)
        _mint(ngoWallet, project.carbonCredits);
        
        emit TokensMinted(projectId, ngoWallet, project.carbonCredits);
    }
    
    /**
     * @dev Mint additional tokens for an existing project (for ML integration)
     * @param projectId Project to mint tokens for
     * @param ngoWallet NGO's wallet address
     * @param additionalCredits Additional carbon credits to mint
     */
    function mintAdditionalCredits(
        string memory projectId, 
        address ngoWallet, 
        uint256 additionalCredits
    ) external onlyOwner {
        CarbonProject storage project = projects[projectId];
        require(project.carbonCredits > 0, "Project does not exist");
        require(!project.isRetired, "Project already retired");
        require(additionalCredits > 0, "Additional credits must be greater than 0");
        
        // Set as verified if not already
        if (!project.isVerified) {
            project.isVerified = true;
            emit ProjectVerified(projectId, true);
        }
        
        // Mint additional tokens
        _mint(ngoWallet, additionalCredits);
        
        emit TokensMinted(projectId, ngoWallet, additionalCredits);
    }
    
    /**
     * @dev Retire tokens when a company uses them for carbon offset
     * @param amount Amount of tokens to retire
     * @param reason Reason for retirement
     */
    function retireTokens(uint256 amount, string memory reason) external whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient token balance");
        
        // Burn the tokens
        _burn(msg.sender, amount);
        
        // Track retired tokens
        retiredTokens[msg.sender] += amount;
        
        emit TokensRetired(msg.sender, amount, reason);
    }
    
    /**
     * @dev Get project information
     * @param projectId Project ID to query
     */
    function getProject(string memory projectId) external view returns (
        string memory projectName,
        string memory ngoName,
        uint256 carbonCredits,
        uint256 timestamp,
        bool isVerified,
        bool isRetired
    ) {
        CarbonProject memory project = projects[projectId];
        return (
            project.projectName,
            project.ngoName,
            project.carbonCredits,
            project.timestamp,
            project.isVerified,
            project.isRetired
        );
    }
    
    /**
     * @dev Get total supply of active (non-retired) tokens
     */
    function getActiveSupply() external view returns (uint256) {
        return totalSupply();
    }
    
    /**
     * @dev Get total retired tokens for an address
     * @param account Address to query
     */
    function getRetiredTokens(address account) external view returns (uint256) {
        return retiredTokens[account];
    }
    
    /**
     * @dev Pause token transfers (emergency function)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Override transfer functions to include pausable functionality
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._update(from, to, amount);
    }
}
