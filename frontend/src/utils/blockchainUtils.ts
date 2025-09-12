// Utility functions for direct blockchain interaction to bypass MetaMask caching issues

const HARDHAT_RPC_URL = 'http://127.0.0.1:8546';

export interface BlockchainCall {
  to: string;
  data: string;
  from?: string;
}

export class BlockchainUtils {
  private static async getCurrentBlock(): Promise<number> {
    const response = await fetch(HARDHAT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 })
    });
    const data = await response.json();
    return parseInt(data.result, 16);
  }

  private static async makeCall(call: BlockchainCall, blockTag?: number): Promise<string> {
    const currentBlock = blockTag || await this.getCurrentBlock();
    
    const response = await fetch(HARDHAT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [call, `0x${currentBlock.toString(16)}`],
        id: 1
      })
    });
    
    const data = await response.json();
    if (data.error) {
      throw new Error(`Blockchain call failed: ${data.error.message}`);
    }
    
    return data.result;
  }

  // ERC20 function selectors
  private static readonly FUNCTION_SELECTORS = {
    balanceOf: '0x70a08231', // balanceOf(address)
    allowance: '0xdd62ed3e', // allowance(address,address)
    approve: '0x095ea7b3',   // approve(address,uint256)
    transfer: '0xa9059cbb',  // transfer(address,uint256)
  };

  // Marketplace function selectors
  private static readonly MARKETPLACE_SELECTORS = {
    getTotalListings: '0x6a2410b1', // getTotalListings()
    getListing: '0xcca30eae',       // getListing(uint256)
    listTokens: '0x8d24a24a',       // listTokens(uint256,uint256,string)
  };

  static async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    const paddedAddress = userAddress.slice(2).padStart(64, '0');
    const callData = this.FUNCTION_SELECTORS.balanceOf + paddedAddress;
    
    const result = await this.makeCall({
      to: tokenAddress,
      data: callData
    });
    
    // Convert from wei to tokens (assuming 18 decimals)
    const balance = BigInt(result);
    return (Number(balance) / (10**18)).toString();
  }

  static async getTokenAllowance(tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<string> {
    const paddedOwner = ownerAddress.slice(2).padStart(64, '0');
    const paddedSpender = spenderAddress.slice(2).padStart(64, '0');
    const callData = this.FUNCTION_SELECTORS.allowance + paddedOwner + paddedSpender;
    
    const result = await this.makeCall({
      to: tokenAddress,
      data: callData
    });
    
    // Convert from wei to tokens (assuming 18 decimals)
    const allowance = BigInt(result);
    return (Number(allowance) / (10**18)).toString();
  }

  static async getTotalListings(marketplaceAddress: string): Promise<number> {
    try {
      const result = await this.makeCall({
        to: marketplaceAddress,
        data: this.MARKETPLACE_SELECTORS.getTotalListings
      });
      return parseInt(result, 16);
    } catch (error) {
      console.warn('Could not get total listings, returning 0:', error);
      return 0;
    }
  }

  static async getCurrentBlockNumber(): Promise<number> {
    return await this.getCurrentBlock();
  }

  // Helper function to get transaction count (nonce)
  static async getTransactionCount(address: string): Promise<number> {
    const response = await fetch(HARDHAT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionCount',
        params: [address, 'latest'],
        id: 1
      })
    });
    
    const data = await response.json();
    if (data.error) {
      throw new Error(`Failed to get transaction count: ${data.error.message}`);
    }
    
    return parseInt(data.result, 16);
  }

  // Helper function to get gas price
  static async getGasPrice(): Promise<string> {
    const response = await fetch(HARDHAT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1
      })
    });
    
    const data = await response.json();
    if (data.error) {
      throw new Error(`Failed to get gas price: ${data.error.message}`);
    }
    
    return data.result;
  }

  // Helper function to estimate gas
  static async estimateGas(transaction: any): Promise<string> {
    const response = await fetch(HARDHAT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_estimateGas',
        params: [transaction],
        id: 1
      })
    });
    
    const data = await response.json();
    if (data.error) {
      throw new Error(`Failed to estimate gas: ${data.error.message}`);
    }
    
    return data.result;
  }
}

// Helper function to encode function parameters
export function encodeAddress(address: string): string {
  return address.slice(2).padStart(64, '0');
}

export function encodeUint256(value: string | number): string {
  const num = typeof value === 'string' ? parseInt(value) : value;
  return num.toString(16).padStart(64, '0');
}

export function encodeString(value: string): string {
  // This is a simplified encoding - for production, use proper ABI encoding
  return Buffer.from(value, 'utf8').toString('hex').padStart(64, '0');
}
