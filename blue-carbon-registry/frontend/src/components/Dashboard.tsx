import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { BlockchainUtils } from '../utils/blockchainUtils';

interface DashboardProps {
  user: {
    address: string;
    balance: string;
    tokenBalance: string;
    isOwner: boolean;
  };
  contracts: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user, contracts }) => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTokens: '0',
    totalRetired: '0',
    activeListings: 0
  });
  const [recentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!contracts) return;
    
    console.log('📊 Loading dashboard data for user:', user.address);
    setLoading(true);
    try {
      const { carbonToken, marketplace } = contracts;
      
      // Get user's token balance using direct blockchain call
      const userTokens = await BlockchainUtils.getTokenBalance(await carbonToken.getAddress(), user.address);
      
      // Get user's retired tokens with specific block number
      const currentBlock = await BlockchainUtils.getCurrentBlockNumber();
      const retiredTokens = await carbonToken.getRetiredTokens(user.address, { blockTag: currentBlock });
      const totalRetired = ethers.formatEther(retiredTokens);
      
      // Get total listings using direct blockchain call
      const totalListings = await BlockchainUtils.getTotalListings(await marketplace.getAddress());
      
      setStats({
        totalProjects: 3, // Hardcoded for demo
        totalTokens: userTokens, // User's token balance, not total supply
        totalRetired,
        activeListings: Number(totalListings)
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [contracts, user.address]);

  useEffect(() => {
    loadDashboardData();
  }, [contracts, loadDashboardData]);

  const quickActions = [
    {
      title: 'Create Project',
      description: 'Create a new carbon credit project',
      action: () => {/* Navigate to projects tab */},
      icon: '🌱',
      disabled: !user.isOwner
    },
    {
      title: 'List Tokens',
      description: 'List your carbon credits for sale',
      action: () => {/* Navigate to marketplace tab */},
      icon: '💰',
      disabled: parseFloat(stats.totalTokens) === 0
    },
    {
      title: 'Buy Credits',
      description: 'Purchase carbon credits to offset emissions',
      action: () => {/* Navigate to marketplace tab */},
      icon: '🛒',
      disabled: false
    },
    {
      title: 'Retire Tokens',
      description: 'Retire tokens to offset your emissions',
      action: () => {/* Show retire modal */},
      icon: '🔥',
      disabled: parseFloat(stats.totalTokens) === 0
    }
  ];

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <p>Welcome to the Blue Carbon Registry</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🌱</div>
          <div className="stat-content">
            <h3>{stats.totalProjects}</h3>
            <p>Total Projects</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🪙</div>
          <div className="stat-content">
            <h3>{parseFloat(stats.totalTokens).toFixed(2)}</h3>
            <p>Total NCT Tokens</p>
            <small>{(parseFloat(stats.totalTokens) * 3994).toLocaleString()} tons CO₂e</small>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <h3>{stats.totalRetired}</h3>
            <p>Retired Tokens</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🛒</div>
          <div className="stat-content">
            <h3>{stats.activeListings}</h3>
            <p>Active Listings</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <div 
                key={index} 
                className={`action-card ${action.disabled ? 'disabled' : ''}`}
                onClick={action.disabled ? undefined : action.action}
              >
                <div className="action-icon">{action.icon}</div>
                <h4>{action.title}</h4>
                <p>{action.description}</p>
                {action.disabled && <span className="disabled-text">Not Available</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="user-info">
          <h3>Your Account</h3>
          <div className="info-card">
            <div className="info-item">
              <span className="label">Address:</span>
              <span className="value">{user.address}</span>
            </div>
            <div className="info-item">
              <span className="label">ETH Balance:</span>
              <span className="value">{user.balance} ETH</span>
            </div>
            <div className="info-item">
              <span className="label">NCT Tokens:</span>
              <span className="value">{parseFloat(stats.totalTokens).toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="label">CO₂e Equivalent:</span>
              <span className="value">{(parseFloat(stats.totalTokens) * 3994).toLocaleString()} tons</span>
            </div>
            <div className="info-item">
              <span className="label">Retired Tokens:</span>
              <span className="value">{stats.totalRetired}</span>
            </div>
            {user.isOwner && (
              <div className="info-item">
                <span className="label">Role:</span>
                <span className="value owner">Contract Owner</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="conversion-rates">
        <h3>Carbon Credit Conversion Rates</h3>
        <div className="rates-grid">
          <div className="rate-card">
            <h4>NCT to ETH</h4>
            <p>1 NCT ≈ 0.0002504 ETH</p>
            <small>Based on current market rates</small>
          </div>
          <div className="rate-card">
            <h4>ETH to NCT</h4>
            <p>1 ETH ≈ 3,994 NCT</p>
            <small>Based on current market rates</small>
          </div>
          <div className="rate-card">
            <h4>CO₂e Equivalent</h4>
            <p>1 NCT ≈ 3,994 tons CO₂e</p>
            <small>Nature Carbon Tonne standard</small>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {recentTransactions.length === 0 ? (
            <div className="no-activity">
              <p>No recent transactions found.</p>
              <p>Start by creating a project or listing tokens for sale.</p>
            </div>
          ) : (
            recentTransactions.map((tx, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">📋</div>
                <div className="activity-content">
                  <h4>{tx.type}</h4>
                  <p>{tx.description}</p>
                  <span className="activity-time">{tx.timestamp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
