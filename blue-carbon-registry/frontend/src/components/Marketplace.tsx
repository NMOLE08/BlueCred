import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { BlockchainUtils } from '../utils/blockchainUtils';

interface MarketplaceProps {
  user: {
    address: string;
    balance: string;
    tokenBalance: string;
    isOwner: boolean;
  };
  contracts: any;
}

interface Listing {
  id: number;
  seller: string;
  tokenAmount: string;
  pricePerToken: string;
  totalPrice: string;
  isActive: boolean;
  timestamp: number;
  description: string;
}

const Marketplace: React.FC<MarketplaceProps> = ({ user, contracts }) => {
  console.log('=== MARKETPLACE COMPONENT RENDERED ===');
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showListForm, setShowListForm] = useState(false);
  const [showRetireForm, setShowRetireForm] = useState(false);
  const [newListing, setNewListing] = useState({
    tokenAmount: '',
    pricePerToken: '',
    description: ''
  });
  const [retireAmount, setRetireAmount] = useState('');
  const [retireReason, setRetireReason] = useState('');

  const loadListings = useCallback(async () => {
    if (!contracts) return;
    
    setLoading(true);
    try {
      const { marketplace } = contracts;
      
      // Get a consistent block tag and fetch total listings directly from the contract
      const currentBlock = await BlockchainUtils.getCurrentBlockNumber();
      let totalListings = 0;
      try {
        // Prefer a direct contract call with blockTag to avoid selector mistakes
        const total = await marketplace.getTotalListings({ blockTag: currentBlock });
        totalListings = Number(total);
      } catch (innerErr) {
        console.warn('Falling back to latest state for total listings:', innerErr);
        const total = await marketplace.getTotalListings();
        totalListings = Number(total);
      }
      const listingsArray: Listing[] = [];
      
      // Load each listing
      for (let i = 1; i <= Number(totalListings); i++) {
        try {
          const listing = await marketplace.getListing(i, { blockTag: currentBlock });
          
          // Check if listing data is valid
          if (!listing || listing.tokenAmount === null || listing.pricePerToken === null) {
            continue;
          }
          
          // Check if tokenAmount and pricePerToken are valid BigInt values
          if (listing.tokenAmount.toString() === '0' || listing.pricePerToken.toString() === '0') {
            continue;
          }
          
          const tokenAmountStr = ethers.formatEther(listing.tokenAmount);
          const pricePerTokenStr = ethers.formatEther(listing.pricePerToken);
          
          // Only add active listings
          if (listing.isActive) {
            // Calculate total price properly using ethers
            const tokenAmountFloat = parseFloat(tokenAmountStr);
            const pricePerTokenFloat = parseFloat(pricePerTokenStr);
            const totalPrice = (tokenAmountFloat * pricePerTokenFloat).toFixed(6);
            
            listingsArray.push({
              id: i,
              seller: listing.seller,
              tokenAmount: tokenAmountStr,
              pricePerToken: pricePerTokenStr,
              totalPrice: totalPrice,
              isActive: listing.isActive,
              timestamp: Number(listing.timestamp) * 1000,
              description: listing.description
            });
          }
        } catch (error) {
          console.error(`Error loading listing ${i}:`, error);
        }
      }
      
      setListings(listingsArray);
      
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  useEffect(() => {
    loadListings();
    
    // Add event listeners for automatic updates
    if (contracts) {
      const { marketplace } = contracts;
      
      // Listen for new listings
      const handleTokenListed = (listingId: any, seller: any, tokenAmount: any, pricePerToken: any) => {
        console.log('🎉 New token listed!', { listingId: Number(listingId), seller, tokenAmount: ethers.formatEther(tokenAmount), pricePerToken: ethers.formatEther(pricePerToken) });
        // Refresh listings after a short delay to ensure blockchain state is updated
        setTimeout(() => {
          loadListings();
        }, 1000);
      };
      
      // Listen for token purchases
      const handleTokenPurchased = (listingId: any, buyer: any, tokenAmount: any, totalPrice: any) => {
        console.log('💰 Token purchased!', { listingId: Number(listingId), buyer, tokenAmount: ethers.formatEther(tokenAmount), totalPrice: ethers.formatEther(totalPrice) });
        // Refresh listings after a short delay
        setTimeout(() => {
          loadListings();
        }, 1000);
      };
      
      // Listen for listing cancellations
      const handleListingCancelled = (listingId: any) => {
        console.log('❌ Listing cancelled!', { listingId: Number(listingId) });
        // Refresh listings after a short delay
        setTimeout(() => {
          loadListings();
        }, 1000);
      };
      
      // Set up event listeners
      marketplace.on('TokenListed', handleTokenListed);
      marketplace.on('TokenPurchased', handleTokenPurchased);
      marketplace.on('ListingCancelled', handleListingCancelled);
      
      // Cleanup function
      return () => {
        marketplace.off('TokenListed', handleTokenListed);
        marketplace.off('TokenPurchased', handleTokenPurchased);
        marketplace.off('ListingCancelled', handleListingCancelled);
      };
    }
  }, [contracts, loadListings]);

  const listTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contracts) return;
    
    try {
      const { marketplace, carbonToken } = contracts;
      
      console.log('🚀 Starting token listing process...');
      console.log('📋 Listing details:', newListing);
      
      // Step 1: Verify user has sufficient tokens using direct blockchain call (bypass MetaMask cache)
      console.log('🔍 Step 1: Checking token balance using direct blockchain call...');
      const userBalanceStr = await BlockchainUtils.getTokenBalance(await carbonToken.getAddress(), user.address);
      const userBalance = ethers.parseEther(userBalanceStr);
      if (userBalance < ethers.parseEther(newListing.tokenAmount)) {
        throw new Error(`Insufficient tokens. You have ${userBalanceStr} NCT but trying to list ${newListing.tokenAmount} NCT`);
      }
      console.log('✅ Step 1: Token balance check passed:', userBalanceStr, 'NCT');
      
      // Step 2: Check current allowance using direct blockchain call (bypass MetaMask cache)
      console.log('🔍 Step 2: Checking allowance using direct blockchain call...');
      const tokenAmount = ethers.parseEther(newListing.tokenAmount);
      const currentAllowanceStr = await BlockchainUtils.getTokenAllowance(
        await carbonToken.getAddress(), 
        user.address, 
        await marketplace.getAddress()
      );
      const currentAllowance = ethers.parseEther(currentAllowanceStr);
      console.log('✅ Step 2: Current allowance:', currentAllowanceStr, 'NCT');
      
      // Step 3: Only approve if allowance is insufficient (use MetaMask for transaction)
      if (currentAllowance < tokenAmount) {
        console.log('🔍 Step 3: Approving tokens via MetaMask...');
        const approvalAmount = ethers.parseEther("10000"); // Approve 10,000 tokens for multiple listings
        const approveTx = await carbonToken.approve(await marketplace.getAddress(), approvalAmount);
        console.log('⏳ Step 3: Waiting for approval transaction...');
        await approveTx.wait();
        console.log('✅ Step 3: Approval transaction confirmed');
      } else {
        console.log('✅ Step 3: Sufficient allowance already exists');
      }
      
      // Step 4: List tokens on marketplace (use MetaMask for transaction)
      console.log('🔍 Step 4: Listing tokens via MetaMask...');
      const listTx = await marketplace.listTokens(
        tokenAmount,
        ethers.parseEther(newListing.pricePerToken),
        newListing.description
      );
      console.log('⏳ Step 4: Waiting for listing transaction...');
      await listTx.wait();
      console.log('✅ Step 4: Listing transaction confirmed');
      
      // Reset form
      setNewListing({
        tokenAmount: '',
        pricePerToken: '',
        description: ''
      });
      setShowListForm(false);
      
      // The event listener will automatically refresh listings
      console.log('🎉 Token listing completed successfully!');
      alert('Tokens listed successfully!');
      
    } catch (error: any) {
      console.error('❌ Error listing tokens:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        reason: error.reason,
        transaction: error.transaction
      });
      alert('Error listing tokens: ' + error.message);
    }
  };

  const purchaseTokens = async (listingId: number, totalPrice: string) => {
    if (!contracts) return;
    
    try {
      const { marketplace } = contracts;
      
      await marketplace.purchaseTokens(listingId, {
        value: ethers.parseEther(totalPrice)
      });
      
      // Reload listings
      loadListings();
      
      alert('Tokens purchased successfully!');
      
    } catch (error: any) {
      alert('Error purchasing tokens: ' + error.message);
    }
  };

  const cancelListing = async (listingId: number) => {
    if (!contracts) return;
    
    try {
      const { marketplace } = contracts;
      
      await marketplace.cancelListing(listingId);
      
      // Reload listings
      loadListings();
      
      alert('Listing cancelled successfully!');
      
    } catch (error: any) {
      alert('Error cancelling listing: ' + error.message);
    }
  };

  const retireTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contracts) return;
    
    try {
      const { carbonToken } = contracts;
      
      await carbonToken.retireTokens(
        ethers.parseEther(retireAmount),
        retireReason
      );
      
      // Reset form
      setRetireAmount('');
      setRetireReason('');
      setShowRetireForm(false);
      
      alert('Tokens retired successfully!');
      
    } catch (error: any) {
      alert('Error retiring tokens: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="marketplace">
        <div className="loading">Loading marketplace...</div>
      </div>
    );
  }

  return (
    <div className="marketplace">
      <div className="marketplace-header">
        <h2>Carbon Credit Marketplace</h2>
        <p>Buy, sell, and retire carbon credit tokens</p>
        
        <div className="marketplace-actions">
          <button 
            onClick={() => setShowListForm(true)}
            className="list-tokens-btn"
            disabled={user.tokenBalance === '0'}
          >
            List Tokens for Sale
          </button>
          
          <button 
            onClick={() => setShowRetireForm(true)}
            className="retire-tokens-btn"
            disabled={user.tokenBalance === '0'}
          >
            Retire Tokens
          </button>
          
        </div>
      </div>

      {showListForm && (
        <div className="list-tokens-modal">
          <div className="modal-content">
            <h3>List Tokens for Sale</h3>
            <form onSubmit={listTokens}>
              <div className="form-group">
                <label>Token Amount:</label>
                <input
                  type="number"
                  value={newListing.tokenAmount}
                  onChange={(e) => setNewListing({...newListing, tokenAmount: e.target.value})}
                  placeholder="e.g., 100"
                  required
                />
                <small>Available: {user.tokenBalance} NCT ({parseFloat(user.tokenBalance) * 3994} tons CO₂e)</small>
              </div>
              
              <div className="form-group">
                <label>Price per Token (ETH):</label>
                <input
                  type="number"
                  step="0.001"
                  value={newListing.pricePerToken}
                  onChange={(e) => setNewListing({...newListing, pricePerToken: e.target.value})}
                  placeholder="e.g., 0.001"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={newListing.description}
                  onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                  placeholder="Describe your carbon credits..."
                  rows={3}
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  List Tokens
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowListForm(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRetireForm && (
        <div className="retire-tokens-modal">
          <div className="modal-content">
            <h3>Retire Carbon Credit Tokens</h3>
            <p>Retire tokens to offset your carbon emissions. Retired tokens cannot be used again.</p>
            
            <form onSubmit={retireTokens}>
              <div className="form-group">
                <label>Amount to Retire:</label>
                <input
                  type="number"
                  value={retireAmount}
                  onChange={(e) => setRetireAmount(e.target.value)}
                  placeholder="e.g., 50"
                  required
                />
                <small>Available: {user.tokenBalance} NCT ({parseFloat(user.tokenBalance) * 3994} tons CO₂e)</small>
              </div>
              
              <div className="form-group">
                <label>Reason for Retirement:</label>
                <textarea
                  value={retireReason}
                  onChange={(e) => setRetireReason(e.target.value)}
                  placeholder="e.g., Offset company emissions for Q1 2024"
                  rows={3}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  Retire Tokens
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowRetireForm(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="listings-section">
        <h3>Available Listings</h3>
        <div style={{textAlign: 'right', marginBottom: '10px'}}>
          <button onClick={() => {
            setListings([]);
            setLoading(true);
            loadListings();
          }} style={{background: '#007bff', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>
            🔄 Refresh Listings
          </button>
        </div>
        
        {listings.length === 0 ? (
          <div className="no-listings">
            <p>No active listings found.</p>
            <p>List your carbon credit tokens to start trading.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {listings.filter(listing => listing.isActive).map((listing) => (
              <div key={listing.id} className="listing-card">
                <div className="listing-header">
                  <h4>Carbon Credit Tokens</h4>
                  <span className="listing-id">#{listing.id}</span>
                </div>
                
                <div className="listing-details">
                  <div className="detail-item">
                    <span className="label">Amount:</span>
                    <span className="value">{listing.tokenAmount} NCT ({parseFloat(listing.tokenAmount) * 3994} tons CO₂e)</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="label">Price per Token:</span>
                    <span className="value">{listing.pricePerToken} ETH</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="label">Total Price:</span>
                    <span className="value">{listing.totalPrice} ETH</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="label">Seller:</span>
                    <span className="value">
                      {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                    </span>
                  </div>
                  
                  {listing.description && (
                    <div className="detail-item">
                      <span className="label">Description:</span>
                      <span className="value">{listing.description}</span>
                    </div>
                  )}
                </div>
                
                <div className="listing-actions">
                  {listing.seller.toLowerCase() === user.address.toLowerCase() ? (
                    <button 
                      onClick={() => cancelListing(listing.id)}
                      className="cancel-listing-btn"
                    >
                      Cancel Listing
                    </button>
                  ) : (
                    <button 
                      onClick={() => purchaseTokens(listing.id, listing.totalPrice)}
                      className="purchase-btn"
                    >
                      Purchase for {listing.totalPrice} ETH
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
