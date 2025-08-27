# Staking

Learn how to implement token staking functionality using the Saros TypeScript SDK. Stake tokens to earn rewards and participate in the Saros ecosystem.

## Overview

Saros staking allows users to:
- **Stake tokens** to earn rewards over time
- **Unstake tokens** to retrieve principal and earned rewards
- **Claim rewards** without unstaking the principal
- **View staking statistics** and APR calculations

## Getting Started

### Basic Staking Setup

```typescript
import sarosSdk, { genConnectionSolana } from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

const { SarosStakeServices } = sarosSdk;
const connection = genConnectionSolana();

// Staking configuration
const SAROS_STAKE_PROGRAM = new PublicKey('STAKE_PROGRAM_ADDRESS'); // Replace with actual
```

### Get Available Staking Pools

```typescript
async function getStakingPools() {
  try {
    const stakingPools = await SarosStakeServices.getListPool({
      page: 1,
      size: 20 // Adjust based on needs
    });

    console.log('Available staking pools:', stakingPools);
    return stakingPools;
  } catch (error) {
    console.error('Failed to fetch staking pools:', error);
    return [];
  }
}

// Example pool structure
interface StakingPool {
  poolAddress: string;
  tokenMint: string;
  rewardMint: string;
  apr: number;
  totalStaked: number;
  maxStake?: number;
  lockupPeriod?: number; // in seconds
}
```

## Staking Operations

### Stake Tokens

```typescript
async function stakeTokens(
  poolAddress: string,
  stakeAmount: number,
  walletAddress: string,
  stakingTokenDecimals: number = 6
) {
  try {
    // Convert amount to wei
    const stakeAmountWei = new BN(stakeAmount * Math.pow(10, stakingTokenDecimals));

    // Get user's payer account structure
    const payerAccount = { 
      publicKey: new PublicKey(walletAddress) 
    };

    // Execute staking
    const result = await SarosStakeServices.stakePool(
      connection,
      payerAccount,
      new PublicKey(poolAddress),
      stakeAmountWei,
      SAROS_STAKE_PROGRAM,
      [], // Additional reward accounts if needed
      null // Additional parameters
    );

    if (result.isError) {
      throw new Error(`Staking failed: ${result.mess}`);
    }

    console.log('✅ Staking successful!');
    console.log(`Transaction hash: ${result.hash}`);
    console.log(`Staked amount: ${stakeAmount} tokens`);

    return {
      success: true,
      transactionHash: result.hash,
      stakedAmount: stakeAmount,
      poolAddress
    };

  } catch (error) {
    console.error('Staking error:', error);
    throw error;
  }
}
```

### Unstake Tokens

```typescript
async function unstakeTokens(
  poolAddress: string,
  unstakeAmount: number, // Amount to unstake (0 for full unstake)
  walletAddress: string,
  fullUnstake: boolean = false
) {
  try {
    const unstakeAmountWei = new BN(unstakeAmount * Math.pow(10, 6)); // Assuming 6 decimals

    const payerAccount = { 
      publicKey: new PublicKey(walletAddress) 
    };

    const result = await SarosStakeServices.unstakePool(
      connection,
      payerAccount,
      new PublicKey(poolAddress),
      unstakeAmountWei,
      SAROS_STAKE_PROGRAM,
      [], // Reward accounts
      fullUnstake // Whether to unstake everything
    );

    if (result.isError) {
      throw new Error(`Unstaking failed: ${result.mess}`);
    }

    console.log('✅ Unstaking successful!');
    console.log(`Transaction hash: ${result.hash}`);

    return {
      success: true,
      transactionHash: result.hash,
      unstakedAmount: unstakeAmount,
      fullUnstake
    };

  } catch (error) {
    console.error('Unstaking error:', error);
    throw error;
  }
}
```

### Claim Staking Rewards

```typescript
async function claimStakingRewards(
  poolAddress: string,
  walletAddress: string
) {
  try {
    // Note: Implementation depends on specific reward structure
    // This is a template - actual method may vary
    
    const payerAccount = { 
      publicKey: new PublicKey(walletAddress) 
    };

    const result = await SarosStakeServices.claimRewards(
      connection,
      payerAccount,
      new PublicKey(poolAddress),
      SAROS_STAKE_PROGRAM
    );

    if (result.isError) {
      throw new Error(`Claim rewards failed: ${result.mess}`);
    }

    console.log('✅ Rewards claimed successfully!');
    console.log(`Transaction hash: ${result.hash}`);

    return {
      success: true,
      transactionHash: result.hash
    };

  } catch (error) {
    console.error('Claim rewards error:', error);
    throw error;
  }
}
```

