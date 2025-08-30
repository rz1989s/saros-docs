# Concentrated Liquidity

Learn the concepts and implementation of concentrated liquidity using the Saros DLMM SDK. This guide covers price bins, position management, and advanced strategies.

## Understanding Concentrated Liquidity

Traditional AMMs spread your liquidity across the entire price range (0 to ∞). Concentrated liquidity allows you to focus your capital in specific price ranges where you expect trading to occur.

### Traditional AMM vs DLMM

```typescript
// Traditional AMM: Your $1000 liquidity
const traditionalAMM = {
  priceRange: [0, Infinity],
  activeTrading: 0.1,      // Only 10% of your liquidity earns fees
  capitalEfficiency: '1x'   // Baseline efficiency
};

// DLMM: Same $1000 but concentrated
const dlmmConcentrated = {
  priceRange: [95, 105],   // ±5% around current price of 100
  activeTrading: 1.0,      // 100% of your liquidity earns fees
  capitalEfficiency: '10x' // 10x more efficient
};
```

## Price Bins Explained

DLMM organizes liquidity into discrete price bins instead of a continuous curve.

### Bin Structure

```typescript
interface PriceBin {
  binId: number;        // Unique identifier (can be negative)
  price: number;        // Exact price of this bin
  liquidityX: number;   // Token X amount in this bin
  liquidityY: number;   // Token Y amount in this bin
  feeX: number;         // Accumulated fees in token X
  feeY: number;         // Accumulated fees in token Y
  isActive: boolean;    // Whether trading happens in this bin
}

// Calculate bin price from ID
function getBinPrice(binId: number, binStep: number): number {
  const basePriceRatio = 1 + (binStep / 10000);
  return Math.pow(basePriceRatio, binId);
}

// Example: Find bin ID for a target price
function findBinForPrice(targetPrice: number, binStep: number): number {
  const basePriceRatio = 1 + (binStep / 10000);
  return Math.floor(Math.log(targetPrice) / Math.log(basePriceRatio));
}
```

### Bin Step and Fee Tiers

Different bin steps correspond to different fee tiers:

```typescript
const FEE_TIERS = {
  STABLE: {
    feeBasisPoints: 1,   // 0.01% fee
    binStep: 1,          // 0.01% price increment per bin
    description: 'For stable pairs like USDC/USDT'
  },
  LOW: {
    feeBasisPoints: 5,   // 0.05% fee
    binStep: 10,         // 0.1% price increment per bin  
    description: 'For major pairs like SOL/USDC'
  },
  MEDIUM: {
    feeBasisPoints: 30,  // 0.3% fee
    binStep: 60,         // 0.6% price increment per bin
    description: 'For standard token pairs'
  },
  HIGH: {
    feeBasisPoints: 100, // 1% fee
    binStep: 200,        // 2% price increment per bin
    description: 'For volatile or exotic pairs'
  }
} as const;

// Choose appropriate fee tier
function selectFeeTier(tokenX: string, tokenY: string): typeof FEE_TIERS[keyof typeof FEE_TIERS] {
  const isStablePair = isStablecoinPair(tokenX, tokenY);
  const isMajorPair = isMajorTokenPair(tokenX, tokenY);
  
  if (isStablePair) return FEE_TIERS.STABLE;
  if (isMajorPair) return FEE_TIERS.LOW;
  return FEE_TIERS.MEDIUM; // Default for most pairs
}
```

## Creating Concentrated Positions

### Basic Position Creation

