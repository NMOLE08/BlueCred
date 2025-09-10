import React, { useState, useEffect, useCallback } from 'react';

interface TransactionHistoryProps {
  user: {
    address: string;
    balance: string;
    tokenBalance: string;
    isOwner: boolean;
  };
  contracts: any;
}

interface Transaction {
  id: string;
  type: 'mint' | 'transfer' | 'purchase' | 'retire' | 'list' | 'cancel';
  from: string;
  to: string;
  amount: string;
  token: string;
  timestamp: number;
  description: string;
  status: 'success' | 'pending' | 'failed';
  txHash?: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ user, contracts }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mint' | 'transfer' | 'purchase' | 'retire' | 'list' | 'cancel'>('all');

  const loadTransactions = useCallback(async () => {
    if (!contracts) return;
    
    setLoading(true);
    try {
      // In a real application, you would fetch transactions from:
      // 1. Contract events
      // 2. A backend database
      // 3. A blockchain indexer
      
      // For demo purposes, we'll create some sample transactions
      const sampleTransactions: Transaction[] = [
        {
          id: '1',
          type: 'mint',
          from: '0x0000000000000000000000000000000000000000',
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          amount: '1000',
          token: 'BCC',
          timestamp: Date.now() - 86400000,
          description: 'Minted tokens for Mangrove Restoration Project',
          status: 'success',
          txHash: '0x1234567890abcdef...'
        },
        {
          id: '2',
          type: 'mint',
          from: '0x0000000000000000000000000000000000000000',
          to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          amount: '750',
          token: 'BCC',
          timestamp: Date.now() - 172800000,
          description: 'Minted tokens for Seagrass Conservation Project',
          status: 'success',
          txHash: '0x2345678901bcdef0...'
        },
        {
          id: '3',
          type: 'list',
          from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          to: '0x0000000000000000000000000000000000000000',
          amount: '100',
          token: 'BCC',
          timestamp: Date.now() - 259200000,
          description: 'Listed 100 BCC tokens for sale at 0.001 ETH each',
          status: 'success',
          txHash: '0x3456789012cdef01...'
        },
        {
          id: '4',
          type: 'purchase',
          from: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          amount: '100',
          token: 'BCC',
          timestamp: Date.now() - 345600000,
          description: 'Purchased 100 BCC tokens for 0.1 ETH',
          status: 'success',
          txHash: '0x4567890123def012...'
        },
        {
          id: '5',
          type: 'retire',
          from: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          to: '0x0000000000000000000000000000000000000000',
          amount: '50',
          token: 'BCC',
          timestamp: Date.now() - 432000000,
          description: 'Retired 50 BCC tokens to offset company emissions',
          status: 'success',
          txHash: '0x5678901234ef0123...'
        }
      ];
      
      setTransactions(sampleTransactions);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  useEffect(() => {
    loadTransactions();
  }, [contracts, loadTransactions]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'mint': return '🪙';
      case 'transfer': return '↔️';
      case 'purchase': return '🛒';
      case 'retire': return '🔥';
      case 'list': return '💰';
      case 'cancel': return '❌';
      default: return '📋';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'mint': return '#4CAF50';
      case 'transfer': return '#2196F3';
      case 'purchase': return '#FF9800';
      case 'retire': return '#F44336';
      case 'list': return '#9C27B0';
      case 'cancel': return '#607D8B';
      default: return '#666';
    }
  };

  const formatAddress = (address: string) => {
    if (address === '0x0000000000000000000000000000000000000000') {
      return 'System';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredTransactions = transactions.filter(tx => 
    filter === 'all' || tx.type === filter
  );

  if (loading) {
    return (
      <div className="transaction-history">
        <div className="loading">Loading transaction history...</div>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      <div className="transaction-header">
        <h2>Transaction History</h2>
        <p>View all carbon credit transactions on the blockchain</p>
      </div>

      <div className="transaction-filters">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Transactions
        </button>
        <button 
          className={filter === 'mint' ? 'active' : ''}
          onClick={() => setFilter('mint')}
        >
          🪙 Minting
        </button>
        <button 
          className={filter === 'purchase' ? 'active' : ''}
          onClick={() => setFilter('purchase')}
        >
          🛒 Purchases
        </button>
        <button 
          className={filter === 'retire' ? 'active' : ''}
          onClick={() => setFilter('retire')}
        >
          🔥 Retirements
        </button>
        <button 
          className={filter === 'list' ? 'active' : ''}
          onClick={() => setFilter('list')}
        >
          💰 Listings
        </button>
      </div>

      <div className="transactions-list">
        {filteredTransactions.length === 0 ? (
          <div className="no-transactions">
            <p>No transactions found.</p>
            <p>Transactions will appear here as they occur on the blockchain.</p>
          </div>
        ) : (
          <div className="transactions-grid">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="transaction-card">
                <div className="transaction-header">
                  <div className="transaction-icon" style={{ color: getTransactionColor(transaction.type) }}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="transaction-info">
                    <h4>{transaction.description}</h4>
                    <span className="transaction-type">{transaction.type.toUpperCase()}</span>
                  </div>
                  <div className="transaction-status">
                    <span className={`status-badge ${transaction.status}`}>
                      {transaction.status === 'success' ? '✅' : 
                       transaction.status === 'pending' ? '⏳' : '❌'}
                    </span>
                  </div>
                </div>
                
                <div className="transaction-details">
                  <div className="detail-row">
                    <span className="label">From:</span>
                    <span className="value">{formatAddress(transaction.from)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">To:</span>
                    <span className="value">{formatAddress(transaction.to)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Amount:</span>
                    <span className="value">{transaction.amount} {transaction.token}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Time:</span>
                    <span className="value">{formatTimestamp(transaction.timestamp)}</span>
                  </div>
                  
                  {transaction.txHash && (
                    <div className="detail-row">
                      <span className="label">Transaction Hash:</span>
                      <span className="value tx-hash">{transaction.txHash}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="transaction-stats">
        <h3>Transaction Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total Transactions:</span>
            <span className="stat-value">{transactions.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Successful:</span>
            <span className="stat-value">
              {transactions.filter(tx => tx.status === 'success').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pending:</span>
            <span className="stat-value">
              {transactions.filter(tx => tx.status === 'pending').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Failed:</span>
            <span className="stat-value">
              {transactions.filter(tx => tx.status === 'failed').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
