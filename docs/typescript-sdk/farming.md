# Farming

Learn how to implement liquidity farming functionality using the Saros TypeScript SDK. Provide liquidity to pools and earn farming rewards.

## Overview

Saros farming allows users to:
- **Stake LP tokens** from liquidity pools to earn additional rewards
- **Farm multiple tokens** simultaneously in different pools
- **Claim farming rewards** without unstaking LP tokens
- **View farming statistics** and projected yields

## Getting Started

### Basic Farming Setup

```typescript
import sarosSdk, { genConnectionSolana } from '@saros-finance/sdk';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

const { SarosFarmService } = sarosSdk;
const connection = genConnectionSolana();

// Saros farming program address
const SAROS_FARM_ADDRESS = new PublicKey('SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ');
```

### Get Available Farms

```typescript
async function getFarmingPools() {
  try {
    const farmingPools = await SarosFarmService.getListPool({
      page: 1,
      size: 20 // Adjust based on needs
    });

    console.log('Available farming pools:', farmingPools);
    return farmingPools;
  } catch (error) {
    console.error('Failed to fetch farming pools:', error);
    return [];
  }
}

// Example farm structure
interface FarmingPool {
  poolAddress: string;        // Farm pool address
  lpAddress: string;         // LP token address to stake
  poolLpAddress: string;     // Underlying liquidity pool
  token0: string;            // First token mint
  token1: string;            // Second token mint
  token0Id: string;          // Token 0 identifier
  token1Id: string;          // Token 1 identifier
  rewards: RewardInfo[];     // Array of reward tokens
}

interface RewardInfo {
  address: string;           // Reward token mint
  poolRewardAddress: string; // Pool reward account
  rewardPerBlock: number;    // Rewards distributed per block
  rewardTokenAccount: string; // Reward token account
  id: string;                // Reward token identifier
}
```

## Farming Operations

### Stake LP Tokens (Start Farming)

```typescript
async function stakeLPTokens(
  farmParams: FarmingPool,
  lpTokenAmount: number,
  walletAddress: string,
  lpTokenDecimals: number = 6
) {
  try {
    // Convert LP amount to wei
    const lpAmountWei = new BN(lpTokenAmount * Math.pow(10, lpTokenDecimals));

    // Setup payer account
    const payerAccount = { 
      publicKey: new PublicKey(walletAddress) 
    };

    // Execute farming stake
    const result = await SarosFarmService.stakePool(
      connection,
      payerAccount,
      new PublicKey(farmParams.poolAddress),  // Farm pool address
      lpAmountWei,                           // LP token amount
      SAROS_FARM_ADDRESS,                    // Farm program address
      farmParams.rewards,                    // Reward configuration
      new PublicKey(farmParams.lpAddress)    // LP token mint
    );

    if (result.isError) {
      throw new Error(`LP staking failed: ${result.mess}`);
    }

    console.log('✅ LP tokens staked successfully!');
    console.log(`Transaction hash: ${result.hash}`);
    console.log(`Staked LP amount: ${lpTokenAmount}`);

    return {
      success: true,
      transactionHash: result.hash,
      stakedAmount: lpTokenAmount,
      farmAddress: farmParams.poolAddress,
      rewardTokens: farmParams.rewards.map(r => r.id)
    };

  } catch (error) {
    console.error('LP staking error:', error);
    throw error;
  }
}
```

### Unstake LP Tokens (Exit Farming)

```typescript
async function unstakeLPTokens(
  farmParams: FarmingPool,
  lpTokenAmount: number,
  walletAddress: string,
  fullUnstake: boolean = false
) {
  try {
    const lpAmountWei = new BN(lpTokenAmount * Math.pow(10, 6));

    const payerAccount = { 
      publicKey: new PublicKey(walletAddress) 
    };

    const result = await SarosFarmService.unStakePool(
      connection,
      payerAccount,
      new PublicKey(farmParams.poolAddress),  // Farm pool address
      new PublicKey(farmParams.lpAddress),    // LP token mint
      lpAmountWei,                           // LP amount to unstake
      SAROS_FARM_ADDRESS,                    // Farm program address  
      farmParams.rewards,                    // Reward configuration
      fullUnstake                            // Whether to unstake all LP tokens
    );

    if (result.isError) {
      throw new Error(`LP unstaking failed: ${result.mess}`);
    }

    console.log('✅ LP tokens unstaked successfully!');
    console.log(`Transaction hash: ${result.hash}`);

    return {
      success: true,
      transactionHash: result.hash,
      unstakedAmount: fullUnstake ? 'all' : lpTokenAmount
    };

  } catch (error) {
    console.error('LP unstaking error:', error);
    throw error;
  }
}
```

