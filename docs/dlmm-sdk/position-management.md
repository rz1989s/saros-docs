# Position Management

Master the art of managing DLMM liquidity positions. Learn how to create, modify, monitor, and optimize concentrated liquidity positions for maximum efficiency.

## Position Lifecycle

### 1. Position Creation

```typescript
import { 
  createPosition,
  LiquidityPosition,
  PositionParameters
} from '@saros-finance/dlmm-sdk';

async function createOptimizedPosition(
  pool: DLMMPool,
  strategy: PositionStrategy,
  capitalAmount: number,
  walletAddress: string
): Promise<LiquidityPosition> {
  
  const currentPrice = pool.getCurrentPrice();
  
  // Calculate optimal range based on strategy
  const range = calculateOptimalRange(currentPrice, strategy);
  
  // Determine token amounts
  const tokenAmounts = calculateTokenAmounts(
    capitalAmount, 
    range, 
    currentPrice,
    strategy.tokenRatio
  );

  const positionParams: PositionParameters = {
    pool: pool,
    lowerBinId: pool.getBinIdFromPrice(range.lower),
    upperBinId: pool.getBinIdFromPrice(range.upper),
    tokenXAmount: tokenAmounts.tokenX,
    tokenYAmount: tokenAmounts.tokenY,
    wallet: new PublicKey(walletAddress),
    slippageTolerance: strategy.slippage || 0.01
  };

  const position = await createPosition(positionParams);

  console.log('🎯 Position created:');
  console.log(`  Range: ${range.lower.toFixed(4)} - ${range.upper.toFixed(4)}`);
  console.log(`  Token X: ${tokenAmounts.tokenX}`);
  console.log(`  Token Y: ${tokenAmounts.tokenY}`);
  console.log(`  Position ID: ${position.positionId}`);

  return position;
}

interface PositionStrategy {
  type: 'market_making' | 'range_order' | 'passive_lp';
  rangePercent: number;    // ±% around current price
  tokenRatio: number;      // 0 = all Y, 0.5 = balanced, 1 = all X  
  slippage: number;        // Position creation slippage
  autoCompound: boolean;   // Whether to auto-compound fees
}
```

### 2. Position Monitoring

```typescript
class PositionMonitor {
  private position: LiquidityPosition;
  private metrics: PositionMetrics;

  constructor(position: LiquidityPosition) {
    this.position = position;
    this.metrics = new PositionMetrics();
  }

  async updateMetrics(): Promise<PositionStatus> {
    await this.position.refresh(); // Update position state from blockchain
    
    const currentPrice = this.position.pool.getCurrentPrice();
    const range = this.position.getPriceRange();
    
    return {
      isActive: this.isPositionActive(currentPrice, range),
      utilization: this.calculateUtilization(),
      feesEarned: this.position.getAccumulatedFees(),
      impermanentLoss: await this.calculateCurrentIL(),
      timeInRange: this.metrics.getTimeInRange(),
      predictedReturn: this.predictReturn(),
      recommendations: this.getRecommendations()
    };
  }

  private isPositionActive(
    currentPrice: number, 
    range: { lower: number; upper: number }
  ): boolean {
    return currentPrice >= range.lower && currentPrice <= range.upper;
  }

  private calculateUtilization(): number {
    // Calculate what percentage of your liquidity is earning fees
    const range = this.position.getPriceRange();
    const currentPrice = this.position.pool.getCurrentPrice();
    
    if (!this.isPositionActive(currentPrice, range)) {
      return 0; // No utilization if out of range
    }
    
    // For positions in range, calculate active liquidity percentage
    return this.position.getActiveLiquidityPercent();
  }

  private async calculateCurrentIL(): Promise<number> {
    const initialPrice = this.position.getCreationPrice();
    const currentPrice = this.position.pool.getCurrentPrice();
    const initialAmounts = this.position.getInitialAmounts();
    const currentAmounts = this.position.getCurrentAmounts();

    return calculateImpermanentLoss(
      initialPrice,
      currentPrice, 
      initialAmounts.tokenX,
      initialAmounts.tokenY,
      currentAmounts.tokenX,
      currentAmounts.tokenY
    );
  }

  private getRecommendations(): string[] {
    const recommendations = [];
    const status = this.getCurrentStatus();
    
    if (!status.isActive) {
      recommendations.push('Position is out of range - consider rebalancing');
    }
    
    if (status.feesEarned.total > 10) { // $10 threshold
      recommendations.push('Consider collecting fees to compound or realize profits');
    }
    
    if (status.utilization < 0.5) {
      recommendations.push('Low capital utilization - consider narrowing range');
    }
    
    if (status.impermanentLoss < -5) {
      recommendations.push('High impermanent loss - monitor closely');
    }
    
    return recommendations;
  }
}

interface PositionStatus {
  isActive: boolean;
  utilization: number;
  feesEarned: { tokenX: number; tokenY: number; total: number };
  impermanentLoss: number;
  timeInRange: number;
  predictedReturn: number;
  recommendations: string[];
}
```

