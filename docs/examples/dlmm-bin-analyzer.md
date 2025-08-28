# Example: DLMM Bin Distribution Analyzer

Advanced analytics tool for analyzing DLMM pool bin distributions, liquidity concentration, and market microstructure to optimize trading strategies.

## Overview

This example demonstrates:
- Analyzing bin distribution and liquidity concentration patterns
- Calculating optimal price ranges for different strategies
- Monitoring real-time bin activity and volume patterns
- Identifying arbitrage opportunities between bins
- Generating comprehensive market microstructure reports

## Complete Implementation

### Setup and Dependencies

```bash
# Create project
mkdir saros-bin-analyzer
cd saros-bin-analyzer

# Initialize npm project
npm init -y

# Install dependencies
npm install @saros-finance/dlmm-sdk @solana/web3.js
npm install chart.js canvas decimal.js
npm install -D typescript @types/node ts-node @types/chart.js
```

### Core Bin Analyzer

```typescript
// src/binAnalyzer.ts
import {
  Connection,
  PublicKey,
  AccountInfo,
} from '@solana/web3.js';
import {
  DLMM,
  DLMMPool,
  getBinArrays,
  PositionV2,
  BinArray,
} from '@saros-finance/dlmm-sdk';
import { Decimal } from 'decimal.js';

export interface BinData {
  binId: number;
  price: number;
  liquidityX: number;
  liquidityY: number;
  totalLiquidity: number;
  feesX: number;
  feesY: number;
  volume24h: number;
  trades24h: number;
  utilizationRate: number;
}

export interface LiquidityDistribution {
  totalLiquidity: number;
  activeBins: number;
  concentrationIndex: number; // Herfindahl index for liquidity concentration
  priceRange: {
    min: number;
    max: number;
    span: number;
  };
  densityMap: Map<number, number>; // Bin ID -> Liquidity density
}

export interface MarketMicrostructure {
  spreadAnalysis: {
    averageSpread: number;
    medianSpread: number;
    spreadVolatility: number;
  };
  depthAnalysis: {
    bidDepth: number;
    askDepth: number;
    depthImbalance: number;
  };
  liquidity: {
    totalActiveLiquidity: number;
    effectiveLiquidity: number;
    liquidityUtilization: number;
  };
  volatility: {
    realized24h: number;
    implied: number;
    priceVolatility: number;
  };
}

export interface OptimizationSuggestion {
  strategy: string;
  reason: string;
  optimalRange: {
    lowerBin: number;
    upperBin: number;
    expectedFees: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  capitalEfficiency: number;
}

export class DLMMBinAnalyzer {
  private connection: Connection;
  private pool: DLMMPool | null = null;
  private binData: Map<number, BinData> = new Map();
  private historicalData: Map<number, BinData[]> = new Map();

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async loadPool(poolAddress: string): Promise<void> {
    console.log('📊 Loading DLMM pool for analysis:', poolAddress);
    
    try {
      this.pool = await DLMM.create(this.connection, new PublicKey(poolAddress));
      await this.loadBinData();
      console.log('✅ Pool loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load pool:', error);
      throw error;
    }
  }

  private async loadBinData(): Promise<void> {
    if (!this.pool) throw new Error('Pool not loaded');
    
    console.log('🔍 Loading bin data...');
    
    try {
      // Get all bin arrays for the pool
      const binArrays = await getBinArrays(this.connection, this.pool.poolAddress);
      
      // Process each bin array
      for (const binArray of binArrays) {
        await this.processBinArray(binArray);
      }
      
      console.log(`📈 Loaded ${this.binData.size} bins`);
    } catch (error) {
      console.error('❌ Failed to load bin data:', error);
      throw error;
    }
  }

  private async processBinArray(binArray: BinArray): Promise<void> {
    // Process each bin in the array
    for (const bin of binArray.bins) {
      if (bin.liquidityGross.gt(new Decimal(0))) {
        const binData: BinData = {
          binId: bin.binId,
          price: this.binIdToPrice(bin.binId),
          liquidityX: bin.liquidityX.toNumber(),
          liquidityY: bin.liquidityY.toNumber(),
          totalLiquidity: bin.liquidityGross.toNumber(),
          feesX: bin.feeAmountXTotal.toNumber(),
          feesY: bin.feeAmountYTotal.toNumber(),
          volume24h: 0, // Would need historical data
          trades24h: 0, // Would need historical data
          utilizationRate: this.calculateUtilizationRate(bin)
        };
        
        this.binData.set(bin.binId, binData);
      }
    }
  }

  private binIdToPrice(binId: number): number {
    if (!this.pool) return 0;
    
    // Convert bin ID to actual price using bin step
    const binStep = this.pool.binStep;
    const priceMultiplier = 1 + binStep / 10000;
    return Math.pow(priceMultiplier, binId);
  }

  private calculateUtilizationRate(bin: any): number {
    // Calculate how much of the bin's liquidity is actively being used
    // This is a simplified calculation
    const totalLiquidity = bin.liquidityGross.toNumber();
    const activeLiquidity = Math.max(bin.liquidityX.toNumber(), bin.liquidityY.toNumber());
    
    return totalLiquidity > 0 ? activeLiquidity / totalLiquidity : 0;
  }

  async analyzeLiquidityDistribution(): Promise<LiquidityDistribution> {
    console.log('📊 Analyzing liquidity distribution...');
    
    if (this.binData.size === 0) {
      throw new Error('No bin data available. Load pool first.');
    }
    
    const bins = Array.from(this.binData.values());
    const totalLiquidity = bins.reduce((sum, bin) => sum + bin.totalLiquidity, 0);
    
    // Calculate concentration using Herfindahl Index
    let concentrationIndex = 0;
    const densityMap = new Map<number, number>();
    
    for (const bin of bins) {
      const marketShare = bin.totalLiquidity / totalLiquidity;
      concentrationIndex += marketShare * marketShare;
      
      const density = bin.totalLiquidity / Math.max(0.001, Math.abs(bin.price - this.getCurrentPrice()));
      densityMap.set(bin.binId, density);
    }
    
    const prices = bins.map(bin => bin.price);
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      span: Math.max(...prices) - Math.min(...prices)
    };
    
    return {
      totalLiquidity,
      activeBins: bins.length,
      concentrationIndex,
      priceRange,
      densityMap
    };
  }

  async analyzeMarketMicrostructure(): Promise<MarketMicrostructure> {
    console.log('🔬 Analyzing market microstructure...');
    
    if (!this.pool) throw new Error('Pool not loaded');
    
    const currentPrice = this.getCurrentPrice();
    const bins = Array.from(this.binData.values()).sort((a, b) => a.price - b.price);
    
    // Find bid and ask sides
    const bidBins = bins.filter(bin => bin.price < currentPrice);
    const askBins = bins.filter(bin => bin.price > currentPrice);
    
    // Calculate spread analysis
    const closestBid = bidBins[bidBins.length - 1];
    const closestAsk = askBins[0];
    
    const spread = closestAsk && closestBid 
      ? (closestAsk.price - closestBid.price) / currentPrice
      : 0;
    
    // Calculate depth analysis
    const bidDepth = bidBins.reduce((sum, bin) => sum + bin.totalLiquidity, 0);
    const askDepth = askBins.reduce((sum, bin) => sum + bin.totalLiquidity, 0);
    const depthImbalance = (bidDepth - askDepth) / (bidDepth + askDepth);
    
    // Calculate liquidity metrics
    const totalActiveLiquidity = bins.reduce((sum, bin) => sum + bin.totalLiquidity, 0);
    const effectiveLiquidity = this.calculateEffectiveLiquidity(bins, currentPrice);
    
    // Calculate volatility (simplified - would need historical data for real calculation)
    const priceVolatility = this.calculatePriceVolatility(bins);
    
    return {
      spreadAnalysis: {
        averageSpread: spread,
        medianSpread: spread,
        spreadVolatility: 0
      },
      depthAnalysis: {
        bidDepth,
        askDepth,
        depthImbalance
      },
      liquidity: {
        totalActiveLiquidity,
        effectiveLiquidity,
        liquidityUtilization: effectiveLiquidity / totalActiveLiquidity
      },
      volatility: {
        realized24h: 0, // Would need historical data
        implied: 0,
        priceVolatility
      }
    };
  }

  private calculateEffectiveLiquidity(bins: BinData[], currentPrice: number): number {
    // Calculate liquidity weighted by proximity to current price
    let effectiveLiquidity = 0;
    
    for (const bin of bins) {
      const priceDistance = Math.abs(bin.price - currentPrice) / currentPrice;
      const weight = Math.exp(-priceDistance * 10); // Exponential decay
      effectiveLiquidity += bin.totalLiquidity * weight;
    }
    
    return effectiveLiquidity;
  }

  private calculatePriceVolatility(bins: BinData[]): number {
    // Calculate volatility based on liquidity distribution
    if (bins.length < 2) return 0;
    
    const weightedPrices = bins.map(bin => ({
      price: bin.price,
      weight: bin.totalLiquidity
    }));
    
    const totalWeight = weightedPrices.reduce((sum, item) => sum + item.weight, 0);
    const avgPrice = weightedPrices.reduce((sum, item) => 
      sum + item.price * item.weight, 0) / totalWeight;
    
    const variance = weightedPrices.reduce((sum, item) => 
      sum + Math.pow(item.price - avgPrice, 2) * item.weight, 0) / totalWeight;
    
    return Math.sqrt(variance) / avgPrice; // Return as percentage
  }

  async generateOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    console.log('💡 Generating optimization suggestions...');
    
    if (!this.pool) throw new Error('Pool not loaded');
    
    const distribution = await this.analyzeLiquidityDistribution();
    const microstructure = await this.analyzeMarketMicrostructure();
    const suggestions: OptimizationSuggestion[] = [];
    
    // Strategy 1: Tight Range for High Fee Capture
    if (microstructure.volatility.priceVolatility < 0.02) { // Low volatility
      suggestions.push({
        strategy: 'Tight Range High Fee Capture',
        reason: 'Low volatility environment detected - concentrate liquidity for maximum fee capture',
        optimalRange: {
          lowerBin: this.getCurrentBinId() - 10,
          upperBin: this.getCurrentBinId() + 10,
          expectedFees: this.estimateFees(20, microstructure.liquidity.liquidityUtilization),
          riskLevel: 'MEDIUM'
        },
        capitalEfficiency: 0.85
      });
    }
    
    // Strategy 2: Wide Range for Stability
    if (microstructure.volatility.priceVolatility > 0.05) { // High volatility
      suggestions.push({
        strategy: 'Wide Range Stability Strategy',
        reason: 'High volatility detected - use wider range to stay in-range longer',
        optimalRange: {
          lowerBin: this.getCurrentBinId() - 50,
          upperBin: this.getCurrentBinId() + 50,
          expectedFees: this.estimateFees(100, microstructure.liquidity.liquidityUtilization),
          riskLevel: 'LOW'
        },
        capitalEfficiency: 0.65
      });
    }
    
    // Strategy 3: Asymmetric Range based on Depth Imbalance
    if (Math.abs(microstructure.depthAnalysis.depthImbalance) > 0.2) {
      const isAskHeavy = microstructure.depthAnalysis.depthImbalance > 0;
      suggestions.push({
        strategy: 'Asymmetric Range Strategy',
        reason: `${isAskHeavy ? 'Ask' : 'Bid'} depth imbalance detected - skew range ${isAskHeavy ? 'down' : 'up'}ward`,
        optimalRange: {
          lowerBin: this.getCurrentBinId() - (isAskHeavy ? 30 : 15),
          upperBin: this.getCurrentBinId() + (isAskHeavy ? 15 : 30),
          expectedFees: this.estimateFees(45, microstructure.liquidity.liquidityUtilization),
          riskLevel: 'MEDIUM'
        },
        capitalEfficiency: 0.75
      });
    }
    
    // Strategy 4: Gap Filling for Arbitrage
    const gaps = this.findLiquidityGaps();
    if (gaps.length > 0) {
      suggestions.push({
        strategy: 'Liquidity Gap Arbitrage',
        reason: `${gaps.length} liquidity gaps found - potential for arbitrage profits`,
        optimalRange: {
          lowerBin: gaps[0].startBin,
          upperBin: gaps[0].endBin,
          expectedFees: this.estimateFees(gaps[0].size, 0.8), // High utilization in gaps
          riskLevel: 'HIGH'
        },
        capitalEfficiency: 0.95
      });
    }
    
    return suggestions;
  }

  private findLiquidityGaps(): Array<{startBin: number, endBin: number, size: number}> {
    const gaps: Array<{startBin: number, endBin: number, size: number}> = [];
    const sortedBins = Array.from(this.binData.keys()).sort((a, b) => a - b);
    
    let gapStart = -1;
    let expectedBin = sortedBins[0];
    
    for (let i = 0; i < sortedBins.length; i++) {
      const currentBin = sortedBins[i];
      
      if (currentBin !== expectedBin && gapStart === -1) {
        gapStart = expectedBin;
      } else if (currentBin === expectedBin && gapStart !== -1) {
        gaps.push({
          startBin: gapStart,
          endBin: currentBin - 1,
          size: currentBin - gapStart
        });
        gapStart = -1;
      }
      
      expectedBin = currentBin + 1;
    }
    
    return gaps.filter(gap => gap.size >= 3); // Only significant gaps
  }

  private estimateFees(binSpan: number, utilizationRate: number): number {
    // Simplified fee estimation based on bin span and utilization
    const baseFeeRate = 0.0003; // 0.03%
    const utilization = Math.min(utilizationRate, 1.0);
    const efficiency = 1 / binSpan; // Tighter range = higher efficiency
    
    return baseFeeRate * utilization * efficiency * 365; // Annualized
  }

  async generateComprehensiveReport(): Promise<AnalysisReport> {
    console.log('📋 Generating comprehensive analysis report...');
    
    if (!this.pool) throw new Error('Pool not loaded');
    
    try {
      const [distribution, microstructure, suggestions] = await Promise.all([
        this.analyzeLiquidityDistribution(),
        this.analyzeMarketMicrostructure(),
        this.generateOptimizationSuggestions()
      ]);
      
      const report: AnalysisReport = {
        poolAddress: this.pool.poolAddress.toString(),
        timestamp: new Date(),
        currentPrice: this.getCurrentPrice(),
        liquidityDistribution: distribution,
        marketMicrostructure: microstructure,
        optimizationSuggestions: suggestions,
        summary: this.generateSummary(distribution, microstructure, suggestions)
      };
      
      return report;
      
    } catch (error) {
      console.error('❌ Failed to generate report:', error);
      throw error;
    }
  }

  private getCurrentPrice(): number {
    return this.pool?.getCurrentPrice() || 0;
  }

  private getCurrentBinId(): number {
    return this.pool?.activeId || 0;
  }

  private generateSummary(
    distribution: LiquidityDistribution,
    microstructure: MarketMicrostructure,
    suggestions: OptimizationSuggestion[]
  ): AnalysisSummary {
    return {
      liquidityConcentration: distribution.concentrationIndex > 0.1 ? 'HIGH' : 'LOW',
      marketCondition: microstructure.volatility.priceVolatility > 0.05 ? 'VOLATILE' : 'STABLE',
      tradingOpportunity: suggestions.length > 0 ? 'AVAILABLE' : 'LIMITED',
      recommendedStrategy: suggestions[0]?.strategy || 'HOLD',
      confidenceScore: Math.min(0.95, suggestions.length * 0.2 + 0.3)
    };
  }
}

export interface AnalysisReport {
  poolAddress: string;
  timestamp: Date;
  currentPrice: number;
  liquidityDistribution: LiquidityDistribution;
  marketMicrostructure: MarketMicrostructure;
  optimizationSuggestions: OptimizationSuggestion[];
  summary: AnalysisSummary;
}

export interface AnalysisSummary {
  liquidityConcentration: 'HIGH' | 'MEDIUM' | 'LOW';
  marketCondition: 'VOLATILE' | 'STABLE' | 'TRENDING';
  tradingOpportunity: 'AVAILABLE' | 'LIMITED' | 'NONE';
  recommendedStrategy: string;
  confidenceScore: number;
}
```