```typescript
import { 
  createPosition,
  LiquidityPosition,
  PositionConfig
} from '@saros-finance/dlmm-sdk';

async function createConcentratedPosition(
  pool: DLMMPool,
  lowerPrice: number,
  upperPrice: number,
  tokenXAmount: number,
  tokenYAmount: number,
  walletAddress: string
): Promise<LiquidityPosition> {
  
  try {
    // Convert prices to bin IDs
    const lowerBinId = findBinForPrice(lowerPrice, pool.binStep);
    const upperBinId = findBinForPrice(upperPrice, pool.binStep);

    console.log(`Creating position in bins ${lowerBinId} to ${upperBinId}`);
    console.log(`Price range: ${lowerPrice} to ${upperPrice}`);

    const position = await createPosition({
      pool: pool,
      lowerBinId: lowerBinId,
      upperBinId: upperBinId,
      tokenXAmount: tokenXAmount,
      tokenYAmount: tokenYAmount,
      wallet: new PublicKey(walletAddress),
      slippageTolerance: 0.01 // 1% slippage for position creation
    });

    console.log('✅ Concentrated position created!');
    console.log(`Position ID: ${position.positionId}`);
    
    return position;

  } catch (error) {
    console.error('Position creation failed:', error);
    throw error;
  }
}
```

### Position Types and Strategies

```typescript
// 1. Range Position (Traditional LP-style)
async function createRangePosition(
  pool: DLMMPool,
  centerPrice: number,
  rangePercent: number = 10, // ±10% range
  totalValue: number,
  walletAddress: string
) {
  const lowerPrice = centerPrice * (1 - rangePercent / 100);
  const upperPrice = centerPrice * (1 + rangePercent / 100);
  
  // Split value 50/50 between tokens
  const tokenXAmount = totalValue * 0.5 / centerPrice; // Convert to token X units
  const tokenYAmount = totalValue * 0.5;               // Token Y amount
  
  return await createConcentratedPosition(
    pool, lowerPrice, upperPrice, tokenXAmount, tokenYAmount, walletAddress
  );
}

// 2. Single-Sided Position (Range Order)
async function createRangeOrder(
  pool: DLMMPool,
  orderType: 'buy' | 'sell',
  triggerPrice: number,
  limitPrice: number,
  amount: number,
  walletAddress: string
) {
  let lowerPrice: number, upperPrice: number;
  let tokenXAmount: number, tokenYAmount: number;
  
  if (orderType === 'sell') {
    // Sell order: Place liquidity above current price (only token X)
    lowerPrice = triggerPrice;
    upperPrice = limitPrice;
    tokenXAmount = amount;
    tokenYAmount = 0;
  } else {
    // Buy order: Place liquidity below current price (only token Y)
    lowerPrice = limitPrice;  
    upperPrice = triggerPrice;
    tokenXAmount = 0;
    tokenYAmount = amount;
  }
  
  return await createConcentratedPosition(
    pool, lowerPrice, upperPrice, tokenXAmount, tokenYAmount, walletAddress
  );
}

// 3. Market Making Position  
async function createMarketMakingPosition(
  pool: DLMMPool,
  spreadBasisPoints: number = 50, // 0.5% spread
  liquidityPerSide: number,
  walletAddress: string
) {
  const currentPrice = pool.getCurrentPrice();
  const spread = spreadBasisPoints / 10000;
  
  // Create tight range around current price
  const lowerPrice = currentPrice * (1 - spread);
  const upperPrice = currentPrice * (1 + spread);
  
  // Equal amounts of both tokens for market making
  const tokenXAmount = liquidityPerSide / currentPrice;
  const tokenYAmount = liquidityPerSide;
  
  return await createConcentratedPosition(
    pool, lowerPrice, upperPrice, tokenXAmount, tokenYAmount, walletAddress
  );
}
```

### Active Liquidity Management