### 3. Position Modification

```typescript
class PositionManager {
  async adjustPositionRange(
    position: LiquidityPosition,
    newLowerPrice: number,
    newUpperPrice: number,
    maintainValue: boolean = true
  ): Promise<LiquidityPosition> {
    
    try {
      // 1. Collect any pending fees first
      const feeResult = await position.collectFees();
      console.log(`Collected fees: ${feeResult.tokenX} X, ${feeResult.tokenY} Y`);

      // 2. Remove liquidity from current position
      const removedLiquidity = await position.removeLiquidity(1.0); // Remove 100%
      
      console.log('🔄 Position liquidity removed, creating new range...');

      // 3. Calculate token amounts for new position
      let tokenXAmount = removedLiquidity.tokenX + feeResult.tokenX;
      let tokenYAmount = removedLiquidity.tokenY + feeResult.tokenY;

      if (maintainValue) {
        // Rebalance token ratio for new range
        const optimalAmounts = calculateOptimalTokenAmounts(
          tokenXAmount,
          tokenYAmount,
          newLowerPrice,
          newUpperPrice,
          position.pool.getCurrentPrice()
        );
        
        tokenXAmount = optimalAmounts.tokenX;
        tokenYAmount = optimalAmounts.tokenY;
      }

      // 4. Create new position with adjusted range
      const newPosition = await createConcentratedPosition(
        position.pool,
        newLowerPrice,
        newUpperPrice,
        tokenXAmount,
        tokenYAmount,
        position.walletAddress
      );

      console.log('✅ Position range adjusted successfully!');
      return newPosition;

    } catch (error) {
      console.error('❌ Failed to adjust position range:', error);
      throw error;
    }
  }

  async increasePosition(
    position: LiquidityPosition,
    additionalTokenX: number,
    additionalTokenY: number
  ): Promise<void> {
    try {
      // Add more liquidity to existing position
      await position.addLiquidity({
        tokenXAmount: additionalTokenX,
        tokenYAmount: additionalTokenY,
        slippageTolerance: 0.01
      });

      console.log('✅ Position size increased!');
      console.log(`Added: ${additionalTokenX} X, ${additionalTokenY} Y`);

    } catch (error) {
      console.error('❌ Failed to increase position:', error);
      throw error;
    }
  }

  async decreasePosition(
    position: LiquidityPosition,
    percentageToRemove: number // 0.0 to 1.0
  ): Promise<{ tokenX: number; tokenY: number }> {
    try {
      if (percentageToRemove <= 0 || percentageToRemove > 1) {
        throw new Error('Invalid percentage: must be between 0 and 1');
      }

      const removedLiquidity = await position.removeLiquidity(percentageToRemove);

      console.log('✅ Position size decreased!');
      console.log(`Removed: ${removedLiquidity.tokenX} X, ${removedLiquidity.tokenY} Y`);

      return removedLiquidity;

    } catch (error) {
      console.error('❌ Failed to decrease position:', error);
      throw error;
    }
  }
}

function calculateOptimalTokenAmounts(
  availableTokenX: number,
  availableTokenY: number,
  lowerPrice: number,
  upperPrice: number,
  currentPrice: number
): { tokenX: number; tokenY: number } {
  
  // For concentrated liquidity, optimal ratio depends on:
  // 1. Where current price sits in the range
  // 2. Expected price movement direction
  // 3. Available token balances

  if (currentPrice <= lowerPrice) {
    // Price below range - use all token Y
    return { tokenX: 0, tokenY: availableTokenY };
  }
  
  if (currentPrice >= upperPrice) {
    // Price above range - use all token X
    return { tokenX: availableTokenX, tokenY: 0 };
  }
  
  // Price in range - calculate optimal ratio
  const rangeProportion = (currentPrice - lowerPrice) / (upperPrice - lowerPrice);
  
  // More token X needed as price approaches upper bound
  const optimalTokenXRatio = 1 - rangeProportion;
  const optimalTokenYRatio = rangeProportion;
  
  // Calculate amounts based on limiting factor
  const tokenXNeeded = availableTokenY * optimalTokenXRatio / optimalTokenYRatio;
  const tokenYNeeded = availableTokenX * optimalTokenYRatio / optimalTokenXRatio;
  
  if (tokenXNeeded <= availableTokenX) {
    // Token Y is limiting factor
    return { tokenX: tokenXNeeded, tokenY: availableTokenY };
  } else {
    // Token X is limiting factor  
    return { tokenX: availableTokenX, tokenY: tokenYNeeded };
  }
}
```

