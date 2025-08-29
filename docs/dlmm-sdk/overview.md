# DLMM SDK Overview

The Saros DLMM (Dynamic Liquidity Market Maker) TypeScript SDK provides advanced concentrated liquidity functionality for sophisticated trading and liquidity provision strategies.

## What is DLMM?

DLMM is an advanced AMM design that offers:

- **Concentrated Liquidity**: Focus liquidity in specific price ranges for higher capital efficiency
- **Dynamic Fee Tiers**: Multiple fee levels (0.01%, 0.05%, 0.3%, 1%) based on volatility
- **Position Management**: Precise control over liquidity positions
- **Automated Rebalancing**: Optional auto-rebalancing for passive liquidity providers
- **Improved Price Discovery**: Better pricing through concentrated liquidity

## Key Benefits

### Capital Efficiency
Traditional AMMs spread liquidity across the entire price curve (0 to ∞). DLMM allows you to concentrate liquidity where trading actually occurs, providing:
- **10-100x capital efficiency** compared to traditional AMMs
- **Higher fee generation** from the same capital amount
- **Reduced impermanent loss** through targeted price ranges

### Advanced Strategies
- **Range Orders**: Limit-order-like behavior with concentrated positions
- **Market Making**: Professional market making with tight spreads
- **Arbitrage Opportunities**: Capital-efficient arbitrage strategies
- **Yield Optimization**: Maximize returns through strategic positioning

## DLMM vs Traditional AMM

| Feature | Traditional AMM | DLMM |
|---------|-----------------|------|
| **Capital Efficiency** | Low (spread across full range) | High (concentrated ranges) |
| **Fee Generation** | Lower per dollar | Higher per dollar |
| **Position Control** | None (auto-distributed) | Full control |
| **Impermanent Loss** | Higher | Lower (targeted ranges) |
| **Complexity** | Simple | Advanced |
| **Gas Costs** | Lower | Higher (more complex) |

## Visual Comparison: Liquidity Distribution

![DLMM Bin Distribution](/img/dlmm-bins-visualization.svg)

This visualization shows how DLMM concentrates liquidity in specific price bins around the current market price, compared to traditional AMMs that spread liquidity uniformly. The concentrated approach provides significantly better capital efficiency and higher returns for liquidity providers.

## Architecture Overview

### Core Components

```typescript
// Main DLMM components
interface DLMMPool {
  poolAddress: string;
  tokenX: TokenInfo;      // Base token
  tokenY: TokenInfo;      // Quote token  
  activeId: number;       // Current active price bin
  feeTier: number;        // Fee tier (1, 5, 30, 100 basis points)
  binStep: number;        // Price increment between bins
}

interface LiquidityPosition {
  positionId: string;     // Unique position identifier
  lowerBin: number;       // Lower price bin
  upperBin: number;       // Upper price bin
  liquidityX: number;     // Token X liquidity
  liquidityY: number;     // Token Y liquidity
  feesEarned: {           // Accumulated fees
    tokenX: number;
    tokenY: number;
  };
}
```

### Price Bins and Ranges

DLMM organizes liquidity into discrete price bins:

```typescript
// Price bin calculation
function calculateBinPrice(binId: number, binStep: number): number {
  // Each bin represents a specific price range
  // binStep determines the price increment (e.g., 1 basis point = 0.01%)
  return Math.pow(1 + binStep / 10000, binId);
}

// Example: Find current price bin
function getCurrentPriceBin(pool: DLMMPool): number {
  return pool.activeId; // Current active trading bin
}
```

## Getting Started with DLMM

### Installation

```bash
npm install @saros-finance/dlmm-sdk
```

### Basic Usage

```typescript
import { 
  DLMMPool,
  LiquidityPosition,
  createPosition,
  addLiquidity,
  removeLiquidity,
  collectFees
} from '@saros-finance/dlmm-sdk';

// Connect to a DLMM pool
const pool = await DLMMPool.load(connection, poolAddress);

// Get current pool state
console.log(`Active bin: ${pool.activeId}`);
console.log(`Current price: ${pool.getCurrentPrice()}`);
console.log(`Fee tier: ${pool.feeTier / 100}%`);
```

## Use Cases

### 1. Concentrated Liquidity Provider

Perfect for users who want to:
- Maximize fee generation from limited capital
- Provide liquidity around current market price
- Actively manage positions based on market conditions