### Claim Farming Rewards

```typescript
async function claimFarmingRewards(
  farmParams: FarmingPool,
  walletAddress: string,
  rewardIndex: number = 0 // Index of reward to claim (if multiple)
) {
  try {
    const rewardInfo = farmParams.rewards[rewardIndex];
    
    if (!rewardInfo) {
      throw new Error(`Reward index ${rewardIndex} not found`);
    }

    const payerAccount = { 
      publicKey: new PublicKey(walletAddress) 
    };

    const result = await SarosFarmService.claimReward(
      connection,
      payerAccount,
      new PublicKey(rewardInfo.poolRewardAddress), // Pool reward account
      SAROS_FARM_ADDRESS,                         // Farm program address
      new PublicKey(rewardInfo.address)           // Reward token mint
    );

    if (result.isError) {
      throw new Error(`Reward claim failed: ${result.mess}`);
    }

    console.log('✅ Farming rewards claimed!');
    console.log(`Transaction hash: ${result.hash}`);
    console.log(`Reward token: ${rewardInfo.id}`);

    return {
      success: true,
      transactionHash: result.hash,
      rewardToken: rewardInfo.id,
      rewardMint: rewardInfo.address
    };

  } catch (error) {
    console.error('Reward claim error:', error);
    throw error;
  }
}
```

## Farm Analytics

### Calculate Farming APR

```typescript
async function calculateFarmingAPR(farmParams: FarmingPool): Promise<number> {
  try {
    // Get total staked LP tokens
    const farmAccountInfo = await connection.getAccountInfo(
      new PublicKey(farmParams.poolAddress)
    );
    
    // This would need to parse the farm account data structure
    // Implementation depends on Saros farm program layout
    
    const totalStakedLP = 0; // Parse from account data
    const rewardPerSecond = farmParams.rewards[0].rewardPerBlock / 2.5; // Assuming 2.5s blocks
    
    // Calculate annual rewards
    const secondsInYear = 365 * 24 * 60 * 60;
    const annualRewards = rewardPerSecond * secondsInYear;
    
    // Get reward token price (would need price oracle)
    const rewardTokenPrice = await getTokenPrice(farmParams.rewards[0].address);
    const annualRewardsUSD = annualRewards * rewardTokenPrice;
    
    // Get LP token value (would need pool analytics)
    const lpTokenPrice = await getLPTokenPrice(farmParams.poolLpAddress);
    const totalStakedUSD = totalStakedLP * lpTokenPrice;
    
    const apr = (annualRewardsUSD / totalStakedUSD) * 100;
    return apr;

  } catch (error) {
    console.error('APR calculation error:', error);
    return 0;
  }
}

// Helper functions (implement based on your price data source)
async function getTokenPrice(mintAddress: string): Promise<number> {
  // Implement using CoinGecko, Jupiter API, or other price sources
  return 1.0; // Placeholder
}

async function getLPTokenPrice(poolAddress: string): Promise<number> {
  // Calculate LP token price based on underlying assets
  return 1.0; // Placeholder  
}
```

### Farming Portfolio Tracking