## Staking Analytics

### Get User Staking Info

```typescript
interface UserStakingData {
  poolAddress: string;
  stakedAmount: number;
  pendingRewards: number;
  stakingDuration: number; // in seconds
  apr: number;
  nextRewardTime: Date;
}

async function getUserStakingInfo(
  poolAddress: string,
  walletAddress: string
): Promise<UserStakingData | null> {
  try {
    // This would typically involve querying account data
    // Implementation depends on Saros staking program structure
    
    // Placeholder implementation
    const stakingAccount = await connection.getAccountInfo(
      new PublicKey(`DERIVED_STAKING_ACCOUNT_FOR_${walletAddress}`)
    );

    if (!stakingAccount) {
      return null; // User has no stake in this pool
    }

    // Parse account data (implementation specific)
    return {
      poolAddress,
      stakedAmount: 0, // Parse from account data
      pendingRewards: 0, // Calculate based on time staked
      stakingDuration: 0, // Time since staking started
      apr: 0, // Get from pool info
      nextRewardTime: new Date() // Next reward distribution
    };

  } catch (error) {
    console.error('Failed to get staking info:', error);
    return null;
  }
}
```

### Calculate Staking Rewards

```typescript
function calculateStakingRewards(
  stakedAmount: number,
  apr: number,
  stakingDurationSeconds: number
): number {
  const annualRewards = stakedAmount * (apr / 100);
  const secondsInYear = 365 * 24 * 60 * 60;
  const rewardRate = annualRewards / secondsInYear;
  
  return rewardRate * stakingDurationSeconds;
}

function calculateAPR(
  totalRewardsDistributed: number,
  totalStakedAmount: number,
  timePeriodSeconds: number
): number {
  const secondsInYear = 365 * 24 * 60 * 60;
  const annualizedRewards = (totalRewardsDistributed / timePeriodSeconds) * secondsInYear;
  
  return (annualizedRewards / totalStakedAmount) * 100;
}
```

## Advanced Staking Features

### Auto-Compounding Staking

```typescript
class AutoCompoundingStaker {
  private poolAddress: string;
  private walletAddress: string;
  private compoundInterval: number;
  private isRunning: boolean = false;

  constructor(
    poolAddress: string,
    walletAddress: string,
    compoundIntervalHours: number = 24
  ) {
    this.poolAddress = poolAddress;
    this.walletAddress = walletAddress;
    this.compoundInterval = compoundIntervalHours * 60 * 60 * 1000; // Convert to ms
  }

  async startAutoCompounding() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Starting auto-compounding...');

    const compoundingLoop = async () => {
      if (!this.isRunning) return;

      try {
        // Check pending rewards
        const stakingInfo = await getUserStakingInfo(this.poolAddress, this.walletAddress);
        
        if (stakingInfo && stakingInfo.pendingRewards > 0.01) { // Min threshold
          console.log(`💰 Compounding ${stakingInfo.pendingRewards} rewards`);
          
          // Claim and restake rewards
          await claimStakingRewards(this.poolAddress, this.walletAddress);
          await stakeTokens(
            this.poolAddress, 
            stakingInfo.pendingRewards, 
            this.walletAddress
          );
        }

      } catch (error) {
        console.error('Auto-compounding error:', error);
      }

      // Schedule next compound
      if (this.isRunning) {
        setTimeout(compoundingLoop, this.compoundInterval);
      }
    };

    compoundingLoop();
  }

  stopAutoCompounding() {
    this.isRunning = false;
    console.log('⏹️ Auto-compounding stopped');
  }
}

// Usage
const autoStaker = new AutoCompoundingStaker(
  'POOL_ADDRESS',
  'WALLET_ADDRESS', 
  24 // Compound every 24 hours
);
autoStaker.startAutoCompounding();
```

### Staking Portfolio Manager

