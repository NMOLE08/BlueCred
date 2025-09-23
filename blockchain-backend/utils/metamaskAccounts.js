// Predefined MetaMask accounts from the existing blockchain system
// These are the 6 accounts that will be assigned to NGOs

const METAMASK_ACCOUNTS = [
  {
    accountIndex: 1,
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    name: "NGO1",
    isAssigned: false
  },
  {
    accountIndex: 2,
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    name: "NGO2",
    isAssigned: false
  },
  {
    accountIndex: 3,
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    name: "Company1",
    isAssigned: false
  },
  {
    accountIndex: 4,
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    name: "NGO3",
    isAssigned: false
  },
  {
    accountIndex: 5,
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    privateKey: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    name: "NGO4",
    isAssigned: false
  },
  {
    accountIndex: 6,
    address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    privateKey: "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    name: "NGO5",
    isAssigned: false
  }
];

class MetaMaskAccountManager {
  constructor() {
    this.accounts = [...METAMASK_ACCOUNTS];
  }

  // Get all available accounts
  getAllAccounts() {
    return this.accounts;
  }

  // Get available (unassigned) accounts
  getAvailableAccounts() {
    return this.accounts.filter(account => !account.isAssigned);
  }

  // Assign an account to an NGO
  assignAccount(accountIndex, ngoId) {
    const account = this.accounts.find(acc => acc.accountIndex === accountIndex);
    
    if (!account) {
      throw new Error(`Account with index ${accountIndex} not found`);
    }
    
    if (account.isAssigned) {
      throw new Error(`Account ${accountIndex} is already assigned`);
    }
    
    account.isAssigned = true;
    account.assignedTo = ngoId;
    account.assignedAt = new Date();
    
    return account;
  }

  // Release an account (unassign)
  releaseAccount(accountIndex) {
    const account = this.accounts.find(acc => acc.accountIndex === accountIndex);
    
    if (!account) {
      throw new Error(`Account with index ${accountIndex} not found`);
    }
    
    account.isAssigned = false;
    delete account.assignedTo;
    delete account.assignedAt;
    
    return account;
  }

  // Get account by index
  getAccountByIndex(accountIndex) {
    return this.accounts.find(acc => acc.accountIndex === accountIndex);
  }

  // Get account by address
  getAccountByAddress(address) {
    return this.accounts.find(acc => acc.address.toLowerCase() === address.toLowerCase());
  }

  // Get next available account
  getNextAvailableAccount() {
    const availableAccount = this.accounts.find(acc => !acc.isAssigned);
    return availableAccount;
  }

  // Check if all accounts are assigned
  areAllAccountsAssigned() {
    return this.accounts.every(account => account.isAssigned);
  }

  // Get assignment statistics
  getAssignmentStats() {
    const total = this.accounts.length;
    const assigned = this.accounts.filter(acc => acc.isAssigned).length;
    const available = total - assigned;
    
    return {
      total,
      assigned,
      available,
      percentageAssigned: (assigned / total) * 100
    };
  }
}

module.exports = new MetaMaskAccountManager();
