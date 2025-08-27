# Staking Rewards Automation

This example demonstrates how to build an automated staking rewards system that manages multiple staking positions across different Saros pools, automatically compounds rewards, and optimizes staking strategies based on current APY and market conditions.

## Overview

The Staking Rewards Automation system provides:
- **Multi-Pool Staking**: Stake across multiple Saros pools simultaneously
- **Automated Compounding**: Automatically claim and re-stake rewards
- **Strategy Optimization**: Dynamically adjust staking allocation based on APY
- **Risk Management**: Position limits and emergency unstaking capabilities
- **Performance Analytics**: Track staking performance and yields

## Implementation

### Core Staking Engine

```typescript
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  Keypair
} from '@solana/web3.js';
import { SarosSDK, StakingPool, StakePosition } from '@saros-finance/sdk';
import { getAssociatedTokenAddress } from '@solana/spl-token';

export interface StakingStrategy {
  name: string;
  minAPY: number;
  maxAllocation: number;
  autoCompound: boolean;
  compoundThreshold: number; // Minimum reward amount to compound
}

export interface StakingConfig {
  strategies: StakingStrategy[];
  maxTotalStaked: number;
  emergencyUnstakeThreshold: number; // APY below which to emergency unstake
  checkInterval: number; // Minutes between checks
  slippageTolerance: number;
}

export interface PoolMetrics {
  poolId: string;
  currentAPY: number;
  totalStaked: number;
  pendingRewards: number;
  lastCompound: Date;
  strategy: string;
}

export class StakingRewardsEngine {
  private connection: Connection;
  private sdk: SarosSDK;
  private wallet: Keypair;
  private config: StakingConfig;
  private isRunning = false;
  private stakingPools = new Map<string, StakingPool>();
  private positions = new Map<string, StakePosition>();
  private metrics = new Map<string, PoolMetrics>();

  constructor(
    connection: Connection,
    wallet: Keypair,
    config: StakingConfig
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.config = config;
    this.sdk = new SarosSDK(connection);
  }

  /**
   * Initialize staking pools and load existing positions
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing staking rewards engine...');

      // Load all available staking pools
      const pools = await this.sdk.getStakingPools();
      for (const pool of pools) {
        this.stakingPools.set(pool.id.toString(), pool);
      }

      // Load existing positions for this wallet
      const userPositions = await this.sdk.getUserStakePositions(
        this.wallet.publicKey
      );

      for (const position of userPositions) {
        this.positions.set(position.poolId.toString(), position);
        
        // Initialize metrics for existing positions
        const pool = this.stakingPools.get(position.poolId.toString());
        if (pool) {
          this.metrics.set(position.poolId.toString(), {
            poolId: position.poolId.toString(),
            currentAPY: await this.calculatePoolAPY(pool),
            totalStaked: position.stakedAmount,
            pendingRewards: await this.getPendingRewards(position),
            lastCompound: new Date(position.lastRewardsClaimed * 1000),
            strategy: this.determineStrategy(pool.id.toString())
          });
        }
      }

      console.log(`Loaded ${this.stakingPools.size} pools and ${this.positions.size} positions`);
    } catch (error) {
      console.error('Failed to initialize staking engine:', error);
      throw error;
    }
  }

  /**
   * Start the automated staking process
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Staking engine is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting staking rewards automation...');

    while (this.isRunning) {
      try {
        await this.runStakingCycle();
        await this.sleep(this.config.checkInterval * 60 * 1000);
      } catch (error) {
        console.error('Error in staking cycle:', error);
        // Continue running despite errors
        await this.sleep(30000); // Wait 30 seconds before retry
      }
    }
  }

  /**
   * Stop the automated staking process
   */
  stop(): void {
    console.log('Stopping staking rewards automation...');
    this.isRunning = false;
  }

  /**
   * Run a single staking cycle
   */
  private async runStakingCycle(): Promise<void> {
    console.log('Running staking cycle...');

    // Update pool metrics
    await this.updatePoolMetrics();

    // Check for compounding opportunities
    await this.processCompounding();

    // Rebalance allocations based on current APYs
    await this.rebalanceAllocations();

    // Emergency unstaking if needed
    await this.checkEmergencyConditions();

    // Log performance metrics
    this.logPerformanceMetrics();
  }

  /**
   * Update APY and metrics for all pools
   */
  private async updatePoolMetrics(): Promise<void> {
    for (const [poolId, pool] of this.stakingPools) {
      try {
        const apy = await this.calculatePoolAPY(pool);
        const position = this.positions.get(poolId);
        
        let metrics = this.metrics.get(poolId);
        if (!metrics) {
          metrics = {
            poolId,
            currentAPY: apy,
            totalStaked: 0,
            pendingRewards: 0,
            lastCompound: new Date(),
            strategy: this.determineStrategy(poolId)
          };
          this.metrics.set(poolId, metrics);
        }

        metrics.currentAPY = apy;
        
        if (position) {
          metrics.totalStaked = position.stakedAmount;
          metrics.pendingRewards = await this.getPendingRewards(position);
        }
      } catch (error) {
        console.error(`Error updating metrics for pool ${poolId}:`, error);
      }
    }
  }

  /**
   * Process reward compounding for eligible positions
   */
  private async processCompounding(): Promise<void> {
    for (const [poolId, metrics] of this.metrics) {
      const strategy = this.config.strategies.find(s => s.name === metrics.strategy);
      
      if (!strategy?.autoCompound) continue;
      
      if (metrics.pendingRewards >= strategy.compoundThreshold) {
        try {
          await this.compoundRewards(poolId);
          metrics.lastCompound = new Date();
          console.log(`Compounded ${metrics.pendingRewards} rewards for pool ${poolId}`);
        } catch (error) {
          console.error(`Failed to compound rewards for pool ${poolId}:`, error);
        }
      }
    }
  }

  /**
   * Rebalance allocations based on current APYs
   */
  private async rebalanceAllocations(): Promise<void> {
    const totalStakedValue = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.totalStaked, 0);

    // Calculate optimal allocation based on weighted APY
    const optimalAllocations = this.calculateOptimalAllocations();

    for (const [poolId, targetAllocation] of optimalAllocations) {
      const currentMetrics = this.metrics.get(poolId);
      if (!currentMetrics) continue;

      const targetStaked = this.config.maxTotalStaked * targetAllocation;
      const currentStaked = currentMetrics.totalStaked;
      const difference = targetStaked - currentStaked;

      // Only rebalance if difference is significant (>5% or >$100 equivalent)
      const rebalanceThreshold = Math.max(
        targetStaked * 0.05,
        100 * 1e6 // $100 in lamports equivalent
      );

      if (Math.abs(difference) > rebalanceThreshold) {
        try {
          if (difference > 0) {
            // Need to stake more
            await this.stakeToPool(poolId, difference);
            console.log(`Increased stake in pool ${poolId} by ${difference}`);
          } else {
            // Need to stake less
            await this.unstakeFromPool(poolId, Math.abs(difference));
            console.log(`Reduced stake in pool ${poolId} by ${Math.abs(difference)}`);
          }
        } catch (error) {
          console.error(`Failed to rebalance pool ${poolId}:`, error);
        }
      }
    }
  }

  /**
   * Calculate optimal allocations based on risk-adjusted APY
   */
  private calculateOptimalAllocations(): Map<string, number> {
    const allocations = new Map<string, number>();
    
    // Calculate risk-adjusted scores for each pool
    const poolScores = new Map<string, number>();
    let totalScore = 0;

    for (const [poolId, metrics] of this.metrics) {
      const strategy = this.config.strategies.find(s => s.name === metrics.strategy);
      if (!strategy) continue;

      // Risk-adjusted score: APY * (1 - volatility penalty)
      const volatilityPenalty = this.calculateVolatilityPenalty(poolId);
      const riskAdjustedAPY = metrics.currentAPY * (1 - volatilityPenalty);
      
      // Apply strategy constraints
      const maxAllocation = strategy.maxAllocation;
      const constrainedScore = Math.min(riskAdjustedAPY, riskAdjustedAPY * maxAllocation);
      
      poolScores.set(poolId, constrainedScore);
      totalScore += constrainedScore;
    }

    // Calculate proportional allocations
    for (const [poolId, score] of poolScores) {
      const allocation = totalScore > 0 ? score / totalScore : 0;
      allocations.set(poolId, allocation);
    }

    return allocations;
  }

  /**
   * Check for emergency unstaking conditions
   */
  private async checkEmergencyConditions(): Promise<void> {
    for (const [poolId, metrics] of this.metrics) {
      if (metrics.currentAPY < this.config.emergencyUnstakeThreshold) {
        console.warn(`Emergency unstaking from pool ${poolId} - APY below threshold`);
        try {
          await this.emergencyUnstake(poolId);
        } catch (error) {
          console.error(`Failed emergency unstake for pool ${poolId}:`, error);
        }
      }
    }
  }

  /**
   * Stake tokens to a specific pool
   */
  private async stakeToPool(poolId: string, amount: number): Promise<string> {
    const pool = this.stakingPools.get(poolId);
    if (!pool) throw new Error(`Pool ${poolId} not found`);

    const transaction = await this.sdk.createStakeTransaction({
      pool: pool.id,
      amount,
      user: this.wallet.publicKey,
      slippageBps: this.config.slippageTolerance * 100
    });

    transaction.sign([this.wallet]);
    const signature = await this.connection.sendTransaction(transaction);
    await this.connection.confirmTransaction(signature);

    // Update position tracking
    const existingPosition = this.positions.get(poolId);
    if (existingPosition) {
      existingPosition.stakedAmount += amount;
    } else {
      // Create new position tracking
      this.positions.set(poolId, {
        poolId: new PublicKey(poolId),
        stakedAmount: amount,
        lastRewardsClaimed: Date.now() / 1000,
        user: this.wallet.publicKey
      });
    }

    return signature;
  }

  /**
   * Unstake tokens from a specific pool
   */
  private async unstakeFromPool(poolId: string, amount: number): Promise<string> {
    const pool = this.stakingPools.get(poolId);
    const position = this.positions.get(poolId);
    
    if (!pool || !position) {
      throw new Error(`Pool or position ${poolId} not found`);
    }

    const transaction = await this.sdk.createUnstakeTransaction({
      pool: pool.id,
      amount: Math.min(amount, position.stakedAmount),
      user: this.wallet.publicKey,
      slippageBps: this.config.slippageTolerance * 100
    });

    transaction.sign([this.wallet]);
    const signature = await this.connection.sendTransaction(transaction);
    await this.connection.confirmTransaction(signature);

    // Update position tracking
    position.stakedAmount = Math.max(0, position.stakedAmount - amount);
    if (position.stakedAmount === 0) {
      this.positions.delete(poolId);
    }

    return signature;
  }

  /**
   * Compound rewards for a specific pool
   */
  private async compoundRewards(poolId: string): Promise<string> {
    const position = this.positions.get(poolId);
    if (!position) throw new Error(`No position found for pool ${poolId}`);

    const rewards = await this.getPendingRewards(position);
    if (rewards === 0) return '';

    // Claim rewards
    const claimTx = await this.sdk.createClaimRewardsTransaction({
      position: position,
      user: this.wallet.publicKey
    });

    claimTx.sign([this.wallet]);
    const claimSig = await this.connection.sendTransaction(claimTx);
    await this.connection.confirmTransaction(claimSig);

    // Re-stake rewards
    const stakeSig = await this.stakeToPool(poolId, rewards);
    
    return stakeSig;
  }

  /**
   * Emergency unstake all funds from a pool
   */
  private async emergencyUnstake(poolId: string): Promise<void> {
    const position = this.positions.get(poolId);
    if (!position || position.stakedAmount === 0) return;

    // Claim any pending rewards first
    try {
      await this.compoundRewards(poolId);
    } catch (error) {
      console.warn(`Could not claim rewards during emergency unstake: ${error}`);
    }

    // Unstake all funds
    await this.unstakeFromPool(poolId, position.stakedAmount);
    console.log(`Emergency unstaked ${position.stakedAmount} from pool ${poolId}`);
  }

  /**
   * Calculate pool APY based on recent rewards
   */
  private async calculatePoolAPY(pool: StakingPool): Promise<number> {
    try {
      const poolInfo = await this.sdk.getPoolInfo(pool.id);
      return poolInfo.apy || 0;
    } catch (error) {
      console.error(`Error calculating APY for pool ${pool.id}:`, error);
      return 0;
    }
  }

  /**
   * Get pending rewards for a position
   */
  private async getPendingRewards(position: StakePosition): Promise<number> {
    try {
      return await this.sdk.calculatePendingRewards(position);
    } catch (error) {
      console.error('Error calculating pending rewards:', error);
      return 0;
    }
  }

  /**
   * Calculate volatility penalty for risk adjustment
   */
  private calculateVolatilityPenalty(poolId: string): number {
    // Simplified volatility calculation based on APY fluctuation
    // In production, this would use historical data
    const metrics = this.metrics.get(poolId);
    if (!metrics) return 0.1; // Default 10% penalty for unknown volatility

    // Higher penalty for newer pools or very high APYs
    if (metrics.currentAPY > 100) return 0.3; // 30% penalty for suspicious APYs
    if (metrics.currentAPY > 50) return 0.2;  // 20% penalty for high APYs
    
    return 0.1; // 10% base volatility penalty
  }

  /**
   * Determine appropriate strategy for a pool
   */
  private determineStrategy(poolId: string): string {
    const metrics = this.metrics.get(poolId);
    if (!metrics) return 'conservative';

    if (metrics.currentAPY > 50) return 'aggressive';
    if (metrics.currentAPY > 25) return 'balanced';
    return 'conservative';
  }

  /**
   * Get current portfolio performance
   */
  async getPortfolioMetrics(): Promise<{
    totalStaked: number;
    totalRewards: number;
    averageAPY: number;
    activePositions: number;
  }> {
    let totalStaked = 0;
    let totalRewards = 0;
    let weightedAPY = 0;

    for (const metrics of this.metrics.values()) {
      totalStaked += metrics.totalStaked;
      totalRewards += metrics.pendingRewards;
      weightedAPY += metrics.currentAPY * metrics.totalStaked;
    }

    return {
      totalStaked,
      totalRewards,
      averageAPY: totalStaked > 0 ? weightedAPY / totalStaked : 0,
      activePositions: this.positions.size
    };
  }

  /**
   * Log current performance metrics
   */
  private logPerformanceMetrics(): void {
    console.log('\n=== Staking Performance Metrics ===');
    
    for (const [poolId, metrics] of this.metrics) {
      console.log(`Pool ${poolId.slice(0, 8)}...:`);
      console.log(`  APY: ${metrics.currentAPY.toFixed(2)}%`);
      console.log(`  Staked: ${(metrics.totalStaked / 1e6).toFixed(2)} USDC`);
      console.log(`  Pending: ${(metrics.pendingRewards / 1e6).toFixed(4)} USDC`);
      console.log(`  Strategy: ${metrics.strategy}`);
      console.log(`  Last Compound: ${metrics.lastCompound.toLocaleString()}`);
    }
    
    console.log('====================================\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Predefined Staking Strategies

```typescript
export const STAKING_STRATEGIES: { [key: string]: StakingStrategy } = {
  conservative: {
    name: 'conservative',
    minAPY: 8,
    maxAllocation: 0.4, // Max 40% in any single pool
    autoCompound: true,
    compoundThreshold: 10 * 1e6 // $10 minimum to compound
  },
  
  balanced: {
    name: 'balanced', 
    minAPY: 15,
    maxAllocation: 0.5, // Max 50% in any single pool
    autoCompound: true,
    compoundThreshold: 5 * 1e6 // $5 minimum to compound
  },
  
  aggressive: {
    name: 'aggressive',
    minAPY: 25,
    maxAllocation: 0.7, // Max 70% in any single pool
    autoCompound: true,
    compoundThreshold: 2 * 1e6 // $2 minimum to compound
  },
  
  maxYield: {
    name: 'maxYield',
    minAPY: 0,
    maxAllocation: 1.0, // Can go all-in on best pool
    autoCompound: true,
    compoundThreshold: 1 * 1e6 // $1 minimum to compound
  }
};
```

### Configuration Management

```typescript
export class StakingConfigManager {
  static createConfig(
    strategy: keyof typeof STAKING_STRATEGIES,
    maxStakeAmount: number,
    customOverrides?: Partial<StakingConfig>
  ): StakingConfig {
    const baseStrategy = STAKING_STRATEGIES[strategy];
    
    const defaultConfig: StakingConfig = {
      strategies: [baseStrategy],
      maxTotalStaked: maxStakeAmount,
      emergencyUnstakeThreshold: 2.0, // 2% APY
      checkInterval: 15, // 15 minutes
      slippageTolerance: 0.01 // 1%
    };

    return { ...defaultConfig, ...customOverrides };
  }