## Advanced Position Strategies

### Dynamic Range Adjustment

```typescript
class DynamicRangeManager {
  private position: LiquidityPosition;
  private config: RangeConfig;

  interface RangeConfig {
    targetUtilization: number;    // Target % of time in range
    rebalanceThreshold: number;   // Price change % to trigger rebalance
    maxRebalanceFrequency: number; // Max rebalances per day
    gasCostLimit: number;         // Max gas cost for rebalance
  }

  async autoAdjustRange(): Promise<boolean> {
    const currentPrice = this.position.pool.getCurrentPrice();
    const range = this.position.getPriceRange();
    const utilization = this.calculateRecentUtilization();
    
    // Check if adjustment is needed
    if (utilization < this.config.targetUtilization) {
      const newRange = this.calculateOptimalRange(currentPrice, utilization);
      
      // Check if adjustment is profitable
      const rebalanceCost = await this.estimateRebalanceCost();
      const expectedBenefit = await this.estimateRangeBenefit(newRange);
      
      if (expectedBenefit > rebalanceCost && this.canRebalance()) {
        await this.adjustRange(newRange);
        return true;
      }
    }
    
    return false;
  }

  private calculateOptimalRange(
    currentPrice: number, 
    currentUtilization: number
  ): { lower: number; upper: number } {
    // If utilization is low, widen the range
    // If utilization is high, consider tightening
    
    let rangePercent = this.position.getCurrentRangePercent();
    
    if (currentUtilization < this.config.targetUtilization) {
      // Widen range to increase time in range
      rangePercent *= 1.5;
    } else if (currentUtilization > 0.9) {
      // Tighten range to increase capital efficiency
      rangePercent *= 0.8;
    }
    
    return {
      lower: currentPrice * (1 - rangePercent / 100),
      upper: currentPrice * (1 + rangePercent / 100)
    };
  }

  private async estimateRebalanceCost(): Promise<number> {
    // Estimate total cost of:
    // 1. Collecting fees
    // 2. Removing liquidity
    // 3. Creating new position
    
    const gasPrice = await this.position.pool.connection.getRecentBlockhash();
    const estimatedGas = 300000; // Estimate based on typical operations
    
    return estimatedGas * 0.000005; // Convert to SOL
  }

  private async estimateRangeBenefit(newRange: { lower: number; upper: number }): Promise<number> {
    // Estimate additional fees from better positioned liquidity
    // Based on historical trading data and range efficiency
    
    const currentRange = this.position.getPriceRange();
    const currentRangeWidth = currentRange.upper - currentRange.lower;
    const newRangeWidth = newRange.upper - newRange.lower;
    
    // Narrower range = higher capital efficiency = more fees per dollar
    const efficiencyGain = currentRangeWidth / newRangeWidth;
    const currentDailyFees = this.position.getDailyFeeRate();
    
    return currentDailyFees * (efficiencyGain - 1) * 30; // 30 days projected benefit
  }
}
```