```typescript
interface StakingPosition {
  poolAddress: string;
  tokenSymbol: string;
  stakedAmount: number;
  currentValue: number;
  pendingRewards: number;
  apr: number;
}

class StakingPortfolio {
  private walletAddress: string;
  private positions: Map<string, StakingPosition> = new Map();

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  async refreshPortfolio() {
    const stakingPools = await getStakingPools();
    
    for (const pool of stakingPools) {
      const stakingInfo = await getUserStakingInfo(pool.poolAddress, this.walletAddress);
      
      if (stakingInfo && stakingInfo.stakedAmount > 0) {
        this.positions.set(pool.poolAddress, {
          poolAddress: pool.poolAddress,
          tokenSymbol: pool.tokenSymbol,
          stakedAmount: stakingInfo.stakedAmount,
          currentValue: stakingInfo.stakedAmount, // + accrued interest
          pendingRewards: stakingInfo.pendingRewards,
          apr: stakingInfo.apr
        });
      }
    }
  }

  getPortfolioSummary() {
    let totalStaked = 0;
    let totalRewards = 0;
    let weightedAPR = 0;

    for (const position of this.positions.values()) {
      totalStaked += position.currentValue;
      totalRewards += position.pendingRewards;
      weightedAPR += (position.apr * position.currentValue);
    }

    return {
      totalPositions: this.positions.size,
      totalStaked,
      totalRewards,
      averageAPR: weightedAPR / totalStaked,
      positions: Array.from(this.positions.values())
    };
  }

  async claimAllRewards() {
    const results = [];
    
    for (const position of this.positions.values()) {
      if (position.pendingRewards > 0.01) { // Min threshold
        try {
          const result = await claimStakingRewards(
            position.poolAddress, 
            this.walletAddress
          );
          results.push({ poolAddress: position.poolAddress, ...result });
        } catch (error) {
          results.push({ 
            poolAddress: position.poolAddress, 
            success: false, 
            error: error.message 
          });
        }
      }
    }

    return results;
  }
}
```

## Integration Examples

### React Hook for Staking

```tsx
// hooks/useStaking.ts
import { useState, useEffect, useCallback } from 'react';

interface UseStakingResult {
  stakingPools: StakingPool[];
  userPositions: UserStakingData[];
  isLoading: boolean;
  stake: (poolAddress: string, amount: number) => Promise<void>;
  unstake: (poolAddress: string, amount: number) => Promise<void>;
  claimRewards: (poolAddress: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useStaking(walletAddress: string | null): UseStakingResult {
  const [stakingPools, setStakingPools] = useState<StakingPool[]>([]);
  const [userPositions, setUserPositions] = useState<UserStakingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    try {
      // Fetch pools and user positions
      const pools = await getStakingPools();
      setStakingPools(pools);

      const positions = await Promise.all(
        pools.map(pool => getUserStakingInfo(pool.poolAddress, walletAddress))
      );
      setUserPositions(positions.filter(Boolean));
      
    } catch (error) {
      console.error('Failed to refresh staking data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  const stake = useCallback(async (poolAddress: string, amount: number) => {
    await stakeTokens(poolAddress, amount, walletAddress!);
    await refreshData();
  }, [walletAddress, refreshData]);

  const unstake = useCallback(async (poolAddress: string, amount: number) => {
    await unstakeTokens(poolAddress, amount, walletAddress!, amount === 0);
    await refreshData();
  }, [walletAddress, refreshData]);

  const claimRewards = useCallback(async (poolAddress: string) => {
    await claimStakingRewards(poolAddress, walletAddress!);
    await refreshData();
  }, [walletAddress, refreshData]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    stakingPools,
    userPositions,
    isLoading,
    stake,
    unstake,
    claimRewards,
    refreshData
  };
}
```

### Staking Dashboard Component