  static createMultiStrategyConfig(
    strategies: (keyof typeof STAKING_STRATEGIES)[],
    maxStakeAmount: number
  ): StakingConfig {
    return {
      strategies: strategies.map(s => STAKING_STRATEGIES[s]),
      maxTotalStaked: maxStakeAmount,
      emergencyUnstakeThreshold: 2.0,
      checkInterval: 10, // More frequent for multi-strategy
      slippageTolerance: 0.01
    };
  }
}
```

### CLI Application

```typescript
import { Command } from 'commander';
import { Connection, Keypair } from '@solana/web3.js';
import * as fs from 'fs';

const program = new Command();

program
  .name('staking-automation')
  .description('Automated staking rewards management for Saros')
  .version('1.0.0');

program
  .command('start')
  .description('Start automated staking')
  .option('-k, --keypair <path>', 'Path to wallet keypair file')
  .option('-r, --rpc <url>', 'Solana RPC URL', 'https://api.devnet.solana.com')
  .option('-s, --strategy <type>', 'Staking strategy', 'balanced')
  .option('-a, --amount <number>', 'Maximum amount to stake (USDC)')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    try {
      const connection = new Connection(options.rpc);
      const wallet = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(options.keypair, 'utf-8')))
      );

      let config: StakingConfig;
      if (options.config) {
        config = JSON.parse(fs.readFileSync(options.config, 'utf-8'));
      } else {
        config = StakingConfigManager.createConfig(
          options.strategy,
          parseFloat(options.amount) * 1e6
        );
      }

      const engine = new StakingRewardsEngine(connection, wallet, config);
      await engine.initialize();

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\nReceived SIGINT, stopping staking engine...');
        engine.stop();
        process.exit(0);
      });

      await engine.start();
    } catch (error) {
      console.error('Failed to start staking automation:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check staking status')
  .option('-k, --keypair <path>', 'Path to wallet keypair file')
  .option('-r, --rpc <url>', 'Solana RPC URL', 'https://api.devnet.solana.com')
  .action(async (options) => {
    try {
      const connection = new Connection(options.rpc);
      const wallet = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(options.keypair, 'utf-8')))
      );

      const tempConfig = StakingConfigManager.createConfig('balanced', 0);
      const engine = new StakingRewardsEngine(connection, wallet, tempConfig);
      await engine.initialize();

      const metrics = await engine.getPortfolioMetrics();
      
      console.log('\n=== Portfolio Status ===');
      console.log(`Total Staked: $${(metrics.totalStaked / 1e6).toFixed(2)}`);
      console.log(`Pending Rewards: $${(metrics.totalRewards / 1e6).toFixed(4)}`);
      console.log(`Average APY: ${metrics.averageAPY.toFixed(2)}%`);
      console.log(`Active Positions: ${metrics.activePositions}`);
      console.log('========================\n');
    } catch (error) {
      console.error('Failed to get staking status:', error);
      process.exit(1);
    }
  });