### Multi-Position Portfolio

```typescript
class DLMMPortfolio {
  private positions: Map<string, LiquidityPosition> = new Map();
  private walletAddress: string;

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  async createLayeredPositions(
    pool: DLMMPool,
    totalCapital: number,
    layers: number = 3
  ): Promise<LiquidityPosition[]> {
    
    const currentPrice = pool.getCurrentPrice();
    const positions: LiquidityPosition[] = [];
    const capitalPerLayer = totalCapital / layers;

    for (let i = 0; i < layers; i++) {
      // Create positions with progressively wider ranges
      const rangeMultiplier = Math.pow(2, i); // 1x, 2x, 4x range
      const baseRange = 0.05; // 5% base range
      const layerRange = baseRange * rangeMultiplier;

      const position = await createConcentratedPosition(
        pool,
        currentPrice * (1 - layerRange),
        currentPrice * (1 + layerRange),
        (capitalPerLayer * 0.5) / currentPrice, // Token X amount
        capitalPerLayer * 0.5,                  // Token Y amount
        this.walletAddress
      );

      positions.push(position);
      this.positions.set(position.positionId, position);
      
      console.log(`Layer ${i + 1} created: ±${(layerRange * 100).toFixed(1)}% range`);
    }

    return positions;
  }

  async rebalancePortfolio(): Promise<RebalanceResult> {
    const rebalanceResults: PositionRebalanceResult[] = [];
    
    for (const [positionId, position] of this.positions.entries()) {
      try {
        const shouldRebalance = await this.evaluatePositionForRebalance(position);
        
        if (shouldRebalance.recommended) {
          const result = await this.rebalancePosition(position, shouldRebalance.strategy);
          rebalanceResults.push({
            positionId,
            action: 'rebalanced',
            result
          });
        } else {
          rebalanceResults.push({
            positionId,
            action: 'maintained',
            reason: shouldRebalance.reason
          });
        }
        
      } catch (error) {
        rebalanceResults.push({
          positionId,
          action: 'error',
          error: error.message
        });
      }
    }

    return {
      totalPositions: this.positions.size,
      rebalanced: rebalanceResults.filter(r => r.action === 'rebalanced').length,
      maintained: rebalanceResults.filter(r => r.action === 'maintained').length,
      errors: rebalanceResults.filter(r => r.action === 'error').length,
      details: rebalanceResults
    };
  }

  async harvestAllFees(): Promise<FeeHarvestResult> {
    const harvestResults = [];
    let totalFeesX = 0;
    let totalFeesY = 0;

    for (const [positionId, position] of this.positions.entries()) {
      try {
        const fees = await position.collectFees();
        
        totalFeesX += fees.tokenX;
        totalFeesY += fees.tokenY;
        
        harvestResults.push({
          positionId,
          success: true,
          feesCollected: fees
        });
        
      } catch (error) {
        harvestResults.push({
          positionId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      totalFeesX,
      totalFeesY,
      positionResults: harvestResults
    };
  }

  getPortfolioSummary(): PortfolioSummary {
    let totalValue = 0;
    let totalFeesEarned = 0;
    let averageUtilization = 0;
    let activePositions = 0;

    for (const position of this.positions.values()) {
      const positionValue = position.getTotalValue();
      const fees = position.getAccumulatedFees();
      const utilization = position.getCurrentUtilization();
      
      totalValue += positionValue;
      totalFeesEarned += fees.total;
      averageUtilization += utilization;
      
      if (position.isActive()) {
        activePositions++;
      }
    }

    return {
      totalPositions: this.positions.size,
      activePositions,
      totalValueUSD: totalValue,
      totalFeesEarned,
      averageUtilization: averageUtilization / this.positions.size,
      estimatedAPR: this.calculatePortfolioAPR()
    };
  }

  private async evaluatePositionForRebalance(
    position: LiquidityPosition
  ): Promise<RebalanceEvaluation> {
    const currentPrice = position.pool.getCurrentPrice();
    const range = position.getPriceRange();
    const utilization = position.getCurrentUtilization();
    
    // Check if out of range
    if (currentPrice < range.lower || currentPrice > range.upper) {
      return {
        recommended: true,
        strategy: 'recenter',
        reason: 'Position is out of range'
      };
    }
    
    // Check if poor utilization
    if (utilization < 0.3) { // Less than 30% utilization
      return {
        recommended: true,
        strategy: 'narrow_range',
        reason: 'Low capital utilization'
      };
    }
    
    // Check if range is too narrow (frequent rebalancing)
    const rebalanceFrequency = await position.getRebalanceFrequency();
    if (rebalanceFrequency > 3) { // More than 3 rebalances per week
      return {
        recommended: true,
        strategy: 'widen_range',
        reason: 'Too frequent rebalancing'
      };
    }
    
    return {
      recommended: false,
      reason: 'Position is performing well'
    };
  }
}

interface RebalanceEvaluation {
  recommended: boolean;
  strategy?: 'recenter' | 'narrow_range' | 'widen_range';
  reason: string;
}

interface PortfolioSummary {
  totalPositions: number;
  activePositions: number;
  totalValueUSD: number;
  totalFeesEarned: number;
  averageUtilization: number;
  estimatedAPR: number;
}
```

