# Portfolio Analytics Dashboard

This example demonstrates how to build a comprehensive portfolio analytics dashboard that tracks all your Saros DeFi positions, calculates performance metrics, generates reports, and provides advanced analytics for portfolio optimization.

## Overview

The Portfolio Analytics Dashboard provides:
- **Real-Time Position Tracking**: Monitor all LP, staking, and farming positions
- **Performance Analytics**: P&L tracking, APY calculations, risk metrics
- **Historical Analysis**: Track portfolio performance over time
- **Risk Assessment**: Portfolio diversification and risk exposure analysis
- **Automated Reporting**: Generate detailed performance reports
- **Rebalancing Suggestions**: AI-driven portfolio optimization recommendations

## Implementation

### Core Analytics Engine

```typescript
import {
  Connection,
  PublicKey,
  Keypair
} from '@solana/web3.js';
import { SarosSDK, LPPosition, StakePosition, FarmPosition } from '@saros-finance/sdk';
import { DLMMSDKv2 } from '@saros-finance/dlmm-sdk';

export interface PortfolioPosition {
  id: string;
  type: 'LP' | 'STAKE' | 'FARM';
  pool: string;
  tokenA: string;
  tokenB: string;
  liquidity: number;
  value: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  apy: number;
  fees: number;
  impermanentLoss: number;
  createdAt: Date;
  lastUpdated: Date;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalPnL: number;
  totalFees: number;
  averageAPY: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  diversificationScore: number;
  riskScore: number;
  activePositions: number;
}

export interface HistoricalData {
  timestamp: Date;
  totalValue: number;
  pnl: number;
  fees: number;
  apy: number;
}

export interface RiskMetrics {
  concentrationRisk: number; // 0-1 scale
  impermanentLossRisk: number;
  liquidityRisk: number;
  correlationRisk: number;
  overallRiskScore: number;
}

export class PortfolioAnalytics {
  private connection: Connection;
  private sdk: SarosSDK;
  private dlmmSDK: DLMMSDKv2;
  private wallet: PublicKey;
  private positions: Map<string, PortfolioPosition> = new Map();
  private historicalData: HistoricalData[] = [];
  private priceCache: Map<string, number> = new Map();

  constructor(connection: Connection, walletAddress: PublicKey) {
    this.connection = connection;
    this.wallet = walletAddress;
    this.sdk = new SarosSDK(connection);
    this.dlmmSDK = new DLMMSDKv2(connection);
  }

  /**
   * Initialize portfolio tracking and load all positions
   */
  async initialize(): Promise<void> {
    console.log('Initializing portfolio analytics...');

    try {
      // Load all position types
      await Promise.all([
        this.loadLPPositions(),
        this.loadStakePositions(),
        this.loadFarmPositions()
      ]);

      // Update current prices for all tokens
      await this.updateTokenPrices();

      // Calculate initial metrics
      await this.updatePositionMetrics();

      console.log(`Loaded ${this.positions.size} positions across all pools`);
    } catch (error) {
      console.error('Failed to initialize portfolio analytics:', error);
      throw error;
    }
  }

  /**
   * Load all liquidity provider positions
   */
  private async loadLPPositions(): Promise<void> {
    try {
      const lpPositions = await this.sdk.getUserLPPositions(this.wallet);
      
      for (const position of lpPositions) {
        const poolInfo = await this.sdk.getPoolInfo(position.poolId);
        
        this.positions.set(position.id.toString(), {
          id: position.id.toString(),
          type: 'LP',
          pool: position.poolId.toString(),
          tokenA: poolInfo.tokenA.symbol,
          tokenB: poolInfo.tokenB.symbol,
          liquidity: position.liquidity,
          value: await this.calculatePositionValue(position),
          entryPrice: position.entryPrice || 0,
          currentPrice: await this.getCurrentPoolPrice(position.poolId),
          pnl: 0, // Will be calculated
          apy: await this.calculatePositionAPY(position),
          fees: position.collectedFees || 0,
          impermanentLoss: await this.calculateImpermanentLoss(position),
          createdAt: new Date(position.createdAt * 1000),
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('Error loading LP positions:', error);
    }
  }

  /**
   * Load all staking positions
   */
  private async loadStakePositions(): Promise<void> {
    try {
      const stakePositions = await this.sdk.getUserStakePositions(this.wallet);
      
      for (const position of stakePositions) {
        const pool = await this.sdk.getStakingPool(position.poolId);
        
        this.positions.set(`stake-${position.poolId.toString()}`, {
          id: `stake-${position.poolId.toString()}`,
          type: 'STAKE',
          pool: position.poolId.toString(),
          tokenA: pool.stakeToken.symbol,
          tokenB: pool.rewardToken.symbol,
          liquidity: position.stakedAmount,
          value: position.stakedAmount,
          entryPrice: 1,
          currentPrice: 1,
          pnl: await this.calculateStakeRewards(position),
          apy: await this.calculateStakeAPY(position),
          fees: 0,
          impermanentLoss: 0,
          createdAt: new Date(position.stakedAt * 1000),
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('Error loading stake positions:', error);
    }
  }

  /**
   * Load all farming positions
   */
  private async loadFarmPositions(): Promise<void> {
    try {
      const farmPositions = await this.sdk.getUserFarmPositions(this.wallet);
      
      for (const position of farmPositions) {
        const farm = await this.sdk.getFarm(position.farmId);
        
        this.positions.set(`farm-${position.farmId.toString()}`, {
          id: `farm-${position.farmId.toString()}`,
          type: 'FARM',
          pool: position.farmId.toString(),
          tokenA: farm.lpToken.symbol,
          tokenB: farm.rewardToken.symbol,
          liquidity: position.stakedLiquidity,
          value: await this.calculateFarmValue(position),
          entryPrice: position.entryPrice || 0,
          currentPrice: await this.getCurrentFarmPrice(position.farmId),
          pnl: await this.calculateFarmRewards(position),
          apy: await this.calculateFarmAPY(position),
          fees: 0,
          impermanentLoss: 0,
          createdAt: new Date(position.startTime * 1000),
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('Error loading farm positions:', error);
    }
  }

  /**
   * Update token prices for portfolio calculation
   */
  private async updateTokenPrices(): Promise<void> {
    const uniqueTokens = new Set<string>();
    
    for (const position of this.positions.values()) {
      uniqueTokens.add(position.tokenA);
      uniqueTokens.add(position.tokenB);
    }

    for (const token of uniqueTokens) {
      try {
        const price = await this.sdk.getTokenPrice(token);
        this.priceCache.set(token, price);
      } catch (error) {
        console.warn(`Failed to get price for ${token}:`, error);
        this.priceCache.set(token, 0);
      }
    }
  }

  /**
   * Calculate comprehensive portfolio metrics
   */
  async calculatePortfolioMetrics(): Promise<PortfolioMetrics> {
    await this.updatePositionMetrics();

    const positions = Array.from(this.positions.values());
    
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalFees = positions.reduce((sum, pos) => sum + pos.fees, 0);
    
    // Weighted average APY
    const weightedAPY = positions.reduce((sum, pos) => {
      return sum + (pos.apy * (pos.value / totalValue));
    }, 0);

    // Calculate Sharpe ratio (simplified)
    const returns = this.calculateReturns();
    const sharpeRatio = this.calculateSharpeRatio(returns);

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown();

    // Calculate win rate
    const winningPositions = positions.filter(pos => pos.pnl > 0).length;
    const winRate = positions.length > 0 ? winningPositions / positions.length : 0;

    // Calculate diversification and risk scores
    const diversificationScore = this.calculateDiversificationScore();
    const riskScore = this.calculatePortfolioRisk();

    return {
      totalValue,
      totalPnL,
      totalFees,
      averageAPY: isNaN(weightedAPY) ? 0 : weightedAPY,
      sharpeRatio,
      maxDrawdown,
      winRate,
      diversificationScore,
      riskScore,
      activePositions: positions.length
    };
  }

  /**
   * Calculate risk metrics for portfolio
   */
  async calculateRiskMetrics(): Promise<RiskMetrics> {
    const positions = Array.from(this.positions.values());
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

    // Concentration risk - how concentrated is the portfolio
    const concentrationRisk = this.calculateConcentrationRisk(positions, totalValue);

    // Impermanent loss risk
    const impermanentLossRisk = positions
      .filter(pos => pos.type === 'LP')
      .reduce((sum, pos) => sum + Math.abs(pos.impermanentLoss), 0) / totalValue;

    // Liquidity risk - based on pool sizes and trading volumes
    const liquidityRisk = await this.calculateLiquidityRisk(positions);

    // Token correlation risk
    const correlationRisk = await this.calculateCorrelationRisk(positions);

    const overallRiskScore = (
      concentrationRisk * 0.3 +
      impermanentLossRisk * 0.25 +
      liquidityRisk * 0.25 +
      correlationRisk * 0.2
    );

    return {
      concentrationRisk,
      impermanentLossRisk,
      liquidityRisk,
      correlationRisk,
      overallRiskScore
    };
  }

  /**
   * Generate portfolio optimization suggestions
   */
  async generateOptimizationSuggestions(): Promise<string[]> {
    const metrics = await this.calculatePortfolioMetrics();
    const riskMetrics = await this.calculateRiskMetrics();
    const suggestions: string[] = [];

    // Concentration risk suggestions
    if (riskMetrics.concentrationRisk > 0.6) {
      suggestions.push(
        'Consider diversifying your portfolio - more than 60% is concentrated in few positions'
      );
    }

    // Low APY suggestions
    if (metrics.averageAPY < 10) {
      suggestions.push(
        'Your average APY is below 10%. Consider moving to higher-yield opportunities'
      );
    }

    // High impermanent loss warning
    if (riskMetrics.impermanentLossRisk > 0.1) {
      suggestions.push(
        'High impermanent loss detected. Consider rebalancing to correlated token pairs'
      );
    }

    // Rebalancing suggestions
    const underperformingPositions = Array.from(this.positions.values())
      .filter(pos => pos.apy < metrics.averageAPY * 0.7);
    
    if (underperformingPositions.length > 0) {
      suggestions.push(
        `Consider closing ${underperformingPositions.length} underperforming positions`
      );
    }

    // Compound suggestions
    const compoundablePositions = Array.from(this.positions.values())
      .filter(pos => pos.fees > 10 * 1e6); // $10+ in fees
    
    if (compoundablePositions.length > 0) {
      suggestions.push(
        `${compoundablePositions.length} positions have significant unclaimed fees - consider compounding`
      );
    }

    return suggestions;
  }

  /**
   * Generate detailed performance report
   */
  async generatePerformanceReport(): Promise<{
    summary: PortfolioMetrics;
    positions: PortfolioPosition[];
    riskAnalysis: RiskMetrics;
    historical: HistoricalData[];
    suggestions: string[];
  }> {
    const [summary, riskAnalysis, suggestions] = await Promise.all([
      this.calculatePortfolioMetrics(),
      this.calculateRiskMetrics(),
      this.generateOptimizationSuggestions()
    ]);

    return {
      summary,
      positions: Array.from(this.positions.values()),
      riskAnalysis,
      historical: this.historicalData.slice(-30), // Last 30 data points
      suggestions
    };
  }

  /**
   * Start continuous portfolio monitoring
   */
  async startMonitoring(intervalMinutes: number = 15): Promise<void> {
    console.log('Starting portfolio monitoring...');

    setInterval(async () => {
      try {
        await this.updatePositionMetrics();
        await this.recordHistoricalData();
        
        const metrics = await this.calculatePortfolioMetrics();
        console.log(`Portfolio Value: $${(metrics.totalValue / 1e6).toFixed(2)}, P&L: ${metrics.totalPnL > 0 ? '+' : ''}$${(metrics.totalPnL / 1e6).toFixed(2)}`);
      } catch (error) {
        console.error('Error in monitoring cycle:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Update metrics for all positions
   */
  private async updatePositionMetrics(): Promise<void> {
    await this.updateTokenPrices();

    for (const [id, position] of this.positions) {
      try {
        // Update current values
        position.value = await this.calculateCurrentValue(position);
        position.currentPrice = await this.getCurrentPrice(position);
        position.pnl = position.value - (position.liquidity * position.entryPrice);
        position.apy = await this.calculateCurrentAPY(position);
        position.lastUpdated = new Date();

        // Update fees for LP positions
        if (position.type === 'LP') {
          position.fees = await this.getAccumulatedFees(position);
          position.impermanentLoss = await this.calculateCurrentImpermanentLoss(position);
        }
      } catch (error) {
        console.error(`Error updating position ${id}:`, error);
      }
    }
  }

  /**
   * Record current portfolio state for historical tracking
   */
  private async recordHistoricalData(): Promise<void> {
    const metrics = await this.calculatePortfolioMetrics();
    
    this.historicalData.push({
      timestamp: new Date(),
      totalValue: metrics.totalValue,
      pnl: metrics.totalPnL,
      fees: metrics.totalFees,
      apy: metrics.averageAPY
    });

    // Keep only last 1000 data points to manage memory
    if (this.historicalData.length > 1000) {
      this.historicalData = this.historicalData.slice(-1000);
    }
  }

  /**
   * Calculate Sharpe ratio for portfolio returns
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const riskFreeRate = 0.02 / 365; // 2% annual risk-free rate
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
  }

  /**
   * Calculate maximum drawdown from historical data
   */
  private calculateMaxDrawdown(): number {
    if (this.historicalData.length < 2) return 0;

    let maxDrawdown = 0;
    let peak = this.historicalData[0].totalValue;

    for (const data of this.historicalData) {
      if (data.totalValue > peak) {
        peak = data.totalValue;
      }
      
      const drawdown = (peak - data.totalValue) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  /**
   * Calculate portfolio diversification score
   */
  private calculateDiversificationScore(): number {
    const positions = Array.from(this.positions.values());
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

    if (totalValue === 0) return 0;

    // Calculate Herfindahl-Hirschman Index (HHI) for concentration
    const hhi = positions.reduce((sum, pos) => {
      const weight = pos.value / totalValue;
      return sum + (weight * weight);
    }, 0);

    // Convert to diversification score (1 = perfectly diversified, 0 = concentrated)
    const maxPositions = 10; // Assume perfect diversification with 10+ positions
    const perfectHHI = 1 / maxPositions;
    
    return Math.max(0, 1 - ((hhi - perfectHHI) / (1 - perfectHHI)));
  }

  /**
   * Calculate overall portfolio risk score
   */
  private calculatePortfolioRisk(): number {
    const positions = Array.from(this.positions.values());
    
    // Risk factors:
    // 1. Volatility of underlying assets
    // 2. Concentration in single pools/tokens
    // 3. Impermanent loss exposure
    // 4. Liquidity depth of pools
    
    let volatilityRisk = 0;
    let concentrationRisk = 0;
    let ilRisk = 0;
    
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    
    for (const position of positions) {
      const weight = position.value / totalValue;
      
      // Volatility risk based on APY (higher APY = higher risk)
      volatilityRisk += weight * Math.min(position.apy / 100, 1);
      
      // IL risk only for LP positions
      if (position.type === 'LP') {
        ilRisk += weight * Math.abs(position.impermanentLoss / position.value);
      }
    }

    // Concentration risk (HHI-based)
    concentrationRisk = this.calculateConcentrationRisk(positions, totalValue);

    return (volatilityRisk * 0.4 + concentrationRisk * 0.4 + ilRisk * 0.2);
  }

  /**
   * Calculate concentration risk using Herfindahl-Hirschman Index
   */
  private calculateConcentrationRisk(positions: PortfolioPosition[], totalValue: number): number {
    if (totalValue === 0) return 0;

    const hhi = positions.reduce((sum, pos) => {
      const weight = pos.value / totalValue;
      return sum + (weight * weight);
    }, 0);

    return hhi; // Returns 0-1, where 1 = fully concentrated
  }

  /**
   * Calculate returns array for statistical analysis
   */
  private calculateReturns(): number[] {
    if (this.historicalData.length < 2) return [];

    const returns: number[] = [];
    
    for (let i = 1; i < this.historicalData.length; i++) {
      const previousValue = this.historicalData[i - 1].totalValue;
      const currentValue = this.historicalData[i].totalValue;
      
      if (previousValue > 0) {
        const dailyReturn = (currentValue - previousValue) / previousValue;
        returns.push(dailyReturn);
      }
    }

    return returns;
  }

  /**
   * Calculate impermanent loss for LP position
   */
  private async calculateImpermanentLoss(position: any): Promise<number> {
    try {
      if (!position.entryPrice || position.entryPrice === 0) return 0;

      const currentPrice = await this.getCurrentPoolPrice(position.poolId);
      const priceRatio = currentPrice / position.entryPrice;

      // Simplified IL calculation: IL = 2*sqrt(priceRatio) / (1 + priceRatio) - 1
      const impermanentLoss = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
      
      return impermanentLoss * position.liquidity;
    } catch (error) {
      console.error('Error calculating impermanent loss:', error);
      return 0;
    }
  }

  /**
   * Calculate liquidity risk based on pool depth
   */
  private async calculateLiquidityRisk(positions: PortfolioPosition[]): Promise<number> {
    let totalRisk = 0;
    let totalWeight = 0;

    for (const position of positions) {
      try {
        const poolInfo = await this.sdk.getPoolInfo(new PublicKey(position.pool));
        const poolLiquidity = poolInfo.totalLiquidity || 1;
        
        // Risk increases as position size approaches pool liquidity
        const positionWeight = position.value / poolLiquidity;
        const liquidityRisk = Math.min(positionWeight * 2, 1); // Cap at 100%
        
        const portfolioWeight = position.value;
        totalRisk += liquidityRisk * portfolioWeight;
        totalWeight += portfolioWeight;
      } catch (error) {
        console.error(`Error calculating liquidity risk for ${position.id}:`, error);
      }
    }

    return totalWeight > 0 ? totalRisk / totalWeight : 0;
  }

  /**
   * Calculate correlation risk between positions
   */
  private async calculateCorrelationRisk(positions: PortfolioPosition[]): Promise<number> {
    // Simplified correlation analysis based on shared tokens
    const tokenExposure = new Map<string, number>();
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

    for (const position of positions) {
      const weight = position.value / totalValue;
      
      tokenExposure.set(
        position.tokenA,
        (tokenExposure.get(position.tokenA) || 0) + weight * 0.5
      );
      tokenExposure.set(
        position.tokenB,
        (tokenExposure.get(position.tokenB) || 0) + weight * 0.5
      );
    }

    // Calculate concentration in individual tokens
    let correlationRisk = 0;
    for (const exposure of tokenExposure.values()) {
      correlationRisk += exposure * exposure;
    }

    return Math.min(correlationRisk, 1);
  }

  /**
   * Get detailed position breakdown
   */
  getPositionBreakdown(): {
    byType: { [key: string]: number };
    byToken: { [key: string]: number };
    byPool: { [key: string]: number };
  } {
    const positions = Array.from(this.positions.values());
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);

    const byType: { [key: string]: number } = {};
    const byToken: { [key: string]: number } = {};
    const byPool: { [key: string]: number } = {};

    for (const position of positions) {
      const weight = totalValue > 0 ? position.value / totalValue : 0;

      // By position type
      byType[position.type] = (byType[position.type] || 0) + weight;

      // By token (combined exposure to each token)
      byToken[position.tokenA] = (byToken[position.tokenA] || 0) + weight * 0.5;
      byToken[position.tokenB] = (byToken[position.tokenB] || 0) + weight * 0.5;

      // By pool
      byPool[position.pool] = (byPool[position.pool] || 0) + weight;
    }

    return { byType, byToken, byPool };
  }

  /**
   * Export portfolio data to CSV
   */
  exportToCSV(): string {
    const positions = Array.from(this.positions.values());
    
    const headers = [
      'ID', 'Type', 'Pool', 'TokenA', 'TokenB', 'Liquidity', 'Value',
      'Entry Price', 'Current Price', 'PnL', 'APY', 'Fees', 'IL', 'Created'
    ];

    const rows = positions.map(pos => [
      pos.id,
      pos.type,
      pos.pool,
      pos.tokenA,
      pos.tokenB,
      pos.liquidity.toString(),
      pos.value.toString(),
      pos.entryPrice.toString(),
      pos.currentPrice.toString(),
      pos.pnl.toString(),
      pos.apy.toString(),
      pos.fees.toString(),
      pos.impermanentLoss.toString(),
      pos.createdAt.toISOString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  // Helper methods (simplified implementations)
  private async calculatePositionValue(position: any): Promise<number> {
    // Implementation would calculate current USD value of position
    return position.liquidity; // Simplified
  }

  private async getCurrentPoolPrice(poolId: PublicKey): Promise<number> {
    try {
      const poolInfo = await this.sdk.getPoolInfo(poolId);
      return poolInfo.price || 1;
    } catch {
      return 1;
    }
  }

  private async calculatePositionAPY(position: any): Promise<number> {
    try {
      return await this.sdk.calculatePositionAPY(position);
    } catch {
      return 0;
    }
  }

  private async calculateCurrentValue(position: PortfolioPosition): Promise<number> {
    const priceA = this.priceCache.get(position.tokenA) || 1;
    const priceB = this.priceCache.get(position.tokenB) || 1;
    
    // Simplified value calculation
    return position.liquidity * (priceA + priceB) / 2;
  }

  private async getCurrentPrice(position: PortfolioPosition): Promise<number> {
    const priceA = this.priceCache.get(position.tokenA) || 1;
    const priceB = this.priceCache.get(position.tokenB) || 1;
    
    return (priceA + priceB) / 2; // Simplified
  }

  private async calculateCurrentAPY(position: PortfolioPosition): Promise<number> {
    if (position.type === 'LP') {
      return await this.calculateLPAPY(position);
    } else if (position.type === 'STAKE') {
      return await this.calculateStakeAPYForPosition(position);
    } else {
      return await this.calculateFarmAPYForPosition(position);
    }
  }

  private async calculateLPAPY(position: PortfolioPosition): Promise<number> {
    // Implementation would calculate current LP APY
    return position.apy; // Simplified - return cached value
  }

  private async calculateStakeAPYForPosition(position: PortfolioPosition): Promise<number> {
    // Implementation would calculate current staking APY
    return position.apy; // Simplified
  }

  private async calculateFarmAPYForPosition(position: PortfolioPosition): Promise<number> {
    // Implementation would calculate current farming APY
    return position.apy; // Simplified
  }

  private async getAccumulatedFees(position: PortfolioPosition): Promise<number> {
    // Implementation would get current fee accumulation
    return position.fees; // Simplified
  }

  private async calculateCurrentImpermanentLoss(position: PortfolioPosition): Promise<number> {
    return await this.calculateImpermanentLoss(position);
  }

  // Staking-specific helper methods
  private async calculateStakeRewards(position: StakePosition): Promise<number> {
    try {
      return await this.sdk.calculatePendingStakeRewards(position);
    } catch {
      return 0;
    }
  }

  private async calculateStakeAPY(position: StakePosition): Promise<number> {
    try {
      const pool = await this.sdk.getStakingPool(position.poolId);
      return pool.currentAPY || 0;
    } catch {
      return 0;
    }
  }

  // Farm-specific helper methods
  private async calculateFarmValue(position: FarmPosition): Promise<number> {
    try {
      return await this.sdk.calculateFarmPositionValue(position);
    } catch {
      return position.stakedLiquidity;
    }
  }

  private async getCurrentFarmPrice(farmId: PublicKey): Promise<number> {
    try {
      const farm = await this.sdk.getFarm(farmId);
      return farm.lpTokenPrice || 1;
    } catch {
      return 1;
    }
  }

  private async calculateFarmRewards(position: FarmPosition): Promise<number> {
    try {
      return await this.sdk.calculatePendingFarmRewards(position);
    } catch {
      return 0;
    }
  }

  private async calculateFarmAPY(position: FarmPosition): Promise<number> {
    try {
      const farm = await this.sdk.getFarm(position.farmId);
      return farm.currentAPY || 0;
    } catch {
      return 0;
    }
  }
}
```