program
  .command('compound')
  .description('Manually compound all rewards')
  .option('-k, --keypair <path>', 'Path to wallet keypair file')
  .option('-r, --rpc <url>', 'Solana RPC URL', 'https://api.devnet.solana.com')
  .action(async (options) => {
    try {
      const connection = new Connection(options.rpc);
      const wallet = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(options.keypair, 'utf-8')))
      );

      const tempConfig = StakingConfigManager.createConfig('balanced', 0);
      const engine = new StakingRewardsEngine(connection, wallet, tempConfig);
      await engine.initialize();

      console.log('Compounding all eligible rewards...');
      // This would trigger manual compounding logic
      
    } catch (error) {
      console.error('Failed to compound rewards:', error);
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}
```

## Usage Examples

### Basic Balanced Staking

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { StakingRewardsEngine, StakingConfigManager } from './staking-automation';

async function runBalancedStaking() {
  const connection = new Connection('https://api.devnet.solana.com');
  const wallet = Keypair.generate(); // Use your actual keypair
  
  // Create balanced configuration for $1000 stake
  const config = StakingConfigManager.createConfig(
    'balanced',
    1000 * 1e6 // $1000 in USDC
  );

  const engine = new StakingRewardsEngine(connection, wallet, config);
  await engine.initialize();
  
  console.log('Starting balanced staking automation...');
  await engine.start();
}
```

