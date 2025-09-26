import React, { useState, useEffect } from 'react';
import './App.css';
import { ethers } from 'ethers';
import WalletConnection from './components/WalletConnection';
import Dashboard from './components/Dashboard';
import ProjectManagement from './components/ProjectManagement';
import Marketplace from './components/Marketplace';
import TransactionHistory from './components/TransactionHistory';
import { configService, ContractConfig } from './services/configService';

// Contract ABIs (simplified for demo)
const CARBON_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function createProject(string memory projectId, string memory projectName, string memory ngoName, uint256 carbonCredits)",
  "function verifyProjectAndMint(string memory projectId, address ngoWallet)",
  "function retireTokens(uint256 amount, string memory reason)",
  "function getProject(string memory projectId) view returns (string, string, uint256, uint256, bool, bool)",
  "function getRetiredTokens(address account) view returns (uint256)",
  "event ProjectCreated(string indexed projectId, string projectName, string ngoName, uint256 carbonCredits)",
  "event TokensMinted(string indexed projectId, address indexed ngo, uint256 amount)",
  "event TokensRetired(address indexed company, uint256 amount, string reason)",
  // Standard ERC20 Transfer event (required for on('Transfer', ...))
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const MARKETPLACE_ABI = [
  "function listTokens(uint256 tokenAmount, uint256 pricePerToken, string memory description)",
  "function purchaseTokens(uint256 listingId) payable",
  "function cancelListing(uint256 listingId)",
  "function getListing(uint256 listingId) view returns (address seller, uint256 tokenAmount, uint256 pricePerToken, bool isActive, uint256 timestamp, string description)",
  "function getTotalListings() view returns (uint256)",
  "event TokenListed(uint256 indexed listingId, address indexed seller, uint256 tokenAmount, uint256 pricePerToken)",
  "event TokenPurchased(uint256 indexed listingId, address indexed buyer, uint256 tokenAmount, uint256 totalPrice)",
  "event ListingCancelled(uint256 indexed listingId)"
];

interface User {
  address: string;
  balance: string;
  tokenBalance: string;
  isOwner: boolean;
}