### Dashboard UI Components

```typescript
import React, { useState, useEffect } from 'react';
import { PortfolioAnalytics, PortfolioMetrics, PortfolioPosition } from './portfolio-analytics';

interface DashboardProps {
  analytics: PortfolioAnalytics;
}

export const PortfolioDashboard: React.FC<DashboardProps> = ({ analytics }) => {
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [analytics]);

  const loadData = async () => {
    try {
      const report = await analytics.generatePerformanceReport();
      setMetrics(report.summary);
      setPositions(report.positions);
    } catch (error) {
      console.error('Failed to load portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading portfolio data...</div>;
  }

  return (
    <div className="portfolio-dashboard">
      <header className="dashboard-header">
        <h1>Saros Portfolio Analytics</h1>
        <div className="last-updated">
          Last updated: {new Date().toLocaleString()}
        </div>
      </header>

      {metrics && (
        <div className="metrics-grid">
          <MetricCard
            title="Total Value"
            value={`$${(metrics.totalValue / 1e6).toFixed(2)}`}
            trend={metrics.totalPnL > 0 ? 'up' : 'down'}
          />
          <MetricCard
            title="Total P&L"
            value={`${metrics.totalPnL > 0 ? '+' : ''}$${(metrics.totalPnL / 1e6).toFixed(2)}`}
            trend={metrics.totalPnL > 0 ? 'up' : 'down'}
          />
          <MetricCard
            title="Average APY"
            value={`${metrics.averageAPY.toFixed(2)}%`}
          />
          <MetricCard
            title="Total Fees"
            value={`$${(metrics.totalFees / 1e6).toFixed(2)}`}
          />
          <MetricCard
            title="Active Positions"
            value={metrics.activePositions.toString()}
          />
          <MetricCard
            title="Sharpe Ratio"
            value={metrics.sharpeRatio.toFixed(3)}
          />
        </div>
      )}

      <div className="dashboard-content">
        <div className="positions-section">
          <h2>Active Positions</h2>
          <PositionsTable positions={positions} />
        </div>
        
        <div className="analytics-section">
          <h2>Performance Analytics</h2>
          <PerformanceChart analytics={analytics} />
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  trend?: 'up' | 'down';
}> = ({ title, value, trend }) => (
  <div className={`metric-card ${trend || ''}`}>
    <div className="metric-title">{title}</div>
    <div className="metric-value">{value}</div>
  </div>
);

const PositionsTable: React.FC<{ positions: PortfolioPosition[] }> = ({ positions }) => (
  <div className="positions-table">
    <table>
      <thead>
        <tr>
          <th>Pool</th>
          <th>Type</th>
          <th>Tokens</th>
          <th>Value</th>
          <th>P&L</th>
          <th>APY</th>
          <th>IL</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {positions.map(pos => (
          <tr key={pos.id}>
            <td>{pos.pool.slice(0, 8)}...</td>
            <td>{pos.type}</td>
            <td>{pos.tokenA}/{pos.tokenB}</td>
            <td>${(pos.value / 1e6).toFixed(2)}</td>
            <td className={pos.pnl > 0 ? 'positive' : 'negative'}>
              {pos.pnl > 0 ? '+' : ''}${(pos.pnl / 1e6).toFixed(2)}
            </td>
            <td>{pos.apy.toFixed(2)}%</td>
            <td>{pos.type === 'LP' ? `$${(pos.impermanentLoss / 1e6).toFixed(2)}` : '-'}</td>
            <td>
              <button onClick={() => window.open(`/position/${pos.id}`)}>
                View
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PerformanceChart: React.FC<{ analytics: PortfolioAnalytics }> = ({ analytics }) => {
  // Implementation would use a charting library like Chart.js or D3
  return (
    <div className="performance-chart">
      <canvas id="portfolioChart" width="600" height="300"></canvas>
    </div>
  );
};
```

