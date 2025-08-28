# Staking Integration Tutorial

Learn how to integrate Saros staking functionality to earn rewards on your tokens. This comprehensive guide covers single-sided staking, LP token staking, and reward harvesting.

## Overview

Saros offers multiple staking options:
- **Single-Asset Staking**: Stake individual tokens (SAROS, SOL, etc.)
- **LP Token Staking**: Stake liquidity pool tokens for enhanced rewards
- **Flexible Terms**: Choose lock periods for multiplied rewards
- **Auto-Compounding**: Automatic reward reinvestment options

## Prerequisites

- Completed the [Quick Start Guide](/docs/getting-started/quick-start)
- Saros SDK installed (`@saros-finance/sdk`)
- Wallet with tokens to stake
- Basic understanding of DeFi staking concepts

## 1. Setting Up Staking Module

### Install Dependencies

```bash
npm install @saros-finance/sdk @solana/web3.js bn.js
```

### Import Staking Functions

```javascript
import {
  stakeSaros,
  unstakeSaros,
  getStakeInfo,
  harvestRewards,
  getStakePools,
  calculateAPY,
  getStakeHistory,
  genConnectionSolana
} from '@saros-finance/sdk';
import { PublicKey, Connection } from '@solana/web3.js';
import BN from 'bn.js';
```

## 2. Discover Staking Pools

### List Available Staking Pools

```javascript
async function getAvailableStakingPools(connection) {
  try {
    // Fetch all active staking pools
    const pools = await getStakePools(connection);
    
    // Display pool information
    pools.forEach(pool => {
      console.log('=== Staking Pool ===');
      console.log('Pool ID:', pool.address);
      console.log('Token:', pool.stakingToken);
      console.log('APY:', pool.apy, '%');
      console.log('Total Staked:', pool.totalStaked);
      console.log('Lock Period:', pool.lockPeriod, 'days');
      console.log('Min Stake:', pool.minStake);
      console.log('Status:', pool.isActive ? 'Active' : 'Inactive');
      console.log('');
    });
    
    return pools;
  } catch (error) {
    console.error('Failed to fetch staking pools:', error);
    return [];
  }
}

// Example usage
const connection = genConnectionSolana();
const pools = await getAvailableStakingPools(connection);
```

### Filter Pools by Token

```javascript
function filterPoolsByToken(pools, tokenMint) {
  return pools.filter(pool => 
    pool.stakingToken === tokenMint
  );
}

// Find SAROS staking pools
const SAROS_MINT = 'Saro7NWpPHLH8fUoq7i1gVPkX1XJfXm7K9bYgTMRJkP';
const sarosPools = filterPoolsByToken(pools, SAROS_MINT);
```

## 3. Stake Tokens

### Single-Asset Staking Implementation

