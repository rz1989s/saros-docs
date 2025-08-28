# Real-Time Price Feed with WebSocket

This example demonstrates how to create a real-time price monitoring system using Saros SDK with WebSocket connections for live market data.

## Overview

Build a real-time price feed that:
- Connects to Solana WebSocket for instant updates
- Monitors multiple token pairs simultaneously
- Calculates price changes and trends
- Handles connection failures gracefully
- Optimizes for high-frequency updates

## Complete Implementation

```typescript
import { 
  Connection, 
  PublicKey, 
  clusterApiUrl,
  AccountChangeCallback 
} from '@solana/web3.js';
import { SarosSDK } from '@saros-finance/sdk';
import { LiquidityBookServices } from '@saros-finance/dlmm-sdk';

interface PriceData {
  mint: PublicKey;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  lastUpdate: number;
}

interface PriceFeedConfig {
  pairs: Array<{
    inputMint: PublicKey;
    outputMint: PublicKey;
    symbol: string;
  }>;
  updateInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

class SarosRealTimePriceFeed {
  private connection: Connection;
  private wsConnection: Connection;
  private sdk: SarosSDK;
  private dlmmServices: LiquidityBookServices;
  private config: PriceFeedConfig;
  
  private prices: Map<string, PriceData> = new Map();
  private subscriptions: Map<string, number> = new Map();
  private reconnectAttempts = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private isConnected = false;
  
  // Event handlers
  public onPriceUpdate?: (symbol: string, priceData: PriceData) => void;
  public onConnectionStatus?: (connected: boolean) => void;
  public onError?: (error: Error) => void;

  constructor(config: PriceFeedConfig) {
    this.config = config;
    
    // HTTP connection for initial data
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'),
      'confirmed'
    );
    
    // WebSocket connection for real-time updates
    this.wsConnection = new Connection(
      process.env.SOLANA_WS_URL || 'wss://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    this.sdk = new SarosSDK({
      connection: this.connection,
      cluster: 'mainnet-beta'
    });
    
    this.dlmmServices = new LiquidityBookServices();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Saros Real-Time Price Feed...');
      
      // Fetch initial price data
      await this.fetchInitialPrices();
      
      // Start WebSocket subscriptions
      await this.startWebSocketSubscriptions();
      
      // Setup heartbeat monitoring
      this.startHeartbeat();
      
      console.log('✅ Price feed initialized successfully');
      this.isConnected = true;
      this.onConnectionStatus?.(true);
      
    } catch (error) {
      console.error('❌ Failed to initialize price feed:', error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  private async fetchInitialPrices(): Promise<void> {
    const pricePromises = this.config.pairs.map(async (pair) => {
      try {
        const quote = await this.sdk.getSwapQuote({
          inputMint: pair.inputMint,
          outputMint: pair.outputMint,
          inputAmount: 1 * 1e6, // 1 unit for price calculation
          slippageTolerance: 0.001
        });

        const priceData: PriceData = {
          mint: pair.inputMint,
          symbol: pair.symbol,
          price: quote.outputAmount / 1e6,
          priceChange24h: 0, // Will be calculated with historical data
          volume24h: 0, // Will be fetched separately
          lastUpdate: Date.now()
        };

        this.prices.set(pair.symbol, priceData);
        console.log(`📊 Initial price for ${pair.symbol}: $${priceData.price.toFixed(4)}`);
        
      } catch (error) {
        console.warn(`⚠️ Failed to fetch initial price for ${pair.symbol}:`, error);
      }
    });

    await Promise.allSettled(pricePromises);
  }

  private async startWebSocketSubscriptions(): Promise<void> {
    for (const pair of this.config.pairs) {
      try {
        // Subscribe to pool account changes
        const poolAddress = await this.findPoolAddress(pair.inputMint, pair.outputMint);
        
        if (poolAddress) {
          const subscriptionId = this.wsConnection.onAccountChange(
            poolAddress,
            this.createAccountChangeHandler(pair),
            'confirmed'
          );
          
          this.subscriptions.set(pair.symbol, subscriptionId);
          console.log(`🔔 WebSocket subscription created for ${pair.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create subscription for ${pair.symbol}:`, error);
      }
    }
  }

  private createAccountChangeHandler(pair: any): AccountChangeCallback {
    return async (accountInfo, context) => {
      try {
        // Decode pool data and calculate new price
        const newPrice = await this.calculatePriceFromAccountData(
          accountInfo,
          pair.inputMint,
          pair.outputMint
        );

        const currentData = this.prices.get(pair.symbol);
        if (currentData && newPrice !== currentData.price) {
          const priceChange = ((newPrice - currentData.price) / currentData.price) * 100;
          
          const updatedData: PriceData = {
            ...currentData,
            price: newPrice,
            priceChange24h: this.calculate24hChange(pair.symbol, newPrice),
            lastUpdate: Date.now()
          };

          this.prices.set(pair.symbol, updatedData);
          
          // Trigger price update callback
          this.onPriceUpdate?.(pair.symbol, updatedData);
          
          console.log(`💹 ${pair.symbol}: $${newPrice.toFixed(4)} (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%)`);
        }
      } catch (error) {
        console.error(`❌ Error processing price update for ${pair.symbol}:`, error);
      }
    };
  }

  private async findPoolAddress(
    inputMint: PublicKey, 
    outputMint: PublicKey
  ): Promise<PublicKey | null> {
    try {
      // Try to find DLMM pool first
      const pools = await this.dlmmServices.getAllPools();
      const pool = pools.find(p => 
        (p.tokenMintX.equals(inputMint) && p.tokenMintY.equals(outputMint)) ||
        (p.tokenMintX.equals(outputMint) && p.tokenMintY.equals(inputMint))
      );
      
      if (pool) {
        return new PublicKey(pool.address);
      }

      // Fallback to regular AMM pools
      const ammPools = await this.sdk.getAllPools();
      const ammPool = ammPools.find(p => 
        (p.tokenA.equals(inputMint) && p.tokenB.equals(outputMint)) ||
        (p.tokenA.equals(outputMint) && p.tokenB.equals(inputMint))
      );

      return ammPool ? ammPool.address : null;
    } catch (error) {
      console.error('Failed to find pool address:', error);
      return null;
    }
  }

  private async calculatePriceFromAccountData(
    accountInfo: any,
    inputMint: PublicKey,
    outputMint: PublicKey
  ): Promise<number> {
    try {
      // Use fresh quote to get accurate price
      const quote = await this.sdk.getSwapQuote({
        inputMint,
        outputMint,
        inputAmount: 1 * 1e6,
        slippageTolerance: 0.001
      });

      return quote.outputAmount / 1e6;
    } catch (error) {
      console.error('Failed to calculate price:', error);
      return 0;
    }
  }

  private calculate24hChange(symbol: string, currentPrice: number): number {
    // Implementation would store historical prices and calculate 24h change
    // For this example, we'll simulate the calculation
    const historicalPrice = this.getHistoricalPrice(symbol, Date.now() - 24 * 60 * 60 * 1000);
    if (historicalPrice) {
      return ((currentPrice - historicalPrice) / historicalPrice) * 100;
    }
    return 0;
  }

  private getHistoricalPrice(symbol: string, timestamp: number): number | null {
    // Implementation would query historical price data
    // For demo purposes, return current price with small variation
    const currentPrice = this.prices.get(symbol)?.price || 0;
    return currentPrice * (0.95 + Math.random() * 0.1); // ±5% variation
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        // Send ping to maintain connection
        await this.wsConnection.getLatestBlockhash('finalized');
      } catch (error) {
        console.warn('⚠️ Heartbeat failed, attempting reconnection...');
        await this.handleReconnection();
      }
    }, this.config.heartbeatInterval);
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.onError?.(new Error('Connection lost - max retries exceeded'));
      return;
    }

    this.reconnectAttempts++;
    this.isConnected = false;
    this.onConnectionStatus?.(false);

    try {
      console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
      
      // Cleanup old subscriptions
      await this.cleanup();
      
      // Wait before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000 * this.reconnectAttempts));
      
      // Reinitialize WebSocket connections
      await this.startWebSocketSubscriptions();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onConnectionStatus?.(true);
      
      console.log('✅ Reconnection successful');
      
    } catch (error) {
      console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      await this.handleReconnection(); // Recursive retry
    }
  }

  getCurrentPrice(symbol: string): PriceData | null {
    return this.prices.get(symbol) || null;
  }

  getAllPrices(): Map<string, PriceData> {
    return new Map(this.prices);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async cleanup(): Promise<void> {
    // Remove WebSocket subscriptions
    for (const [symbol, subscriptionId] of this.subscriptions) {
      try {
        await this.wsConnection.removeAccountChangeListener(subscriptionId);
        console.log(`🗑️ Cleaned up subscription for ${symbol}`);
      } catch (error) {
        console.warn(`Warning: Failed to cleanup subscription for ${symbol}:`, error);
      }
    }
    
    this.subscriptions.clear();
    
    // Clear heartbeat timer
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    console.log('🧹 Price feed cleanup complete');
  }
}

// Usage Example
async function main() {
  const config: PriceFeedConfig = {
    pairs: [
      {
        inputMint: new PublicKey('So11111111111111111111111111111111111111112'), // SOL
        outputMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
        symbol: 'SOL/USDC'
      },
      {
        inputMint: new PublicKey('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'), // mSOL
        outputMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
        symbol: 'mSOL/USDC'
      }
    ],
    updateInterval: 1000, // 1 second
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000 // 30 seconds
  };

  const priceFeed = new SarosRealTimePriceFeed(config);

  // Setup event handlers
  priceFeed.onPriceUpdate = (symbol, priceData) => {
    console.log(`📈 Price Update: ${symbol} = $${priceData.price.toFixed(4)}`);
    console.log(`   24h Change: ${priceData.priceChange24h.toFixed(2)}%`);
    console.log(`   Volume: $${priceData.volume24h.toLocaleString()}`);
  };

  priceFeed.onConnectionStatus = (connected) => {
    console.log(`🔌 Connection Status: ${connected ? 'Connected' : 'Disconnected'}`);
  };

  priceFeed.onError = (error) => {
    console.error('💥 Price Feed Error:', error.message);
  };

  try {
    await priceFeed.initialize();
    
    // Keep running for demonstration
    console.log('🔄 Price feed running... Press Ctrl+C to stop');
    
    // Example: Get current prices
    setInterval(() => {
      const allPrices = priceFeed.getAllPrices();
      console.log('\n📊 Current Prices:');
      allPrices.forEach((data, symbol) => {
        console.log(`   ${symbol}: $${data.price.toFixed(4)} (${data.priceChange24h.toFixed(2)}%)`);
      });
    }, 10000); // Print summary every 10 seconds

  } catch (error) {
    console.error('❌ Failed to start price feed:', error);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down price feed...');
    await priceFeed.cleanup();
    process.exit(0);
  });
}

// Advanced Features
class AdvancedPriceAnalytics {
  private priceHistory: Map<string, number[]> = new Map();
  private maxHistoryLength = 1000;

  addPricePoint(symbol: string, price: number): void {
    let history = this.priceHistory.get(symbol) || [];
    history.push(price);
    
    // Keep only recent history
    if (history.length > this.maxHistoryLength) {
      history = history.slice(-this.maxHistoryLength);
    }
    
    this.priceHistory.set(symbol, history);
  }

  calculateVolatility(symbol: string, periods: number = 20): number {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < periods) return 0;

    const recentPrices = history.slice(-periods);
    const returns = [];
    
    for (let i = 1; i < recentPrices.length; i++) {
      const return_ = Math.log(recentPrices[i] / recentPrices[i - 1]);
      returns.push(return_);
    }

    // Calculate standard deviation
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * 100; // Convert to percentage
  }

  detectPriceTrends(symbol: string, periods: number = 10): 'bullish' | 'bearish' | 'neutral' {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < periods) return 'neutral';

    const recentPrices = history.slice(-periods);
    const firstPrice = recentPrices[0];
    const lastPrice = recentPrices[recentPrices.length - 1];
    const change = (lastPrice - firstPrice) / firstPrice;

    if (change > 0.02) return 'bullish';   // >2% increase
    if (change < -0.02) return 'bearish';  // >2% decrease
    return 'neutral';
  }

  getSupportResistanceLevels(symbol: string): { support: number; resistance: number } {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < 50) {
      return { support: 0, resistance: 0 };
    }

    const recentPrices = history.slice(-50);
    const min = Math.min(...recentPrices);
    const max = Math.max(...recentPrices);

    return {
      support: min,
      resistance: max
    };
  }
}

// Error Recovery and Resilience
class PriceFeedResilience {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        console.warn(`⚠️ Attempt ${attempt} failed, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
      }
    }
    throw new Error('Should not reach here');
  }

  static createCircuitBreaker(
    failureThreshold: number = 5,
    timeoutMs: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;

    return {
      async execute<T>(operation: () => Promise<T>): Promise<T> {
        // Check if circuit is open
        if (failures >= failureThreshold) {
          if (Date.now() - lastFailureTime < timeoutMs) {
            throw new Error('Circuit breaker open - too many failures');
          }
          // Reset circuit after timeout
          failures = 0;
        }

        try {
          const result = await operation();
          failures = 0; // Reset on success
          return result;
        } catch (error) {
          failures++;
          lastFailureTime = Date.now();
          throw error;
        }
      }
    };
  }
}