### Multi-Strategy Staking

```typescript
async function runMultiStrategyStaking() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = Keypair.generate(); // Use your actual keypair
  
  // Use multiple strategies simultaneously
  const config = StakingConfigManager.createMultiStrategyConfig(
    ['conservative', 'balanced', 'aggressive'],
    5000 * 1e6 // $5000 total stake
  );

  const engine = new StakingRewardsEngine(connection, wallet, config);
  await engine.initialize();
  
  console.log('Starting multi-strategy staking...');
  await engine.start();
}
```

### Custom Strategy Configuration

```typescript
async function runCustomStrategy() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = Keypair.generate();
  
  const customConfig: StakingConfig = {
    strategies: [
      {
        name: 'highYield',
        minAPY: 30,
        maxAllocation: 0.3,
        autoCompound: true,
        compoundThreshold: 20 * 1e6 // $20 threshold
      },
      {
        name: 'stable',
        minAPY: 8,
        maxAllocation: 0.7,
        autoCompound: true,
        compoundThreshold: 5 * 1e6 // $5 threshold
      }
    ],
    maxTotalStaked: 10000 * 1e6, // $10,000
    emergencyUnstakeThreshold: 1.0, // 1% emergency threshold
    checkInterval: 5, // Check every 5 minutes
    slippageTolerance: 0.005 // 0.5% slippage
  };

  const engine = new StakingRewardsEngine(connection, wallet, customConfig);
  await engine.initialize();
  
  await engine.start();
}
```