```typescript
class ActiveLiquidityManager {
  private pool: DLMMPool;
  private position: LiquidityPosition;
  private strategy: 'follow_price' | 'range_bound' | 'market_making';

  constructor(pool: DLMMPool, position: LiquidityPosition, strategy: string) {
    this.pool = pool;
    this.position = position;
    this.strategy = strategy;
  }

  async rebalanceIfNeeded(): Promise<boolean> {
    const currentPrice = this.pool.getCurrentPrice();
    const positionRange = this.position.getPriceRange();
    
    switch (this.strategy) {
      case 'follow_price':
        return await this.followPriceStrategy(currentPrice, positionRange);
      case 'range_bound':
        return await this.rangeBoundStrategy(currentPrice, positionRange);
      case 'market_making':
        return await this.marketMakingStrategy(currentPrice, positionRange);
      default:
        return false;
    }
  }

  private async followPriceStrategy(
    currentPrice: number,
    positionRange: { lower: number; upper: number }
  ): Promise<boolean> {
    // Rebalance if price moves outside position range
    const isOutOfRange = currentPrice < positionRange.lower || currentPrice > positionRange.upper;
    
    if (isOutOfRange) {
      console.log('🔄 Price moved out of range, rebalancing...');
      
      // Close current position
      await this.closePosition();
      
      // Create new position centered on current price
      const newRange = positionRange.upper - positionRange.lower; // Keep same range width
      await createRangePosition(
        this.pool,
        currentPrice,
        (newRange / currentPrice) * 100, // Convert to percentage
        this.position.getTotalValue(),
        this.position.walletAddress
      );
      
      return true;
    }
    
    return false;
  }

  private async rangeBoundStrategy(
    currentPrice: number,
    positionRange: { lower: number; upper: number }
  ): Promise<boolean> {
    // Only rebalance if price moves significantly outside range
    const threshold = 0.02; // 2% threshold
    const lowerThreshold = positionRange.lower * (1 - threshold);
    const upperThreshold = positionRange.upper * (1 + threshold);
    
    if (currentPrice < lowerThreshold || currentPrice > upperThreshold) {
      console.log('🔄 Price exceeded threshold, rebalancing...');
      // Rebalancing logic here
      return true;
    }
    
    return false;
  }

  private async marketMakingStrategy(
    currentPrice: number,
    positionRange: { lower: number; upper: number }
  ): Promise<boolean> {
    // Maintain tight spread around current price
    const targetSpread = 0.005; // 0.5% spread
    const currentSpread = (positionRange.upper - positionRange.lower) / currentPrice;
    
    if (Math.abs(currentSpread - targetSpread) > 0.001) { // 0.1% tolerance
      console.log('🔄 Adjusting market making spread...');
      // Adjust position to maintain target spread
      return true;
    }
    
    return false;
  }

  private async closePosition() {
    // Implementation for closing/removing position
    await removeLiquidity(this.position, this.position.walletAddress);
  }
}
```

## Advanced Strategies

### 1. Delta Neutral Strategy

Maintain constant exposure to price movements:

```typescript
async function createDeltaNeutralPosition(
  pool: DLMMPool,
  notionalValue: number,
  hedgeRatio: number = 1.0
) {
  const currentPrice = pool.getCurrentPrice();
  
  // Create concentrated position
  const lpPosition = await createRangePosition(
    pool,
    currentPrice,
    5, // ±5% range
    notionalValue * 0.7, // 70% in LP
    walletAddress
  );
  
  // Hedge with perpetual short (would need integration with perp protocol)
  const hedgeSize = notionalValue * 0.3 * hedgeRatio;
  console.log(`LP Position: $${notionalValue * 0.7}`);
  console.log(`Hedge Size: $${hedgeSize}`);
  
  return {
    lpPosition,
    hedgeSize,
    netDelta: calculateNetDelta(lpPosition, hedgeSize)
  };
}
```

### 2. Volatility Farming

Profit from volatility by providing liquidity at key levels:

```typescript
class VolatilityFarmer {
  async createVolatilityPositions(
    pool: DLMMPool,
    supportLevel: number,    // Key support price
    resistanceLevel: number, // Key resistance price
    totalCapital: number
  ) {
    const positions = [];
    
    // Support level position (expect bounces)
    const supportPosition = await createConcentratedPosition(
      pool,
      supportLevel * 0.99,  // Just below support
      supportLevel * 1.01,  // Just above support
      0,                    // No token X (expecting price to bounce up)
      totalCapital * 0.4,   // 40% of capital in token Y
      walletAddress
    );
    
    // Resistance level position (expect rejections)
    const resistancePosition = await createConcentratedPosition(
      pool,
      resistanceLevel * 0.99, // Just below resistance
      resistanceLevel * 1.01, // Just above resistance  
      (totalCapital * 0.4) / resistanceLevel, // 40% of capital in token X
      0,                      // No token Y (expecting price to bounce down)
      walletAddress
    );
    
    // Market making in between
    const currentPrice = pool.getCurrentPrice();
    const mmPosition = await createMarketMakingPosition(
      pool,
      20, // 0.2% spread
      totalCapital * 0.2, // 20% for market making
      walletAddress
    );

    return {
      supportPosition,
      resistancePosition, 
      mmPosition,
      strategy: 'volatility_farming'
    };
  }
}
```