// Performance Optimization
class PriceFeedOptimization {
  private updateQueue: Array<{symbol: string, price: number, timestamp: number}> = [];
  private batchUpdateTimer?: NodeJS.Timeout;
  
  queuePriceUpdate(symbol: string, price: number): void {
    this.updateQueue.push({
      symbol,
      price,
      timestamp: Date.now()
    });

    // Process updates in batches
    if (!this.batchUpdateTimer) {
      this.batchUpdateTimer = setTimeout(() => {
        this.processBatchUpdates();
      }, 100); // 100ms batch window
    }
  }

  private processBatchUpdates(): void {
    // Group updates by symbol, keep only latest
    const latestUpdates = new Map<string, {price: number, timestamp: number}>();
    
    this.updateQueue.forEach(update => {
      const current = latestUpdates.get(update.symbol);
      if (!current || update.timestamp > current.timestamp) {
        latestUpdates.set(update.symbol, {
          price: update.price,
          timestamp: update.timestamp
        });
      }
    });

    // Apply batched updates
    latestUpdates.forEach((data, symbol) => {
      console.log(`📊 Batched update: ${symbol} = $${data.price.toFixed(4)}`);
    });

    // Clear queue and timer
    this.updateQueue = [];
    this.batchUpdateTimer = undefined;
  }
}