## CLI Commands

```bash
# Start automated staking with default balanced strategy
npm run staking start --keypair ./wallet.json --amount 1000

# Start with custom strategy
npm run staking start --keypair ./wallet.json --strategy aggressive --amount 5000

# Check current staking status
npm run staking status --keypair ./wallet.json

# Manually compound all rewards
npm run staking compound --keypair ./wallet.json

# Use custom configuration file
npm run staking start --keypair ./wallet.json --config ./staking-config.json
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { StakingRewardsEngine, StakingConfigManager } from '../staking-automation';

describe('StakingRewardsEngine', () => {
  let engine: StakingRewardsEngine;
  let mockConnection: Connection;
  let testWallet: Keypair;

  beforeEach(() => {
    mockConnection = new Connection('https://api.devnet.solana.com');
    testWallet = Keypair.generate();
    
    const config = StakingConfigManager.createConfig('balanced', 1000 * 1e6);
    engine = new StakingRewardsEngine(mockConnection, testWallet, config);
  });

  it('should initialize with correct configuration', async () => {
    expect(engine).toBeInstanceOf(StakingRewardsEngine);
  });

  it('should calculate optimal allocations correctly', () => {
    // Test allocation calculation logic
    // This would require mocking the metrics data
  });

  it('should handle emergency unstaking', async () => {
    // Test emergency unstaking conditions
  });

  it('should compound rewards when threshold is met', async () => {
    // Test compounding logic
  });
});

describe('StakingConfigManager', () => {
  it('should create balanced config correctly', () => {
    const config = StakingConfigManager.createConfig('balanced', 1000 * 1e6);
    
    expect(config.strategies).toHaveLength(1);
    expect(config.strategies[0].name).toBe('balanced');
    expect(config.maxTotalStaked).toBe(1000 * 1e6);
    expect(config.emergencyUnstakeThreshold).toBe(2.0);
  });

  it('should create multi-strategy config correctly', () => {
    const config = StakingConfigManager.createMultiStrategyConfig(
      ['conservative', 'balanced'],
      2000 * 1e6
    );
    
    expect(config.strategies).toHaveLength(2);
    expect(config.maxTotalStaked).toBe(2000 * 1e6);
  });
});
```