```typescript
interface FarmingPosition {
  farmAddress: string;
  lpTokensStaked: number;
  pendingRewards: Array<{
    tokenSymbol: string;
    amount: number;
    valueUSD: number;
  }>;
  farmingDuration: number; // seconds
  estimatedAPR: number;
  totalRewardsEarned: number;
}

class FarmingPortfolio {
  private walletAddress: string;
  private positions: Map<string, FarmingPosition> = new Map();

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  async refreshPortfolio() {
    const farmingPools = await getFarmingPools();
    
    for (const farm of farmingPools) {
      const farmingData = await getUserFarmingInfo(farm.poolAddress, this.walletAddress);
      
      if (farmingData && farmingData.stakedAmount > 0) {
        this.positions.set(farm.poolAddress, {
          farmAddress: farm.poolAddress,
          lpTokensStaked: farmingData.stakedAmount,
          pendingRewards: await calculatePendingRewards(farm, this.walletAddress),
          farmingDuration: farmingData.duration,
          estimatedAPR: await calculateFarmingAPR(farm),
          totalRewardsEarned: farmingData.totalRewards
        });
      }
    }
  }

  getPortfolioSummary() {
    let totalLPValue = 0;
    let totalPendingRewards = 0;
    let weightedAPR = 0;

    for (const position of this.positions.values()) {
      const lpValue = position.lpTokensStaked; // Convert to USD
      totalLPValue += lpValue;
      
      position.pendingRewards.forEach(reward => {
        totalPendingRewards += reward.valueUSD;
      });
      
      weightedAPR += (position.estimatedAPR * lpValue);
    }

    return {
      totalFarms: this.positions.size,
      totalLPStaked: totalLPValue,
      totalPendingRewardsUSD: totalPendingRewards,
      averageAPR: totalLPValue > 0 ? weightedAPR / totalLPValue : 0,
      positions: Array.from(this.positions.values())
    };
  }

  async harvestAllRewards() {
    const results = [];
    
    for (const [farmAddress, position] of this.positions.entries()) {
      const hasClaimableRewards = position.pendingRewards.some(r => r.amount > 0.01);
      
      if (hasClaimableRewards) {
        try {
          // Get farm params for this position
          const farmParams = await getFarmParams(farmAddress);
          
          // Claim each reward token
          for (let i = 0; i < farmParams.rewards.length; i++) {
            const claimResult = await claimFarmingRewards(
              farmParams,
              this.walletAddress,
              i
            );
            results.push({
              farmAddress,
              rewardIndex: i,
              ...claimResult
            });
          }
        } catch (error) {
          results.push({
            farmAddress,
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

## Advanced Farming Strategies

### Compound Farming

```typescript
class CompoundFarmer {
  private farmParams: FarmingPool;
  private walletAddress: string;
  private compoundThreshold: number;

  constructor(
    farmParams: FarmingPool, 
    walletAddress: string,
    compoundThreshold: number = 0.1 // Min reward amount to trigger compound
  ) {
    this.farmParams = farmParams;
    this.walletAddress = walletAddress;
    this.compoundThreshold = compoundThreshold;
  }

  async autoCompound() {
    try {
      // 1. Claim all rewards
      const claimResults = [];
      for (let i = 0; i < this.farmParams.rewards.length; i++) {
        const result = await claimFarmingRewards(
          this.farmParams, 
          this.walletAddress, 
          i
        );
        claimResults.push(result);
      }

      // 2. Convert rewards to LP tokens
      // This involves swapping reward tokens for the underlying pool tokens
      // then adding liquidity to get more LP tokens
      
      for (const claimResult of claimResults) {
        if (claimResult.success) {
          await this.reinvestRewards(claimResult.rewardToken);
        }
      }

      // 3. Stake new LP tokens
      // Implementation depends on how much LP was created from reinvestment
      
      return { success: true, compoundResults: claimResults };

    } catch (error) {
      console.error('Auto-compound error:', error);
      throw error;
    }
  }

  private async reinvestRewards(rewardTokenMint: string) {
    // Implementation would involve:
    // 1. Check reward token balance
    // 2. Swap half to token0, half to token1 of underlying pool  
    // 3. Add liquidity to get LP tokens
    // 4. Stake new LP tokens
    
    console.log('Reinvesting rewards for token:', rewardTokenMint);
    // Detailed implementation here
  }
}
```

### Multi-Farm Management

```typescript
interface FarmAllocation {
  farmAddress: string;
  lpTokenAmount: number;
  expectedAPR: number;
  riskLevel: 'low' | 'medium' | 'high';
}

class MultiFarmManager {
  private walletAddress: string;
  private allocations: FarmAllocation[] = [];

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  async optimizeAllocations(
    totalLPAmount: number,
    strategy: 'yield' | 'balanced' | 'conservative'
  ) {
    const farms = await getFarmingPools();
    
    // Calculate APRs for all farms
    const farmData = await Promise.all(
      farms.map(async farm => ({
        ...farm,
        apr: await calculateFarmingAPR(farm),
        tvl: await getFarmTVL(farm.poolAddress),
        riskLevel: assessFarmRisk(farm)
      }))
    );

    // Sort by strategy criteria
    const sortedFarms = this.sortFarmsByStrategy(farmData, strategy);
    
    // Calculate allocations
    this.allocations = this.calculateAllocations(sortedFarms, totalLPAmount, strategy);
    
    return this.allocations;
  }