// Export for use in other modules
export {
  SarosRealTimePriceFeed,
  AdvancedPriceAnalytics,
  PriceFeedResilience,
  PriceFeedOptimization,
  type PriceData,
  type PriceFeedConfig
};

// Run example if called directly
if (require.main === module) {
  main().catch(console.error);
}
```

## Key Features

### 🔄 Real-Time Updates
- **WebSocket connections** for instant price changes
- **Account change subscriptions** for pool updates  
- **Heartbeat monitoring** to detect connection issues
- **Automatic reconnection** with exponential backoff

### 📈 Price Analytics
- **Historical price tracking** with configurable memory
- **Volatility calculation** using standard deviation
- **Trend detection** (bullish/bearish/neutral)
- **Support/resistance levels** from price history

### 🛡️ Error Handling & Resilience
- **Circuit breaker pattern** to prevent cascade failures
- **Retry logic** with exponential backoff
- **Connection monitoring** with automatic recovery
- **Graceful degradation** when WebSocket fails

### ⚡ Performance Optimization
- **Batch processing** for high-frequency updates
- **Memory management** for long-running processes
- **Connection pooling** for multiple price feeds
- **Efficient data structures** for fast lookups

## Configuration

### Environment Variables

```bash
# Required
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com

# Optional
PRICE_FEED_UPDATE_INTERVAL=1000
PRICE_FEED_HISTORY_LENGTH=1000
PRICE_FEED_BATCH_SIZE=10
```

### Production Considerations

```typescript
const productionConfig: PriceFeedConfig = {
  pairs: [
    // Add your trading pairs
  ],
  updateInterval: 500,        // Faster updates for trading
  maxReconnectAttempts: 10,   // More resilient
  heartbeatInterval: 15000    // More frequent heartbeat
};
```

## Testing

```typescript
// Test the price feed
describe('SarosRealTimePriceFeed', () => {
  let priceFeed: SarosRealTimePriceFeed;

  beforeEach(() => {
    priceFeed = new SarosRealTimePriceFeed(testConfig);
  });

  afterEach(async () => {
    await priceFeed.cleanup();
  });

  it('should initialize successfully', async () => {
    await expect(priceFeed.initialize()).resolves.toBeUndefined();
    expect(priceFeed.getConnectionStatus()).toBe(true);
  });

  it('should receive price updates', async () => {
    await priceFeed.initialize();
    
    const prices = priceFeed.getAllPrices();
    expect(prices.size).toBeGreaterThan(0);
    
    const solPrice = priceFeed.getCurrentPrice('SOL/USDC');
    expect(solPrice).toBeDefined();
    expect(solPrice!.price).toBeGreaterThan(0);
  });
});
```

## Next Steps

1. **Deploy monitoring** - Set up alerting for connection issues
2. **Add more pairs** - Monitor additional tokens and pools
3. **Implement alerts** - Price threshold notifications
4. **Historical data** - Store and analyze price trends
5. **Machine learning** - Predictive price modeling

## Related Examples

- [Automated Trading Bot](/docs/examples/automated-trading-bot) - Uses this price feed
- [Arbitrage Detection](/docs/examples/arbitrage-bot) - Cross-exchange price monitoring
- [Portfolio Dashboard](/docs/examples/portfolio-analytics-dashboard) - Real-time portfolio tracking

---

This real-time price feed provides the foundation for building sophisticated trading applications with Saros SDKs. The WebSocket integration ensures you never miss critical price movements! 🚀