```javascript
async function stakeTokens({
  connection,
  wallet,
  poolAddress,
  amount,
  tokenMint,
  lockPeriod = 0 // 0 for flexible, 30/60/90 for locked
}) {
  try {
    console.log('🔒 Initiating staking...');
    console.log(`Amount: ${amount} tokens`);
    console.log(`Lock period: ${lockPeriod} days`);
    
    // Get user's token account
    const tokenAccount = await getInfoTokenByMint(
      tokenMint,
      wallet.publicKey.toString()
    );
    
    if (!tokenAccount) {
      throw new Error('Token account not found');
    }
    
    // Check balance
    const balance = tokenAccount.amount;
    if (balance < amount) {
      throw new Error(`Insufficient balance: ${balance} < ${amount}`);
    }
    
    // Convert amount to proper decimals
    const amountBN = new BN(amount * Math.pow(10, tokenAccount.decimals));
    
    // Execute staking transaction
    const result = await stakeSaros(
      connection,
      wallet,
      new PublicKey(poolAddress),
      amountBN,
      lockPeriod,
      tokenAccount.pubkey
    );
    
    if (result.isError) {
      throw new Error(`Staking failed: ${result.mess}`);
    }
    
    console.log('✅ Staking successful!');
    console.log('Transaction:', result.hash);
    console.log(`View on Solscan: https://solscan.io/tx/${result.hash}`);
    
    // Get updated stake info
    const stakeInfo = await getStakeInfo(
      connection,
      wallet.publicKey,
      new PublicKey(poolAddress)
    );
    
    return {
      success: true,
      transaction: result.hash,
      stakeInfo: stakeInfo
    };
    
  } catch (error) {
    console.error('❌ Staking failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Example: Stake 100 SAROS tokens for 30 days
const stakeResult = await stakeTokens({
  connection,
  wallet,
  poolAddress: 'POOL_ADDRESS_HERE',
  amount: 100,
  tokenMint: SAROS_MINT,
  lockPeriod: 30 // 30-day lock for bonus rewards
});
```

### LP Token Staking

```javascript
async function stakeLPTokens({
  connection,
  wallet,
  lpTokenMint,
  poolAddress,
  amount
}) {
  try {
    console.log('🏊 Staking LP tokens...');
    
    // Get LP token account
    const lpTokenAccount = await getInfoTokenByMint(
      lpTokenMint,
      wallet.publicKey.toString()
    );
    
    if (!lpTokenAccount) {
      throw new Error('LP token account not found');
    }
    
    // Validate LP token balance
    const lpBalance = lpTokenAccount.amount;
    console.log(`LP Token Balance: ${lpBalance}`);
    
    if (lpBalance < amount) {
      throw new Error('Insufficient LP tokens');
    }
    
    // Stake LP tokens
    const result = await stakeSaros(
      connection,
      wallet,
      new PublicKey(poolAddress),
      new BN(amount * Math.pow(10, lpTokenAccount.decimals)),
      0, // Usually flexible for LP tokens
      lpTokenAccount.pubkey
    );
    
    if (result.isError) {
      throw new Error(`LP staking failed: ${result.mess}`);
    }
    
    console.log('✅ LP tokens staked successfully!');
    console.log('Transaction:', result.hash);
    
    return {
      success: true,
      transaction: result.hash
    };
    
  } catch (error) {
    console.error('❌ LP staking failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
```

## 4. Monitor Staking Position

### Get Stake Information

```javascript
async function getMyStakeInfo(connection, wallet, poolAddress) {
  try {
    const stakeInfo = await getStakeInfo(
      connection,
      wallet.publicKey,
      new PublicKey(poolAddress)
    );
    
    if (!stakeInfo) {
      console.log('No active stake found');
      return null;
    }
    
    console.log('=== Your Staking Position ===');
    console.log('Staked Amount:', stakeInfo.stakedAmount);
    console.log('Pending Rewards:', stakeInfo.pendingRewards);
    console.log('Lock End Date:', new Date(stakeInfo.lockEndTime * 1000));
    console.log('APY:', stakeInfo.currentAPY, '%');
    console.log('Can Unstake:', stakeInfo.canUnstake);
    
    return stakeInfo;
  } catch (error) {
    console.error('Failed to get stake info:', error);
    return null;
  }
}
```

### Calculate Earnings

```javascript
async function calculateStakingRewards({
  stakedAmount,
  apy,
  daysStaked,
  compoundFrequency = 365 // Daily compounding
}) {
  // Simple interest calculation
  const simpleInterest = stakedAmount * (apy / 100) * (daysStaked / 365);
  
  // Compound interest calculation
  const rate = apy / 100 / compoundFrequency;
  const periods = compoundFrequency * (daysStaked / 365);
  const compoundInterest = stakedAmount * Math.pow(1 + rate, periods) - stakedAmount;
  
  return {
    simpleInterest: simpleInterest.toFixed(2),
    compoundInterest: compoundInterest.toFixed(2),
    totalWithSimple: (stakedAmount + simpleInterest).toFixed(2),
    totalWithCompound: (stakedAmount + compoundInterest).toFixed(2)
  };
}

// Example: Calculate rewards for 100 tokens at 25% APY for 30 days
const rewards = calculateStakingRewards({
  stakedAmount: 100,
  apy: 25,
  daysStaked: 30,
  compoundFrequency: 365
});

console.log('Expected Rewards:', rewards);
```

## 5. Harvest Rewards

### Claim Staking Rewards

```javascript
async function claimRewards(connection, wallet, poolAddress) {
  try {
    console.log('🌾 Harvesting rewards...');
    
    // Check pending rewards first
    const stakeInfo = await getStakeInfo(
      connection,
      wallet.publicKey,
      new PublicKey(poolAddress)
    );
    
    if (!stakeInfo || stakeInfo.pendingRewards === 0) {
      console.log('No rewards to harvest');
      return {
        success: false,
        error: 'No pending rewards'
      };
    }
    
    console.log(`Pending rewards: ${stakeInfo.pendingRewards}`);
    
    // Harvest rewards
    const result = await harvestRewards(
      connection,
      wallet,
      new PublicKey(poolAddress)
    );
    
    if (result.isError) {
      throw new Error(`Harvest failed: ${result.mess}`);
    }
    
    console.log('✅ Rewards harvested successfully!');
    console.log('Transaction:', result.hash);
    console.log(`Claimed: ${stakeInfo.pendingRewards} tokens`);
    
    return {
      success: true,
      transaction: result.hash,
      amount: stakeInfo.pendingRewards
    };
    
  } catch (error) {
    console.error('❌ Harvest failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Auto-Compound Strategy

```javascript
async function autoCompound(connection, wallet, poolAddress, interval = 86400000) {
  console.log('🔄 Starting auto-compound strategy...');
  
  const compound = async () => {
    try {
      // Harvest rewards
      const harvestResult = await claimRewards(connection, wallet, poolAddress);
      
      if (harvestResult.success && harvestResult.amount > 0) {
        // Re-stake harvested rewards
        await stakeTokens({
          connection,
          wallet,
          poolAddress,
          amount: harvestResult.amount,
          tokenMint: SAROS_MINT,
          lockPeriod: 0 // Flexible for compound
        });
        
        console.log(`✅ Auto-compounded ${harvestResult.amount} tokens`);
      }
    } catch (error) {
      console.error('Auto-compound error:', error);
    }
  };
  
  // Run immediately
  await compound();
  
  // Set up recurring compound
  setInterval(compound, interval);
  
  console.log(`Auto-compound running every ${interval / 3600000} hours`);
}

// Start daily auto-compound
autoCompound(connection, wallet, poolAddress, 24 * 60 * 60 * 1000);
```

## 6. Unstake Tokens

### Unstaking Implementation

```javascript
async function unstakeTokens({
  connection,
  wallet,
  poolAddress,
  amount = null // null to unstake all
}) {
  try {
    console.log('🔓 Initiating unstaking...');
    
    // Get current stake info
    const stakeInfo = await getStakeInfo(
      connection,
      wallet.publicKey,
      new PublicKey(poolAddress)
    );
    
    if (!stakeInfo) {
      throw new Error('No active stake found');
    }
    
    // Check if lock period has ended
    if (!stakeInfo.canUnstake) {
      const lockEnd = new Date(stakeInfo.lockEndTime * 1000);
      throw new Error(`Tokens locked until ${lockEnd.toLocaleString()}`);
    }
    
    // Determine unstake amount
    const unstakeAmount = amount || stakeInfo.stakedAmount;
    console.log(`Unstaking: ${unstakeAmount} tokens`);
    
    // Execute unstaking
    const result = await unstakeSaros(
      connection,
      wallet,
      new PublicKey(poolAddress),
      new BN(unstakeAmount * Math.pow(10, stakeInfo.decimals))
    );
    
    if (result.isError) {
      throw new Error(`Unstaking failed: ${result.mess}`);
    }
    
    console.log('✅ Unstaking successful!');
    console.log('Transaction:', result.hash);
    console.log(`View on Solscan: https://solscan.io/tx/${result.hash}`);
    
    return {
      success: true,
      transaction: result.hash,
      amount: unstakeAmount
    };
    
  } catch (error) {
    console.error('❌ Unstaking failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Example: Unstake all tokens
const unstakeResult = await unstakeTokens({
  connection,
  wallet,
  poolAddress: 'POOL_ADDRESS_HERE'
});
```

### Emergency Unstake (with Penalty)

```javascript
async function emergencyUnstake(connection, wallet, poolAddress) {
  console.log('⚠️ WARNING: Emergency unstake will incur penalties!');
  console.log('Penalty: 10-50% depending on remaining lock time');
  
  // Confirm action
  const confirmed = await confirmAction('Proceed with emergency unstake?');
  
  if (!confirmed) {
    console.log('Emergency unstake cancelled');
    return;
  }
  
  // Force unstake with penalty flag
  const result = await unstakeSaros(
    connection,
    wallet,
    new PublicKey(poolAddress),
    null,
    true // Emergency flag
  );
  
  if (result.isError) {
    console.error('Emergency unstake failed:', result.mess);
  } else {
    console.log('Emergency unstake completed');
    console.log('Transaction:', result.hash);
  }
}
```

## 7. Advanced Staking Strategies

### Ladder Staking Strategy

```javascript
async function ladderStaking({
  connection,
  wallet,
  totalAmount,
  poolAddress,
  tokenMint
}) {
  // Divide amount into 4 tranches with different lock periods
  const tranches = [
    { amount: totalAmount * 0.25, lockPeriod: 0 },   // Flexible
    { amount: totalAmount * 0.25, lockPeriod: 30 },  // 30 days
    { amount: totalAmount * 0.25, lockPeriod: 60 },  // 60 days
    { amount: totalAmount * 0.25, lockPeriod: 90 }   // 90 days
  ];
  
  console.log('📊 Executing ladder staking strategy...');
  
  for (const tranche of tranches) {
    const result = await stakeTokens({
      connection,
      wallet,
      poolAddress,
      amount: tranche.amount,
      tokenMint,
      lockPeriod: tranche.lockPeriod
    });
    
    if (result.success) {
      console.log(`✅ Staked ${tranche.amount} for ${tranche.lockPeriod} days`);
    }
  }
  
  console.log('Ladder staking complete!');
}
```

### Yield Optimization

```javascript
async function findOptimalStakingPool(connection, tokenMint, amount) {
  // Get all pools for the token
  const pools = await getStakePools(connection);
  const tokenPools = filterPoolsByToken(pools, tokenMint);
  
  // Calculate projected returns for each pool
  const projections = tokenPools.map(pool => {
    const lockBonus = pool.lockPeriod > 0 ? 1 + (pool.lockPeriod / 365) : 1;
    const effectiveAPY = pool.apy * lockBonus;
    const yearlyReturn = amount * (effectiveAPY / 100);
    
    return {
      pool: pool.address,
      apy: pool.apy,
      effectiveAPY,
      lockPeriod: pool.lockPeriod,
      projectedYearlyReturn: yearlyReturn,
      risk: pool.lockPeriod > 60 ? 'High' : pool.lockPeriod > 30 ? 'Medium' : 'Low'
    };
  });
  
  // Sort by projected return
  projections.sort((a, b) => b.projectedYearlyReturn - a.projectedYearlyReturn);
  
  console.log('=== Optimal Staking Pools ===');
  projections.forEach((proj, index) => {
    console.log(`#${index + 1} Pool: ${proj.pool}`);
    console.log(`   APY: ${proj.apy}% (Effective: ${proj.effectiveAPY}%)`);
    console.log(`   Lock: ${proj.lockPeriod} days`);
    console.log(`   Projected Return: ${proj.projectedYearlyReturn}`);
    console.log(`   Risk: ${proj.risk}`);
    console.log('');
  });
  
  return projections[0]; // Return best option
}
```

## 8. Staking Dashboard

### Complete Dashboard Implementation

```javascript
class StakingDashboard {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.positions = [];
  }
  
  async loadPositions() {
    const pools = await getStakePools(this.connection);
    this.positions = [];
    
    for (const pool of pools) {
      const stakeInfo = await getStakeInfo(
        this.connection,
        this.wallet.publicKey,
        new PublicKey(pool.address)
      );
      
      if (stakeInfo && stakeInfo.stakedAmount > 0) {
        this.positions.push({
          pool: pool.address,
          token: pool.stakingToken,
          amount: stakeInfo.stakedAmount,
          rewards: stakeInfo.pendingRewards,
          apy: pool.apy,
          lockEndTime: stakeInfo.lockEndTime,
          value: await this.calculateValue(stakeInfo)
        });
      }
    }
    
    return this.positions;
  }
  
  async calculateValue(stakeInfo) {
    // Fetch token price (implement price fetching)
    const tokenPrice = 1.5; // Example price
    return (stakeInfo.stakedAmount + stakeInfo.pendingRewards) * tokenPrice;
  }
  
  getTotalValue() {
    return this.positions.reduce((sum, pos) => sum + pos.value, 0);
  }
  
  getTotalRewards() {
    return this.positions.reduce((sum, pos) => sum + pos.rewards, 0);
  }
  
  getAverageAPY() {
    if (this.positions.length === 0) return 0;
    
    const weightedAPY = this.positions.reduce((sum, pos) => 
      sum + (pos.apy * pos.value), 0
    );
    
    return weightedAPY / this.getTotalValue();
  }
  
  async displayDashboard() {
    await this.loadPositions();
    
    console.log('╔══════════════════════════════════╗');
    console.log('║     STAKING DASHBOARD            ║');
    console.log('╚══════════════════════════════════╝');
    console.log('');
    console.log(`Total Value: $${this.getTotalValue().toFixed(2)}`);
    console.log(`Total Rewards: ${this.getTotalRewards().toFixed(2)}`);
    console.log(`Average APY: ${this.getAverageAPY().toFixed(2)}%`);
    console.log(`Active Positions: ${this.positions.length}`);
    console.log('');
    console.log('=== Positions ===');
    
    this.positions.forEach((pos, i) => {
      console.log(`#${i + 1} ${pos.token}`);
      console.log(`   Staked: ${pos.amount}`);
      console.log(`   Rewards: ${pos.rewards}`);
      console.log(`   APY: ${pos.apy}%`);
      console.log(`   Value: $${pos.value.toFixed(2)}`);
      console.log(`   Unlock: ${new Date(pos.lockEndTime * 1000).toLocaleDateString()}`);
      console.log('');
    });
  }
}

// Initialize and display dashboard
const dashboard = new StakingDashboard(connection, wallet);
await dashboard.displayDashboard();
```

## 9. Error Handling & Best Practices

### Comprehensive Error Handling

```javascript
async function safeStaking(stakingFunction, ...args) {
  const maxRetries = 3;
  let lastError = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Add delay between retries
      if (i > 0) {
        console.log(`Retry attempt ${i + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Execute staking function
      const result = await stakingFunction(...args);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
    } catch (error) {
      lastError = error.message;
      console.error(`Attempt ${i + 1} failed:`, error.message);
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError}`);
}
```

### Transaction Confirmation

```javascript
async function waitForConfirmation(connection, signature, timeout = 30000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const status = await connection.getSignatureStatus(signature);
    
    if (status?.value?.confirmationStatus === 'confirmed') {
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Transaction confirmation timeout');
}
```

## 10. Testing Your Integration

### Test Suite

```javascript
async function testStakingIntegration() {
  const tests = [
    {
      name: 'Fetch staking pools',
      test: async () => {
        const pools = await getStakePools(connection);
        assert(pools.length > 0, 'Should have staking pools');
      }
    },
    {
      name: 'Stake tokens',
      test: async () => {
        const result = await stakeTokens({
          connection,
          wallet,
          poolAddress: TEST_POOL,
          amount: 1,
          tokenMint: TEST_TOKEN,
          lockPeriod: 0
        });
        assert(result.success, 'Staking should succeed');
      }
    },
    {
      name: 'Check stake info',
      test: async () => {
        const info = await getStakeInfo(
          connection,
          wallet.publicKey,
          new PublicKey(TEST_POOL)
        );
        assert(info !== null, 'Should have stake info');
      }
    },
    {
      name: 'Harvest rewards',
      test: async () => {
        const result = await claimRewards(connection, wallet, TEST_POOL);
        assert(result !== null, 'Should harvest rewards');
      }
    },
    {
      name: 'Unstake tokens',
      test: async () => {
        const result = await unstakeTokens({
          connection,
          wallet,
          poolAddress: TEST_POOL
        });
        assert(result.success, 'Unstaking should succeed');
      }
    }
  ];
  
  console.log('Running staking integration tests...\n');
  
  for (const test of tests) {
    try {
      await test.test();
      console.log(`✅ ${test.name}`);
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

// Run tests on devnet
await testStakingIntegration();
```

## Summary

You've learned how to:
- ✅ Discover and analyze staking pools
- ✅ Stake single assets and LP tokens
- ✅ Monitor staking positions and calculate rewards
- ✅ Harvest rewards and implement auto-compounding
- ✅ Unstake tokens with proper validation
- ✅ Implement advanced staking strategies
- ✅ Build a comprehensive staking dashboard
- ✅ Handle errors and edge cases properly

## Next Steps

1. **[Explore Advanced Examples](/docs/examples/automated-trading-bot)** - Maximize yields with automated strategies
2. **[Build Analytics Dashboard](/docs/examples/portfolio-analytics-dashboard)** - Track all DeFi positions
3. **[Implement Auto-Strategies](/docs/examples/staking-rewards-automation)** - Automate your DeFi operations
4. **[Review Troubleshooting Guide](/docs/troubleshooting)** - Secure your staking integration

## Resources

- [Staking API Reference](/docs/typescript-sdk/api-reference)
- [Example Code Repository](https://github.com/saros-xyz/saros-sdk-examples)
- [Developer Support](https://t.me/+DLLPYFzvTzJmNTJh)
- [Saros Staking Dashboard](https://app.saros.xyz/stake)