### 3. Automated Range Adjustment

Automatically adjust position ranges based on market conditions:

```typescript
class AutoRangeAdjuster {
  private pool: DLMMPool;
  private position: LiquidityPosition;
  private config: {
    rebalanceThreshold: number;  // Price change % to trigger rebalance
    maxGasCost: number;         // Maximum gas cost for rebalancing
    minProfitThreshold: number; // Minimum profit to justify rebalance
  };

  async monitorAndAdjust() {
    const currentPrice = this.pool.getCurrentPrice();
    const positionRange = this.position.getPriceRange();
    
    // Calculate price deviation from position center
    const positionCenter = (positionRange.lower + positionRange.upper) / 2;
    const deviation = Math.abs((currentPrice - positionCenter) / positionCenter);
    
    if (deviation > this.config.rebalanceThreshold) {
      const shouldRebalance = await this.evaluateRebalance(currentPrice);
      
      if (shouldRebalance) {
        await this.executeRebalance(currentPrice);
      }
    }
  }

  private async evaluateRebalance(newCenterPrice: number): Promise<boolean> {
    // Calculate cost of rebalancing
    const rebalanceCost = await this.estimateRebalanceCost();
    
    // Calculate expected additional fees from new position
    const expectedAdditionalFees = await this.estimateAdditionalFees(newCenterPrice);
    
    // Only rebalance if expected profit > cost + threshold
    return expectedAdditionalFees > rebalanceCost + this.config.minProfitThreshold;
  }

  private async executeRebalance(newCenterPrice: number) {
    try {
      console.log('🔄 Executing position rebalance...');
      
      // 1. Collect current fees
      await this.position.collectFees();
      
      // 2. Remove liquidity from current position
      const removedLiquidity = await this.position.removeLiquidity(1.0); // Remove 100%
      
      // 3. Create new position around current price
      const rangeWidth = this.position.getPriceRange().upper - this.position.getPriceRange().lower;
      const newPosition = await createConcentratedPosition(
        this.pool,
        newCenterPrice - rangeWidth / 2,
        newCenterPrice + rangeWidth / 2,
        removedLiquidity.tokenX,
        removedLiquidity.tokenY,
        this.position.walletAddress
      );
      
      // 4. Update tracking
      this.position = newPosition;
      
      console.log('✅ Position rebalanced successfully');
      
    } catch (error) {
      console.error('❌ Rebalancing failed:', error);
      throw error;
    }
  }

  private async estimateRebalanceCost(): Promise<number> {
    // Estimate gas costs for:
    // 1. Collecting fees
    // 2. Removing liquidity  
    // 3. Creating new position
    
    const baseGasCost = 0.01; // SOL
    const solPrice = await getTokenPrice('SOL');
    return baseGasCost * solPrice;
  }

  private async estimateAdditionalFees(newCenterPrice: number): Promise<number> {
    // Estimate additional fees from better positioned liquidity
    // This involves complex calculations based on:
    // - Historical trading volume in the new price range
    // - Expected time in range
    // - Fee tier of the pool
    
    return 0; // Placeholder - implement based on historical data
  }
}
```

## Position Optimization

### Capital Allocation Strategies

