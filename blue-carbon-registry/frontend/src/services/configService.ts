// Configuration service to fetch contract addresses from backend
export interface ContractConfig {
  contracts: {
    carbonCreditToken: string;
    carbonCreditMarketplace: string;
  };
  network: {
    chainId: string;
    rpcUrl: string;
    name: string;
  };
  timestamp: string;
}

class ConfigService {
  private config: ContractConfig | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 0; // No cache during development

  async getConfig(): Promise<ContractConfig> {
    const now = Date.now();
    
    // Return cached config if it's still fresh
    if (this.config && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.config;
    }

    try {
      const response = await fetch('http://localhost:5001/config');
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error('Config fetch failed');
      }
      
      this.config = data.data;
      this.lastFetch = now;
      
      console.log('🔧 Fetched contract config:', this.config);
      return this.config!;
    } catch (error) {
      console.error('❌ Failed to fetch config:', error);
      
      // Fallback to hardcoded addresses if backend is not available
      const fallbackConfig: ContractConfig = {
        contracts: {
          carbonCreditToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          carbonCreditMarketplace: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
        },
        network: {
          chainId: "8546",
          rpcUrl: "http://127.0.0.1:8546",
          name: "Localhost 8546"
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('🔄 Using fallback config:', fallbackConfig);
      return fallbackConfig;
    }
  }

  // Force refresh config (bypass cache)
  async refreshConfig(): Promise<ContractConfig> {
    this.config = null;
    this.lastFetch = 0;
    return this.getConfig();
  }

  // Get current cached config without fetching
  getCachedConfig(): ContractConfig | null {
    return this.config;
  }
}

export const configService = new ConfigService();