### CLI Application

```typescript
import { Command } from 'commander';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { PortfolioAnalytics } from './portfolio-analytics';
import * as fs from 'fs';

const program = new Command();

program
  .name('portfolio-analytics')
  .description('Saros portfolio analytics and tracking')
  .version('1.0.0');

program
  .command('report')
  .description('Generate portfolio performance report')
  .option('-w, --wallet <address>', 'Wallet address to analyze')
  .option('-k, --keypair <path>', 'Path to wallet keypair file')
  .option('-r, --rpc <url>', 'Solana RPC URL', 'https://api.mainnet-beta.solana.com')
  .option('-o, --output <format>', 'Output format (json|csv|table)', 'table')
  .action(async (options) => {
    try {
      const connection = new Connection(options.rpc);
      
      let walletAddress: PublicKey;
      if (options.wallet) {
        walletAddress = new PublicKey(options.wallet);
      } else if (options.keypair) {
        const keypair = Keypair.fromSecretKey(
          new Uint8Array(JSON.parse(fs.readFileSync(options.keypair, 'utf-8')))
        );
        walletAddress = keypair.publicKey;
      } else {
        console.error('Must provide either --wallet or --keypair');
        process.exit(1);
      }

      const analytics = new PortfolioAnalytics(connection, walletAddress);
      await analytics.initialize();

      const report = await analytics.generatePerformanceReport();

      if (options.output === 'json') {
        console.log(JSON.stringify(report, null, 2));
      } else if (options.output === 'csv') {
        console.log(analytics.exportToCSV());
      } else {
        // Table format
        printTableReport(report);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      process.exit(1);
    }
  });

program
  .command('monitor')
  .description('Start real-time portfolio monitoring')
  .option('-w, --wallet <address>', 'Wallet address to monitor')
  .option('-k, --keypair <path>', 'Path to wallet keypair file')
  .option('-r, --rpc <url>', 'Solana RPC URL', 'https://api.mainnet-beta.solana.com')
  .option('-i, --interval <minutes>', 'Update interval in minutes', '5')
  .action(async (options) => {
    try {
      const connection = new Connection(options.rpc);
      
      let walletAddress: PublicKey;
      if (options.wallet) {
        walletAddress = new PublicKey(options.wallet);
      } else if (options.keypair) {
        const keypair = Keypair.fromSecretKey(
          new Uint8Array(JSON.parse(fs.readFileSync(options.keypair, 'utf-8')))
        );
        walletAddress = keypair.publicKey;
      } else {
        console.error('Must provide either --wallet or --keypair');
        process.exit(1);
      }

      const analytics = new PortfolioAnalytics(connection, walletAddress);
      await analytics.initialize();

      console.log('Starting portfolio monitoring...');
      await analytics.startMonitoring(parseInt(options.interval));
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      process.exit(1);
    }
  });

program
  .command('optimize')
  .description('Get portfolio optimization suggestions')
  .option('-w, --wallet <address>', 'Wallet address to analyze')
  .option('-k, --keypair <path>', 'Path to wallet keypair file')
  .option('-r, --rpc <url>', 'Solana RPC URL', 'https://api.mainnet-beta.solana.com')
  .action(async (options) => {
    try {
      const connection = new Connection(options.rpc);
      
      let walletAddress: PublicKey;
      if (options.wallet) {
        walletAddress = new PublicKey(options.wallet);
      } else if (options.keypair) {
        const keypair = Keypair.fromSecretKey(
          new Uint8Array(JSON.parse(fs.readFileSync(options.keypair, 'utf-8')))
        );
        walletAddress = keypair.publicKey;
      } else {
        console.error('Must provide either --wallet or --keypair');
        process.exit(1);
      }

      const analytics = new PortfolioAnalytics(connection, walletAddress);
      await analytics.initialize();

      const suggestions = await analytics.generateOptimizationSuggestions();
      const breakdown = analytics.getPositionBreakdown();
      const riskMetrics = await analytics.calculateRiskMetrics();

      console.log('\n=== Portfolio Optimization Report ===');
      
      console.log('\n📊 Position Breakdown:');
      console.log('By Type:', breakdown.byType);
      console.log('By Token:', breakdown.byToken);
      
      console.log('\n⚠️ Risk Analysis:');
      console.log(`Overall Risk Score: ${(riskMetrics.overallRiskScore * 100).toFixed(1)}/100`);
      console.log(`Concentration Risk: ${(riskMetrics.concentrationRisk * 100).toFixed(1)}%`);
      console.log(`IL Risk: ${(riskMetrics.impermanentLossRisk * 100).toFixed(1)}%`);
      
      console.log('\n💡 Optimization Suggestions:');
      suggestions.forEach((suggestion, i) => {
        console.log(`${i + 1}. ${suggestion}`);
      });
      
      console.log('\n=====================================');
    } catch (error) {
      console.error('Failed to generate optimization report:', error);
      process.exit(1);
    }
  });

function printTableReport(report: any): void {
  console.log('\n=== Portfolio Performance Report ===');
  
  const { summary } = report;
  console.log(`Total Value: $${(summary.totalValue / 1e6).toFixed(2)}`);
  console.log(`Total P&L: ${summary.totalPnL > 0 ? '+' : ''}$${(summary.totalPnL / 1e6).toFixed(2)}`);
  console.log(`Total Fees: $${(summary.totalFees / 1e6).toFixed(2)}`);
  console.log(`Average APY: ${summary.averageAPY.toFixed(2)}%`);
  console.log(`Sharpe Ratio: ${summary.sharpeRatio.toFixed(3)}`);
  console.log(`Max Drawdown: ${(summary.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`Win Rate: ${(summary.winRate * 100).toFixed(1)}%`);
  console.log(`Active Positions: ${summary.activePositions}`);
  
  console.log('\n📈 Top Performing Positions:');
  const topPositions = report.positions
    .filter((pos: PortfolioPosition) => pos.pnl > 0)
    .sort((a: PortfolioPosition, b: PortfolioPosition) => b.pnl - a.pnl)
    .slice(0, 5);
    
  topPositions.forEach((pos: PortfolioPosition, i: number) => {
    console.log(`${i + 1}. ${pos.tokenA}/${pos.tokenB} (${pos.type}): +$${(pos.pnl / 1e6).toFixed(2)} (${pos.apy.toFixed(1)}% APY)`);
  });

  if (report.suggestions.length > 0) {
    console.log('\n💡 Optimization Suggestions:');
    report.suggestions.forEach((suggestion: string, i: number) => {
      console.log(`${i + 1}. ${suggestion}`);
    });
  }
  
  console.log('\n====================================');
}