```typescript
interface CapitalAllocationStrategy {
  name: string;
  description: string;
  allocate(
    totalCapital: number,
    currentPrice: number,
    volatility: number
  ): AllocationPlan;
}

interface AllocationPlan {
  positions: Array<{
    lowerPrice: number;
    upperPrice: number;
    capitalPercent: number;
    expectedAPR: number;
  }>;
}

class ConservativeStrategy implements CapitalAllocationStrategy {
  name = 'Conservative';
  description = 'Wide range, lower risk, consistent fees';
  
  allocate(totalCapital: number, currentPrice: number, volatility: number): AllocationPlan {
    // Single wide position to capture most trades
    const rangePercent = Math.max(20, volatility * 100); // Adapt to volatility
    
    return {
      positions: [{
        lowerPrice: currentPrice * (1 - rangePercent / 100),
        upperPrice: currentPrice * (1 + rangePercent / 100),
        capitalPercent: 100,
        expectedAPR: 15 // Conservative estimate
      }]
    };
  }
}

class AggressiveStrategy implements CapitalAllocationStrategy {
  name = 'Aggressive';  
  description = 'Tight range, higher risk, maximum fees when in range';
  
  allocate(totalCapital: number, currentPrice: number): AllocationPlan {
    return {
      positions: [{
        lowerPrice: currentPrice * 0.98, // ±2% range
        upperPrice: currentPrice * 1.02,
        capitalPercent: 100,
        expectedAPR: 50 // Higher APR but higher risk
      }]
    };
  }
}

class BalancedStrategy implements CapitalAllocationStrategy {
  name = 'Balanced';
  description = 'Multiple positions for optimal risk/reward';
  
  allocate(totalCapital: number, currentPrice: number): AllocationPlan {
    return {
      positions: [
        {
          // Core position: 60% in ±5% range
          lowerPrice: currentPrice * 0.95,
          upperPrice: currentPrice * 1.05,
          capitalPercent: 60,
          expectedAPR: 30
        },
        {
          // Backup position: 30% in ±15% range
          lowerPrice: currentPrice * 0.85,
          upperPrice: currentPrice * 1.15,
          capitalPercent: 30,
          expectedAPR: 15
        },
        {
          // Opportunistic position: 10% in ±2% range
          lowerPrice: currentPrice * 0.98,
          upperPrice: currentPrice * 1.02,
          capitalPercent: 10,
          expectedAPR: 60
        }
      ]
    };
  }
}
```

### Fee Optimization

```typescript
class FeeOptimizer {
  async optimizeForFeeGeneration(
    pool: DLMMPool,
    historicalData: TradingData[],
    capitalAmount: number
  ) {
    // Analyze where most trading volume occurs
    const volumeDistribution = this.analyzeVolumeDistribution(historicalData);
    
    // Find optimal price ranges based on volume
    const optimalRanges = this.findOptimalRanges(volumeDistribution, pool.getCurrentPrice());
    
    // Create positions in high-volume ranges
    const positions = [];
    for (const range of optimalRanges) {
      const capitalForRange = capitalAmount * range.volumePercent;
      
      if (capitalForRange > 10) { // Minimum position size
        const position = await createConcentratedPosition(
          pool,
          range.lowerPrice,
          range.upperPrice,
          this.calculateTokenAmounts(capitalForRange, range.averagePrice),
          0, // Calculate token Y amount
          walletAddress
        );
        positions.push(position);
      }
    }
    
    return positions;
  }

  private analyzeVolumeDistribution(data: TradingData[]) {
    // Group trades by price ranges
    const priceRanges = new Map<string, { volume: number; count: number }>();
    
    for (const trade of data) {
      const priceRange = this.getPriceRange(trade.price);
      const existing = priceRanges.get(priceRange) || { volume: 0, count: 0 };
      
      priceRanges.set(priceRange, {
        volume: existing.volume + trade.volume,
        count: existing.count + 1
      });
    }
    
    return priceRanges;
  }

  private findOptimalRanges(
    volumeDistribution: Map<string, any>, 
    currentPrice: number
  ) {
    // Convert volume distribution to position recommendations
    const ranges = [];
    
    for (const [priceRangeKey, data] of volumeDistribution.entries()) {
      const [lowerStr, upperStr] = priceRangeKey.split('-');
      ranges.push({
        lowerPrice: parseFloat(lowerStr),
        upperPrice: parseFloat(upperStr),
        volumePercent: data.volume / this.getTotalVolume(volumeDistribution),
        averagePrice: (parseFloat(lowerStr) + parseFloat(upperStr)) / 2
      });
    }
    
    // Sort by volume and return top ranges
    return ranges.sort((a, b) => b.volumePercent - a.volumePercent).slice(0, 5);
  }

  private getPriceRange(price: number): string {
    // Group prices into 1% ranges
    const rangeSize = 0.01; // 1%
    const rangeLower = Math.floor(price / (price * rangeSize)) * (price * rangeSize);
    const rangeUpper = rangeLower + (price * rangeSize);
    return `${rangeLower.toFixed(4)}-${rangeUpper.toFixed(4)}`;
  }

  private getTotalVolume(distribution: Map<string, any>): number {
    return Array.from(distribution.values()).reduce((sum, data) => sum + data.volume, 0);
  }

  private calculateTokenAmounts(capitalUSD: number, averagePrice: number) {
    // Calculate optimal token distribution for the price range
    // Implementation depends on position type and strategy
    return {
      tokenX: capitalUSD * 0.5 / averagePrice,
      tokenY: capitalUSD * 0.5
    };
  }
}
```