// Carbon Credit Conversion Rates
  // Conversion rates for carbon credits
  // const CONVERSION_RATES = {
  //   NCT_TO_ETH: 0.0002504, // 1 NCT ≈ 0.0002504 ETH
  //   ETH_TO_NCT: 3994,      // 1 ETH ≈ 3,994 NCT
  //   NCT_TO_CO2: 3994       // 1 NCT ≈ 3,994 tons CO₂e
  // };

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [config, setConfig] = useState<ContractConfig | null>(null);
  const [lastTokenBalance, setLastTokenBalance] = useState<string>('0');
  const [balanceCheckInterval, setBalanceCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // Load configuration on app start
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const contractConfig = await configService.getConfig();
        setConfig(contractConfig);
        console.log('🔧 App loaded with config:', contractConfig);
      } catch (error) {
        console.error('❌ Failed to load config:', error);
      }
    };
    
    loadConfig();
  }, []);

  // Check network connection
  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const expectedChainId = '0x2162'; // 8546 in hex
          console.log('🌐 Current Chain ID:', chainId, 'Expected:', expectedChainId);
          
          if (chainId !== expectedChainId) {
            console.warn('⚠️ Wrong network! Please switch to Localhost 8546');
            alert('Please switch MetaMask to "Localhost 8546" network for this DApp to work correctly.');
          } else {
            console.log('✅ Connected to correct network');
          }
        } catch (error) {
          console.error('❌ Network check failed:', error);
        }
      }
    };
    checkNetwork();
  }, []);

  useEffect(() => {
    const initializeContracts = async () => {
      if (user && window.ethereum && config) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const carbonToken = new ethers.Contract(
          config.contracts.carbonCreditToken,
          CARBON_TOKEN_ABI,
          signer
        );
        
        const marketplace = new ethers.Contract(
          config.contracts.carbonCreditMarketplace,
          MARKETPLACE_ABI,
          signer
        );
        
        const contractsData = { carbonToken, marketplace, provider, signer };
        console.log('🔗 Setting contracts:', {
          carbonTokenAddress: config.contracts.carbonCreditToken,
          marketplaceAddress: config.contracts.carbonCreditMarketplace,
          userAddress: user.address
        });
        setContracts(contractsData);
      }
    };
    
    initializeContracts();
  }, [user, config]);

  // Subscribe to token events to keep balances in sync in real time
  useEffect(() => {
    if (!contracts || !user) return;

    const { carbonToken } = contracts;
    if (!carbonToken) return;

    const onTokensMinted = async (projectId: string, ngo: string, amount: any, event: any) => {
      try {
        console.log('⚡ TokensMinted event:', { projectId, ngo, amount: amount?.toString?.() });
        if (ngo && ngo.toLowerCase() === user.address.toLowerCase()) {
          await refreshUserData();
        }
      } catch (e) {
        console.warn('TokensMinted handler failed', e);
      }
    };

    const onTransfer = async (from: string, to: string, value: any, event: any) => {
      try {
        // Refresh if the connected user is sender or recipient
        if (
          (to && to.toLowerCase() === user.address.toLowerCase()) ||
          (from && from.toLowerCase() === user.address.toLowerCase())
        ) {
          console.log('⚡ Transfer event affecting current user, refreshing...');
          await refreshUserData();
        }
      } catch (e) {
        console.warn('Transfer handler failed', e);
      }
    };

    try {
      carbonToken.on('TokensMinted', onTokensMinted);
      carbonToken.on('Transfer', onTransfer);
      console.log('📡 Subscribed to TokensMinted and Transfer events');
    } catch (e) {
      console.warn('Failed to subscribe to events', e);
    }

    // Cleanup listeners on unmount or when dependencies change
    return () => {
      try {
        carbonToken.off('TokensMinted', onTokensMinted);
        carbonToken.off('Transfer', onTransfer);
        console.log('🧹 Unsubscribed from contract events');
      } catch {}
    };
  }, [contracts, user]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        console.log('🔄 Account changed:', accounts);
        if (accounts.length > 0) {
          // Account changed, refresh user data
          const provider = new ethers.BrowserProvider(window.ethereum!);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          console.log('📍 New address:', address);
          
          // Get ETH balance
          const balance = await provider.getBalance(address);
          const ethBalance = ethers.formatEther(balance);
          
          // Check if user is owner (hardcoded owner address from deployment)
          const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
          const isOwner = address.toLowerCase() === ownerAddress.toLowerCase();
          console.log('👑 Owner check:', { address, ownerAddress, isOwner });
          
               // Get token balance using direct JSON-RPC call to avoid MetaMask caching
               let tokenBalance = "0";
               try {
                 if (config) {
                   console.log('🔄 Account change using config:', config);
                   console.log('🔄 Account change address:', address);
                   console.log('🔄 Account change contract address:', config.contracts.carbonCreditToken);

                   // Use direct JSON-RPC call to bypass MetaMask caching
                   const functionSelector = '0x70a08231'; // balanceOf(address)
                   const paddedAddress = address.slice(2).padStart(64, '0');
                   const callData = functionSelector + paddedAddress;
                   
                   console.log('🔄 Making eth_call request...');
                   const response = await window.ethereum!.request({
                     method: 'eth_call',
                     params: [{
                       to: config.contracts.carbonCreditToken,
                       data: callData
                     }, 'latest'] // Use latest block
                   });
                   
                   console.log('🔄 Raw response from blockchain:', response);
                   const balance = BigInt(response);
                   tokenBalance = ethers.formatEther(balance);
                   console.log('🔄 Account change raw balance:', balance.toString());
                   console.log('🔄 Account change formatted balance:', tokenBalance);
                   console.log('🔄 Final tokenBalance variable:', tokenBalance);
                 }
               } catch (error) {
                 console.error("❌ Could not fetch token balance:", error);
                 tokenBalance = "0";
               }
          
          const newUser = {
            address,
            balance: parseFloat(ethBalance).toFixed(4),
            tokenBalance,
            isOwner
          };
          console.log('👤 Setting new user:', newUser);
          setUser(newUser);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      // Listen for chain changes and force a reload to avoid stale provider state
      const handleChainChanged = () => {
        console.log('🔄 Chain changed, reloading...');
        window.location.reload();
      };
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [config]);

  // Polling fallback: Some environments/extensions occasionally miss accountsChanged.
  // Periodically check the selected account and refresh user if it changed.
  useEffect(() => {
    let intervalId: any;
    if (window.ethereum) {
      intervalId = setInterval(async () => {
        try {
          const accounts: string[] = await window.ethereum!.request({ method: 'eth_accounts' });
          const current = accounts && accounts.length > 0 ? accounts[0] : null;
          if (current && user && current.toLowerCase() !== user.address.toLowerCase()) {
            console.log('⏱️ Poll detected account change to', current);
            // Mirror the update behavior from the accountsChanged handler
            const provider = new ethers.BrowserProvider(window.ethereum!);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const balance = await provider.getBalance(address);
            const ethBalance = ethers.formatEther(balance);
            const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
            const isOwner = address.toLowerCase() === ownerAddress.toLowerCase();

            // Get token balance via direct eth_call to avoid caching
            let tokenBalance = "0";
            try {
              if (config) {
                const functionSelector = '0x70a08231'; // balanceOf(address)
                const paddedAddress = address.slice(2).padStart(64, '0');
                const callData = functionSelector + paddedAddress;
                const response = await window.ethereum!.request({
                  method: 'eth_call',
                  params: [{
                    to: config.contracts.carbonCreditToken,
                    data: callData
                  }, 'latest']
                });
                const raw = BigInt(response);
                tokenBalance = ethers.formatEther(raw);
              }
            } catch (err) {
              console.error('Polling: failed token balance fetch', err);
            }

            setUser({
              address,
              balance: parseFloat(ethBalance).toFixed(4),
              tokenBalance,
              isOwner
            });
          }
        } catch (e) {
          // Silent; polling should be lightweight
        }
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, config]);

  const handleWalletConnect = (userData: User) => {
    setUser(userData);
  };

  const handleWalletDisconnect = () => {
    setUser(null);
    setContracts(null);
  };

  const handleSwitchAccount = async () => {
    try {
      if (!window.ethereum) return;
      // Prompt MetaMask to re-request account permissions (opens account selection UI)
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });

      const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) return;

      // Rehydrate user state for the selected account
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      const ethBalance = ethers.formatEther(balance);
      const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const isOwner = address.toLowerCase() === ownerAddress.toLowerCase();

      // Get token balance using direct eth_call to avoid caching
      let tokenBalance = "0";
      try {
        if (config) {
          const functionSelector = '0x70a08231'; // balanceOf(address)
          const paddedAddress = address.slice(2).padStart(64, '0');
          const callData = functionSelector + paddedAddress;
          const response = await window.ethereum!.request({
            method: 'eth_call',
            params: [{
              to: config.contracts.carbonCreditToken,
              data: callData
            }, 'latest']
          });
          const raw = BigInt(response);
          tokenBalance = ethers.formatEther(raw);
        }
      } catch (err) {
        console.error('Switch Account: failed token balance fetch', err);
      }

      setUser({
        address,
        balance: parseFloat(ethBalance).toFixed(4),
        tokenBalance,
        isOwner
      });
    } catch (e) {
      console.error('Failed to switch account', e);
    }
  };

  const refreshUserData = async () => {
    if (window.ethereum && user) {
      try {
        // First refresh config to get latest contract addresses
        const newConfig = await configService.refreshConfig();
        setConfig(newConfig);
        
        const provider = new ethers.BrowserProvider(window.ethereum!);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        // Get ETH balance
        const balance = await provider.getBalance(address);
        const ethBalance = ethers.formatEther(balance);
        
          // Check if user is owner (hardcoded owner address from deployment)
          const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
          const isOwner = address.toLowerCase() === ownerAddress.toLowerCase();
        
               // Get token balance using direct JSON-RPC call to avoid MetaMask caching
               let tokenBalance = "0";
               try {
                 if (newConfig) {
                   console.log('🔄 Refresh using config:', newConfig);
                   console.log('🔄 Refresh address:', address);
                   console.log('🔄 Refresh contract address:', newConfig.contracts.carbonCreditToken);

                   // Use direct JSON-RPC call to bypass MetaMask caching
                   const functionSelector = '0x70a08231'; // balanceOf(address)
                   const paddedAddress = address.slice(2).padStart(64, '0');
                   const callData = functionSelector + paddedAddress;
                   
                   console.log('🔄 Refresh: Making eth_call request...');
                   const response = await window.ethereum!.request({
                     method: 'eth_call',
                     params: [{
                       to: newConfig.contracts.carbonCreditToken,
                       data: callData
                     }, 'latest'] // Use latest block
                   });
                   
                   console.log('🔄 Refresh: Raw response from blockchain:', response);
                   const balance = BigInt(response);
                   tokenBalance = ethers.formatEther(balance);
                   console.log('🔄 Refresh raw balance:', balance.toString());
                   console.log('🔄 Refresh formatted balance:', tokenBalance);
                   console.log('🔄 Refresh: Final tokenBalance variable:', tokenBalance);
                 }
               } catch (error) {
                 console.error("❌ Could not fetch token balance:", error);
                 tokenBalance = "0";
               }
        
        setUser({
          address,
          balance: parseFloat(ethBalance).toFixed(4),
          tokenBalance,
          isOwner
        });
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    }
  };

  // Function to check for token balance changes (for external minting detection)
  const checkForBalanceChanges = async () => {
    if (!user || !config) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Get current token balance
      const functionSelector = '0x70a08231'; // balanceOf(address)
      const paddedAddress = address.slice(2).padStart(64, '0');
      const callData = functionSelector + paddedAddress;
      
      const response = await window.ethereum!.request({
        method: 'eth_call',
        params: [{
          to: config.contracts.carbonCreditToken,
          data: callData
        }, 'latest']
      });
      
      const currentBalance = ethers.formatEther(BigInt(response));
      
      // Check if balance has changed
      if (currentBalance !== lastTokenBalance && currentBalance !== user.tokenBalance) {
        console.log('🔄 Balance change detected:', {
          last: lastTokenBalance,
          current: currentBalance,
          user: user.tokenBalance
        });
        
        // Update the last known balance
        setLastTokenBalance(currentBalance);
        
        // Refresh user data to update the header
        await refreshUserData();
      }
    } catch (error) {
      console.error('Error checking balance changes:', error);
    }
  };

  // Set up periodic balance checking when user is connected
  useEffect(() => {
    if (user && config) {
      // Initialize last known balance
      setLastTokenBalance(user.tokenBalance);
      
      // Set up periodic checking every 5 seconds
      const interval = setInterval(checkForBalanceChanges, 5000);
      setBalanceCheckInterval(interval);
      
      console.log('🔄 Started periodic balance checking');
    }
    
    return () => {
      if (balanceCheckInterval) {
        clearInterval(balanceCheckInterval);
        console.log('🔄 Stopped periodic balance checking');
      }
    };
  }, [user, config]);

  if (!user) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>🌊 Blue Carbon Registry</h1>
          <p>Blockchain-based Carbon Credit Management System</p>
          <WalletConnection onConnect={handleWalletConnect} />
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🌊 Blue Carbon Registry</h1>
            <p>Blockchain-based Carbon Credit Management System</p>
          </div>
          <div className="header-right">
            <div className="wallet-info">
              <p><strong>Address:</strong> {user.address.slice(0, 6)}...{user.address.slice(-4)}</p>
              <p><strong>ETH Balance:</strong> {user.balance} ETH</p>
              <p><strong>NCT Tokens:</strong> {parseFloat(user.tokenBalance).toFixed(2)}</p>
              {user.isOwner && <span className="owner-badge">OWNER</span>}
              <div className="debug-info" style={{fontSize: '10px', color: '#666', marginTop: '4px'}}>
                <div>Token: {config?.contracts?.carbonCreditToken?.slice(0,10)}...</div>
                <div>Full Addr: {user.address}</div>
              </div>
            </div>
            <button onClick={handleSwitchAccount} className="refresh-btn">
              🔀 Switch Account
            </button>
            <button onClick={refreshUserData} className="refresh-btn">
              🔄 Refresh
            </button>
            <button onClick={handleWalletDisconnect} className="disconnect-btn">
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <nav className="navigation">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''} 
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'projects' ? 'active' : ''} 
          onClick={() => setActiveTab('projects')}
        >
          🌱 Projects
        </button>
        <button 
          className={activeTab === 'marketplace' ? 'active' : ''} 
          onClick={() => setActiveTab('marketplace')}
        >
          🛒 Marketplace
        </button>
        <button 
          className={activeTab === 'transactions' ? 'active' : ''} 
          onClick={() => setActiveTab('transactions')}
        >
          📋 Transactions
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard user={user} contracts={contracts} onTokensMinted={refreshUserData} />
        )}
        {activeTab === 'projects' && (
          <ProjectManagement user={user} contracts={contracts} onTokensMinted={refreshUserData} />
        )}
        {activeTab === 'marketplace' && (
          <Marketplace user={user} contracts={contracts} />
        )}
        {activeTab === 'transactions' && (
          <TransactionHistory user={user} contracts={contracts} />
        )}
      </main>
    </div>
  );
}

export default App;