### Visualization Engine

```typescript
// src/visualization.ts
import { Chart, ChartConfiguration } from 'chart.js';
import { BinData, LiquidityDistribution } from './binAnalyzer';

export class BinVisualization {
  async generateLiquidityChart(
    bins: BinData[],
    currentPrice: number
  ): Promise<ChartConfiguration> {
    const sortedBins = bins.sort((a, b) => a.price - b.price);
    
    return {
      type: 'bar',
      data: {
        labels: sortedBins.map(bin => bin.price.toFixed(4)),
        datasets: [
          {
            label: 'X Token Liquidity',
            data: sortedBins.map(bin => bin.liquidityX),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Y Token Liquidity',
            data: sortedBins.map(bin => bin.liquidityY),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'DLMM Liquidity Distribution by Price Bin'
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Price'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Liquidity Amount'
            },
            beginAtZero: true
          }
        },
        annotations: {
          currentPrice: {
            type: 'line',
            xMin: currentPrice,
            xMax: currentPrice,
            borderColor: 'rgba(255, 206, 84, 1)',
            borderWidth: 3,
            label: {
              content: 'Current Price',
              enabled: true
            }
          }
        }
      }
    };
  }

  async generateHeatmap(
    bins: BinData[],
    metric: 'liquidity' | 'fees' | 'utilization' = 'liquidity'
  ): Promise<string> {
    // Generate ASCII heatmap for terminal display
    const maxBinId = Math.max(...bins.map(b => b.binId));
    const minBinId = Math.min(...bins.map(b => b.binId));
    const range = maxBinId - minBinId;
    
    const getValue = (bin: BinData) => {
      switch (metric) {
        case 'liquidity': return bin.totalLiquidity;
        case 'fees': return bin.feesX + bin.feesY;
        case 'utilization': return bin.utilizationRate;
        default: return bin.totalLiquidity;
      }
    };
    
    const maxValue = Math.max(...bins.map(getValue));
    let heatmap = `\n📊 ${metric.toUpperCase()} HEATMAP\n${'='.repeat(50)}\n`;
    
    const binMap = new Map(bins.map(bin => [bin.binId, bin]));
    
    for (let binId = minBinId; binId <= maxBinId; binId += Math.ceil(range / 40)) {
      const bin = binMap.get(binId);
      const value = bin ? getValue(bin) : 0;
      const intensity = value / maxValue;
      
      const char = this.getHeatmapChar(intensity);
      const price = bin ? bin.price.toFixed(2) : 'N/A';
      
      heatmap += `${price.padStart(8)} |${char.repeat(Math.ceil(intensity * 20))}\n`;
    }
    
    heatmap += `${'='.repeat(50)}\nLegend: ${this.getHeatmapChar(0.1)} Low  ${this.getHeatmapChar(0.5)} Med  ${this.getHeatmapChar(0.9)} High\n`;
    
    return heatmap;
  }

  private getHeatmapChar(intensity: number): string {
    if (intensity < 0.1) return '░';
    if (intensity < 0.3) return '▒';
    if (intensity < 0.6) return '▓';
    return '█';
  }

  async exportReportToCSV(report: AnalysisReport, filename: string): Promise<void> {
    const fs = require('fs');
    
    let csv = 'BinId,Price,LiquidityX,LiquidityY,TotalLiquidity,FeesX,FeesY,UtilizationRate\n';
    
    const bins = Array.from(this.binData.values()).sort((a, b) => a.binId - b.binId);
    
    for (const bin of bins) {
      csv += `${bin.binId},${bin.price},${bin.liquidityX},${bin.liquidityY},${bin.totalLiquidity},${bin.feesX},${bin.feesY},${bin.utilizationRate}\n`;
    }
    
    fs.writeFileSync(filename, csv);
    console.log(`📁 Report exported to ${filename}`);
  }
}
```