  async executeAllocations() {
    const results = [];
    
    for (const allocation of this.allocations) {
      try {
        const farmParams = await getFarmParams(allocation.farmAddress);
        const result = await stakeLPTokens(
          farmParams,
          allocation.lpTokenAmount,
          this.walletAddress
        );
        results.push({ allocation, result });
      } catch (error) {
        results.push({ allocation, error: error.message });
      }
    }

    return results;
  }

  private sortFarmsByStrategy(farms: any[], strategy: string) {
    switch (strategy) {
      case 'yield':
        return farms.sort((a, b) => b.apr - a.apr); // Highest APR first
      case 'conservative':
        return farms
          .filter(f => f.riskLevel === 'low')
          .sort((a, b) => b.tvl - a.tvl); // Highest TVL first (more stable)
      case 'balanced':
      default:
        return farms.sort((a, b) => {
          const scoreA = a.apr * 0.7 + (a.tvl / 1000000) * 0.3; // Weight APR 70%, TVL 30%
          const scoreB = b.apr * 0.7 + (b.tvl / 1000000) * 0.3;
          return scoreB - scoreA;
        });
    }
  }

  private calculateAllocations(
    farms: any[], 
    totalAmount: number, 
    strategy: string
  ): FarmAllocation[] {
    switch (strategy) {
      case 'yield':
        return [
          { farmAddress: farms[0]?.poolAddress, lpTokenAmount: totalAmount, expectedAPR: farms[0]?.apr, riskLevel: 'high' }
        ];
        
      case 'conservative':
        return farms.slice(0, 2).map((farm, index) => ({
          farmAddress: farm.poolAddress,
          lpTokenAmount: totalAmount * (index === 0 ? 0.7 : 0.3),
          expectedAPR: farm.apr,
          riskLevel: 'low'
        }));
        
      case 'balanced':
      default:
        return farms.slice(0, 3).map((farm, index) => ({
          farmAddress: farm.poolAddress,
          lpTokenAmount: totalAmount * [0.5, 0.3, 0.2][index],
          expectedAPR: farm.apr,
          riskLevel: 'medium'
        }));
    }
  }
}

// Risk assessment helper
function assessFarmRisk(farm: FarmingPool): 'low' | 'medium' | 'high' {
  // Risk factors:
  // - New farm = higher risk
  // - Low TVL = higher risk  
  // - Very high APR = higher risk
  // - Unknown tokens = higher risk
  
  const knownStableTokens = ['USDC', 'USDT', 'SOL'];
  const hasStableTokens = farm.token0Id && farm.token1Id && 
    (knownStableTokens.includes(farm.token0Id.toUpperCase()) || 
     knownStableTokens.includes(farm.token1Id.toUpperCase()));

  if (hasStableTokens) return 'low';
  return 'medium'; // Default risk assessment
}
```

## Farming Analytics

### Real-time Farming Dashboard

```typescript
interface FarmingMetrics {
  totalLPStaked: number;
  totalRewardsEarned: number;
  currentAPR: number;
  dailyRewards: number;
  farmingDuration: number;
  nextRewardTime: Date;
}

class FarmingAnalytics {
  async getFarmingMetrics(
    farmAddress: string, 
    walletAddress: string
  ): Promise<FarmingMetrics> {
    // Get user's farming position
    const position = await getUserFarmingPosition(farmAddress, walletAddress);
    const farmInfo = await getFarmParams(farmAddress);
    
    // Calculate metrics
    const currentAPR = await calculateFarmingAPR(farmInfo);
    const dailyAPR = currentAPR / 365;
    const dailyRewards = (position.stakedAmount * dailyAPR) / 100;

    return {
      totalLPStaked: position.stakedAmount,
      totalRewardsEarned: position.totalRewards,
      currentAPR,
      dailyRewards,
      farmingDuration: position.duration,
      nextRewardTime: position.nextReward
    };
  }