if (require.main === module) {
  program.parse();
}
```

## Usage Examples

### Basic Portfolio Monitoring

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { PortfolioAnalytics } from './portfolio-analytics';

async function monitorPortfolio() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const walletAddress = new PublicKey('YOUR_WALLET_ADDRESS');
  
  const analytics = new PortfolioAnalytics(connection, walletAddress);
  await analytics.initialize();

  // Get current portfolio snapshot
  const metrics = await analytics.calculatePortfolioMetrics();
  console.log('Portfolio Value:', metrics.totalValue / 1e6, 'USDC');
  console.log('Total P&L:', metrics.totalPnL / 1e6, 'USDC');
  console.log('Average APY:', metrics.averageAPY, '%');

  // Start continuous monitoring
  await analytics.startMonitoring(15); // Update every 15 minutes
}
```

### Risk Analysis

```typescript
async function analyzePortfolioRisk() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const walletAddress = new PublicKey('YOUR_WALLET_ADDRESS');
  
  const analytics = new PortfolioAnalytics(connection, walletAddress);
  await analytics.initialize();

  const riskMetrics = await analytics.calculateRiskMetrics();
  
  console.log('Risk Analysis:');
  console.log('- Overall Risk Score:', (riskMetrics.overallRiskScore * 100).toFixed(1), '/100');
  console.log('- Concentration Risk:', (riskMetrics.concentrationRisk * 100).toFixed(1), '%');
  console.log('- Impermanent Loss Risk:', (riskMetrics.impermanentLossRisk * 100).toFixed(1), '%');
  console.log('- Liquidity Risk:', (riskMetrics.liquidityRisk * 100).toFixed(1), '%');
  console.log('- Correlation Risk:', (riskMetrics.correlationRisk * 100).toFixed(1), '%');

  // Get optimization suggestions
  const suggestions = await analytics.generateOptimizationSuggestions();
  
  if (suggestions.length > 0) {
    console.log('\nOptimization Suggestions:');
    suggestions.forEach((suggestion, i) => {
      console.log(`${i + 1}. ${suggestion}`);
    });
  }
}
```