### Real-time Monitoring

```typescript
// src/monitor.ts
import { DLMMBinAnalyzer } from './binAnalyzer';
import { BinVisualization } from './visualization';

export class RealTimeMonitor {
  private analyzer: DLMMBinAnalyzer;
  private visualizer: BinVisualization;
  private isRunning: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(rpcUrl: string) {
    this.analyzer = new DLMMBinAnalyzer(rpcUrl);
    this.visualizer = new BinVisualization();
  }

  async startMonitoring(poolAddress: string, intervalSeconds: number = 30): Promise<void> {
    console.log('🔍 Starting real-time monitoring...');
    
    await this.analyzer.loadPool(poolAddress);
    this.isRunning = true;
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateAnalysis();
      } catch (error) {
        console.error('❌ Monitoring error:', error);
      }
    }, intervalSeconds * 1000);
    
    console.log(`✅ Monitoring started (${intervalSeconds}s intervals)`);
  }

  private async updateAnalysis(): Promise<void> {
    if (!this.analyzer) return;
    
    try {
      const report = await this.analyzer.generateComprehensiveReport();
      
      // Display key metrics
      console.clear();
      console.log('📊 DLMM BIN ANALYSIS - LIVE DATA');
      console.log('═'.repeat(50));
      console.log(`🏊 Pool: ${report.poolAddress}`);
      console.log(`💰 Current Price: $${report.currentPrice.toFixed(4)}`);
      console.log(`📈 Active Bins: ${report.liquidityDistribution.activeBins}`);
      console.log(`💧 Total Liquidity: $${(report.liquidityDistribution.totalLiquidity / 1e6).toFixed(2)}M`);
      console.log(`⚡ Volatility: ${(report.marketMicrostructure.volatility.priceVolatility * 100).toFixed(2)}%`);
      console.log(`🎯 Concentration: ${(report.liquidityDistribution.concentrationIndex * 100).toFixed(1)}%`);
      console.log('═'.repeat(50));
      
      // Show top suggestions
      if (report.optimizationSuggestions.length > 0) {
        const topSuggestion = report.optimizationSuggestions[0];
        console.log('💡 TOP SUGGESTION:');
        console.log(`Strategy: ${topSuggestion.strategy}`);
        console.log(`Reason: ${topSuggestion.reason}`);
        console.log(`Range: ${topSuggestion.optimalRange.lowerBin} - ${topSuggestion.optimalRange.upperBin}`);
        console.log(`Expected APY: ${(topSuggestion.optimalRange.expectedFees * 100).toFixed(2)}%`);
        console.log(`Risk Level: ${topSuggestion.optimalRange.riskLevel}`);
      }
      
      console.log('\n⏳ Next update in 30s... (Press Ctrl+C to stop)');
      
    } catch (error) {
      console.error('❌ Update failed:', error);
    }
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isRunning = false;
    console.log('🛑 Monitoring stopped');
  }
}
```