  async compareFrequency(farmAddress: string) {
    const metrics24h = await this.getFarmingMetrics(farmAddress, walletAddress);
    
    // Compare with historical data
    const metrics7d = await this.getHistoricalMetrics(farmAddress, 7);
    const metrics30d = await this.getHistoricalMetrics(farmAddress, 30);

    return {
      current: metrics24h,
      changes: {
        aprChange7d: metrics24h.currentAPR - metrics7d.averageAPR,
        aprChange30d: metrics24h.currentAPR - metrics30d.averageAPR,
        rewardTrend: 'increasing' // Calculate based on reward history
      }
    };
  }
}
```

### Yield Optimization

```typescript
class YieldOptimizer {
  async findBestFarms(
    lpTokenType: string,
    amount: number,
    timeHorizon: number = 30 // days
  ) {
    const allFarms = await getFarmingPools();
    
    // Filter farms that accept this LP token type
    const compatibleFarms = allFarms.filter(farm => 
      farm.lpAddress === lpTokenType || 
      farm.poolLpAddress === lpTokenType
    );

    // Calculate expected returns for each farm
    const farmAnalysis = await Promise.all(
      compatibleFarms.map(async farm => {
        const apr = await calculateFarmingAPR(farm);
        const projectedRewards = this.calculateProjectedRewards(
          amount, 
          apr, 
          timeHorizon
        );
        
        return {
          farmAddress: farm.poolAddress,
          apr,
          projectedRewards,
          riskScore: this.calculateRiskScore(farm),
          liquidityDepth: await getFarmTVL(farm.poolAddress)
        };
      })
    );

    // Sort by risk-adjusted returns
    return farmAnalysis.sort((a, b) => {
      const scoreA = a.projectedRewards / (a.riskScore + 1);
      const scoreB = b.projectedRewards / (b.riskScore + 1);
      return scoreB - scoreA;
    });
  }

  private calculateProjectedRewards(
    amount: number, 
    apr: number, 
    days: number
  ): number {
    const dailyRate = apr / 365 / 100;
    return amount * Math.pow(1 + dailyRate, days) - amount;
  }

  private calculateRiskScore(farm: FarmingPool): number {
    let risk = 0;
    
    // Age factor (newer = riskier)
    risk += 0.5;
    
    // Token familiarity
    const knownTokens = ['USDC', 'USDT', 'SOL', 'C98'];
    if (!knownTokens.includes(farm.token0Id) || !knownTokens.includes(farm.token1Id)) {
      risk += 1.0;
    }
    
    // Reward token stability
    if (farm.rewards.length > 1) risk += 0.5; // Multiple reward tokens = more complex
    
    return Math.min(risk, 5.0); // Cap at 5
  }
}
```

## Integration Patterns

### React Hook for Farming

```tsx
// hooks/useFarming.ts
import { useState, useEffect, useCallback } from 'react';

