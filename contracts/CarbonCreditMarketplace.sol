// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CarbonCreditToken.sol";

/**
 * @title CarbonCreditMarketplace
 * @dev Marketplace for trading carbon credit tokens
 * @notice Allows NGOs to list tokens for sale and companies to purchase them
 */
contract CarbonCreditMarketplace is ReentrancyGuard, Ownable {
    
    // Struct to store listing information
    struct Listing {
        address seller;
        uint256 tokenAmount;
        uint256 pricePerToken; // in wei
        bool isActive;
        uint256 timestamp;
        string description;
    }
    
    // Reference to the carbon credit token contract
    CarbonCreditToken public carbonToken;
    
    // Mapping to store listings
    mapping(uint256 => Listing) public listings;
    
    // Counter for listing IDs
    uint256 public listingCounter;
    
    // Marketplace fee (in basis points, e.g., 250 = 2.5%)
    uint256 public marketplaceFee = 250; // 2.5%
    
    // Events
    event TokenListed(uint256 indexed listingId, address indexed seller, uint256 tokenAmount, uint256 pricePerToken);
    event TokenPurchased(uint256 indexed listingId, address indexed buyer, uint256 tokenAmount, uint256 totalPrice);
    event ListingCancelled(uint256 indexed listingId);
    event MarketplaceFeeUpdated(uint256 newFee);
    
    // Modifiers
    modifier onlyActiveListing(uint256 listingId) {
        require(listings[listingId].isActive, "Listing is not active");
        _;
    }
    
    modifier onlyListingOwner(uint256 listingId) {
        require(listings[listingId].seller == msg.sender, "Not the listing owner");
        _;
    }
    
    constructor(address _carbonToken) Ownable(msg.sender) {
        carbonToken = CarbonCreditToken(_carbonToken);
    }
    
    /**
     * @dev List carbon credit tokens for sale
     * @param tokenAmount Amount of tokens to list
     * @param pricePerToken Price per token in wei
     * @param description Description of the carbon credits
     */
    function listTokens(
        uint256 tokenAmount,
        uint256 pricePerToken,
        string memory description
    ) external nonReentrant {
        require(tokenAmount > 0, "Token amount must be greater than 0");
        require(pricePerToken > 0, "Price per token must be greater than 0");
        require(carbonToken.balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");
        
        // Transfer tokens from seller to marketplace contract
        carbonToken.transferFrom(msg.sender, address(this), tokenAmount);
        
        // Create new listing
        listingCounter++;
        listings[listingCounter] = Listing({
            seller: msg.sender,
            tokenAmount: tokenAmount,
            pricePerToken: pricePerToken,
            isActive: true,
            timestamp: block.timestamp,
            description: description
        });
        
        emit TokenListed(listingCounter, msg.sender, tokenAmount, pricePerToken);
    }
    
    /**
     * @dev Purchase carbon credit tokens from a listing
     * @param listingId ID of the listing to purchase from
     */
    function purchaseTokens(uint256 listingId) 
        external 
        payable 
        nonReentrant 
        onlyActiveListing(listingId) 
    {
        Listing storage listing = listings[listingId];
        require(msg.sender != listing.seller, "Cannot purchase your own listing");
        
        uint256 totalPrice = (listing.tokenAmount * listing.pricePerToken) / 1e18;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Calculate marketplace fee
        uint256 fee = (totalPrice * marketplaceFee) / 10000;
        uint256 sellerAmount = totalPrice - fee;
        
        // Transfer tokens to buyer
        carbonToken.transfer(msg.sender, listing.tokenAmount);
        
        // Transfer payment to seller (minus fee)
        payable(listing.seller).transfer(sellerAmount);
        
        // Transfer fee to contract owner
        if (fee > 0) {
            payable(owner()).transfer(fee);
        }
        
        // Refund excess payment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        
        // Deactivate listing
        listing.isActive = false;
        
        emit TokenPurchased(listingId, msg.sender, listing.tokenAmount, totalPrice);
    }
    
    /**
     * @dev Cancel a listing and return tokens to seller
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) 
        external 
        nonReentrant 
        onlyActiveListing(listingId) 
        onlyListingOwner(listingId) 
    {
        Listing storage listing = listings[listingId];
        
        // Return tokens to seller
        carbonToken.transfer(listing.seller, listing.tokenAmount);
        
        // Deactivate listing
        listing.isActive = false;
        
        emit ListingCancelled(listingId);
    }
    
    /**
     * @dev Get listing information
     * @param listingId ID of the listing to query
     */
    function getListing(uint256 listingId) external view returns (
        address seller,
        uint256 tokenAmount,
        uint256 pricePerToken,
        bool isActive,
        uint256 timestamp,
        string memory description
    ) {
        Listing memory listing = listings[listingId];
        return (
            listing.seller,
            listing.tokenAmount,
            listing.pricePerToken,
            listing.isActive,
            listing.timestamp,
            listing.description
        );
    }
    
    /**
     * @dev Get total number of listings
     */
    function getTotalListings() external view returns (uint256) {
        return listingCounter;
    }
    
    /**
     * @dev Update marketplace fee (only owner)
     * @param newFee New fee in basis points
     */
    function updateMarketplaceFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee cannot exceed 10%"); // Max 10%
        marketplaceFee = newFee;
        emit MarketplaceFeeUpdated(newFee);
    }
    
    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdrawBalance() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Emergency function to withdraw stuck tokens (only owner)
     * @param tokenAddress Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlyOwner {
        CarbonCreditToken(tokenAddress).transfer(owner(), amount);
    }
}