## Fee Collection and Compounding

### Automated Fee Collection

```typescript
class AutoFeeCollector {
  private positions: LiquidityPosition[];
  private config: FeeCollectionConfig;

  interface FeeCollectionConfig {
    minFeeThreshold: number;     // Minimum fee amount to collect ($)
    maxGasCostRatio: number;     // Max gas cost as % of fees
    compoundStrategy: 'reinvest' | 'withdraw' | 'mixed';
    checkInterval: number;       // Minutes between checks
  }

  async startAutoCollection() {
    console.log('🔄 Starting automated fee collection...');
    
    const collectionLoop = async () => {
      try {
        await this.collectFeesIfProfitable();
      } catch (error) {
        console.error('Fee collection error:', error);
      }
      
      // Schedule next check
      setTimeout(collectionLoop, this.config.checkInterval * 60 * 1000);
    };

    collectionLoop();
  }

  private async collectFeesIfProfitable(): Promise<void> {
    for (const position of this.positions) {
      const fees = position.getPendingFees();
      const feeValueUSD = fees.tokenX * await getTokenPrice(position.pool.tokenX.mintAddress) +
                         fees.tokenY * await getTokenPrice(position.pool.tokenY.mintAddress);

      if (feeValueUSD >= this.config.minFeeThreshold) {
        const gasCost = await this.estimateCollectionGasCost();
        const gasCostUSD = gasCost * await getTokenPrice('SOL');
        
        // Only collect if gas cost is reasonable
        if (gasCostUSD <= feeValueUSD * this.config.maxGasCostRatio) {
          await this.collectAndProcessFees(position);
        } else {
          console.log(`Skipping fee collection - gas cost too high: $${gasCostUSD} vs fees $${feeValueUSD}`);
        }
      }
    }
  }

  private async collectAndProcessFees(position: LiquidityPosition): Promise<void> {
    const fees = await position.collectFees();
    
    console.log(`💰 Collected fees: ${fees.tokenX} X, ${fees.tokenY} Y`);

    switch (this.config.compoundStrategy) {
      case 'reinvest':
        await this.reinvestFees(position, fees);
        break;
      case 'withdraw':
        // Fees are already in wallet, no action needed
        console.log('Fees withdrawn to wallet');
        break;
      case 'mixed':
        await this.mixedFeeStrategy(position, fees);
        break;
    }
  }

  private async reinvestFees(
    position: LiquidityPosition,
    fees: { tokenX: number; tokenY: number }
  ): Promise<void> {
    // Add collected fees back to the position
    await position.addLiquidity({
      tokenXAmount: fees.tokenX,
      tokenYAmount: fees.tokenY,
      slippageTolerance: 0.02
    });

    console.log('🔄 Fees reinvested into position');
  }

  private async mixedFeeStrategy(
    position: LiquidityPosition,
    fees: { tokenX: number; tokenY: number }
  ): Promise<void> {
    // Reinvest 70%, withdraw 30%
    const reinvestPercent = 0.7;
    
    await position.addLiquidity({
      tokenXAmount: fees.tokenX * reinvestPercent,
      tokenYAmount: fees.tokenY * reinvestPercent,
      slippageTolerance: 0.02
    });

    // Remaining 30% stays in wallet
    console.log('🔄 70% fees reinvested, 30% withdrawn');
  }
}
```