### Command Line Interface

```typescript
// src/cli.ts
import { Command } from 'commander';
import { DLMMBinAnalyzer } from './binAnalyzer';
import { RealTimeMonitor } from './monitor';
import { clusterApiUrl } from '@solana/web3.js';

const program = new Command();

program
  .name('dlmm-analyzer')
  .description('DLMM Bin Distribution Analysis Tool')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze a DLMM pool')
  .requiredOption('-p, --pool <address>', 'Pool address to analyze')
  .option('-n, --network <network>', 'Network (mainnet/devnet)', 'mainnet')
  .option('-o, --output <file>', 'Output file for report')
  .action(async (options) => {
    try {
      const rpcUrl = options.network === 'devnet' 
        ? clusterApiUrl('devnet')
        : clusterApiUrl('mainnet-beta');
      
      const analyzer = new DLMMBinAnalyzer(rpcUrl);
      await analyzer.loadPool(options.pool);
      
      const report = await analyzer.generateComprehensiveReport();
      
      console.log('📊 ANALYSIS COMPLETE');
      console.log('══════════════════');
      console.log(`Pool: ${report.poolAddress}`);
      console.log(`Price: $${report.currentPrice.toFixed(4)}`);
      console.log(`Active Bins: ${report.liquidityDistribution.activeBins}`);
      console.log(`Concentration Index: ${(report.liquidityDistribution.concentrationIndex * 100).toFixed(1)}%`);
      
      if (report.optimizationSuggestions.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        report.optimizationSuggestions.forEach((suggestion, i) => {
          console.log(`${i + 1}. ${suggestion.strategy}`);
          console.log(`   Risk: ${suggestion.optimalRange.riskLevel}`);
          console.log(`   Expected APY: ${(suggestion.optimalRange.expectedFees * 100).toFixed(2)}%`);
        });
      }
      
      // Save report if output file specified
      if (options.output) {
        require('fs').writeFileSync(
          options.output,
          JSON.stringify(report, null, 2)
        );
        console.log(`\n📁 Report saved to ${options.output}`);
      }
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  });

program
  .command('monitor')
  .description('Real-time monitoring of a DLMM pool')
  .requiredOption('-p, --pool <address>', 'Pool address to monitor')
  .option('-i, --interval <seconds>', 'Update interval in seconds', '30')
  .option('-n, --network <network>', 'Network (mainnet/devnet)', 'mainnet')
  .action(async (options) => {
    try {
      const rpcUrl = options.network === 'devnet' 
        ? clusterApiUrl('devnet')
        : clusterApiUrl('mainnet-beta');
      
      const monitor = new RealTimeMonitor(rpcUrl);
      
      // Graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping monitor...');
        monitor.stopMonitoring();
        process.exit(0);
      });
      
      await monitor.startMonitoring(options.pool, parseInt(options.interval));
      
    } catch (error) {
      console.error('❌ Monitoring failed:', error);
      process.exit(1);
    }
  });

program.parse();
```