export function useFarming(walletAddress: string | null) {
  const [farmingPools, setFarmingPools] = useState<FarmingPool[]>([]);
  const [userPositions, setUserPositions] = useState<FarmingPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFarmingData = useCallback(async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    try {
      const farms = await getFarmingPools();
      setFarmingPools(farms);

      const portfolio = new FarmingPortfolio(walletAddress);
      await portfolio.refreshPortfolio();
      const summary = portfolio.getPortfolioSummary();
      setUserPositions(summary.positions);
      
    } catch (error) {
      console.error('Failed to refresh farming data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  const stakeLPInFarm = useCallback(async (
    farmAddress: string, 
    lpAmount: number
  ) => {
    const farmParams = await getFarmParams(farmAddress);
    await stakeLPTokens(farmParams, lpAmount, walletAddress!);
    await refreshFarmingData();
  }, [walletAddress, refreshFarmingData]);

  useEffect(() => {
    refreshFarmingData();
  }, [refreshFarmingData]);

  return {
    farmingPools,
    userPositions,
    isLoading,
    stakeLPInFarm,
    unstakeLPFromFarm: unstakeLPTokens,
    claimFarmRewards: claimFarmingRewards,
    refreshData: refreshFarmingData
  };
}
```

### Farming Dashboard Component

```tsx
// components/FarmingDashboard.tsx
import React, { useState } from 'react';
import { useFarming } from '../hooks/useFarming';

interface FarmingDashboardProps {
  walletAddress: string;
}

export function FarmingDashboard({ walletAddress }: FarmingDashboardProps) {
  const { farmingPools, userPositions, isLoading, stakeLPInFarm } = useFarming(walletAddress);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [lpAmount, setLpAmount] = useState('');

  const handleStakeLP = async () => {
    if (!selectedFarm || !lpAmount) return;
    
    try {
      await stakeLPInFarm(selectedFarm, parseFloat(lpAmount));
      setLpAmount('');
      alert('LP tokens staked successfully!');
    } catch (error) {
      alert(`Staking failed: ${error.message}`);
    }
  };

  if (isLoading) {
    return <div>Loading farming data...</div>;
  }

  return (
    <div className="farming-dashboard">
      <h2>Liquidity Farming</h2>
      
      {/* Available Farms */}
      <section className="available-farms">
        <h3>Available Farms</h3>
        <div className="farms-grid">
          {farmingPools.map(farm => (
            <div key={farm.poolAddress} className="farm-card">
              <h4>{farm.token0Id}/{farm.token1Id}</h4>
              <p>APR: {farm.estimatedAPR}%</p>
              <p>Rewards: {farm.rewards.map(r => r.id).join(', ')}</p>
              <button onClick={() => setSelectedFarm(farm.poolAddress)}>
                Select Farm
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Stake Interface */}
      <section className="stake-interface">
        <h3>Stake LP Tokens</h3>
        <select 
          value={selectedFarm} 
          onChange={(e) => setSelectedFarm(e.target.value)}
        >
          <option value="">Select a farm</option>
          {farmingPools.map(farm => (
            <option key={farm.poolAddress} value={farm.poolAddress}>
              {farm.token0Id}/{farm.token1Id} - {farm.estimatedAPR}% APR
            </option>
          ))}
        </select>
        
        <input
          type="number"
          placeholder="LP token amount"
          value={lpAmount}
          onChange={(e) => setLpAmount(e.target.value)}
        />
        
        <button onClick={handleStakeLP} disabled={!selectedFarm || !lpAmount}>
          Stake LP Tokens
        </button>
      </section>

      {/* User Positions */}
      <section className="user-positions">
        <h3>Your Farming Positions</h3>
        {userPositions.map(position => (
          <div key={position.farmAddress} className="position-card">
            <h4>LP Staked: {position.lpTokensStaked}</h4>
            <p>Farming APR: {position.estimatedAPR}%</p>
            
            <div className="pending-rewards">
              <h5>Pending Rewards:</h5>
              {position.pendingRewards.map((reward, index) => (
                <div key={index}>
                  {reward.amount.toFixed(4)} {reward.tokenSymbol} 
                  (${reward.valueUSD.toFixed(2)})
                </div>
              ))}
            </div>
            
            <button onClick={() => claimFarmingRewards(position.farmAddress, walletAddress)}>
              Claim Rewards
            </button>
            <button onClick={() => unstakeLPTokens(position.farmAddress, 0, walletAddress, true)}>
              Unstake All
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
```

## Error Handling and Best Practices

### Farming-Specific Errors

```typescript
enum FarmingErrorCode {
  INSUFFICIENT_LP_BALANCE = 'INSUFFICIENT_LP_BALANCE',
  FARM_NOT_ACTIVE = 'FARM_NOT_ACTIVE',
  LOCKUP_PERIOD_ACTIVE = 'LOCKUP_PERIOD_ACTIVE',
  NO_REWARDS_AVAILABLE = 'NO_REWARDS_AVAILABLE',
  REWARD_CLAIM_TOO_SOON = 'REWARD_CLAIM_TOO_SOON'
}

function handleFarmingError(error: any, operation: string) {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('insufficient') && message.includes('lp')) {
    throw new Error('Insufficient LP token balance for farming');
  }
  
  if (message.includes('not active') || message.includes('paused')) {
    throw new Error('Farming pool is not currently active');
  }
  
  if (message.includes('lockup') || message.includes('locked')) {
    throw new Error('LP tokens are in lockup period');
  }
  
  if (message.includes('no rewards') || message.includes('zero rewards')) {
    throw new Error('No rewards available to claim');
  }
  
  throw new Error(`Farming ${operation} failed: ${error.message}`);
}
```

### Monitoring and Alerts

```typescript
class FarmingMonitor {
  private positions: Map<string, FarmingPosition> = new Map();
  private alertThresholds = {
    minRewardToClaim: 0.1,    // Minimum reward worth claiming
    aprDropThreshold: 10,      // Alert if APR drops by 10%
    maxLockupWarning: 7        // Alert 7 days before lockup expires
  };

  async monitorPositions(walletAddress: string) {
    const portfolio = new FarmingPortfolio(walletAddress);
    await portfolio.refreshPortfolio();
    const positions = portfolio.getPortfolioSummary().positions;

    for (const position of positions) {
      await this.checkPositionAlerts(position);
    }
  }

  private async checkPositionAlerts(position: FarmingPosition) {
    // Check for claimable rewards
    const totalPendingValue = position.pendingRewards.reduce(
      (sum, reward) => sum + reward.valueUSD, 0
    );
    
    if (totalPendingValue >= this.alertThresholds.minRewardToClaim) {
      this.sendAlert({
        type: 'reward_ready',
        message: `$${totalPendingValue.toFixed(2)} in rewards ready to claim`,
        farmAddress: position.farmAddress
      });
    }

    // Check for APR changes
    const currentAPR = await calculateFarmingAPR(await getFarmParams(position.farmAddress));
    if (Math.abs(currentAPR - position.estimatedAPR) > this.alertThresholds.aprDropThreshold) {
      this.sendAlert({
        type: 'apr_changed',
        message: `APR changed from ${position.estimatedAPR}% to ${currentAPR}%`,
        farmAddress: position.farmAddress
      });
    }
  }

  private sendAlert(alert: any) {
    console.log('🔔 Farming Alert:', alert.message);
    // Implement notification system (email, push notifications, etc.)
  }
}
```

## Testing and Validation

### Test Farming Operations

```typescript
// test/farming.test.ts
import { describe, test, expect } from '@jest/globals';

describe('Saros Farming SDK', () => {
  const testWallet = 'TEST_WALLET_ADDRESS';
  const testFarm = 'TEST_FARM_ADDRESS';

  test('should fetch available farming pools', async () => {
    const pools = await getFarmingPools();
    expect(pools).toBeDefined();
    expect(Array.isArray(pools)).toBe(true);
  });

  test('should calculate farming APR', async () => {
    const farmParams = await getFarmParams(testFarm);
    const apr = await calculateFarmingAPR(farmParams);
    expect(typeof apr).toBe('number');
    expect(apr).toBeGreaterThan(0);
  });

  test('should handle stake LP tokens', async () => {
    // This would require test LP tokens and test farm
    // Implementation for devnet testing
  });
});
```

## Best Practices

### Farming Strategy Guidelines

1. **Diversify Farms**: Don't put all LP tokens in one farm
2. **Monitor APR Changes**: Rates fluctuate based on demand
3. **Consider Lockup Periods**: Some farms have minimum staking time
4. **Regular Harvesting**: Claim rewards regularly to compound
5. **Gas Fee Management**: Batch operations when possible

### Risk Management

```typescript
const FARMING_RISK_GUIDELINES = {
  // Maximum allocation to any single farm
  maxSingleFarmAllocation: 0.3, // 30%
  
  // APR thresholds for risk assessment
  suspiciousAPR: 1000, // APRs > 1000% are suspicious
  minimumAPR: 5,       // Minimum worthwhile APR
  
  // Diversification rules
  minFarmsForDiversification: 3,
  maxHighRiskAllocation: 0.2, // 20% max in high-risk farms
};

function validateFarmingStrategy(allocations: FarmAllocation[]): boolean {
  // Check single farm allocation limit
  for (const allocation of allocations) {
    if (allocation.lpTokenAmount > FARMING_RISK_GUIDELINES.maxSingleFarmAllocation) {
      console.warn(`Farm allocation exceeds recommended maximum: ${allocation.farmAddress}`);
      return false;
    }
  }
  
  // Check APR reasonableness
  for (const allocation of allocations) {
    if (allocation.expectedAPR > FARMING_RISK_GUIDELINES.suspiciousAPR) {
      console.warn(`Suspiciously high APR detected: ${allocation.expectedAPR}%`);
      return false;
    }
  }
  
  return true;
}
```

## Next Steps

✅ Farming operations mastered  
➡️ **Next**: [API Reference](/docs/typescript-sdk/api-reference)

Or explore related topics:
- [Farming Tutorial](/docs/examples/liquidity-farming-strategy)
- [Yield Farming Examples](/docs/examples/staking-rewards-automation)
- [Liquidity Management](/docs/typescript-sdk/amm#liquidity-management)