### Position Performance Analytics

```typescript
class PositionAnalytics {
  async generatePerformanceReport(
    position: LiquidityPosition,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<PerformanceReport> {
    
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const initialValue = position.getInitialValue();
    const currentValue = position.getTotalValue();
    const feesEarned = position.getAccumulatedFees();

    // Calculate performance metrics
    const totalReturn = ((currentValue - initialValue) / initialValue) * 100;
    const feeAPR = (feesEarned.total / initialValue) * (365 / duration) * 100;
    const impermanentLoss = await this.calculateImpermanentLoss(position);
    const utilization = await this.calculateAverageUtilization(position, duration);

    // Benchmark against alternatives
    const hodlReturn = this.calculateHodlReturn(position, startDate, endDate);
    const traditionalAMMReturn = await this.estimateTraditionalAMMReturn(position, duration);

    return {
      position: {
        id: position.positionId,
        range: position.getPriceRange(),
        duration: duration,
        initialValue: initialValue,
        currentValue: currentValue
      },
      performance: {
        totalReturnPercent: totalReturn,
        feeAPR: feeAPR,
        impermanentLoss: impermanentLoss,
        netReturnPercent: totalReturn - Math.abs(impermanentLoss),
        utilization: utilization
      },
      benchmarks: {
        hodlReturn: hodlReturn,
        traditionalAMM: traditionalAMMReturn,
        bestStrategy: this.identifyBestStrategy(totalReturn, hodlReturn, traditionalAMMReturn)
      },
      recommendations: this.generateRecommendations(position, {
        totalReturn,
        feeAPR,
        impermanentLoss,
        utilization
      })
    };
  }

  private generateRecommendations(
    position: LiquidityPosition,
    metrics: any
  ): string[] {
    const recommendations = [];
    
    if (metrics.utilization < 0.5) {
      recommendations.push('Consider narrowing position range for better capital efficiency');
    }
    
    if (metrics.impermanentLoss < -10) {
      recommendations.push('High impermanent loss detected - consider rebalancing or hedging');
    }
    
    if (metrics.feeAPR > 50) {
      recommendations.push('Excellent fee generation - consider increasing position size');
    }
    
    if (metrics.feeAPR < 5) {
      recommendations.push('Low fee generation - consider moving to more active price range');
    }
    
    const currentPrice = position.pool.getCurrentPrice();
    const range = position.getPriceRange();
    
    if (currentPrice < range.lower * 1.1) {
      recommendations.push('Price approaching lower bound - consider rebalancing up');
    }
    
    if (currentPrice > range.upper * 0.9) {
      recommendations.push('Price approaching upper bound - consider rebalancing down');
    }
    
    return recommendations;
  }
}

interface PerformanceReport {
  position: {
    id: string;
    range: { lower: number; upper: number };
    duration: number;
    initialValue: number;
    currentValue: number;
  };
  performance: {
    totalReturnPercent: number;
    feeAPR: number;
    impermanentLoss: number;
    netReturnPercent: number;
    utilization: number;
  };
  benchmarks: {
    hodlReturn: number;
    traditionalAMM: number;
    bestStrategy: string;
  };
  recommendations: string[];
}
```

## Risk Management

### Position Risk Assessment