## Risk Management

### Impermanent Loss Calculation

```typescript
function calculateImpermanentLoss(
  initialPrice: number,
  currentPrice: number,
  initialTokenXAmount: number,
  initialTokenYAmount: number,
  currentTokenXAmount: number,
  currentTokenYAmount: number
): number {
  // Value if held without providing liquidity
  const holdValue = (initialTokenXAmount * currentPrice) + initialTokenYAmount;
  
  // Current value in pool
  const poolValue = (currentTokenXAmount * currentPrice) + currentTokenYAmount;
  
  // Impermanent loss percentage
  return ((poolValue - holdValue) / holdValue) * 100;
}

function calculateImpermanentLossForRange(
  lowerPrice: number,
  upperPrice: number,
  entryPrice: number,
  currentPrice: number
): number {
  // Calculate IL for concentrated position
  // IL varies based on how far price moved within the range
  
  if (currentPrice < lowerPrice || currentPrice > upperPrice) {
    // Price is outside range - position is single-sided
    return this.calculateSingleSidedIL(entryPrice, currentPrice);
  }
  
  // Price is within range - calculate partial IL
  return this.calculatePartialIL(lowerPrice, upperPrice, entryPrice, currentPrice);
}
```

### Position Risk Metrics

```typescript
interface PositionRiskMetrics {
  impermanentLoss: number;      // Current IL percentage
  timeInRange: number;          // % of time position was active
  feeAPR: number;              // Annualized fee generation rate
  netAPR: number;              // Fee APR minus IL
  capitalUtilization: number;   // % of capital earning fees
  riskScore: number;           // Overall risk score (1-10)
}

async function calculatePositionRisk(
  position: LiquidityPosition,
  daysActive: number
): Promise<PositionRiskMetrics> {
  const currentPrice = position.pool.getCurrentPrice();
  const positionRange = position.getPriceRange();
  
  // Calculate various risk metrics
  const il = calculateImpermanentLoss(/* params */);
  const feesEarned = position.getAccumulatedFees();
  const capitalDeployed = position.getTotalValue();
  
  const feeAPR = (feesEarned.total / capitalDeployed) * (365 / daysActive) * 100;
  const timeInRange = await calculateTimeInRange(position, daysActive);
  
  return {
    impermanentLoss: il,
    timeInRange: timeInRange,
    feeAPR: feeAPR,
    netAPR: feeAPR + il, // IL is negative, so this is fee APR minus IL
    capitalUtilization: timeInRange,
    riskScore: calculateRiskScore(il, timeInRange, feeAPR)
  };
}

function calculateRiskScore(
  impermanentLoss: number,
  timeInRange: number, 
  feeAPR: number
): number {
  let risk = 5; // Base risk score
  
  // Adjust for IL
  if (impermanentLoss < -10) risk += 2; // High IL increases risk
  if (impermanentLoss > -2) risk -= 1;  // Low IL decreases risk
  
  // Adjust for time in range
  if (timeInRange < 50) risk += 2; // Low utilization increases risk
  if (timeInRange > 80) risk -= 1; // High utilization decreases risk
  
  // Adjust for fee generation
  if (feeAPR > 30) risk -= 1; // High fees reduce effective risk
  if (feeAPR < 5) risk += 1;  // Low fees increase risk
  
  return Math.max(1, Math.min(10, risk));
}
```