### Performance Reporting

```typescript
async function generateMonthlyReport() {
  const analytics = new PortfolioAnalytics(connection, walletAddress);
  await analytics.initialize();

  const report = await analytics.generatePerformanceReport();
  
  // Generate detailed report
  console.log('=== Monthly Portfolio Report ===');
  console.log(`Reporting Period: ${new Date().toLocaleDateString()}`);
  console.log(`Portfolio Value: $${(report.summary.totalValue / 1e6).toFixed(2)}`);
  console.log(`Monthly P&L: $${(report.summary.totalPnL / 1e6).toFixed(2)}`);
  console.log(`Fee Income: $${(report.summary.totalFees / 1e6).toFixed(2)}`);
  
  // Export to CSV for further analysis
  const csvData = analytics.exportToCSV();
  fs.writeFileSync(`portfolio-report-${Date.now()}.csv`, csvData);
  
  console.log('Report exported to CSV file');
}
```

## CLI Commands

```bash
# Generate comprehensive portfolio report
npm run analytics report --keypair ./wallet.json --output table

# Export portfolio data to CSV
npm run analytics report --keypair ./wallet.json --output csv > portfolio.csv

# Get JSON report for API integration
npm run analytics report --wallet YOUR_ADDRESS --output json

# Start real-time monitoring (updates every 5 minutes)
npm run analytics monitor --keypair ./wallet.json --interval 5

# Get portfolio optimization suggestions
npm run analytics optimize --keypair ./wallet.json
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Connection, PublicKey } from '@solana/web3.js';
import { PortfolioAnalytics } from '../portfolio-analytics';

describe('PortfolioAnalytics', () => {
  let analytics: PortfolioAnalytics;
  let mockConnection: Connection;
  let testWallet: PublicKey;

  beforeEach(() => {
    mockConnection = new Connection('https://api.devnet.solana.com');
    testWallet = new PublicKey('11111111111111111111111111111112');
    analytics = new PortfolioAnalytics(mockConnection, testWallet);
  });

  it('should calculate portfolio metrics correctly', async () => {
    // Test portfolio metrics calculation
    const metrics = await analytics.calculatePortfolioMetrics();
    expect(metrics).toHaveProperty('totalValue');
    expect(metrics).toHaveProperty('totalPnL');
    expect(metrics).toHaveProperty('averageAPY');
  });

  it('should calculate risk metrics correctly', async () => {
    const riskMetrics = await analytics.calculateRiskMetrics();
    expect(riskMetrics.overallRiskScore).toBeGreaterThanOrEqual(0);
    expect(riskMetrics.overallRiskScore).toBeLessThanOrEqual(1);
  });

  it('should generate optimization suggestions', async () => {
    const suggestions = await analytics.generateOptimizationSuggestions();
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should export portfolio to CSV', () => {
    const csv = analytics.exportToCSV();
    expect(csv).toContain('ID,Type,Pool,TokenA,TokenB');
  });
});
```