```tsx
// components/StakingDashboard.tsx
import React from 'react';
import { useStaking } from '../hooks/useStaking';

interface StakingDashboardProps {
  walletAddress: string;
}

export function StakingDashboard({ walletAddress }: StakingDashboardProps) {
  const { stakingPools, userPositions, isLoading, stake, unstake, claimRewards } = 
    useStaking(walletAddress);

  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedPool, setSelectedPool] = useState('');

  const handleStake = async () => {
    if (!selectedPool || !stakeAmount) return;
    
    try {
      await stake(selectedPool, parseFloat(stakeAmount));
      setStakeAmount('');
      alert('Staking successful!');
    } catch (error) {
      alert(`Staking failed: ${error.message}`);
    }
  };

  if (isLoading) {
    return <div>Loading staking data...</div>;
  }

  return (
    <div className="staking-dashboard">
      <h2>Staking Dashboard</h2>
      
      {/* Available Pools */}
      <section>
        <h3>Available Staking Pools</h3>
        <div className="pools-grid">
          {stakingPools.map(pool => (
            <div key={pool.poolAddress} className="pool-card">
              <h4>{pool.tokenSymbol} Staking</h4>
              <p>APR: {pool.apr}%</p>
              <p>Total Staked: {pool.totalStaked}</p>
              <button onClick={() => setSelectedPool(pool.poolAddress)}>
                Select Pool
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Stake Interface */}
      <section>
        <h3>Stake Tokens</h3>
        <input
          type="number"
          placeholder="Amount to stake"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
        />
        <button onClick={handleStake} disabled={!selectedPool || !stakeAmount}>
          Stake
        </button>
      </section>

      {/* User Positions */}
      <section>
        <h3>Your Staking Positions</h3>
        {userPositions.map(position => (
          <div key={position.poolAddress} className="position-card">
            <h4>Staked: {position.stakedAmount}</h4>
            <p>Pending Rewards: {position.pendingRewards}</p>
            <p>APR: {position.apr}%</p>
            <button onClick={() => claimRewards(position.poolAddress)}>
              Claim Rewards
            </button>
            <button onClick={() => unstake(position.poolAddress, 0)}>
              Unstake All
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
```

## Advanced Staking Strategies

### Time-based Staking

```typescript
interface TimedStakingStrategy {
  stakingPeriods: Array<{
    duration: number; // in days
    bonusMultiplier: number; // Extra APR bonus
  }>;
}

async function timedStaking(
  poolAddress: string,
  amount: number,
  stakingDays: number,
  walletAddress: string
) {
  // Calculate expected rewards with time bonus
  const poolInfo = await getStakingPoolInfo(poolAddress);
  const baseAPR = poolInfo.apr;
  const timeBonus = getTimeBonusMultiplier(stakingDays);
  const effectiveAPR = baseAPR * timeBonus;

  console.log(`Staking for ${stakingDays} days`);
  console.log(`Base APR: ${baseAPR}%, Effective APR: ${effectiveAPR}%`);

  // Execute timed staking
  return await stakeTokens(poolAddress, amount, walletAddress);
}

function getTimeBonusMultiplier(days: number): number {
  if (days >= 365) return 1.5;      // 50% bonus for 1+ year
  if (days >= 180) return 1.25;     // 25% bonus for 6+ months  
  if (days >= 90) return 1.1;       // 10% bonus for 3+ months
  return 1.0;                       // No bonus for < 3 months
}
```

### Diversified Staking

```typescript
class DiversifiedStaker {
  private walletAddress: string;
  private totalAmount: number;

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  async diversifyStaking(totalAmount: number, strategy: 'conservative' | 'aggressive' | 'balanced') {
    const pools = await getStakingPools();
    
    // Sort pools by APR and risk
    const sortedPools = pools.sort((a, b) => b.apr - a.apr);
    
    const allocations = this.calculateAllocations(sortedPools, strategy);
    const results = [];

    for (const allocation of allocations) {
      const stakeAmount = totalAmount * allocation.percentage;
      
      try {
        const result = await stakeTokens(
          allocation.poolAddress,
          stakeAmount,
          this.walletAddress
        );
        results.push({ ...allocation, result });
      } catch (error) {
        results.push({ ...allocation, error: error.message });
      }
    }

    return results;
  }

  private calculateAllocations(pools: StakingPool[], strategy: string) {
    switch (strategy) {
      case 'conservative':
        return [
          { poolAddress: pools[0]?.poolAddress, percentage: 0.8 }, // 80% in highest APR
          { poolAddress: pools[1]?.poolAddress, percentage: 0.2 }  // 20% in second highest
        ];
      
      case 'aggressive':
        return [
          { poolAddress: pools[0]?.poolAddress, percentage: 1.0 }  // 100% in highest APR
        ];
        
      case 'balanced':
      default:
        return [
          { poolAddress: pools[0]?.poolAddress, percentage: 0.4 }, // 40% highest APR
          { poolAddress: pools[1]?.poolAddress, percentage: 0.3 }, // 30% second highest
          { poolAddress: pools[2]?.poolAddress, percentage: 0.2 }, // 20% third highest
          { poolAddress: pools[3]?.poolAddress, percentage: 0.1 }  // 10% fourth highest
        ];
    }
  }
}
```