## Performance Monitoring

### Real-time Position Analytics

```typescript
class DLMMAnalytics {
  async getPositionPerformance(
    position: LiquidityPosition,
    startDate: Date
  ): Promise<PositionPerformance> {
    const now = new Date();
    const daysActive = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Get current position state
    const fees = position.getAccumulatedFees();
    const currentValue = position.getTotalValue();
    const initialValue = position.getInitialValue(); // Store this when creating position
    
    // Calculate performance metrics
    const totalFees = fees.tokenX + fees.tokenY;
    const impermanentLoss = calculateImpermanentLoss(/* params */);
    const totalReturn = ((currentValue - initialValue) / initialValue) * 100;
    
    return {
      daysActive,
      totalFeesUSD: totalFees,
      feeAPR: (totalFees / initialValue) * (365 / daysActive) * 100,
      impermanentLoss,
      totalReturnPercent: totalReturn,
      netReturnPercent: totalReturn - Math.abs(impermanentLoss),
      breakEvenPrice: this.calculateBreakEvenPrice(position, fees)
    };
  }

  private calculateBreakEvenPrice(
    position: LiquidityPosition,
    feesEarned: { tokenX: number; tokenY: number }
  ): number {
    // Calculate price where total return (including fees) equals hold strategy
    // Complex calculation involving position range and fee accumulation
    return 0; // Placeholder
  }
}

interface PositionPerformance {
  daysActive: number;
  totalFeesUSD: number;
  feeAPR: number;
  impermanentLoss: number;
  totalReturnPercent: number;
  netReturnPercent: number;
  breakEvenPrice: number;
}
```

### Benchmarking

```typescript
// Compare DLMM performance vs alternatives
async function benchmarkDLMMPerformance(
  dlmmPosition: LiquidityPosition,
  startPrice: number,
  endPrice: number,
  timeframeDays: number
) {
  const dlmmPerformance = await getPositionPerformance(dlmmPosition, timeframeDays);
  
  // Compare vs holding tokens
  const holdingReturn = calculateHoldingReturn(startPrice, endPrice);
  
  // Compare vs traditional AMM (simulate)
  const traditionalAMMReturn = calculateTraditionalAMMReturn(
    startPrice, 
    endPrice, 
    dlmmPosition.getInitialValue()
  );
  
  return {
    dlmm: {
      totalReturn: dlmmPerformance.netReturnPercent,
      fees: dlmmPerformance.totalFeesUSD,
      impermanentLoss: dlmmPerformance.impermanentLoss
    },
    holding: {
      totalReturn: holdingReturn,
      fees: 0,
      impermanentLoss: 0
    },
    traditionalAMM: {
      totalReturn: traditionalAMMReturn.totalReturn,
      fees: traditionalAMMReturn.fees,
      impermanentLoss: traditionalAMMReturn.impermanentLoss
    },
    winner: getBestStrategy([dlmmPerformance.netReturnPercent, holdingReturn, traditionalAMMReturn.totalReturn])
  };
}
```

## Best Practices

### 1. Position Sizing