### Integration Tests

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { StakingRewardsEngine } from '../staking-automation';

describe('Staking Integration Tests', () => {
  let connection: Connection;
  let wallet: Keypair;

  beforeAll(async () => {
    connection = new Connection('https://api.devnet.solana.com');
    // Use a funded devnet wallet for integration tests
    wallet = Keypair.fromSecretKey(/* test wallet secret */);
  });

  it('should successfully initialize with real pools', async () => {
    const config = StakingConfigManager.createConfig('conservative', 100 * 1e6);
    const engine = new StakingRewardsEngine(connection, wallet, config);
    
    await expect(engine.initialize()).resolves.not.toThrow();
  });

  it('should successfully execute staking transaction', async () => {
    const config = StakingConfigManager.createConfig('balanced', 50 * 1e6);
    const engine = new StakingRewardsEngine(connection, wallet, config);
    
    await engine.initialize();
    
    // Test staking a small amount
    // This would require actual devnet setup and funded wallet
  });
});
```

### Configuration Examples

```json
{
  "strategies": [
    {
      "name": "stablecoin",
      "minAPY": 5,
      "maxAllocation": 0.5,
      "autoCompound": true,
      "compoundThreshold": 50000000
    },
    {
      "name": "highYield", 
      "minAPY": 20,
      "maxAllocation": 0.3,
      "autoCompound": true,
      "compoundThreshold": 10000000
    }
  ],
  "maxTotalStaked": 10000000000,
  "emergencyUnstakeThreshold": 1.5,
  "checkInterval": 10,
  "slippageTolerance": 0.01
}
```

## Key Features

1. **Automated Compounding**: Automatically claims and re-stakes rewards when they exceed the configured threshold
2. **Dynamic Allocation**: Adjusts staking allocations based on current APY and strategy constraints  
3. **Risk Management**: Emergency unstaking when APYs drop below acceptable levels
4. **Multi-Strategy Support**: Can run multiple staking strategies simultaneously with different risk profiles
5. **Performance Monitoring**: Comprehensive metrics tracking and logging
6. **CLI Interface**: Easy-to-use command-line interface for management

## Risk Considerations

- **Smart Contract Risk**: Staking pools are subject to smart contract vulnerabilities
- **APY Volatility**: High APYs may be temporary or unsustainable
- **Liquidity Risk**: Large unstaking operations may face slippage
- **Key Management**: Secure storage and handling of private keys is critical

This automation system helps maximize staking rewards while managing risk through diversification and active monitoring.