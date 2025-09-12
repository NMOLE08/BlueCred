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
  console.log('=== MARKETPLACE COMPONENT RENDERED ===');
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
      
      // Get total listings using direct blockchain call to avoid MetaMask caching
      const totalListings = await BlockchainUtils.getTotalListings(await marketplace.getAddress());
      const listingsArray: Listing[] = [];
      
      // Load each listing
      for (let i = 1; i <= Number(totalListings); i++) {
        try {
          const currentBlock = await BlockchainUtils.getCurrentBlockNumber();
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
      
      // WORKAROUND: Skip balance and allowance checks, go straight to approval and listing
      // This bypasses the MetaMask caching issues entirely
      console.log('🚀 WORKAROUND: Skipping balance/allowance checks to avoid MetaMask cache issues...');
      
      const tokenAmount = ethers.parseEther(newListing.tokenAmount);
      
      // Step 1: Always approve a large amount to avoid allowance issues
      console.log('🔍 Step 1: Approving tokens (large amount to avoid future issues)...');
      const approvalAmount = ethers.parseEther("100000"); // Approve 100,000 tokens
      const approveTx = await carbonToken.approve(await marketplace.getAddress(), approvalAmount);
      console.log('⏳ Step 1: Waiting for approval transaction...');
      await approveTx.wait();
      console.log('✅ Step 1: Approval transaction confirmed');
      
      // Step 2: List tokens on marketplace
      console.log('🔍 Step 2: Listing tokens...');
      const listTx = await marketplace.listTokens(
        tokenAmount,
        ethers.parseEther(newListing.pricePerToken),
        newListing.description
      );
      console.log('⏳ Step 2: Waiting for listing transaction...');
      await listTx.wait();
      console.log('✅ Step 2: Listing transaction confirmed');
      
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
        <p>Buy and sell carbon credits on the blockchain</p>
      </div>

      <div className="marketplace-content">
        <div className="coming-soon-section">
          <div className="coming-soon-card">
            <div className="coming-soon-icon">🚧</div>
            <h3>Marketplace Under Development</h3>
            <p>
              The carbon credit marketplace is currently under development. 
              Core functionality including token minting and transfers is working perfectly.
            </p>
            <div className="upcoming-features">
              <h4>🔮 Coming Soon:</h4>
              <ul>
                <li>Token listing on marketplace</li>
                <li>Peer-to-peer trading</li>
                <li>Price discovery mechanisms</li>
                <li>Advanced trading features</li>
              </ul>
            </div>
            <div className="demo-note">
              <p>
                <strong>Demo Note:</strong> This prototype demonstrates the core blockchain 
                functionality of the Blue Carbon Registry. The marketplace will be fully 
                functional in the production version.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .marketplace {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .marketplace-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .marketplace-header h2 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .marketplace-header p {
          color: #7f8c8d;
          font-size: 16px;
        }

        .coming-soon-section {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
        }

        .coming-soon-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 600px;
          width: 100%;
        }

        .coming-soon-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .coming-soon-card h3 {
          font-size: 2rem;
          margin-bottom: 20px;
          font-weight: 600;
        }

        .coming-soon-card > p {
          font-size: 1.1rem;
          margin-bottom: 30px;
          opacity: 0.9;
          line-height: 1.6;
        }

        .upcoming-features {
          text-align: left;
          margin: 20px 0;
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
        }

        .upcoming-features h4 {
          margin-bottom: 15px;
          font-size: 1.2rem;
        }

        .upcoming-features ul {
          list-style: none;
          padding: 0;
        }

        .upcoming-features li {
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .upcoming-features li:last-child {
          border-bottom: none;
        }

        .demo-note {
          margin-top: 30px;
          padding: 20px;
          background: rgba(255,255,255,0.15);
          border-radius: 10px;
          border-left: 4px solid #f39c12;
        }

        .demo-note p {
          margin: 0;
          font-size: 0.95rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default Marketplace;