```typescript
const POSITION_SIZING_RULES = {
  // Never put more than 20% of portfolio in single position
  maxSinglePosition: 0.2,
  
  // Tight ranges should use smaller position sizes
  maxTightRangeAllocation: 0.1, // 10% max for <5% ranges
  
  // Minimum position size to justify gas costs
  minPositionSize: 100, // $100 minimum
  
  // Maximum number of active positions
  maxActivePositions: 10
};

function validatePositionSize(
  positionValue: number,
  portfolioValue: number,
  priceRange: { lower: number; upper: number; current: number }
): boolean {
  const allocationPercent = positionValue / portfolioValue;
  
  // Check maximum allocation
  if (allocationPercent > POSITION_SIZING_RULES.maxSinglePosition) {
    console.warn(`Position size ${allocationPercent}% exceeds maximum ${POSITION_SIZING_RULES.maxSinglePosition * 100}%`);
    return false;
  }
  
  // Check tight range allocation
  const rangePercent = ((priceRange.upper - priceRange.lower) / priceRange.current) * 100;
  if (rangePercent < 5 && allocationPercent > POSITION_SIZING_RULES.maxTightRangeAllocation) {
    console.warn(`Tight range position too large: ${allocationPercent}%`);
    return false;
  }
  
  // Check minimum size
  if (positionValue < POSITION_SIZING_RULES.minPositionSize) {
    console.warn(`Position size $${positionValue} below minimum $${POSITION_SIZING_RULES.minPositionSize}`);
    return false;
  }
  
  return true;
}
```

### 2. Range Selection

```typescript
function selectOptimalRange(
  currentPrice: number,
  volatility: number,      // Historical volatility (daily %)
  liquidityDepth: number,  // Pool liquidity depth
  tradingVolume: number,   // Recent trading volume
  riskTolerance: 'low' | 'medium' | 'high'
): { lower: number; upper: number } {
  
  let baseRangePercent: number;
  
  // Base range based on risk tolerance
  switch (riskTolerance) {
    case 'low':
      baseRangePercent = Math.max(15, volatility * 200); // Wider ranges for safety
      break;
    case 'high':
      baseRangePercent = Math.max(2, volatility * 50);   // Tighter ranges for efficiency
      break;
    case 'medium':
    default:
      baseRangePercent = Math.max(5, volatility * 100);  // Balanced approach
  }
  
  // Adjust for market conditions
  if (liquidityDepth < 100000) baseRangePercent += 5; // Wider range for thin markets
  if (tradingVolume > 1000000) baseRangePercent -= 2; // Tighter range for active markets
  
  return {
    lower: currentPrice * (1 - baseRangePercent / 100),
    upper: currentPrice * (1 + baseRangePercent / 100)
  };
}
```

## Integration Testing

### Test Concentrated Positions

```typescript
// test/concentrated-liquidity.test.ts
import { describe, test, expect, beforeAll } from '@jest/globals';

describe('Concentrated Liquidity', () => {
  let pool: DLMMPool;
  let testWallet: Keypair;

  beforeAll(async () => {
    // Setup test environment
    const testEnv = await setupTestEnvironment();
    pool = testEnv.pool;
    testWallet = testEnv.wallet;
  });

  test('should create concentrated position', async () => {
    const currentPrice = pool.getCurrentPrice();
    
    const position = await createConcentratedPosition(
      pool,
      currentPrice * 0.95, // -5%
      currentPrice * 1.05, // +5%
      1.0,  // 1 token X
      100,  // 100 token Y  
      testWallet.publicKey.toString()
    );

    expect(position).toBeDefined();
    expect(position.positionId).toBeDefined();
  });

  test('should calculate position value correctly', async () => {
    // Test position valuation logic
    const position = await createTestPosition();
    const value = position.getTotalValue();
    
    expect(typeof value).toBe('number');
    expect(value).toBeGreaterThan(0);
  });

  test('should handle out-of-range positions', async () => {
    // Test behavior when price moves outside position range
    const farOutPosition = await createConcentratedPosition(
      pool,
      pool.getCurrentPrice() * 2,   // Way above current
      pool.getCurrentPrice() * 2.1, // Even higher
      1.0,
      0, // Single-sided position
      testWallet.publicKey.toString()
    );

    // Position should be created but not earning fees initially
    expect(farOutPosition.isActive()).toBe(false);
  });
});
```

## Next Steps

✅ DLMM SDK installed and configured  
✅ Concentrated liquidity concepts understood  
➡️ **Next**: [Position Management](position-management)

Or dive into practical applications:
- [DLMM Position Manager Tutorial](../examples/dlmm-position-creator)
- [Market Making Examples](../examples/arbitrage-bot)
- [API Reference](api-reference)