```typescript
interface RiskProfile {
  volatilityRisk: number;      // Risk from price volatility
  liquidityRisk: number;       // Risk from low trading volume
  concentrationRisk: number;   // Risk from narrow ranges
  impermanentLossRisk: number; // Potential IL exposure
  overallRiskScore: number;    // Combined risk (1-10 scale)
}

async function assessPositionRisk(
  position: LiquidityPosition,
  marketData: MarketData
): Promise<RiskProfile> {
  
  const range = position.getPriceRange();
  const currentPrice = position.pool.getCurrentPrice();
  
  // 1. Volatility Risk
  const rangeWidth = ((range.upper - range.lower) / currentPrice) * 100;
  const historicalVolatility = marketData.dailyVolatility * 100;
  const volatilityRisk = Math.min(10, Math.max(1, 10 - (rangeWidth / historicalVolatility)));

  // 2. Liquidity Risk  
  const poolLiquidity = await position.pool.getTotalLiquidity();
  const liquidityRisk = poolLiquidity < 100000 ? 8 : 
                       poolLiquidity < 500000 ? 5 : 
                       poolLiquidity < 1000000 ? 3 : 1;

  // 3. Concentration Risk
  const concentrationRisk = rangeWidth < 5 ? 8 :    // Very narrow = high risk
                           rangeWidth < 15 ? 5 :    // Moderate = medium risk
                           rangeWidth < 30 ? 2 : 1; // Wide = low risk

  // 4. Impermanent Loss Risk
  const maxPriceMove = Math.max(
    Math.abs((range.upper - currentPrice) / currentPrice),
    Math.abs((currentPrice - range.lower) / currentPrice)
  ) * 100;
  const ilRisk = maxPriceMove > 50 ? 9 :
                maxPriceMove > 20 ? 6 :
                maxPriceMove > 10 ? 3 : 1;

  // 5. Overall Risk Score (weighted average)
  const overallRisk = (
    volatilityRisk * 0.3 +
    liquidityRisk * 0.2 + 
    concentrationRisk * 0.3 +
    ilRisk * 0.2
  );

  return {
    volatilityRisk,
    liquidityRisk,
    concentrationRisk,
    impermanentLossRisk: ilRisk,
    overallRiskScore: Math.round(overallRisk)
  };
}
```

### Emergency Position Management

```typescript
class EmergencyManager {
  async emergencyExit(
    position: LiquidityPosition,
    reason: 'high_volatility' | 'smart_contract_risk' | 'market_crash'
  ): Promise<EmergencyExitResult> {
    
    console.log(`🚨 Emergency exit triggered: ${reason}`);
    
    try {
      // 1. Collect any pending fees first
      const fees = await position.collectFees();
      console.log(`Collected emergency fees: ${fees.tokenX + fees.tokenY}`);

      // 2. Remove all liquidity immediately  
      const removedLiquidity = await position.removeLiquidity(1.0);
      console.log(`Emergency liquidity removed: ${removedLiquidity.tokenX} X, ${removedLiquidity.tokenY} Y`);

      // 3. Optional: Convert to stablecoin if market crash
      if (reason === 'market_crash') {
        const conversionResult = await this.convertToStablecoin(removedLiquidity, fees);
        return {
          success: true,
          exitReason: reason,
          liquidityRecovered: removedLiquidity,
          feesCollected: fees,
          stablecoinConverted: conversionResult.totalUSDC
        };
      }

      return {
        success: true,
        exitReason: reason,
        liquidityRecovered: removedLiquidity,
        feesCollected: fees
      };

    } catch (error) {
      console.error('❌ Emergency exit failed:', error);
      
      return {
        success: false,
        exitReason: reason,
        error: error.message
      };
    }
  }

  private async convertToStablecoin(
    liquidity: { tokenX: number; tokenY: number },
    fees: { tokenX: number; tokenY: number }
  ): Promise<{ totalUSDC: number }> {
    // Implementation would swap both tokens to USDC
    // Using the main Saros AMM SDK for swaps
    
    const totalTokenX = liquidity.tokenX + fees.tokenX;
    const totalTokenY = liquidity.tokenY + fees.tokenY;
    
    // Swap logic here using main SDK
    console.log(`Converting ${totalTokenX} X and ${totalTokenY} Y to USDC`);
    
    return { totalUSDC: 0 }; // Placeholder
  }
}

interface EmergencyExitResult {
  success: boolean;
  exitReason: string;
  liquidityRecovered?: { tokenX: number; tokenY: number };
  feesCollected?: { tokenX: number; tokenY: number };
  stablecoinConverted?: number;
  error?: string;
}
```