```typescript
// Provide liquidity in tight range around current price
const currentPrice = pool.getCurrentPrice();
const range = 0.05; // ±5% range

const position = await createPosition(
  pool,
  currentPrice * (1 - range), // Lower price
  currentPrice * (1 + range), // Upper price
  liquidityAmount,
  walletAddress
);
```

### 2. Range Orders (Limit Order Alternative)

Use DLMM positions as sophisticated limit orders:

```typescript
// Sell order: Place liquidity above current price
const sellOrder = await createPosition(
  pool,
  currentPrice * 1.02, // Start selling 2% above current
  currentPrice * 1.10, // Stop selling 10% above current
  tokenXAmount,
  walletAddress
);

// Buy order: Place liquidity below current price
const buyOrder = await createPosition(
  pool,
  currentPrice * 0.90, // Start buying 10% below current
  currentPrice * 0.98, // Stop buying 2% below current
  tokenYAmount,
  walletAddress
);
```

### 3. Market Making

Professional market makers can:
- Create tight spreads around market price
- Adjust positions based on market conditions
- Collect fees while providing liquidity

```typescript
class DLMMMarketMaker {
  async createTightSpread(
    pool: DLMMPool,
    spreadBasisPoints: number = 10 // 0.1% spread
  ) {
    const currentPrice = pool.getCurrentPrice();
    const spread = spreadBasisPoints / 10000;
    
    // Bid side (below current price)
    const bidPosition = await createPosition(
      pool,
      currentPrice * (1 - spread), 
      currentPrice,
      liquidityAmount / 2,
      walletAddress
    );
    
    // Ask side (above current price)
    const askPosition = await createPosition(
      pool,
      currentPrice,
      currentPrice * (1 + spread),
      liquidityAmount / 2,
      walletAddress
    );
    
    return { bidPosition, askPosition };
  }
}
```

### 4. Automated Strategies

Build sophisticated automated liquidity strategies:

```typescript
class DLMMStrategy {
  async autoRebalance(position: LiquidityPosition) {
    const pool = await DLMMPool.load(connection, position.poolAddress);
    const currentPrice = pool.getCurrentPrice();
    
    // Check if position is still in range
    const positionInRange = this.isPositionInRange(position, currentPrice);
    
    if (!positionInRange) {
      // Close old position
      await removeLiquidity(position, walletAddress);
      
      // Create new position around current price
      const newPosition = await this.createCenteredPosition(
        pool,
        currentPrice,
        position.liquidityX + position.liquidityY
      );
      
      return newPosition;
    }
    
    return position; // No rebalancing needed
  }
}
```

## Key Concepts

### Bins and Price Ranges
- **Bin**: Discrete price bucket that holds liquidity
- **Bin Step**: Price increment between adjacent bins
- **Active Bin**: Current trading price bin
- **Position Range**: Set of consecutive bins containing your liquidity

### Fee Tiers
Different fee levels for different volatility:
- **0.01%**: Stable pairs (USDC/USDT)
- **0.05%**: Major pairs (SOL/USDC)  
- **0.30%**: Standard pairs (most tokens)
- **1.00%**: Exotic/volatile pairs

### Impermanent Loss Mitigation
DLMM reduces impermanent loss through:
- **Targeted Ranges**: Only exposed to price movement within range
- **Fee Accumulation**: Higher fees offset some impermanent loss
- **Position Management**: Ability to adjust ranges as needed

## When to Use DLMM SDK

### ✅ **Use DLMM SDK When**:
- You understand concentrated liquidity concepts
- You want maximum capital efficiency
- You plan to actively manage positions
- You're building professional trading tools
- You need advanced fee generation

### ⚠️ **Consider Alternatives When**:
- You want "set and forget" liquidity provision
- You're new to DeFi concepts
- You need simple token swapping (use main SDK)
- You want to minimize gas costs

## Learning Path

1. **[Installation Guide](/docs/dlmm-sdk/installation)** - Set up the DLMM SDK
2. **[Concentrated Liquidity Basics](/docs/dlmm-sdk/concentrated-liquidity)** - Understand the concepts
3. **[Position Management](/docs/dlmm-sdk/position-management)** - Create and manage positions
4. **[API Reference](/docs/dlmm-sdk/api-reference)** - Complete function documentation
5. **[Advanced Examples](/docs/examples/dlmm-position-creator)** - Build sophisticated applications

## Resources

- **Main SDK**: For basic AMM operations
- **Rust DLMM SDK**: For high-performance applications
- **Tutorials**: Step-by-step implementation guides  
- **Examples**: Working code you can copy and modify

Ready to dive in? Start with [DLMM Installation](/docs/dlmm-sdk/installation)!