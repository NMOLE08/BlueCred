import React, { useState } from 'react';
import { ethers } from 'ethers';

interface WalletConnectionProps {
  onConnect: (user: {
    address: string;
    balance: string;
    tokenBalance: string;
    isOwner: boolean;
  }) => void;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Get ETH balance
      const balance = await provider.getBalance(address);
      const ethBalance = ethers.formatEther(balance);
      
      // Check if user is owner (hardcoded owner address from deployment)
      const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const isOwner = address.toLowerCase() === ownerAddress.toLowerCase();
      
      // Get token balance from contract
      const CARBON_TOKEN_ADDRESS = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
      const CARBON_TOKEN_ABI = [
        "function balanceOf(address) view returns (uint256)"
      ];
      
      let tokenBalance = "0";
      try {
        const carbonToken = new ethers.Contract(CARBON_TOKEN_ADDRESS, CARBON_TOKEN_ABI, provider);
        const balance = await carbonToken.balanceOf(address);
        tokenBalance = ethers.formatEther(balance);
      } catch (error) {
        console.log("Could not fetch token balance:", error);
        tokenBalance = "0";
      }
      
      onConnect({
        address,
        balance: parseFloat(ethBalance).toFixed(4),
        tokenBalance,
        isOwner
      });
      
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const addLocalNetwork = () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed.');
      return;
    }

    window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x2166', // 8546 in hex
        chainName: 'Localhost 8546',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['http://127.0.0.1:8546'],
        blockExplorerUrls: null,
      }],
    }).catch((error: any) => {
      setError('Failed to add local network: ' + error.message);
    });
  };

  return (
    <div className="wallet-connection">
      <div className="connection-card">
        <h2>Connect Your Wallet</h2>
        <p>Connect your MetaMask wallet to interact with the Blue Carbon Registry</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div className="connection-buttons">
          <button 
            onClick={connectWallet} 
            disabled={isConnecting}
            className="connect-btn"
          >
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
          </button>
          
          <button 
            onClick={addLocalNetwork}
            className="network-btn"
          >
            Add Local Network
          </button>
        </div>
        
        <div className="setup-instructions">
          <h3>Setup Instructions:</h3>
          <ol>
            <li>Make sure MetaMask is installed in your browser</li>
            <li>Click "Add Local Network" to add the Hardhat local network</li>
            <li>Start the Hardhat node: <code>npm run node</code></li>
            <li>Deploy contracts: <code>npm run deploy</code></li>
            <li>Import test accounts to MetaMask using Hardhat's private keys</li>
            <li>Click "Connect MetaMask" to connect your wallet</li>
          </ol>
        </div>
        
        <div className="network-details">
          <h4>Local Network Details:</h4>
          <ul>
            <li><strong>Network Name:</strong> Localhost 8546</li>
            <li><strong>RPC URL:</strong> http://127.0.0.1:8546</li>
            <li><strong>Chain ID:</strong> 8546</li>
            <li><strong>Currency Symbol:</strong> ETH</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WalletConnection;