## Testing Position Management

### Position Simulation

```typescript
// Simulate position performance under different market scenarios
async function simulatePositionPerformance(
  pool: DLMMPool,
  positionConfig: PositionConfig,
  priceScenarios: PriceScenario[]
): Promise<SimulationResult[]> {
  
  const results: SimulationResult[] = [];
  
  for (const scenario of priceScenarios) {
    const simulation = new PositionSimulator(pool, positionConfig);
    const result = await simulation.runScenario(scenario);
    results.push(result);
  }
  
  return results;
}

interface PriceScenario {
  name: string;
  pricePoints: Array<{ price: number; time: number }>; // Price over time
  volume: number; // Trading volume multiplier
}

class PositionSimulator {
  private pool: DLMMPool;
  private config: PositionConfig;

  constructor(pool: DLMMPool, config: PositionConfig) {
    this.pool = pool;
    this.config = config;
  }

  async runScenario(scenario: PriceScenario): Promise<SimulationResult> {
    let totalFees = 0;
    let timeInRange = 0;
    let maxDrawdown = 0;
    
    const range = {
      lower: this.config.lowerPrice,
      upper: this.config.upperPrice
    };

    for (let i = 0; i < scenario.pricePoints.length; i++) {
      const { price, time } = scenario.pricePoints[i];
      
      // Check if position is active at this price
      if (price >= range.lower && price <= range.upper) {
        timeInRange += time;
        
        // Calculate fees earned during this period
        const volumeInRange = scenario.volume * time * this.getVolumeMultiplier(price, range);
        const feesEarned = volumeInRange * (this.pool.feeTier / 10000);
        totalFees += feesEarned;
      }
      
      // Track maximum impermanent loss
      const currentIL = this.calculateILForPrice(price);
      maxDrawdown = Math.min(maxDrawdown, currentIL);
    }

    const totalTime = scenario.pricePoints.reduce((sum, point) => sum + point.time, 0);
    const utilization = timeInRange / totalTime;
    
    return {
      scenarioName: scenario.name,
      totalFeesEarned: totalFees,
      timeInRangePercent: utilization * 100,
      maxDrawdown: maxDrawdown,
      netReturn: totalFees + maxDrawdown, // Fees minus worst IL
      utilization: utilization
    };
  }

  private getVolumeMultiplier(price: number, range: { lower: number; upper: number }): number {
    // Volume tends to be higher near range boundaries
    const rangeMidpoint = (range.lower + range.upper) / 2;
    const distanceFromMid = Math.abs(price - rangeMidpoint) / (rangeMidpoint - range.lower);
    
    // Higher multiplier near edges where more trading occurs
    return 1 + distanceFromMid * 0.5;
  }

  private calculateILForPrice(price: number): number {
    // Calculate IL for this specific price vs initial price
    const initialPrice = (this.config.lowerPrice + this.config.upperPrice) / 2;
    const priceRatio = price / initialPrice;
    
    // Simplified IL calculation for concentrated positions
    return -Math.abs((Math.sqrt(priceRatio) - 1) * 100);
  }
}

interface SimulationResult {
  scenarioName: string;
  totalFeesEarned: number;
  timeInRangePercent: number;
  maxDrawdown: number;
  netReturn: number;
  utilization: number;
}
```

## Next Steps

✅ Position management mastered  
➡️ **Next**: [DLMM API Reference](/docs/dlmm-sdk/api-reference)

Or explore practical applications:
- [DLMM Position Manager Tutorial](/docs/examples/dlmm-position-creator)
- [Advanced Range Strategies](/docs/examples/arbitrage-bot)
- [Rust DLMM SDK](/docs/rust-sdk/getting-started) for high-performance trading