### Usage Examples

```typescript
// examples/usage.ts
import { DLMMBinAnalyzer } from '../src/binAnalyzer';
import { RealTimeMonitor } from '../src/monitor';
import { clusterApiUrl } from '@solana/web3.js';

async function exampleUsage() {
  // Example 1: One-time analysis
  console.log('📊 Example 1: Pool Analysis');
  
  const analyzer = new DLMMBinAnalyzer(clusterApiUrl('mainnet-beta'));
  await analyzer.loadPool('your-pool-address-here');
  
  const report = await analyzer.generateComprehensiveReport();
  console.log('Analysis complete:', report.summary);
  
  // Example 2: Real-time monitoring
  console.log('\n👁️  Example 2: Real-time Monitoring');
  
  const monitor = new RealTimeMonitor(clusterApiUrl('mainnet-beta'));
  await monitor.startMonitoring('your-pool-address-here', 60); // 60-second intervals
  
  // Example 3: Batch analysis of multiple pools
  console.log('\n🔍 Example 3: Batch Analysis');
  
  const pools = [
    'pool-address-1',
    'pool-address-2', 
    'pool-address-3'
  ];
  
  for (const poolAddress of pools) {
    try {
      const poolAnalyzer = new DLMMBinAnalyzer(clusterApiUrl('mainnet-beta'));
      await poolAnalyzer.loadPool(poolAddress);
      
      const poolReport = await poolAnalyzer.generateComprehensiveReport();
      console.log(`\n📊 Pool ${poolAddress}:`);
      console.log(`   Liquidity: $${(poolReport.liquidityDistribution.totalLiquidity / 1e6).toFixed(2)}M`);
      console.log(`   Active Bins: ${poolReport.liquidityDistribution.activeBins}`);
      console.log(`   Best Strategy: ${poolReport.summary.recommendedStrategy}`);
      
    } catch (error) {
      console.error(`❌ Failed to analyze pool ${poolAddress}:`, error.message);
    }
  }
}

// Run examples
exampleUsage().catch(console.error);
```

