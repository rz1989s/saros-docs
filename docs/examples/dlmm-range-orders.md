# Example: DLMM Range Orders Implementation

Learn how to implement sophisticated range orders using Saros DLMM SDK for automated buying and selling at specific price levels.

## Overview

This example demonstrates:
- Creating buy and sell range orders at specific price levels
- Implementing automated order execution based on market conditions
- Managing multiple range orders simultaneously
- Calculating optimal order sizes and price levels
- Implementing take-profit and stop-loss mechanisms

## Complete Implementation

### Setup and Dependencies

```bash
# Create project
mkdir saros-range-orders
cd saros-range-orders

# Initialize npm project
npm init -y

# Install dependencies
npm install @saros-finance/dlmm-sdk @solana/web3.js
npm install -D typescript @types/node ts-node dotenv
```

### Core Range Order Manager

```typescript
// src/rangeOrderManager.ts
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  DLMM,
  DLMMPool,
  createPosition,
  addLiquidity,
  removeLiquidity,
  getBinArrays,
  PositionV2,
} from '@saros-finance/dlmm-sdk';
import { getAssociatedTokenAddress } from '@solana/spl-token';

export interface RangeOrder {
  id: string;
  type: 'BUY' | 'SELL';
  poolAddress: string;
  targetPrice: number;
  amount: number;
  tolerance: number;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED';
  positionAddress?: string;
  filledAmount: number;
  avgFillPrice?: number;
  createdAt: Date;
  expiresAt?: Date;
}

export interface OrderConfig {
  type: 'BUY' | 'SELL';
  poolAddress: string;
  targetPrice: number;
  amount: number;
  tolerance: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK'; // Good Till Cancelled, Immediate or Cancel, Fill or Kill
  postOnly: boolean;
  reduceOnly: boolean;
  expirationHours?: number;
}

export class RangeOrderManager {
  private connection: Connection;
  private wallet: Keypair;
  private orders: Map<string, RangeOrder> = new Map();
  private pools: Map<string, DLMMPool> = new Map();
  private isRunning: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(rpcUrl: string, walletPath?: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    if (walletPath && require('fs').existsSync(walletPath)) {
      const walletData = JSON.parse(require('fs').readFileSync(walletPath, 'utf-8'));
      this.wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    } else {
      this.wallet = Keypair.generate();
      console.log('⚠️  Generated new wallet:', this.wallet.publicKey.toString());
    }
  }

  async initialize(): Promise<void> {
    console.log('🎯 Initializing DLMM Range Order Manager');
    console.log('📍 Wallet:', this.wallet.publicKey.toString());
    
    try {
      // Check wallet balance
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      console.log(`💰 Wallet balance: ${balance / 1e9} SOL`);
      
      if (balance < 0.01e9) {
        console.warn('⚠️  Low SOL balance for transaction fees');
      }
      
      console.log('✅ Range Order Manager initialized');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  async createRangeOrder(config: OrderConfig): Promise<string> {
    console.log(`📋 Creating ${config.type} range order for ${config.amount} at price ${config.targetPrice}`);
    
    try {
      // Load pool if not cached
      if (!this.pools.has(config.poolAddress)) {
        const pool = await DLMM.create(this.connection, new PublicKey(config.poolAddress));
        this.pools.set(config.poolAddress, pool);
      }
      
      const pool = this.pools.get(config.poolAddress)!;
      const currentPrice = pool.getCurrentPrice();
      
      console.log(`📊 Current pool price: ${currentPrice}`);
      console.log(`🎯 Target price: ${config.targetPrice}`);
      
      // Validate order parameters
      const priceDeviation = Math.abs(currentPrice - config.targetPrice) / currentPrice;
      if (priceDeviation > 0.5) {
        throw new Error(`Target price too far from current price (${priceDeviation * 100}%)`);
      }
      
      // Calculate optimal bin range for the order
      const binRange = this.calculateBinRange(
        config.targetPrice,
        config.tolerance,
        pool.binStep
      );
      
      // Generate unique order ID
      const orderId = `${config.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the range order
      const order: RangeOrder = {
        id: orderId,
        type: config.type,
        poolAddress: config.poolAddress,
        targetPrice: config.targetPrice,
        amount: config.amount,
        tolerance: config.tolerance,
        status: 'PENDING',
        filledAmount: 0,
        createdAt: new Date(),
        expiresAt: config.expirationHours 
          ? new Date(Date.now() + config.expirationHours * 3600000) 
          : undefined
      };
      
      // Create DLMM position for the order
      if (config.type === 'BUY') {
        // For buy orders, create position with Y token (usually USDC/stablecoin)
        const position = await this.createBuyPosition(pool, binRange, config.amount);
        order.positionAddress = position.toString();
      } else {
        // For sell orders, create position with X token (usually the asset being sold)
        const position = await this.createSellPosition(pool, binRange, config.amount);
        order.positionAddress = position.toString();
      }
      
      // Store order
      this.orders.set(orderId, order);
      
      console.log(`✅ Range order created: ${orderId}`);
      console.log(`📍 Position address: ${order.positionAddress}`);
      
      return orderId;
      
    } catch (error) {
      console.error('❌ Failed to create range order:', error);
      throw error;
    }
  }

  private async createBuyPosition(
    pool: DLMMPool,
    binRange: { lowerBin: number; upperBin: number },
    amount: number
  ): Promise<PublicKey> {
    console.log(`🟢 Creating buy position for ${amount} tokens`);
    
    try {
      // For buy orders, we provide Y token (quote token) liquidity
      // This liquidity will be used to buy X token when price moves into range
      
      const positionParams = {
        poolAddress: pool.poolAddress,
        user: this.wallet.publicKey,
        lowerBinId: binRange.lowerBin,
        upperBinId: binRange.upperBin,
        amountX: 0, // No X token for buy orders
        amountY: Math.floor(amount * 1e6), // Y token amount (assuming USDC with 6 decimals)
        liquidityDistribution: this.generateLiquidityDistribution(binRange)
      };
      
      const transaction = await createPosition(
        this.connection,
        positionParams,
        this.wallet.publicKey
      );
      
      // Sign and send transaction
      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      transaction.sign(this.wallet);
      
      const signature = await this.connection.sendTransaction(transaction);
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      console.log('🎉 Buy position created:', signature);
      
      // Extract position address from transaction
      const positionAddress = new PublicKey('11111111111111111111111111111112'); // Placeholder
      return positionAddress;
      
    } catch (error) {
      console.error('❌ Failed to create buy position:', error);
      throw error;
    }
  }

  private async createSellPosition(
    pool: DLMMPool,
    binRange: { lowerBin: number; upperBin: number },
    amount: number
  ): Promise<PublicKey> {
    console.log(`🔴 Creating sell position for ${amount} tokens`);
    
    try {
      // For sell orders, we provide X token liquidity
      // This liquidity will be sold for Y token when price moves into range
      
      const positionParams = {
        poolAddress: pool.poolAddress,
        user: this.wallet.publicKey,
        lowerBinId: binRange.lowerBin,
        upperBinId: binRange.upperBin,
        amountX: Math.floor(amount * 1e9), // X token amount (assuming SOL with 9 decimals)
        amountY: 0, // No Y token for sell orders
        liquidityDistribution: this.generateLiquidityDistribution(binRange)
      };
      
      const transaction = await createPosition(
        this.connection,
        positionParams,
        this.wallet.publicKey
      );
      
      // Sign and send transaction
      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      transaction.sign(this.wallet);
      
      const signature = await this.connection.sendTransaction(transaction);
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      console.log('🎉 Sell position created:', signature);
      
      // Extract position address from transaction
      const positionAddress = new PublicKey('11111111111111111111111111111112'); // Placeholder
      return positionAddress;
      
    } catch (error) {
      console.error('❌ Failed to create sell position:', error);
      throw error;
    }
  }

  private calculateBinRange(
    targetPrice: number,
    tolerance: number,
    binStep: number
  ): { lowerBin: number; upperBin: number } {
    // Convert target price to bin ID
    // This is a simplified calculation - actual implementation would be more complex
    const targetBinId = Math.log(targetPrice) / Math.log(1 + binStep / 10000);
    
    const toleranceRange = tolerance * targetBinId;
    
    return {
      lowerBin: Math.floor(targetBinId - toleranceRange),
      upperBin: Math.ceil(targetBinId + toleranceRange)
    };
  }

  private generateLiquidityDistribution(
    binRange: { lowerBin: number; upperBin: number }
  ): number[] {
    // Generate distribution weights for each bin
    const binCount = binRange.upperBin - binRange.lowerBin + 1;
    const distribution: number[] = [];
    
    // Use normal distribution for liquidity concentration
    const center = (binRange.lowerBin + binRange.upperBin) / 2;
    
    for (let binId = binRange.lowerBin; binId <= binRange.upperBin; binId++) {
      const distance = Math.abs(binId - center);
      const weight = Math.exp(-distance * distance / (2 * binCount * binCount));
      distribution.push(weight);
    }
    
    // Normalize weights
    const totalWeight = distribution.reduce((sum, weight) => sum + weight, 0);
    return distribution.map(weight => weight / totalWeight);
  }

  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('📊 Monitoring already running');
      return;
    }
    
    console.log('👁️  Starting order monitoring...');
    this.isRunning = true;
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAllOrders();
      } catch (error) {
        console.error('❌ Monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  private async checkAllOrders(): Promise<void> {
    const pendingOrders = Array.from(this.orders.values())
      .filter(order => order.status === 'PENDING' || order.status === 'PARTIALLY_FILLED');
    
    if (pendingOrders.length === 0) return;
    
    console.log(`🔍 Checking ${pendingOrders.length} active orders...`);
    
    for (const order of pendingOrders) {
      await this.checkOrderStatus(order);
    }
  }

  private async checkOrderStatus(order: RangeOrder): Promise<void> {
    try {
      if (!order.positionAddress) return;
      
      // Get current position status
      const positionInfo = await getPositionInfo(
        this.connection,
        new PublicKey(order.positionAddress)
      );
      
      if (!positionInfo) {
        console.warn(`⚠️  Position not found: ${order.positionAddress}`);
        return;
      }
      
      // Calculate fill status
      const originalAmount = order.amount;
      const currentAmount = this.extractLiquidityAmount(positionInfo);
      const filledAmount = originalAmount - currentAmount;
      
      if (filledAmount > order.filledAmount) {
        // Order has been partially or fully filled
        const newlyFilled = filledAmount - order.filledAmount;
        order.filledAmount = filledAmount;
        
        if (filledAmount >= originalAmount * 0.99) { // 99% filled considered complete
          order.status = 'FILLED';
          console.log(`🎉 Order ${order.id} FILLED - ${filledAmount} tokens`);
        } else {
          order.status = 'PARTIALLY_FILLED';
          console.log(`🔄 Order ${order.id} PARTIALLY FILLED - ${newlyFilled} tokens`);
        }
        
        // Update order in storage
        this.orders.set(order.id, order);
        
        // Trigger callbacks or notifications here
        await this.onOrderFilled(order, newlyFilled);
      }
      
      // Check for expiration
      if (order.expiresAt && new Date() > order.expiresAt) {
        console.log(`⏰ Order ${order.id} expired, cancelling...`);
        await this.cancelOrder(order.id);
      }
      
    } catch (error) {
      console.error(`❌ Error checking order ${order.id}:`, error);
    }
  }

  private extractLiquidityAmount(positionInfo: any): number {
    // Extract current liquidity amount from position info
    // This is a simplified implementation
    return positionInfo.liquidity || 0;
  }

  private async onOrderFilled(order: RangeOrder, filledAmount: number): Promise<void> {
    console.log(`📈 Order fill notification: ${order.type} ${filledAmount} at ~${order.targetPrice}`);
    
    // Collect fees if any
    if (order.positionAddress) {
      try {
        await collectFees(
          this.connection,
          new PublicKey(order.positionAddress),
          this.wallet.publicKey
        );
        console.log('💰 Fees collected from filled position');
      } catch (error) {
        console.error('❌ Failed to collect fees:', error);
      }
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    console.log(`❌ Cancelling order: ${orderId}`);
    
    try {
      const order = this.orders.get(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.positionAddress) {
        // Remove liquidity from the position
        await removeLiquidity(
          this.connection,
          new PublicKey(order.positionAddress),
          this.wallet.publicKey,
          100 // Remove 100% of liquidity
        );
        
        console.log(`🗑️  Position ${order.positionAddress} closed`);
      }
      
      order.status = 'CANCELLED';
      this.orders.set(orderId, order);
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to cancel order:', error);
      return false;
    }
  }

  async getOrderStatus(orderId: string): Promise<RangeOrder | null> {
    return this.orders.get(orderId) || null;
  }

  async getAllOrders(): Promise<RangeOrder[]> {
    return Array.from(this.orders.values());
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isRunning = false;
    console.log('🛑 Order monitoring stopped');
  }
}
```

### Range Order Strategies

```typescript
// src/strategies.ts
import { RangeOrderManager, OrderConfig } from './rangeOrderManager';

export class TradingStrategies {
  private orderManager: RangeOrderManager;

  constructor(orderManager: RangeOrderManager) {
    this.orderManager = orderManager;
  }

  /**
   * Grid Trading Strategy
   * Places multiple buy and sell orders at different price levels
   */
  async gridStrategy(
    poolAddress: string,
    centerPrice: number,
    gridSpacing: number,
    orderSize: number,
    gridLevels: number
  ): Promise<string[]> {
    console.log('📊 Executing Grid Trading Strategy');
    console.log(`Center price: ${centerPrice}, Spacing: ${gridSpacing}%, Levels: ${gridLevels}`);
    
    const orderIds: string[] = [];
    
    try {
      // Create buy orders below center price
      for (let i = 1; i <= gridLevels; i++) {
        const buyPrice = centerPrice * (1 - (gridSpacing * i) / 100);
        const buyConfig: OrderConfig = {
          type: 'BUY',
          poolAddress,
          targetPrice: buyPrice,
          amount: orderSize,
          tolerance: 0.5, // 0.5% tolerance
          timeInForce: 'GTC',
          postOnly: true,
          reduceOnly: false
        };
        
        const buyOrderId = await this.orderManager.createRangeOrder(buyConfig);
        orderIds.push(buyOrderId);
        console.log(`🟢 Buy order ${i}: ${buyPrice} (${orderSize} tokens)`);
      }
      
      // Create sell orders above center price
      for (let i = 1; i <= gridLevels; i++) {
        const sellPrice = centerPrice * (1 + (gridSpacing * i) / 100);
        const sellConfig: OrderConfig = {
          type: 'SELL',
          poolAddress,
          targetPrice: sellPrice,
          amount: orderSize,
          tolerance: 0.5, // 0.5% tolerance
          timeInForce: 'GTC',
          postOnly: true,
          reduceOnly: false
        };
        
        const sellOrderId = await this.orderManager.createRangeOrder(sellConfig);
        orderIds.push(sellOrderId);
        console.log(`🔴 Sell order ${i}: ${sellPrice} (${orderSize} tokens)`);
      }
      
      console.log(`✅ Grid strategy deployed with ${orderIds.length} orders`);
      return orderIds;
      
    } catch (error) {
      console.error('❌ Grid strategy failed:', error);
      throw error;
    }
  }

  /**
   * DCA (Dollar Cost Averaging) Strategy
   * Places periodic buy orders at current market price with tolerance
   */
  async dcaStrategy(
    poolAddress: string,
    orderSize: number,
    intervalMinutes: number,
    maxOrders: number
  ): Promise<void> {
    console.log('💰 Executing DCA Strategy');
    console.log(`Order size: ${orderSize}, Interval: ${intervalMinutes}min, Max orders: ${maxOrders}`);
    
    let orderCount = 0;
    
    const dcaInterval = setInterval(async () => {
      try {
        if (orderCount >= maxOrders) {
          clearInterval(dcaInterval);
          console.log('🏁 DCA strategy completed');
          return;
        }
        
        // Get current market price
        const pool = await DLMM.create(
          this.orderManager['connection'],
          new PublicKey(poolAddress)
        );
        const currentPrice = pool.getCurrentPrice();
        
        // Create buy order with 2% tolerance
        const dcaConfig: OrderConfig = {
          type: 'BUY',
          poolAddress,
          targetPrice: currentPrice,
          amount: orderSize,
          tolerance: 2.0, // 2% tolerance for market orders
          timeInForce: 'IOC', // Immediate or Cancel
          postOnly: false,
          reduceOnly: false,
          expirationHours: 1 // Expire after 1 hour if not filled
        };
        
        const orderId = await this.orderManager.createRangeOrder(dcaConfig);
        orderCount++;
        
        console.log(`💸 DCA order ${orderCount}/${maxOrders}: ${orderId} at ${currentPrice}`);
        
      } catch (error) {
        console.error('❌ DCA order failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Bracket Order Strategy
   * Creates take-profit and stop-loss orders around a base position
   */
  async bracketStrategy(
    poolAddress: string,
    basePrice: number,
    amount: number,
    takeProfitPercent: number,
    stopLossPercent: number
  ): Promise<string[]> {
    console.log('🎯 Executing Bracket Order Strategy');
    
    const orderIds: string[] = [];
    
    try {
      // Take profit order (sell above base price)
      const takeProfitPrice = basePrice * (1 + takeProfitPercent / 100);
      const takeProfitConfig: OrderConfig = {
        type: 'SELL',
        poolAddress,
        targetPrice: takeProfitPrice,
        amount,
        tolerance: 0.5,
        timeInForce: 'GTC',
        postOnly: true,
        reduceOnly: true // Close existing position
      };
      
      const takeProfitId = await this.orderManager.createRangeOrder(takeProfitConfig);
      orderIds.push(takeProfitId);
      console.log(`🎯 Take Profit: ${takeProfitPrice} (+${takeProfitPercent}%)`);
      
      // Stop loss order (sell below base price)
      const stopLossPrice = basePrice * (1 - stopLossPercent / 100);
      const stopLossConfig: OrderConfig = {
        type: 'SELL',
        poolAddress,
        targetPrice: stopLossPrice,
        amount,
        tolerance: 2.0, // Higher tolerance for stop loss
        timeInForce: 'IOC',
        postOnly: false,
        reduceOnly: true
      };
      
      const stopLossId = await this.orderManager.createRangeOrder(stopLossConfig);
      orderIds.push(stopLossId);
      console.log(`🛑 Stop Loss: ${stopLossPrice} (-${stopLossPercent}%)`);
      
      return orderIds;
      
    } catch (error) {
      console.error('❌ Bracket strategy failed:', error);
      throw error;
    }
  }
}
```

### Usage Example

```typescript
// src/main.ts
import { RangeOrderManager, OrderConfig } from './rangeOrderManager';
import { TradingStrategies } from './strategies';
import { clusterApiUrl } from '@solana/web3.js';

async function main() {
  // Initialize order manager
  const orderManager = new RangeOrderManager(
    clusterApiUrl('devnet'), // Use devnet for testing
    process.env.WALLET_PATH // Optional: path to wallet keypair JSON
  );
  
  await orderManager.initialize();
  
  // Initialize strategies
  const strategies = new TradingStrategies(orderManager);
  
  // Example: SOL/USDC pool on devnet
  const poolAddress = 'your-pool-address-here';
  const currentPrice = 100; // Current SOL price in USDC
  
  // Example 1: Single range order
  console.log('\n🎯 Example 1: Single Buy Order');
  const buyOrderId = await orderManager.createRangeOrder({
    type: 'BUY',
    poolAddress,
    targetPrice: currentPrice * 0.95, // Buy 5% below current price
    amount: 10, // 10 USDC
    tolerance: 1.0, // 1% tolerance
    timeInForce: 'GTC',
    postOnly: true,
    reduceOnly: false,
    expirationHours: 24
  });
  
  console.log(`📋 Buy order created: ${buyOrderId}`);
  
  // Example 2: Grid trading strategy
  console.log('\n📊 Example 2: Grid Trading Strategy');
  const gridOrderIds = await strategies.gridStrategy(
    poolAddress,
    currentPrice, // Center price
    2, // 2% spacing between orders
    5, // 5 tokens per order
    3  // 3 levels each side (6 orders total)
  );
  
  console.log(`📊 Grid deployed with ${gridOrderIds.length} orders`);
  
  // Example 3: DCA strategy
  console.log('\n💰 Example 3: DCA Strategy');
  await strategies.dcaStrategy(
    poolAddress,
    10, // 10 USDC per order
    60, // Every 60 minutes
    10  // Maximum 10 orders
  );
  
  // Start monitoring all orders
  await orderManager.startMonitoring();
  
  // Keep running for demo purposes
  console.log('\n⏳ Monitoring orders... Press Ctrl+C to stop');
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    orderManager.stopMonitoring();
    
    // Optional: Cancel all pending orders
    const orders = await orderManager.getAllOrders();
    const pendingOrders = orders.filter(o => 
      o.status === 'PENDING' || o.status === 'PARTIALLY_FILLED'
    );
    
    for (const order of pendingOrders) {
      await orderManager.cancelOrder(order.id);
    }
    
    process.exit(0);
  });
}

// Error handling wrapper
main().catch(error => {
  console.error('💥 Application error:', error);
  process.exit(1);
});
```

### Testing and Simulation

```typescript
// tests/rangeOrders.test.ts
import { RangeOrderManager } from '../src/rangeOrderManager';
import { clusterApiUrl } from '@solana/web3.js';

describe('DLMM Range Orders', () => {
  let orderManager: RangeOrderManager;
  
  beforeAll(async () => {
    orderManager = new RangeOrderManager(clusterApiUrl('devnet'));
    await orderManager.initialize();
  });
  
  afterAll(() => {
    orderManager.stopMonitoring();
  });
  
  test('should create buy range order', async () => {
    const orderId = await orderManager.createRangeOrder({
      type: 'BUY',
      poolAddress: 'test-pool-address',
      targetPrice: 100,
      amount: 10,
      tolerance: 1.0,
      timeInForce: 'GTC',
      postOnly: true,
      reduceOnly: false
    });
    
    expect(orderId).toBeDefined();
    expect(orderId.length).toBeGreaterThan(10);
    
    const order = await orderManager.getOrderStatus(orderId);
    expect(order).toBeDefined();
    expect(order!.type).toBe('BUY');
    expect(order!.status).toBe('PENDING');
  });
  
  test('should create sell range order', async () => {
    const orderId = await orderManager.createRangeOrder({
      type: 'SELL',
      poolAddress: 'test-pool-address',
      targetPrice: 120,
      amount: 5,
      tolerance: 0.5,
      timeInForce: 'GTC',
      postOnly: true,
      reduceOnly: false
    });
    
    expect(orderId).toBeDefined();
    
    const order = await orderManager.getOrderStatus(orderId);
    expect(order!.type).toBe('SELL');
  });
});
```

### Configuration Example

```typescript
// config/strategies.ts
import { PositionStrategy } from '../src/rangeOrderManager';

export const PREDEFINED_STRATEGIES = {
  CONSERVATIVE_GRID: {
    gridSpacing: 1.0,      // 1% spacing
    orderSize: 50,         // 50 USDC per order
    gridLevels: 5,         // 5 levels each side
    tolerance: 0.5         // 0.5% tolerance
  },
  
  AGGRESSIVE_SCALPING: {
    gridSpacing: 0.1,      // 0.1% spacing
    orderSize: 10,         // 10 USDC per order
    gridLevels: 20,        // 20 levels each side
    tolerance: 0.1         // 0.1% tolerance
  },
  
  DCA_WEEKLY: {
    orderSize: 100,        // 100 USDC per week
    intervalMinutes: 10080, // Weekly (7 * 24 * 60)
    maxOrders: 52,         // One year
    tolerance: 3.0         // 3% tolerance for market orders
  }
} as const;

// Pool configurations for popular trading pairs
export const POOL_CONFIGS = {
  'SOL-USDC': {
    poolAddress: 'your-sol-usdc-pool-address',
    baseDecimals: 9,  // SOL decimals
    quoteDecimals: 6, // USDC decimals
    tickSpacing: 60,
    minOrderSize: 0.1 // Minimum 0.1 SOL
  },
  
  'BONK-SOL': {
    poolAddress: 'your-bonk-sol-pool-address',
    baseDecimals: 5,  // BONK decimals
    quoteDecimals: 9, // SOL decimals
    tickSpacing: 120,
    minOrderSize: 1000000 // Minimum 1M BONK
  }
} as const;
```

## Advanced Features

### Order Analytics

```typescript
// src/analytics.ts
export class OrderAnalytics {
  calculateOrderPerformance(orders: RangeOrder[]): PerformanceMetrics {
    const filledOrders = orders.filter(o => o.status === 'FILLED');
    
    return {
      totalOrders: orders.length,
      filledOrders: filledOrders.length,
      fillRate: filledOrders.length / orders.length,
      totalVolume: filledOrders.reduce((sum, o) => sum + o.filledAmount, 0),
      avgFillTime: this.calculateAvgFillTime(filledOrders),
      profitLoss: this.calculatePnL(filledOrders)
    };
  }
  
  generateReport(orders: RangeOrder[]): string {
    const metrics = this.calculateOrderPerformance(orders);
    
    return `
📈 RANGE ORDER PERFORMANCE REPORT
=====================================
📊 Total Orders: ${metrics.totalOrders}
✅ Filled Orders: ${metrics.filledOrders}
📋 Fill Rate: ${(metrics.fillRate * 100).toFixed(2)}%
💵 Total Volume: ${metrics.totalVolume.toFixed(2)}
⏱️  Avg Fill Time: ${metrics.avgFillTime.toFixed(1)} minutes
💰 Total P&L: ${metrics.profitLoss.toFixed(2)} USDC
=====================================
    `.trim();
  }
}
```

## Production Checklist

### Before Deployment

- [ ] **Test on devnet**: Verify all strategies work with test tokens
- [ ] **Risk management**: Implement position size limits and maximum exposure
- [ ] **Error handling**: Comprehensive try-catch blocks with retry logic
- [ ] **Monitoring**: Set up alerts for failed orders and unusual behavior
- [ ] **Gas optimization**: Batch operations when possible
- [ ] **Security**: Never hardcode private keys, use environment variables
- [ ] **Backup systems**: Implement fallback RPC endpoints
- [ ] **Logging**: Add structured logging for audit trails
- [ ] **Rate limiting**: Respect RPC endpoint limits
- [ ] **Circuit breakers**: Pause trading during extreme volatility

### Risk Warnings

⚠️ **Important Considerations:**
- Range orders can result in losses during trending markets
- Always test with small amounts first
- Monitor gas costs vs. profits carefully
- Be aware of impermanent loss in DLMM positions
- Consider MEV protection for large orders
- Set appropriate position size limits

## What's Next?

🎉 **You've mastered DLMM range orders!**

### Advanced Techniques:
1. **[Implement Arbitrage Bot](/docs/examples/arbitrage-bot)** - Cross-DEX arbitrage
2. **[Build Analytics Dashboard](/docs/examples/defi-analytics-dashboard)** - Track performance
3. **[Advanced Strategies](/docs/tutorials/optimizing-dlmm-strategies)** - Professional tactics
4. **[Rust SDK Integration](/docs/rust-sdk/examples)** - High-performance execution

### Resources:
- 📚 [DLMM API Reference](/docs/dlmm-sdk/api-reference) - Complete method docs
- 🛠️ [Troubleshooting Guide](/docs/troubleshooting#transaction-errors) - Common problems
- 💬 [Developer Support](https://t.me/+DLLPYFzvTzJmNTJh) - Get help on Telegram
- 📊 [Pool Analytics](https://docs.saros.xyz/analytics) - Pool statistics and metrics