### Staking Notifications

```typescript
interface StakingAlert {
  type: 'reward_ready' | 'unstake_available' | 'apr_change';
  message: string;
  poolAddress: string;
  timestamp: Date;
}

class StakingNotifier {
  private alerts: StakingAlert[] = [];
  private subscribers: Array<(alert: StakingAlert) => void> = [];

  async checkForAlerts(walletAddress: string) {
    const positions = await getUserAllStakingPositions(walletAddress);
    
    for (const position of positions) {
      // Check for claimable rewards
      if (position.pendingRewards > 0.1) {
        this.addAlert({
          type: 'reward_ready',
          message: `${position.pendingRewards.toFixed(4)} rewards ready to claim`,
          poolAddress: position.poolAddress,
          timestamp: new Date()
        });
      }

      // Check for completed lock periods
      if (position.isUnlockable) {
        this.addAlert({
          type: 'unstake_available', 
          message: 'Tokens available for unstaking',
          poolAddress: position.poolAddress,
          timestamp: new Date()
        });
      }
    }
  }

  private addAlert(alert: StakingAlert) {
    this.alerts.push(alert);
    this.notifySubscribers(alert);
  }

  subscribe(callback: (alert: StakingAlert) => void) {
    this.subscribers.push(callback);
  }

  private notifySubscribers(alert: StakingAlert) {
    this.subscribers.forEach(callback => callback(alert));
  }
}
```

## Best Practices

### Security Considerations

1. **Validate Pool Addresses**: Always verify pool authenticity
2. **Check Lock Periods**: Understand unstaking restrictions
3. **Monitor APR Changes**: Rates can fluctuate
4. **Diversify Stakes**: Don't put everything in one pool
5. **Regular Monitoring**: Check positions periodically

### Performance Optimization

```typescript
// Batch operations when possible
async function batchStakingOperations(
  operations: Array<{
    type: 'stake' | 'unstake' | 'claim';
    poolAddress: string;
    amount?: number;
  }>,
  walletAddress: string
) {
  const results = [];
  
  // Group by operation type for efficiency
  const groupedOps = operations.reduce((acc, op) => {
    if (!acc[op.type]) acc[op.type] = [];
    acc[op.type].push(op);
    return acc;
  }, {} as Record<string, any[]>);

  // Execute in optimal order: claims first, then stakes, then unstakes
  for (const [opType, ops] of Object.entries(groupedOps)) {
    for (const op of ops) {
      try {
        let result;
        switch (opType) {
          case 'claim':
            result = await claimStakingRewards(op.poolAddress, walletAddress);
            break;
          case 'stake':
            result = await stakeTokens(op.poolAddress, op.amount!, walletAddress);
            break;
          case 'unstake':
            result = await unstakeTokens(op.poolAddress, op.amount!, walletAddress);
            break;
        }
        results.push({ operation: op, result });
      } catch (error) {
        results.push({ operation: op, error: error.message });
      }
    }
  }

  return results;
}
```

## Error Handling

### Common Staking Errors

```typescript
enum StakingErrorCode {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  POOL_INACTIVE = 'POOL_INACTIVE', 
  LOCKUP_ACTIVE = 'LOCKUP_ACTIVE',
  MIN_STAKE_NOT_MET = 'MIN_STAKE_NOT_MET',
  MAX_STAKE_EXCEEDED = 'MAX_STAKE_EXCEEDED'
}

function parseStakingError(error: any): StakingErrorCode {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('insufficient')) return StakingErrorCode.INSUFFICIENT_BALANCE;
  if (message.includes('inactive')) return StakingErrorCode.POOL_INACTIVE;
  if (message.includes('lockup') || message.includes('locked')) return StakingErrorCode.LOCKUP_ACTIVE;
  if (message.includes('minimum')) return StakingErrorCode.MIN_STAKE_NOT_MET;
  if (message.includes('maximum')) return StakingErrorCode.MAX_STAKE_EXCEEDED;
  
  return StakingErrorCode.INSUFFICIENT_BALANCE; // Default
}
```

## Next Steps

✅ Staking operations mastered  
➡️ **Next**: [Farming Guide](/docs/typescript-sdk/farming)

Or explore related topics:
- [Farming Tutorial](/docs/examples/liquidity-farming-strategy)
- [Staking Examples](/docs/examples/staking-rewards-automation)
- [API Reference](/docs/typescript-sdk/api-reference)