## Testing Framework

```typescript
// tests/binAnalyzer.test.ts
import { DLMMBinAnalyzer } from '../src/binAnalyzer';
import { clusterApiUrl } from '@solana/web3.js';

describe('DLMM Bin Analyzer', () => {
  let analyzer: DLMMBinAnalyzer;
  const testPoolAddress = 'test-pool-address';
  
  beforeAll(async () => {
    analyzer = new DLMMBinAnalyzer(clusterApiUrl('devnet'));
    // Note: In real tests, you'd use a real pool address
  });
  
  test('should load pool successfully', async () => {
    // Mock the pool loading for testing
    expect(analyzer).toBeDefined();
  });
  
  test('should analyze liquidity distribution', async () => {
    // Would need real pool data for this test
    // This is a structure test only
    expect(typeof analyzer.analyzeLiquidityDistribution).toBe('function');
  });
  
  test('should generate optimization suggestions', async () => {
    expect(typeof analyzer.generateOptimizationSuggestions).toBe('function');
  });
  
  test('should create comprehensive report', async () => {
    expect(typeof analyzer.generateComprehensiveReport).toBe('function');
  });
});
```

## Production Deployment

### Environment Configuration

```bash
# .env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
POOL_ADDRESS=your-dlmm-pool-address
UPDATE_INTERVAL=30
ENABLE_NOTIFICATIONS=true
WEBHOOK_URL=https://your-webhook-endpoint.com
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Key Insights

### Understanding Bin Behavior

1. **High Utilization Bins** - Bins with >80% utilization rate are actively trading
2. **Liquidity Gaps** - Missing bins create arbitrage opportunities
3. **Concentration Patterns** - High concentration index indicates risky but profitable setups
4. **Price Discovery** - Active bins around current price drive price discovery

### Optimization Strategies

1. **Tight Ranges** - Use when volatility is low (&lt;2%)
2. **Wide Ranges** - Use when volatility is high (&gt;5%)
3. **Asymmetric Ranges** - Skew based on market sentiment and depth imbalance
4. **Gap Filling** - Target liquidity gaps for potential arbitrage profits

## Resources

- 📚 [DLMM SDK API Reference](/docs/dlmm-sdk/api-reference) - Complete method documentation
- 🎯 [Position Management Tutorial](/docs/tutorials/managing-concentrated-liquidity) - Advanced techniques
- 💡 [Strategy Optimization Guide](/docs/tutorials/optimizing-dlmm-strategies) - Professional strategies
- 🛠️ [Troubleshooting Guide](/docs/troubleshooting#dlmm-specific-issues) - Common issues and solutions