### Integration Tests

```typescript
describe('Portfolio Analytics Integration', () => {
  it('should track real portfolio positions', async () => {
    // This test would use a real devnet wallet with known positions
    const connection = new Connection('https://api.devnet.solana.com');
    const wallet = new PublicKey('DEVNET_WALLET_WITH_POSITIONS');
    
    const analytics = new PortfolioAnalytics(connection, wallet);
    await analytics.initialize();

    const metrics = await analytics.calculatePortfolioMetrics();
    expect(metrics.activePositions).toBeGreaterThan(0);
  });

  it('should calculate accurate P&L', async () => {
    // Test with known position data
    // Verify P&L calculations match expected values
  });
});
```

## Dashboard CSS

```css
.portfolio-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Inter', sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e1e5e9;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.metric-card.up {
  border-left: 4px solid #10b981;
}

.metric-card.down {
  border-left: 4px solid #ef4444;
}

.metric-title {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
}

.positions-table table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.positions-table th,
.positions-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.positions-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.positive {
  color: #10b981;
}

.negative {
  color: #ef4444;
}

.performance-chart {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 20px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 18px;
  color: #6b7280;
}
```

## Key Features

1. **Comprehensive Position Tracking**: Monitors LP, staking, and farming positions across all Saros protocols
2. **Real-Time Analytics**: Live P&L, APY, and fee tracking with automatic updates
3. **Risk Assessment**: Multi-factor risk analysis including concentration, correlation, and liquidity risks
4. **Performance Metrics**: Sharpe ratio, max drawdown, win rate, and other institutional-grade metrics
5. **Optimization Engine**: AI-driven suggestions for portfolio rebalancing and optimization
6. **Historical Tracking**: Long-term performance tracking with exportable data
7. **Multiple Interfaces**: Web dashboard, CLI tools, and programmatic API

## Advanced Features

- **Automated Alerts**: Set up notifications for position performance thresholds
- **Correlation Analysis**: Understand how your positions move together
- **Scenario Analysis**: Model portfolio performance under different market conditions
- **Tax Reporting**: Generate reports suitable for tax filing
- **Integration APIs**: Connect with external portfolio management tools

This analytics dashboard provides institutional-grade portfolio management capabilities for Saros DeFi positions, helping users maximize returns while managing risk effectively.